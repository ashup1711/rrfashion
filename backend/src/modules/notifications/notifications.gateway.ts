import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

export interface SaleAlertData {
  title: string;
  body: string;
  type: string;
}

@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: '*', credentials: true },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer() server!: Server;

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string | undefined;
    if (userId) {
      client.join(`user-${userId}`);
      this.logger.log(`Socket connected: user-${userId} (client: ${client.id})`);
    } else {
      this.logger.log(`Socket connected without userId (client: ${client.id})`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  sendSaleAlert(userId: string, data: SaleAlertData) {
    this.server.to(`user-${userId}`).emit('sale_alert', data);
  }

  sendOrderUpdate(userId: string, data: { orderId: string; status: string; message: string }) {
    this.server.to(`user-${userId}`).emit('order_update', data);
  }
}
