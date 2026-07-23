import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { ReviewFilterDto } from './dto/review-filter.dto';
import { Prisma, ReviewStatus } from '@prisma/client';

export interface PaginatedReviewsResponse {
  items: unknown[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ModerateReviewResponse {
  id: string;
  status: string;
}

const EDIT_WINDOW_DAYS = 30;

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateReviewDto, guestSessionId?: string) {
    // Validate that the product exists
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check for duplicate review by the same authenticated user
    // (guest sessions skip this check — userId is null for guests)
    if (userId) {
      const existingReview = await this.prisma.review.findFirst({
        where: {
          userId,
          productId: dto.productId,
        },
      });

      if (existingReview) {
        throw new ConflictException('You have already reviewed this product');
      }
    }

    // Create the review directly without order linkage
    return this.prisma.review.create({
      data: {
        ...(guestSessionId ? { guestSessionId, userId: undefined } : { userId }),
        productId: dto.productId,
        rating: dto.rating,
        comment: dto.comment,
        photos: dto.photos ?? [],
        status: ReviewStatus.PENDING,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async findAll(userId: string, query: ReviewFilterDto): Promise<PaginatedReviewsResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {
      OR: [
        { status: ReviewStatus.APPROVED },
        ...(userId ? [{ userId } as Prisma.ReviewWhereInput] : []),
      ],
    };

    if (query.status) {
      where.status = query.status as ReviewStatus;
    }

    if (query.rating) {
      where.rating = query.rating;
    }

    if (query.productId) {
      where.productId = query.productId;
    }

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, profilePhoto: true },
          },
          product: {
            select: { id: true, name: true, slug: true },
          },
          variant: {
            select: { id: true, size: true, color: true },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, userId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, profilePhoto: true },
        },
        product: {
          select: { id: true, name: true, slug: true },
        },
        variant: {
          select: { id: true, size: true, color: true },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (
      review.status !== ReviewStatus.APPROVED &&
      review.userId !== userId &&
      review.guestSessionId !== userId
    ) {
      throw new ForbiddenException('You do not have access to this review');
    }

    return review;
  }

  async update(userId: string, id: string, dto: UpdateReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId !== userId && review.guestSessionId !== userId) {
      throw new ForbiddenException('You can only edit your own reviews');
    }

    const editDeadline = new Date(review.createdAt);
    editDeadline.setDate(editDeadline.getDate() + EDIT_WINDOW_DAYS);

    if (new Date() > editDeadline) {
      throw new BadRequestException('Review can only be edited within 30 days of creation');
    }

    const data: Prisma.ReviewUpdateInput = {};

    if (dto.rating !== undefined) {
      data.rating = dto.rating;
    }

    if (dto.comment !== undefined) {
      data.comment = dto.comment;
    }

    if (dto.photos !== undefined) {
      data.photos = dto.photos;
    }

    return this.prisma.review.update({
      where: { id },
      data,
    });
  }

  async remove(userId: string, id: string): Promise<{ deleted: boolean }> {
    const review = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.userId !== userId && review.guestSessionId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.prisma.review.delete({
      where: { id },
    });

    return { deleted: true };
  }

  async findAllAdmin(filter: ReviewFilterDto): Promise<PaginatedReviewsResponse> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {};

    if (filter.status) {
      where.status = filter.status as ReviewStatus;
    }

    if (filter.rating) {
      where.rating = filter.rating;
    }

    if (filter.productId) {
      where.productId = filter.productId;
    }

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, profilePhoto: true },
          },
          product: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async moderate(
    id: string,
    dto: ModerateReviewDto,
    adminId: string,
  ): Promise<ModerateReviewResponse> {
    const review = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.status !== ReviewStatus.PENDING && review.status !== ReviewStatus.FLAGGED) {
      throw new BadRequestException(
        `Review is already ${review.status.toLowerCase()} and cannot be moderated`,
      );
    }

    const updated = await this.prisma.review.update({
      where: { id },
      data: {
        status: dto.status,
        reviewedByAdminId: adminId,
      },
    });

    return {
      id: updated.id,
      status: updated.status,
    };
  }
}
