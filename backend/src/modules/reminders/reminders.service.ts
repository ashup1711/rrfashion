import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { GuestSessionService } from '../guest/guest-session.service';
import { NotificationJobData } from '../notifications/processors/notification.processor';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly guestSessionService: GuestSessionService,
    @InjectQueue('notifications') private readonly notificationsQueue: Queue<NotificationJobData>,
  ) {}

  /**
   * EVERY_30_MINUTES — Carts older than 24 hours with items
   * Creates a notification for the user via BullMQ queue.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCartAbandonment(): Promise<void> {
    this.logger.log('Running cart abandonment check...');
    await this.processCartAbandonment();
  }

  /**
   * Public method to manually trigger the cart abandonment check.
   * Returns a summary of the action taken.
   */
  async triggerCartAbandonmentManually(): Promise<{
    triggered: boolean;
    checked: number;
    notificationsCreated: number;
  }> {
    this.logger.log('Manually triggering cart abandonment check...');
    const result = await this.processCartAbandonment();
    return {
      triggered: true,
      checked: result.checked,
      notificationsCreated: result.notificationsCreated,
    };
  }

  private async processCartAbandonment(): Promise<{
    checked: number;
    notificationsCreated: number;
  }> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const abandonedCarts = await this.prisma.cart.findMany({
      where: {
        updatedAt: { lt: cutoff },
        items: { some: {} },
      },
      include: {
        user: { select: { id: true } },
        items: { select: { id: true } },
      },
    });

    this.logger.log(`Found ${abandonedCarts.length} abandoned carts`);

    let notificationsCreated = 0;

    for (const cart of abandonedCarts) {
      const notification = await this.prisma.notification.create({
        data: {
          userId: cart.user.id,
          type: 'cart_abandonment',
          channel: 'EMAIL',
          title: 'Complete Your Purchase',
          body: `You have ${cart.items.length} item(s) in your cart. Complete your order before they sell out!`,
          status: 'PENDING',
        },
      });

      await this.notificationsQueue.add('send-notification', {
        notificationId: notification.id,
      });
      notificationsCreated++;
    }

    return { checked: abandonedCarts.length, notificationsCreated };
  }

  /**
   * Daily at 6AM — Check for wishlist items with price drops
   * Notifies users who have opted in for price drop alerts.
   */
  @Cron('0 6 * * *')
  async handleWishlistPriceDrops(): Promise<void> {
    this.logger.log('Running wishlist price drop check...');

    const wishlists = await this.prisma.wishlist.findMany({
      where: { notifyOnPriceDrop: true },
      include: {
        user: { select: { id: true, email: true } },
        variant: {
          select: {
            id: true,
            salePrice: true,
            product: { select: { name: true } },
          },
        },
      },
    });

    this.logger.log(`Checking ${wishlists.length} wishlist items for price drops`);

    for (const wishlist of wishlists) {
      const notification = await this.prisma.notification.create({
        data: {
          userId: wishlist.user.id,
          type: 'price_drop',
          channel: 'EMAIL',
          title: 'Price Drop Alert!',
          body: `The price of ${wishlist.variant.product.name} has dropped to ₹${wishlist.variant.salePrice?.toString() ?? 'N/A'}. Check it out now!`,
          status: 'PENDING',
        },
      });

      await this.notificationsQueue.add('send-notification', {
        notificationId: notification.id,
      });
    }
  }

  /**
   * Daily at 8AM — Rentals due to be returned within 24 hours
   * Sends a reminder to the customer.
   */
  @Cron('0 8 * * *')
  async handleRentalReturnDue(): Promise<void> {
    this.logger.log('Running rental return due check...');

    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const dueRentals = await this.prisma.rentalBooking.findMany({
      where: {
        status: { in: ['BOOKED', 'IN_USE'] },
        dueReturnAt: { gte: now, lte: in24Hours },
      },
      include: {
        orderItem: {
          include: {
            order: {
              include: {
                user: { select: { id: true, email: true, phone: true } },
              },
            },
          },
        },
      },
    });

    this.logger.log(`Found ${dueRentals.length} rentals due within 24 hours`);

    for (const rental of dueRentals) {
      const user = rental.orderItem.order.user;

      if (!user) {
        this.logger.warn(`Skipping due reminder for rental ${rental.id}: no user`);
        continue;
      }

      const notification = await this.prisma.notification.create({
        data: {
          userId: user.id,
          type: 'rental_due',
          channel: 'EMAIL',
          title: 'Rental Return Reminder',
          body: `Your rental is due for return by ${rental.dueReturnAt.toLocaleDateString()}. Please return it on time to avoid late fees.`,
          status: 'PENDING',
        },
      });

      await this.notificationsQueue.add('send-notification', {
        notificationId: notification.id,
      });
    }
  }

  /**
   * Every 4 hours — Past-due rentals
   * Marks overdue rentals as LATE_RETURN and notifies the customer.
   */
  @Cron('0 */4 * * *')
  async handleOverdueRentals(): Promise<void> {
    this.logger.log('Running overdue rental check...');

    const now = new Date();

    const overdueRentals = await this.prisma.rentalBooking.findMany({
      where: {
        status: { in: ['BOOKED', 'IN_USE'] },
        dueReturnAt: { lt: now },
      },
      include: {
        orderItem: {
          include: {
            order: {
              include: {
                user: { select: { id: true, email: true } },
              },
            },
          },
        },
      },
    });

    this.logger.log(`Found ${overdueRentals.length} overdue rentals`);

    for (const rental of overdueRentals) {
      // Update status to LATE_RETURN
      await this.prisma.rentalBooking.update({
        where: { id: rental.id },
        data: { status: 'LATE_RETURN' },
      });

      const user = rental.orderItem.order.user;

      if (!user) {
        this.logger.warn(`Skipping overdue reminder for rental ${rental.id}: no user`);
        continue;
      }

      const notification = await this.prisma.notification.create({
        data: {
          userId: user.id,
          type: 'rental_overdue',
          channel: 'EMAIL',
          title: 'Rental Overdue!',
          body: `Your rental was due on ${rental.dueReturnAt.toLocaleDateString()}. Please return it immediately to avoid additional late fees.`,
          status: 'PENDING',
        },
      });

      await this.notificationsQueue.add('send-notification', {
        notificationId: notification.id,
      });
    }
  }

  /**
   * Weekly on Sunday at 10AM — Completed orders older than 3 months
   * Suggests repeat purchase to the customer.
   */
  @Cron('0 10 * * 0')
  async handleRepeatPurchase(): Promise<void> {
    this.logger.log('Running repeat purchase suggestion check...');

    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const oldOrders = await this.prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        deliveredAt: { lte: threeMonthsAgo },
      },
      include: {
        user: { select: { id: true, email: true } },
        items: {
          take: 3,
          include: {
            product: { select: { name: true, slug: true } },
          },
        },
      },
    });

    this.logger.log(`Found ${oldOrders.length} orders for repeat purchase suggestions`);

    for (const order of oldOrders) {
      const productNames = order.items.map((item) => item.product.name).join(', ');

      if (!order.user) {
        this.logger.warn(`Skipping repurchase reminder for order ${order.id}: no user`);
        continue;
      }

      const notification = await this.prisma.notification.create({
        data: {
          userId: order.user.id,
          type: 'repeat_purchase',
          channel: 'EMAIL',
          title: 'Time to Restock?',
          body: `It's been a while since you ordered ${productNames}. Check out our latest collection!`,
          status: 'PENDING',
        },
      });

      await this.notificationsQueue.add('send-notification', {
        notificationId: notification.id,
      });
    }
  }

  /**
   * Daily at 2AM — Removes expired guest sessions and cascades their
   * cart/wishlist items.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupExpiredGuestSessions(): Promise<{
    sessions: number;
    cartItems: number;
    wishlistItems: number;
  }> {
    this.logger.log('Running expired guest session cleanup...');
    return this.guestSessionService.cleanupExpired(new Date());
  }
}
