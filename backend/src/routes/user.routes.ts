import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticateToken, isOwnerOrAdmin } from '../middleware';
import { services } from '../config/services';

const router = Router();

// Use centralized service container (single DB connection, shared services)
const userController = new UserController(services.userService);

// Protected user routes - require authentication
router.get('/profile', authenticateToken, userController.getUserProfile.bind(userController));
router.get('/:userId/orders', authenticateToken, isOwnerOrAdmin, userController.getUserOrders.bind(userController));
router.get('/:userId/last-order', authenticateToken, isOwnerOrAdmin, userController.getUserLastOrder.bind(userController));

// Order repeat functionality
router.get('/orders/:orderId/repeat', authenticateToken, userController.repeatOrder.bind(userController));

export default router; 