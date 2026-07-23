import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ApiTags, ApiConsumes, ApiBody, ApiAcceptedResponse } from '@nestjs/swagger';
import { ApiCommonResponse } from '../../common/decorators/api-response.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { ImageUploadService } from '../upload/image-upload.service';
import { mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

const PROFILE_PHOTO_TEMP_DIR = './uploads/temp';
mkdirSync(PROFILE_PHOTO_TEMP_DIR, { recursive: true });

@ApiTags('Users')
@Controller()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly uploadService: ImageUploadService,
  ) {}

  @Post('users')
  @ApiCommonResponse({
    summary: 'Create a new user',
    status: 201,
    type: UserResponseDto,
    auth: false,
  })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get('users')
  @ApiCommonResponse({
    summary: 'Get all users',
    type: UserResponseDto,
    isArray: true,
    pagination: true,
  })
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('users/:id')
  @ApiCommonResponse({ summary: 'Get user by ID', type: UserResponseDto })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('users/:id')
  @ApiCommonResponse({ summary: 'Update user', type: UserResponseDto })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete('users/:id')
  @ApiCommonResponse({ summary: 'Delete user' })
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiCommonResponse({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @ApiCommonResponse({ summary: 'Update profile' })
  async updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('profile/delete-account')
  @ApiCommonResponse({ summary: 'Delete my account' })
  async deleteMyAccount(@CurrentUser('id') userId: string, @Body() dto: DeleteAccountDto) {
    return this.usersService.deleteMyAccount(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile/photo')
  @HttpCode(202)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: PROFILE_PHOTO_TEMP_DIR,
        filename: (_req, file, cb) => {
          const ext = file.originalname.split('.').pop() ?? 'jpg';
          cb(null, `${uuidv4()}.${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiAcceptedResponse({ description: 'Upload accepted, processing in background' })
  async uploadProfilePhoto(
    @CurrentUser('id') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<{ uploadId: string; status: string }> {
    return this.uploadService.queueProfilePhotoUpload(userId, file);
  }
}
