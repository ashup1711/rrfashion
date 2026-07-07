import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PosAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-pos-api-key'];
    const deviceUuid = request.headers['x-pos-device-id'];

    if (!apiKey || !deviceUuid) {
      throw new UnauthorizedException('Missing POS credentials');
    }

    const device = await this.prisma.posDevice.findUnique({
      where: { deviceUuid },
    });

    if (!device || !device.isActive) {
      throw new UnauthorizedException('Device not registered or inactive');
    }

    const hash = createHash('sha256').update(apiKey).digest('hex');
    if (hash !== device.apiKeyHash) {
      throw new UnauthorizedException('Invalid API key');
    }

    request.posDevice = device;
    return true;
  }
}
