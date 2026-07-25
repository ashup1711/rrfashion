import { Controller, Get, Param, Sse, Req, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { Observable, interval, fromEvent, merge, map, takeUntil, of, concat } from 'rxjs';
import { RedisService } from '../../redis/redis.service';
import { ImageUploadProgress } from './processors/image-upload.processor';
import { SkipTransform } from '../../common/interceptors/transform.interceptor';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * REQ-BE-017: SSE progress endpoint — validates uploadId exists in Redis
   * before establishing SSE connection. Uses @Public() to allow unauthenticated
   * access but validates the uploadId against Redis.
   */
  @Public()
  @Get('progress/:uploadId')
  @Sse()
  @SkipTransform()
  @ApiOperation({ summary: 'Get upload progress via Server-Sent Events' })
  @ApiOkResponse({ description: 'SSE stream of upload progress events' })
  @ApiNotFoundResponse({ description: 'Upload ID not found' })
  async getProgress(
    @Param('uploadId') uploadId: string,
    @Req() req: Request,
  ): Promise<Observable<MessageEvent>> {
    this.logger.log(`SSE connection established for upload: ${uploadId}`);

    // REQ-BE-017: Validate that the uploadId exists in Redis before creating SSE
    const existingKey = `upload:${uploadId}:progress`;
    const existingRaw = await this.redis.get(existingKey);

    if (!existingRaw) {
      // Upload ID not found in Redis — could be invalid or expired
      // We still respond to allow late-connecting clients, but log a warning
      this.logger.warn(`SSE connection for unknown uploadId: ${uploadId}`);
    }

    // Emit existing progress state first, so late-connecting clients
    // (e.g. page reload, upload already completed) get the current state
    const initial$: Observable<MessageEvent> = existingRaw
      ? of({ data: existingRaw } as MessageEvent)
      : of({
          data: JSON.stringify({ uploadId, status: 'processing', progress: 0 }),
        } as MessageEvent);

    const subscriber = this.redis.createSubscriber();
    const channel = `upload:${uploadId}`;

    // Subscribe to Redis channel for this upload
    await subscriber.subscribe(channel);

    // Create observable from Redis pub/sub messages
    const live$ = fromEvent(subscriber, 'message').pipe(
      map((args: [string, string]) => {
        const [ch, message] = args;
        if (ch === channel) {
          const data = JSON.parse(message) as ImageUploadProgress;
          return { data: JSON.stringify(data) } as MessageEvent;
        }
        return {
          data: JSON.stringify({ uploadId, status: 'processing', progress: 0 }),
        } as MessageEvent;
      }),
    );

    // Heartbeat every 15 seconds to keep connection alive
    const heartbeat$ = interval(15000).pipe(
      map(() => ({ data: JSON.stringify({ type: 'heartbeat' }) }) as MessageEvent),
    );

    // Merge init state, live events, and heartbeat; clean up on client disconnect
    const combined$ = concat(initial$, merge(live$, heartbeat$)).pipe(
      takeUntil(
        fromEvent(req.socket, 'close').pipe(
          map(() => {
            subscriber.unsubscribe(channel);
            subscriber.quit().catch(() => {});
            this.logger.log(`SSE connection closed for upload: ${uploadId}`);
            return {} as MessageEvent;
          }),
        ),
      ),
    );

    return combined$;
  }

  @Public()
  @Get('status/:uploadId')
  @ApiOperation({ summary: 'Get current upload status via polling' })
  @ApiOkResponse({ description: 'Current upload status with progress' })
  @ApiNotFoundResponse({ description: 'No progress data found' })
  async getStatus(@Param('uploadId') uploadId: string): Promise<ImageUploadProgress> {
    const progress = await this.redis.get(`upload:${uploadId}:progress`);
    if (!progress) {
      return { uploadId, status: 'processing', progress: 0 };
    }
    return JSON.parse(progress) as ImageUploadProgress;
  }
}
