export interface NotificationData {
  userId: number;
  type: 'ORDER_UPDATE' | 'PAYMENT_CONFIRMED' | 'ORDER_READY' | 'BIRTHDAY_REWARD' | 'ADMIN_ALERT' | 'PROMOTIONAL';
  title: string;
  message: string;
  metadata?: any;
  emailTemplate?: string;
  pushData?: {
    sound?: string;
    badge?: number;
    data?: any;
  };
}

export interface EmailTemplate {
  subject: string;
  html: string;
}

export interface INotificationService {
  // Core notification methods
  sendNotification(data: NotificationData): Promise<void>;
  
  // Specific notification types
  sendOrderStatusUpdate(orderId: number, status: string): Promise<void>;
  sendNewOrderAlert(order: any): Promise<void>;
  sendPromotionalNotification(userIds: number[], title: string, message: string, metadata?: any): Promise<void>;
  
  // User notification management
  getUserNotifications(userId: number, limit?: number): Promise<any[]>;
  markAsRead(notificationId: number): Promise<void>;
  markAllAsRead(userId: number): Promise<void>;
  
  // Push token management
  registerPushToken(userId: number, pushToken: string): Promise<void>;
  removePushToken(userId: number): Promise<void>;
  
  // Email methods
  sendEmail(to: string, subject: string, html: string): Promise<void>;
  generateEmailTemplate(template: string, data: any): string;
  
  // Push notification methods  
  sendPushNotification(pushToken: string, title: string, message: string, data?: any): Promise<void>;
  sendBulkPushNotifications(pushTokens: string[], title: string, message: string, data?: any): Promise<void>;
} 