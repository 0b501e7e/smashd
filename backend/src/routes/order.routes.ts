import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authenticateToken, validateCreateOrder, validateOrderId } from '../middleware';
import { services } from '../config/services';

const router = Router();

// Use centralized service container (single DB connection, shared services)
const orderController = new OrderController(services.orderService);

/**
 * @route   POST /v1/orders
 * @desc    Create a new order
 * @access  Private (registered users)
 */
router.post('/', 
  authenticateToken, 
  validateCreateOrder, 
  orderController.createOrder.bind(orderController)
);

/**
 * @route   GET /v1/orders/:id/status
 * @desc    Get order status for polling
 * @access  Public
 */
router.get('/:id/status', 
  validateOrderId, 
  orderController.getOrderStatus.bind(orderController)
);

/**
 * @route   POST /v1/orders/:id/estimate
 * @desc    Update order estimated preparation time
 * @access  Private (admin/business)
 */
router.post('/:id/estimate', 
  authenticateToken, 
  orderController.updateOrderEstimate.bind(orderController)
);

/**
 * @route   POST /v1/orders/:orderId/verify-payment
 * @desc    Verify payment status with SumUp
 * @access  Private (order owner)
 */
router.post('/:orderId/verify-payment', 
  authenticateToken, 
  orderController.verifyPayment.bind(orderController)
);

// Order repeat functionality available at user routes (/v1/users/orders/:orderId/repeat) - more RESTful approach

export default router; 