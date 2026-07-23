import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ReviewStatus } from '@prisma/client';

describe('ReviewsService', () => {
  let service: ReviewsService;

  const mockPrisma = {
    product: {
      findUnique: jest.fn(),
    },
    review: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = 'user-1';
    const dto = {
      productId: 'product-1',
      rating: 5,
      comment: 'Great product!',
      photos: [],
    };

    it('should throw NotFoundException when product does not exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.create(userId, dto)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.product.findUnique).toHaveBeenCalledWith({
        where: { id: dto.productId },
        select: { id: true },
      });
    });

    it('should throw ConflictException when user already reviewed product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'product-1' });
      mockPrisma.review.findFirst.mockResolvedValue({ id: 'existing-review' });

      await expect(service.create(userId, dto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.review.findFirst).toHaveBeenCalledWith({
        where: { userId, productId: dto.productId },
      });
    });

    it('should create a review successfully for authenticated user', async () => {
      const expectedReview = {
        id: 'new-review',
        productId: 'product-1',
        rating: 5,
        comment: 'Great product!',
        photos: [],
        status: 'PENDING',
        userId: 'user-1',
        user: { id: 'user-1', firstName: 'John', lastName: 'Doe' },
      };

      mockPrisma.product.findUnique.mockResolvedValue({ id: 'product-1' });
      mockPrisma.review.findFirst.mockResolvedValue(null);
      mockPrisma.review.create.mockResolvedValue(expectedReview);

      const result = await service.create(userId, dto);
      expect(mockPrisma.review.create).toHaveBeenCalledWith({
        data: {
          userId,
          productId: dto.productId,
          rating: dto.rating,
          comment: dto.comment,
          photos: dto.photos ?? [],
          status: ReviewStatus.PENDING,
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      expect(result).toEqual(expectedReview);
    });

    it('should create a review for guest session (skips duplicate check)', async () => {
      const guestSessionId = 'guest-1';
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'product-1' });
      mockPrisma.review.create.mockResolvedValue({
        id: 'guest-review',
        guestSessionId,
        productId: 'product-1',
      });

      await service.create('', dto, guestSessionId);
      // Should NOT check for duplicates when userId is empty
      expect(mockPrisma.review.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.review.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            guestSessionId,
            userId: undefined,
          }),
        }),
      );
    });

    it('should omit variantId and orderItemId in created data', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 'product-1' });
      mockPrisma.review.findFirst.mockResolvedValue(null);
      mockPrisma.review.create.mockResolvedValue({
        id: 'new-review',
        productId: 'product-1',
      });

      await service.create(userId, dto);

      const createCallData = mockPrisma.review.create.mock.calls[0][0].data;
      expect(createCallData).not.toHaveProperty('variantId');
      expect(createCallData).not.toHaveProperty('orderItemId');
      expect(createCallData.productId).toBe('product-1');
    });
  });
});
