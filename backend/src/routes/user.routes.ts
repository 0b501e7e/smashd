import { Router } from 'express';
import { userController } from '../controllers';
import { authenticateToken, isOwnerOrAdmin } from '../middleware';

const router = Router();

// Protected user routes - require authentication
router.get('/profile', authenticateToken, userController.getUserProfile);
router.get('/:userId/orders', authenticateToken, isOwnerOrAdmin, userController.getUserOrders);
router.get('/:userId/last-order', authenticateToken, isOwnerOrAdmin, userController.getUserLastOrder);

export default router; 