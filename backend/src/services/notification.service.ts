import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
// Use require for SDKs without types
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Resend } = require('resend');
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { INotificationService, NotificationData } from '../interfaces/INotificationService';

export class NotificationService implements INotificationService {
  private prisma: PrismaClient;
  private emailTransporter!: nodemailer.Transporter;
  private resend?: any;
  private expo!: Expo;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.setupEmailTransporter();
    this.setupExpo();
    this.setupResend();
  }

  private setupEmailTransporter(): void {
    this.emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env['EMAIL_USER'],
        pass: process.env['EMAIL_APP_PASSWORD'],
      },
    });
  }

  private setupResend(): void {
    const key = process.env['RESEND_API_KEY'];
    if (key) {
      this.resend = new Resend(key);
      console.log('✅ Resend email provider configured');
    } else {
      console.log('ℹ️  RESEND_API_KEY not set - falling back to Nodemailer');
    }
  }

  private setupExpo(): void {
    const accessToken = process.env['EXPO_ACCESS_TOKEN'];
    if (accessToken) {
      this.expo = new Expo({
        accessToken,
        useFcmV1: true,
      });
    } else {
      console.warn('EXPO_ACCESS_TOKEN not configured - push notifications will not work');
      // Create a mock expo instance that won't crash
      this.expo = new Expo();
    }
  }

  // =====================
  // CORE NOTIFICATION METHODS
  // =====================

  async sendNotification(data: NotificationData): Promise<void> {
    try {
      // 1. Save notification to database
      await this.prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          metadata: data.metadata || {},
          sentAt: new Date(),
        },
      });

      // 2. Get user details including push token
      const user = await this.prisma.user.findUnique({
        where: { id: data.userId }
      });

      if (!user) {
        throw new Error(`User ${data.userId} not found`);
      }

      // 3. Send email if template specified
      if (data.emailTemplate && user.email) {
        try {
          const emailHtml = this.generateEmailTemplate(data.emailTemplate, {
            ...data.metadata,
            userName: user.name,
            userEmail: user.email
          });
          await this.sendEmail(user.email, data.title, emailHtml);
        } catch (emailError) {
          console.error(`❌ Failed to send email to ${user.email}:`, emailError);
        }
      }

      // 4. Send push notification if user has push token
      if (user.pushToken && data.pushData) {
        try {
          // Log notification details for debugging
          console.log(`📱 Sending push notification to user ${data.userId} (${user.email || 'no email'}), pushToken: ${user.pushToken.substring(0, 20)}...`);

          await this.sendPushNotification(
            user.pushToken,
            data.pushData.title || data.title,
            data.pushData.body || data.message,
            data.pushData.data
          );

          console.log(`✅ Push notification sent successfully to user ${data.userId}`);
        } catch (pushError) {
          console.error(`❌ Failed to send push notification to user ${data.userId}:`, pushError);
        }
      } else {
        if (!user.pushToken) {
          console.log(`⚠️ User ${data.userId} has no push token registered, skipping push notification`);
        }
        if (!data.pushData) {
          console.log(`⚠️ No pushData provided for notification to user ${data.userId}, skipping push notification`);
        }
      }

      console.log(`✅ Notification sent to user ${data.userId} (${user.email || 'no email'}): ${data.type}`);
    } catch (error) {
      console.error(`❌ Failed to send notification:`, error);
      throw error;
    }
  }

  // =====================
  // SPECIFIC NOTIFICATION TYPES
  // =====================

  async sendOrderStatusUpdate(orderId: number, status: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, items: { include: { menuItem: true } } }
    });

    if (!order || !order.userId) {
      console.log(`Order ${orderId} has no associated user, skipping notification`);
      return;
    }

    const statusMessages = {
      'PAYMENT_CONFIRMED': {
        title: '✅ ¡Pago Confirmado!',
        message: `El pago de tu pedido #${orderId} ha sido confirmado. ¡Empezaremos a prepararlo pronto!`,
        template: 'payment-confirmed',
        sound: 'default'
      },
      'CONFIRMED': {
        title: '👨‍🍳 ¡Pedido Confirmado!',
        message: `Tu pedido #${orderId} se está preparando. ${order.estimatedReadyTime ? `Listo a las ${new Date(order.estimatedReadyTime).toLocaleTimeString('es-ES')}` : '¡Te notificaremos cuando esté listo!'}`,
        template: 'order-confirmed',
        sound: 'default'
      },
      'READY': {
        title: order.fulfillmentMethod === 'DELIVERY'
          ? '🍔 ¡Pedido Listo para Entrega!'
          : '🍔 ¡Pedido Listo!',
        message: order.fulfillmentMethod === 'DELIVERY'
          ? `¡Tu pedido #${orderId} está listo! Un repartidor lo recogerá pronto.`
          : `¡Tu pedido #${orderId} está listo para recoger!`,
        template: 'order-ready',
        sound: 'notification'
      }
    };

    const statusData = statusMessages[status as keyof typeof statusMessages];
    if (statusData) {
      await this.sendNotification({
        userId: order.userId,
        type: 'ORDER_UPDATE',
        title: statusData.title,
        message: statusData.message,
        emailTemplate: statusData.template,
        metadata: {
          orderId,
          status,
          total: order.total,
          estimatedReadyTime: order.estimatedReadyTime
        },
        pushData: {
          sound: statusData.sound,
          badge: 1,
          data: { orderId, status, type: 'order_update' }
        }
      });
    }
  }

  async sendNewOrderAlert(order: any): Promise<void> {
    // Get all admin and staff users
    const adminUsers = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'STAFF'] } }
    });

    const customerName = order.user?.name || 'Guest Customer';

    for (const admin of adminUsers) {
      await this.sendNotification({
        userId: admin.id,
        type: 'ADMIN_ALERT',
        title: '🔔 ¡Nuevo Pedido Recibido!',
        message: `Pedido #${order.id} de ${customerName} por €${order.total.toFixed(2)}`,
        emailTemplate: 'new-order-admin',
        metadata: {
          orderId: order.id,
          total: order.total,
          customerName,
          itemCount: order.items?.length || 0
        },
        pushData: {
          sound: 'notification',
          badge: 1,
          data: { orderId: order.id, type: 'new_order', total: order.total }
        }
      });
    }
  }

  async sendPromotionalNotification(userIds: number[], title: string, message: string, metadata?: any): Promise<void> {
    const notifications = userIds.map(userId => this.sendNotification({
      userId,
      type: 'PROMOTIONAL',
      title,
      message,
      emailTemplate: 'promotional',
      metadata: metadata || {},
      pushData: {
        sound: 'default',
        data: { type: 'promotional', ...metadata }
      }
    }));

    await Promise.allSettled(notifications);
    console.log(`📢 Promotional notification sent to ${userIds.length} users`);
  }

  // =====================
  // USER NOTIFICATION MANAGEMENT
  // =====================

  async getUserNotifications(userId: number, limit: number = 20): Promise<any[]> {
    return await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  async markAsRead(notificationId: number): Promise<void> {
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });
  }

  async markAllAsRead(userId: number): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
  }

  // =====================
  // PUSH TOKEN MANAGEMENT
  // =====================

  async registerPushToken(userId: number, pushToken: string): Promise<void> {
    if (!Expo.isExpoPushToken(pushToken)) {
      throw new Error('Invalid Expo push token');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { pushToken }
    });

    console.log(`📱 Push token registered for user ${userId}`);
  }

  async removePushToken(userId: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { pushToken: null }
    });

    console.log(`📱 Push token removed for user ${userId}`);
  }

  // =====================
  // EMAIL METHODS
  // =====================

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      if (!process.env['EMAIL_FROM'] && this.resend) {
        console.warn('EMAIL_FROM not set. Using default fallback no-reply@smashd.app');
      }
      if (this.resend) {
        const { data, error } = await this.resend.emails.send({
          from: process.env['EMAIL_FROM'] || 'Smashd <no-reply@smashd.app>',
          to,
          subject,
          html,
        });
        if (error) {
          console.error('❌ Resend error:', error);
          throw new Error(typeof error === 'string' ? error : (error.message || 'Resend send failed'));
        }
        console.log('📧 Resend accepted. Message ID:', data?.id);
      } else {
        await this.emailTransporter.sendMail({
          from: `"Smashd Restaurant" <${process.env['EMAIL_USER']}>`,
          to,
          subject,
          html,
        });
      }

      console.log(`📧 Email sent to ${to}: ${subject}`);
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  generateEmailTemplate(template: string, data: any): string {
    const templates = {
      'payment-confirmed': `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #f59e0b;">Payment Confirmed! 🎉</h2>
          <p>Hi ${data.userName},</p>
          <p>Thank you! Your payment for order #${data.orderId} has been confirmed.</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>Order Details:</strong><br>
            Order #: ${data.orderId}<br>
            Total: €${data.total}<br>
          </div>
          <p>We'll start preparing your order now and notify you when it's ready!</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            Smashd Restaurant<br>
            Thanks for choosing us!
          </p>
        </div>
      `,
      'order-confirmed': `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #f59e0b;">Order Confirmed! 👨‍🍳</h2>
          <p>Hi ${data.userName},</p>
          <p>Your order #${data.orderId} is now being prepared by our kitchen team.</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>Order Details:</strong><br>
            Order #: ${data.orderId}<br>
            Total: €${data.total}<br>
            ${data.estimatedReadyTime ? `Estimated Ready Time: ${new Date(data.estimatedReadyTime).toLocaleTimeString()}<br>` : ''}
          </div>
          <p>We'll notify you as soon as your order is ready for pickup!</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            Smashd Restaurant<br>
            Thanks for your patience!
          </p>
        </div>
      `,
      'order-ready': `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #f59e0b;">Order Ready! 🍔</h2>
          <p>Hi ${data.userName},</p>
          <p><strong>Great news!</strong> Your order #${data.orderId} is ready for pickup!</p>
          <div style="background: #dcfce7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
            <strong>Ready for Pickup Now</strong><br>
            Order #: ${data.orderId}<br>
            Total: €${data.total}<br>
          </div>
          <p>Come collect it when you're ready. See you soon!</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            Smashd Restaurant<br>
            Enjoy your meal!
          </p>
        </div>
      `,
      'new-order-admin': `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc2626;">New Order Alert! 🔔</h2>
          <p>A new order has been received and needs your attention.</p>
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <strong>Order Details:</strong><br>
            Order #: ${data.orderId}<br>
            Customer: ${data.customerName}<br>
            Total: €${data.total}<br>
            Items: ${data.itemCount} item(s)<br>
          </div>
          <p>Please check your admin panel to accept or decline this order.</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            Smashd Restaurant Admin System
          </p>
        </div>
      `,
      'promotional': `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #f59e0b;">${data.title || 'Special Offer!'}</h2>
          <p>Hi ${data.userName},</p>
          <p>${data.message || 'We have a special offer just for you!'}</p>
          ${data.promoCode ? `
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <strong>Promo Code: ${data.promoCode}</strong>
            </div>
          ` : ''}
          <p>Don't miss out - visit us soon!</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            Smashd Restaurant<br>
            Unsubscribe anytime in your account settings.
          </p>
        </div>
      `
      ,
      'password-reset': `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #f59e0b;">Restablecer tu contraseña</h2>
          <p>Hola ${data.userName},</p>
          <p>Recibimos una solicitud para restablecer tu contraseña. Si fuiste tú, haz clic en el botón:</p>
          <p style="margin: 24px 0; text-align: center;">
            <a href="${data.resetUrl}" style="background: #f59e0b; color: #000; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              Restablecer contraseña en la app
            </a>
          </p>
          ${data.webResetUrl ? `<p style="text-align:center;"><a href="${data.webResetUrl}">Abrir en el navegador</a></p>` : ""}
          <p style="color: #6b7280; font-size: 12px;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
        </div>
      `
    };

    return templates[template as keyof typeof templates] || `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>${data.title}</h2>
        <p>${data.message}</p>
      </div>
    `;
  }

  // =====================
  // PUSH NOTIFICATION METHODS
  // =====================

  async sendPushNotification(pushToken: string, title: string, message: string, data?: any): Promise<void> {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Invalid push token: ${pushToken}`);
      return;
    }

    const pushMessage: ExpoPushMessage = {
      to: pushToken,
      sound: 'default',
      title,
      body: message,
      data: data || {},
    };

    try {
      const tickets = await this.expo.sendPushNotificationsAsync([pushMessage]);
      console.log(`📱 Push notification sent: ${title}`);

      // Handle any errors in the tickets
      tickets.forEach((ticket) => {
        if (ticket.status === 'error') {
          console.error(`Push notification error:`, ticket.message);
        }
      });
    } catch (error) {
      console.error(`❌ Failed to send push notification:`, error);
      throw error;
    }
  }

  async sendBulkPushNotifications(pushTokens: string[], title: string, message: string, data?: any): Promise<void> {
    const validTokens = pushTokens.filter(token => Expo.isExpoPushToken(token));

    if (validTokens.length === 0) {
      console.log('No valid push tokens found');
      return;
    }

    const messages: ExpoPushMessage[] = validTokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body: message,
      data: data || {},
    }));

    try {
      // Send in chunks (Expo recommends max 100 at a time)
      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets: ExpoPushTicket[] = [];

      for (const chunk of chunks) {
        const chunkTickets = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...chunkTickets);
      }

      console.log(`📱 Bulk push notifications sent to ${validTokens.length} devices: ${title}`);

      // Handle any errors
      tickets.forEach((ticket, ticketIndex) => {
        if (ticket.status === 'error') {
          console.error(`Push notification error for token ${validTokens[ticketIndex]}:`, ticket.message);
        }
      });
    } catch (error) {
      console.error(`❌ Failed to send bulk push notifications:`, error);
      throw error;
    }
  }
} 