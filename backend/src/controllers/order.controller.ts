import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { HTTP_STATUS } from '../config/constants';
import { AuthenticatedRequest } from '../types/common.types';
import { IOrderService } from '../interfaces/IOrderService';
import { sendSuccess, sendError, sendValidationError } from '../utils/response.utils';
import {
  CreateOrderData,
  UpdateOrderEstimateData,
  PaymentVerificationRequest
} from '../types/order.types';

/**
 * OrderController - Handles HTTP requests/responses for order operations
 * Business logic is delegated to OrderService
 */
export class OrderController {
  constructor(private orderService: IOrderService) { }

  /**
   * Create a new order
   * POST /v1/orders
   */
  async createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      sendValidationError(res, errors.array() as any);
      return;
    }

    try {
      const { items, total, fulfillmentMethod, deliveryAddress } = req.body;
      const userId = req.user?.userId;

      console.log(`OrderController: Received order creation request - fulfillmentMethod: ${fulfillmentMethod}, deliveryAddress: ${deliveryAddress ? 'present' : 'missing'}`);

      const orderData: CreateOrderData = {
        items,
        total,
        ...(userId && { userId }),
        ...(fulfillmentMethod && { fulfillmentMethod }),
        ...(deliveryAddress && { deliveryAddress })
      };

      const result = await this.orderService.createOrder(orderData);

      console.log(`OrderController: Received order from service:`, result.order.id);

      sendSuccess(res, {
        order: result.order,
        message: result.message
      }, 'Order created successfully', HTTP_STATUS.CREATED);

    } catch (error) {
      next(error);
    }
  }

  /**
   * Get order status (for mobile app polling)
   * GET /v1/orders/:id/status
   */
  async getOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;

    if (!id) {
      sendError(res, 'Order ID is required', HTTP_STATUS.BAD_REQUEST);
      return;
    }

    try {
      const orderId = parseInt(id);
      if (isNaN(orderId)) {
        sendError(res, 'Invalid order ID', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const orderStatus = await this.orderService.getOrderStatus(orderId);

      sendSuccess(res, orderStatus);

    } catch (error) {
      if (error instanceof Error && error.message === 'Order not found') {
        sendError(res, 'Order not found', HTTP_STATUS.NOT_FOUND);
        return;
      }
      next(error);
    }
  }

  /**
   * Update order estimated time (for business use)
   * POST /v1/orders/:id/estimate
   */
  async updateOrderEstimate(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    const { estimatedMinutes } = req.body;

    if (!id) {
      sendError(res, 'Order ID is required', HTTP_STATUS.BAD_REQUEST);
      return;
    }

    if (!estimatedMinutes || typeof estimatedMinutes !== 'number') {
      sendError(res, 'Valid estimated time is required (estimatedMinutes)', HTTP_STATUS.BAD_REQUEST);
      return;
    }

    try {
      const orderId = parseInt(id);
      if (isNaN(orderId)) {
        sendError(res, 'Invalid order ID', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const estimateData: UpdateOrderEstimateData = {
        estimatedMinutes
      };

      const result = await this.orderService.updateOrderEstimate(orderId, estimateData);

      sendSuccess(res, result);

    } catch (error) {
      if (error instanceof Error && error.message === 'Order not found') {
        sendError(res, 'Order not found', HTTP_STATUS.NOT_FOUND);
        return;
      }
      next(error);
    }
  }

  /**
   * Verify payment status with SumUp and update order
   * POST /v1/orders/:orderId/verify-payment
   */
  async verifyPayment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const { orderId } = req.params;

    if (!orderId) {
      sendError(res, 'Order ID is required', HTTP_STATUS.BAD_REQUEST);
      return;
    }

    try {
      const orderIdInt = parseInt(orderId);
      if (isNaN(orderIdInt)) {
        sendError(res, 'Invalid order ID', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const verificationRequest: PaymentVerificationRequest = { orderId: orderIdInt };

      const result = await this.orderService.verifyPayment(verificationRequest);

      sendSuccess(res, result);

    } catch (error) {
      next(error);
    }
  }
}

// Export OrderController class
// Note: The controller instance will be created in routes with dependency injection 