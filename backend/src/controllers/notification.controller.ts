import { Request, Response } from 'express';
import { services } from '../config/services';
import { sendSuccess, sendError } from '../utils/response.utils';
import { HTTP_STATUS } from '../config/constants';

export class NotificationController {
  /**
   * Get user notifications
   */
  static async getUserNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userIdStr = req.params['userId'];
      const limitStr = req.query['limit'] as string | undefined;
      
      const userId = userIdStr ? parseInt(userIdStr) : NaN;
      const limit = limitStr ? parseInt(limitStr) : 20;

      if (isNaN(userId)) {
        sendError(res, 'Invalid user ID', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const notifications = await services.notificationService.getUserNotifications(userId, limit);
      sendSuccess(res, notifications);
    } catch (error) {
      console.error('Get user notifications error:', error);
      sendError(res, 'Failed to get notifications');
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const notificationIdStr = req.params['notificationId'];
      const notificationId = notificationIdStr ? parseInt(notificationIdStr) : NaN;

      if (isNaN(notificationId)) {
        sendError(res, 'Invalid notification ID', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      await services.notificationService.markAsRead(notificationId);
      sendSuccess(res, { message: 'Notification marked as read' });
    } catch (error) {
      console.error('Mark notification as read error:', error);
      sendError(res, 'Failed to mark notification as read');
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userIdStr = req.params['userId'];
      const userId = userIdStr ? parseInt(userIdStr) : NaN;

      if (isNaN(userId)) {
        sendError(res, 'Invalid user ID', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      await services.notificationService.markAllAsRead(userId);
      sendSuccess(res, { message: 'All notifications marked as read' });
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      sendError(res, 'Failed to mark all notifications as read');
    }
  }

  /**
   * Register push token for a user
   */
  static async registerPushToken(req: Request, res: Response): Promise<void> {
    try {
      const userIdStr = req.params['userId'];
      const userId = userIdStr ? parseInt(userIdStr) : NaN;
      const { pushToken } = req.body;

      if (isNaN(userId)) {
        sendError(res, 'Invalid user ID', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      if (!pushToken || typeof pushToken !== 'string') {
        sendError(res, 'Push token is required', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      await services.notificationService.registerPushToken(userId, pushToken);
      sendSuccess(res, { message: 'Push token registered successfully' });
    } catch (error) {
      console.error('Register push token error:', error);
      if (error instanceof Error && error.message.includes('Invalid Expo push token')) {
        sendError(res, 'Invalid push token format', HTTP_STATUS.BAD_REQUEST);
      } else {
        sendError(res, 'Failed to register push token');
      }
    }
  }

  /**
   * Remove push token for a user
   */
  static async removePushToken(req: Request, res: Response): Promise<void> {
    try {
      const userIdStr = req.params['userId'];
      const userId = userIdStr ? parseInt(userIdStr) : NaN;

      if (isNaN(userId)) {
        sendError(res, 'Invalid user ID', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      await services.notificationService.removePushToken(userId);
      sendSuccess(res, { message: 'Push token removed successfully' });
    } catch (error) {
      console.error('Remove push token error:', error);
      sendError(res, 'Failed to remove push token');
    }
  }

  /**
   * Send promotional notification (Admin only)
   */
  static async sendPromotionalNotification(req: Request, res: Response): Promise<void> {
    try {
      const { userIds, title, message, metadata } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        sendError(res, 'User IDs array is required', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      if (!title || !message) {
        sendError(res, 'Title and message are required', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      await services.notificationService.sendPromotionalNotification(userIds, title, message, metadata);
      sendSuccess(res, { 
        message: `Promotional notification sent to ${userIds.length} users` 
      });
    } catch (error) {
      console.error('Send promotional notification error:', error);
      sendError(res, 'Failed to send promotional notification');
    }
  }

  /**
   * Test notification (Development only)
   */
  static async testNotification(req: Request, res: Response): Promise<void> {
    try {
      if (process.env['NODE_ENV'] === 'production') {
        sendError(res, 'Not found', HTTP_STATUS.NOT_FOUND);
        return;
      }

      const { userId, type, title, message } = req.body;

      if (!userId || !type || !title || !message) {
        sendError(res, 'userId, type, title, and message are required', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      await services.notificationService.sendNotification({
        userId,
        type,
        title,
        message,
        emailTemplate: 'order-ready',
        metadata: { orderId: 123, total: 15.50 },
        pushData: {
          sound: 'default',
          badge: 1,
          data: { test: true }
        }
      });

      sendSuccess(res, { message: 'Test notification sent' });
    } catch (error) {
      console.error('Test notification error:', error);
      sendError(res, 'Failed to send test notification');
    }
  }
} 