import {
  Controller,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '../../common/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TempUploadService } from './temp-upload.service';

@ApiTags('Uploads')
@Controller('upload')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
export class TempUploadController {
  constructor(private readonly tempUploadService: TempUploadService) {}

  @Post('temp')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a temporary image for new product creation' })
  @ApiOkResponse({
    description: 'Temporary image uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        tempId: { type: 'string' },
        url: { type: 'string' },
        storageKey: { type: 'string' },
        expiresAt: { type: 'string' },
      },
    },
  })
  async uploadTempImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ): Promise<{
    tempId: string;
    url: string;
    storageKey: string;
    expiresAt: string;
  }> {
    return this.tempUploadService.uploadTempImage(file);
  }

  @Delete('temp/:tempId')
  @ApiOperation({ summary: 'Delete a temporary image' })
  @ApiOkResponse({ description: 'Temporary image deleted successfully' })
  async deleteTempImage(@Param('tempId') tempId: string): Promise<{ deleted: boolean }> {
    await this.tempUploadService.deleteTempImage(tempId);
    return { deleted: true };
  }
}
