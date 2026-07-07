import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  NotImplementedException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async create(_createUserDto?: unknown): Promise<never> {
    void _createUserDto;
    throw new NotImplementedException(
      'User creation via this endpoint is not implemented. Use POST /auth/register.',
    );
  }

  async findAll(): Promise<never> {
    throw new NotImplementedException('Admin user listing is not yet implemented.');
  }

  async findOne(_id?: string): Promise<never> {
    void _id;
    throw new NotImplementedException('Use GET /profile for current user profile.');
  }

  async update(_id?: string, _updateUserDto?: unknown): Promise<never> {
    void _id;
    void _updateUserDto;
    throw new NotImplementedException('Use PATCH /profile to update your own profile.');
  }

  async remove(_id?: string): Promise<never> {
    void _id;
    throw new NotImplementedException('User removal is not yet implemented.');
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        profilePhoto: true,
        profilePhotoKey: true,
        addresses: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user || !user.isActive) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const updateData: Record<string, unknown> = {};

    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.addresses !== undefined) updateData.addresses = dto.addresses;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        profilePhoto: true,
        profilePhotoKey: true,
        addresses: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async deleteMyAccount(userId: string, dto: DeleteAccountDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Check for active orders
    const activeOrders = await this.prisma.order.count({
      where: {
        userId,
        status: { in: ['PENDING', 'CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY'] },
      },
    });
    if (activeOrders > 0) {
      throw new BadRequestException(
        'Cannot delete account with active orders. Please complete or cancel your orders first.',
      );
    }

    // Check for active rentals (RentalBooking doesn't have a direct userId, so we query through orderItem -> order)
    const activeRentals = await this.prisma.rentalBooking.count({
      where: {
        status: { in: ['BOOKED', 'IN_USE', 'LATE_RETURN'] },
        orderItem: {
          order: {
            userId,
          },
        },
      },
    });
    if (activeRentals > 0) {
      throw new BadRequestException(
        'Cannot delete account with active rentals. Please complete your rentals first.',
      );
    }

    // Soft delete
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    // Invalidate all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });

    this.logger.log({ userId, action: 'account.deleted' });

    return { success: true, message: 'Account has been deleted' };
  }

  async uploadProfilePhoto(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    // Generate storage key
    const extension = file.originalname.split('.').pop() || 'jpg';
    const safeName = `${uuidv4()}.${extension}`;
    const key = `profiles/${userId}/${safeName}`;

    // Upload to storage
    await this.storage.upload(key, file.buffer, file.mimetype);
    const photoUrl = this.storage.getPublicUrl(key);

    // Get old photo key for deletion
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { profilePhotoKey: true },
    });

    // Update user record
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        profilePhoto: photoUrl,
        profilePhotoKey: key,
      },
    });

    // Delete old photo if exists
    if (currentUser?.profilePhotoKey) {
      try {
        await this.storage.delete(currentUser.profilePhotoKey);
      } catch (error) {
        this.logger.warn(
          `Failed to delete old profile photo: ${currentUser.profilePhotoKey}`,
          error,
        );
      }
    }

    return { photoUrl };
  }
}
