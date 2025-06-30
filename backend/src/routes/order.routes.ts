import { Router } from 'express';
import { orderController, userController } from '../controllers';
import { authenticateToken, validateCreateOrder, validateOrderId } from '../middleware';

const router = Router();

// Order management routes
router.post('/', authenticateToken, validateCreateOrder, orderController.createOrder);
router.get('/:id/status', validateOrderId, orderController.getOrderStatus);
router.post('/:id/estimate', authenticateToken, orderController.updateOrderEstimate);
router.post('/:orderId/verify-payment', authenticateToken, orderController.verifyPayment);

// Order repeat functionality  
router.post('/repeat', authenticateToken, userController.repeatOrder);

export default router; 