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
import { Prisma, ReviewStatus, OrderStatus } from '@prisma/client';

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

  async create(userId: string, dto: CreateReviewDto) {
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: dto.orderItemId },
      include: {
        order: true,
        product: { select: { id: true } },
        variant: { select: { id: true } },
      },
    });

    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }

    if (orderItem.order.userId !== userId) {
      throw new ForbiddenException('You can only review items from your own orders');
    }

    if (!orderItem.order.userId) {
      throw new ForbiddenException('Cannot review items from guest orders');
    }

    const isEligibleForReview = await this.isOrderItemEligibleForReview(orderItem);
    if (!isEligibleForReview) {
      throw new ForbiddenException(
        'You can only review delivered sale items or returned/closed rental items',
      );
    }

    const existingReview = await this.prisma.review.findUnique({
      where: { orderItemId: dto.orderItemId },
    });

    if (existingReview) {
      throw new ConflictException('This order item has already been reviewed');
    }

    return this.prisma.review.create({
      data: {
        userId,
        productId: orderItem.productId,
        variantId: orderItem.variantId,
        orderItemId: dto.orderItemId,
        rating: dto.rating,
        comment: dto.comment,
        photos: dto.photos ?? [],
        status: ReviewStatus.PENDING,
      },
    });
  }

  private async isOrderItemEligibleForReview(orderItem: {
    order: { status: OrderStatus; userId: string | null };
    id: string;
    type: string;
  }): Promise<boolean> {
    if (orderItem.order.status === 'RETURNED') {
      return true;
    }

    if (orderItem.type === 'rent') {
      const closedRental = await this.prisma.rentalBooking.findFirst({
        where: {
          orderItemId: orderItem.id,
          status: { in: ['RETURNED', 'CLOSED'] },
        },
      });
      return !!closedRental;
    }

    return orderItem.order.status === 'DELIVERED';
  }

  async findAll(userId: string, query: ReviewFilterDto): Promise<PaginatedReviewsResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {
      OR: [{ status: ReviewStatus.APPROVED }, { userId }],
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
            select: { id: true, firstName: true, lastName: true },
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
          select: { id: true, firstName: true, lastName: true },
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

    if (review.status !== ReviewStatus.APPROVED && review.userId !== userId) {
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

    if (review.userId !== userId) {
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

    if (review.userId !== userId) {
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
            select: { id: true, firstName: true, lastName: true, email: true },
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
