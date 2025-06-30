import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Get user notifications
router.get('/users/:userId/notifications', authenticateToken, NotificationController.getUserNotifications);

// Mark notification as read
router.patch('/notifications/:notificationId/read', authenticateToken, NotificationController.markAsRead);

// Register push token
router.post('/users/:userId/push-token', authenticateToken, NotificationController.registerPushToken);

// Test notification (development only)
router.post('/test', NotificationController.testNotification);

export default router; 