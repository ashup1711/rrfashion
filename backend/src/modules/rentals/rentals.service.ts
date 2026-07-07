import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { BookRentalDto } from './dto/book-rental.dto';
import { InspectRentalDto } from './dto/inspect-rental.dto';
import { ExtendRentalDto } from './dto/extend-rental.dto';
import { CreateDepositDto, CaptureDepositDto, ReleaseDepositDto } from './dto/create-deposit.dto';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class RentalsService {
  private readonly logger = new Logger(RentalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async checkAvailability(dto: CheckAvailabilityDto) {
    const { variantId, startDate, endDate } = dto;

    const units = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT iu.id
      FROM inventory_units iu
      WHERE iu."variantId" = ${variantId}
        AND iu.status IN ('available', 'returned')
        AND iu.id NOT IN (
          SELECT rb."unitId"
          FROM rental_bookings rb
          WHERE rb.status NOT IN ('CLOSED', 'CANCELLED')
            AND rb.booking_period && tstzrange(${startDate}::timestamptz, ${endDate}::timestamptz, '[)')
        )
      LIMIT 20
    `;

    const totalResult = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM inventory_units iu
      WHERE iu."variantId" = ${variantId}
        AND iu.status IN ('available', 'returned')
        AND iu.id NOT IN (
          SELECT rb."unitId"
          FROM rental_bookings rb
          WHERE rb.status NOT IN ('CLOSED', 'CANCELLED')
            AND rb.booking_period && tstzrange(${startDate}::timestamptz, ${endDate}::timestamptz, '[)')
        )
    `;

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: { select: { name: true } } },
    });

    return {
      variantId,
      productName: variant?.product?.name || 'Unknown',
      availableUnits: units,
      availableCount: Number(totalResult[0]?.count || 0),
      requestedDates: { start: startDate, end: endDate },
      rentPricePerDay: variant?.rentPricePerDay?.toNumber() || null,
      securityDeposit: variant?.securityDeposit?.toNumber() || null,
      estimatedTotal: variant
        ? this.calculateEstimate(
            variant.rentPricePerDay?.toNumber() || null,
            variant.securityDeposit?.toNumber() || null,
            startDate,
            endDate,
          )
        : null,
    };
  }

  async book(dto: BookRentalDto) {
    const { orderItemId, unitId, storeId, startDate, endDate, depositAmount } = dto;

    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: orderItemId },
    });

    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }

    const unit = await this.prisma.inventoryUnit.findUnique({
      where: { id: unitId },
    });

    if (!unit || !['available', 'returned'].includes(unit.status)) {
      throw new BadRequestException('Unit is not available for rental');
    }

    const overlapped = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT rb.id FROM rental_bookings rb
      WHERE rb."unitId" = ${unitId}
        AND rb.status NOT IN ('CLOSED', 'CANCELLED')
        AND rb.booking_period && tstzrange(${startDate}::timestamptz, ${endDate}::timestamptz, '[)')
      LIMIT 1
    `;

    if (overlapped.length > 0) {
      throw new BadRequestException('Unit is already booked for the requested period');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    const result = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.rentalBooking.create({
        data: {
          orderItemId,
          unitId,
          storeId,
          status: 'BOOKED',
          bookedAt: new Date(),
          dueReturnAt: end,
          depositAmount,
          depositStatus: 'collected',
        },
      });

      await tx.$executeRaw`
        UPDATE rental_bookings
        SET booking_period = tstzrange(${start.toISOString()}::timestamptz, ${end.toISOString()}::timestamptz, '[)')
        WHERE id = ${booking.id}
      `;

      await tx.inventoryUnit.update({
        where: { id: unitId },
        data: { status: 'RESERVED' },
      });

      await tx.orderItem.update({
        where: { id: orderItemId },
        data: {
          rentStart: start,
          rentEnd: end,
          rentDays: days,
          depositAmount,
        },
      });

      return booking;
    });

    return result;
  }

  async confirmPickup(id: string, _adminId: string) {
    const booking = await this.prisma.rentalBooking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Rental booking not found');
    }

    if (booking.status !== 'BOOKED') {
      throw new BadRequestException(`Cannot pickup: booking status is ${booking.status}`);
    }

    return this.prisma.rentalBooking.update({
      where: { id },
      data: {
        status: 'IN_USE',
        pickupAt: new Date(),
      },
    });
  }

  async processReturn(id: string) {
    const booking = await this.prisma.rentalBooking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Rental booking not found');
    }

    if (!['IN_USE', 'LATE_RETURN'].includes(booking.status)) {
      throw new BadRequestException(`Cannot return: booking status is ${booking.status}`);
    }

    const now = new Date();
    const dueDate = new Date(booking.dueReturnAt);
    const depositAmount = booking.depositAmount.toNumber();
    const lateFee = now > dueDate ? this.calculateLateFee(depositAmount, dueDate, now) : 0;

    return this.prisma.rentalBooking.update({
      where: { id },
      data: {
        status: 'RETURNED',
        actualReturnAt: now,
        lateFee,
      },
    });
  }

  async inspect(id: string, dto: InspectRentalDto, adminId: string) {
    const booking = await this.prisma.rentalBooking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Rental booking not found');
    }

    if (booking.status !== 'RETURNED') {
      throw new BadRequestException(`Cannot inspect: booking status is ${booking.status}`);
    }

    const { lateFee, damageCharge, damageNotes, damagePhotos, closeNotes } = dto;
    const hasDamage = (damageCharge || 0) > 0;

    const updated = await this.prisma.rentalBooking.update({
      where: { id },
      data: {
        status: hasDamage ? 'DAMAGE_ASSESSED' : 'INSPECTED',
        inspectedAt: new Date(),
        inspectedByAdminId: adminId,
        lateFee: lateFee ?? booking.lateFee.toNumber(),
        damageCharge: damageCharge ?? 0,
        damageNotes: damageNotes ?? null,
        damagePhotos: damagePhotos ?? [],
        closeNotes: closeNotes ?? null,
      },
    });

    return updated;
  }

  async close(id: string) {
    const booking = await this.prisma.rentalBooking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Rental booking not found');
    }

    if (!['INSPECTED', 'DAMAGE_ASSESSED'].includes(booking.status)) {
      throw new BadRequestException(`Cannot close: booking status is ${booking.status}`);
    }

    const damageCharge = booking.damageCharge.toNumber();
    const lateFee = booking.lateFee.toNumber();
    const depositAmount = booking.depositAmount.toNumber();
    const forfeitedAmount = damageCharge + lateFee;
    const depositStatus =
      forfeitedAmount > 0
        ? forfeitedAmount >= depositAmount
          ? 'forfeited'
          : 'partially_refunded'
        : 'fully_refunded';

    const result = await this.prisma.$transaction([
      this.prisma.rentalBooking.update({
        where: { id },
        data: {
          status: 'CLOSED',
          depositStatus,
        },
      }),
      this.prisma.inventoryUnit.update({
        where: { id: booking.unitId },
        data: {
          status: damageCharge > 0 ? 'DAMAGED' : 'AVAILABLE',
          conditionNotes: booking.damageNotes || undefined,
        },
      }),
    ]);

    return result[0];
  }

  async extend(id: string, dto: ExtendRentalDto, adminId: string) {
    const booking = await this.prisma.rentalBooking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException('Rental booking not found');
    }

    if (!['IN_USE', 'LATE_RETURN'].includes(booking.status)) {
      throw new BadRequestException('Cannot extend: rental is not in use');
    }

    const { newEndDate, additionalCharge } = dto;

    const overlapped = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT rb.id FROM rental_bookings rb
      WHERE rb."unitId" = ${booking.unitId}
        AND rb.id != ${id}
        AND rb.status NOT IN ('CLOSED', 'CANCELLED')
        AND rb.booking_period && tstzrange(${booking.dueReturnAt}::timestamptz, ${newEndDate}::timestamptz, '[)')
      LIMIT 1
    `;

    if (overlapped.length > 0) {
      throw new BadRequestException(
        'Cannot extend: unit is booked for the requested extension period',
      );
    }

    const result = await this.prisma.$transaction([
      this.prisma.rentalExtension.create({
        data: {
          rentalBookingId: id,
          originalDueDate: booking.dueReturnAt,
          newDueDate: new Date(newEndDate),
          additionalCharge,
          approvedByAdminId: adminId,
        },
      }),
      this.prisma.rentalBooking.update({
        where: { id },
        data: {
          dueReturnAt: new Date(newEndDate),
        },
      }),
    ]);

    return result;
  }

  async findAllAdmin(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (params.status) {
      where.status = params.status;
    }

    if (params.search) {
      where.OR = [
        { orderItem: { order: { user: { firstName: { contains: params.search, mode: 'insensitive' } } } } },
        { orderItem: { order: { user: { lastName: { contains: params.search, mode: 'insensitive' } } } } },
        { orderItem: { order: { user: { email: { contains: params.search, mode: 'insensitive' } } } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.rentalBooking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          orderItem: {
            include: {
              order: {
                select: {
                  orderNumber: true,
                  user: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                  },
                },
              },
              variant: {
                select: {
                  id: true,
                  size: true,
                  color: true,
                  product: { select: { id: true, name: true } },
                },
              },
            },
          },
          store: {
            select: { id: true, name: true },
          },
          unit: {
            select: { id: true, status: true },
          },
        },
      }),
      this.prisma.rentalBooking.count({ where }),
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

  async getById(id: string) {
    const booking = await this.prisma.rentalBooking.findUnique({
      where: { id },
      include: {
        unit: true,
        orderItem: { include: { order: true } },
        extensions: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Rental booking not found');
    }

    return booking;
  }

  async findByOrderItem(orderItemId: string) {
    return this.prisma.rentalBooking.findMany({
      where: { orderItemId },
      include: { extensions: true },
    });
  }

  async createDeposit(rentalId: string, dto: CreateDepositDto) {
    const booking = await this.prisma.rentalBooking.findUnique({
      where: { id: rentalId },
      include: { orderItem: { include: { order: true } } },
    });

    if (!booking) {
      throw new NotFoundException('Rental booking not found');
    }

    if (booking.status !== 'BOOKED') {
      throw new BadRequestException(
        `Cannot create deposit: booking status is ${booking.status}, expected BOOKED`,
      );
    }

    const orderId = booking.orderItem.orderId;

    // Create Razorpay pre-auth payment (authorize only, don't capture)
    const razorpayPayment = await this.paymentsService.createPreAuthPayment(
      dto.amount,
      `Security deposit for rental ${rentalId}`,
    );

    const preAuthId = razorpayPayment.id;

    // Persist payment record and update rental booking in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.rentalBooking.update({
        where: { id: rentalId },
        data: {
          razorpayPreAuthId: preAuthId,
          preAuthStatus: 'HOLD',
        },
      });

      const payment = await tx.payment.create({
        data: {
          orderId,
          razorpayPreAuthId: preAuthId,
          amount: dto.amount / 100,
          currency: 'INR',
          type: 'SECURITY_DEPOSIT',
          channel: 'ONLINE',
          status: 'PENDING',
          preAuthStatus: 'HOLD',
          metadata: {
            razorpay_pre_auth_id: preAuthId,
            amount_paise: dto.amount,
            rental_booking_id: rentalId,
          },
        },
      });

      return payment;
    });

    return {
      razorpayPreAuthId: preAuthId,
      amount: dto.amount,
      status: 'HOLD',
      paymentId: result.id,
    };
  }

  async captureDeposit(rentalId: string, dto: CaptureDepositDto) {
    const booking = await this.prisma.rentalBooking.findUnique({
      where: { id: rentalId },
    });

    if (!booking) {
      throw new NotFoundException('Rental booking not found');
    }

    if (booking.status !== 'INSPECTED') {
      throw new BadRequestException(
        `Cannot capture deposit: booking status is ${booking.status}, expected INSPECTED`,
      );
    }

    // Find the payment record to resolve the full amount if not specified
    const paymentRecord = await this.prisma.payment.findFirst({
      where: { razorpayPreAuthId: dto.razorpayPreAuthId },
    });

    if (!paymentRecord) {
      throw new NotFoundException('Deposit payment record not found');
    }

    // Resolve amount in paise for Razorpay API
    // If dto.amount is provided (partial capture), use it; otherwise full amount from DB
    const captureAmountPaise = dto.amount ?? Number(paymentRecord.amount) * 100;

    // Capture via Razorpay API
    const capturedPayment = await this.paymentsService.capturePreAuth(
      dto.razorpayPreAuthId,
      captureAmountPaise,
    );

    // Update records in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.rentalBooking.update({
        where: { id: rentalId },
        data: { preAuthStatus: 'CAPTURED' },
      });

      const payment = await tx.payment.update({
        where: { id: paymentRecord.id },
        data: {
          status: 'PAID',
          preAuthStatus: 'CAPTURED',
          razorpayPaymentId: capturedPayment.id,
        },
      });

      return payment;
    });

    return {
      status: 'CAPTURED',
      paymentId: result.id,
      razorpayPaymentId: capturedPayment.id,
    };
  }

  async releaseDeposit(rentalId: string, dto: ReleaseDepositDto) {
    const booking = await this.prisma.rentalBooking.findUnique({
      where: { id: rentalId },
    });

    if (!booking) {
      throw new NotFoundException('Rental booking not found');
    }

    // Find the payment record first (razorpayPreAuthId is not @unique)
    const paymentRecord = await this.prisma.payment.findFirst({
      where: { razorpayPreAuthId: dto.razorpayPreAuthId },
    });

    if (!paymentRecord) {
      throw new NotFoundException('Deposit payment record not found');
    }

    // Release/void via Razorpay Refund API
    const refund = await this.paymentsService.releasePreAuth(dto.razorpayPreAuthId);

    // Update records in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.rentalBooking.update({
        where: { id: rentalId },
        data: { preAuthStatus: 'RELEASED' },
      });

      const payment = await tx.payment.update({
        where: { id: paymentRecord.id },
        data: {
          status: 'REFUNDED',
          preAuthStatus: 'RELEASED',
        },
      });

      return payment;
    });

    return {
      status: 'RELEASED',
      paymentId: result.id,
      refundId: refund.id,
    };
  }

  private calculateEstimate(
    pricePerDay: number | null,
    deposit: number | null,
    start: string,
    end: string,
  ): Record<string, unknown> | null {
    if (!pricePerDay) return null;

    const startDate = new Date(start);
    const endDate = new Date(end);
    const days = Math.max(
      1,
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
    );
    const rentalCharge = pricePerDay * days;

    return {
      days,
      rentalCharge,
      deposit: deposit || 0,
      total: rentalCharge + (deposit || 0),
    };
  }

  private calculateLateFee(depositAmount: number, dueDate: Date, returnDate: Date): number {
    const daysLate = Math.ceil((returnDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLate <= 0) return 0;
    return Math.round(depositAmount * 0.05 * daysLate * 100) / 100;
  }
}
