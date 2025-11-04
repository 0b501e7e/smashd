import { Router } from 'express';
import { DriverController } from '../controllers/driver.controller';
import { services } from '../config/services';
import { authenticateToken, isDriver } from '../middleware';

const router = Router();

// Use centralized service container (single DB connection, shared services)
const driverController = new DriverController(services.driverService);

// All driver routes require authentication and driver role
router.use(authenticateToken, isDriver);

/**
 * @route   GET /v1/driver/orders
 * @desc    Get list of ready delivery orders
 * @access  Driver
 */
router.get('/orders', driverController.getOrders.bind(driverController));

/**
 * @route   GET /v1/driver/orders/active
 * @desc    Get driver's active delivery orders (OUT_FOR_DELIVERY)
 * @access  Driver
 */
router.get('/orders/active', driverController.getActiveOrders.bind(driverController));

/**
 * @route   GET /v1/driver/orders/:orderId
 * @desc    Get order details with delivery address
 * @access  Driver
 */
router.get('/orders/:orderId', driverController.getOrderDetails.bind(driverController));

/**
 * @route   POST /v1/driver/orders/:orderId/accept
 * @desc    Accept an order for delivery
 * @access  Driver
 */
router.post('/orders/:orderId/accept', driverController.acceptOrder.bind(driverController));

/**
 * @route   POST /v1/driver/orders/:orderId/delivered
 * @desc    Mark order as delivered
 * @access  Driver
 */
router.post('/orders/:orderId/delivered', driverController.markDelivered.bind(driverController));

export default router;

