import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { HTTP_STATUS } from '../config/constants';
import { AuthenticatedRequest } from '../types/common.types';
import { IOrderService } from '../interfaces/IOrderService';
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
  constructor(private orderService: IOrderService) {}

  /**
   * Create a new order
   * POST /v1/orders
   */
  async createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        errors: errors.array()
      });
      return;
    }

    try {
      const { items, total } = req.body;
      const userId = req.user?.userId;

      const orderData: CreateOrderData = {
        items,
        total,
        ...(userId && { userId })
      };

      const result = await this.orderService.createOrder(orderData);

      console.log(`OrderController: Received order from service:`, result.order.id);

      const response = {
        success: true,
        data: {
          order: result.order,
          message: result.message
        }
      };

      console.log(`OrderController: Sending response with order ID:`, response.data.order.id);

      res.status(HTTP_STATUS.CREATED).json(response);

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
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Order ID is required'
      });
      return;
    }

    try {
      const orderId = parseInt(id);
      if (isNaN(orderId)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Invalid order ID'
        });
        return;
      }

      const orderStatus = await this.orderService.getOrderStatus(orderId);

      res.json({
        success: true,
        data: orderStatus
      });

    } catch (error) {
      if (error instanceof Error && error.message === 'Order not found') {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Order not found'
        });
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
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Order ID is required'
      });
      return;
    }
    
    if (!estimatedMinutes || typeof estimatedMinutes !== 'number') {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Valid estimatedMinutes required'
      });
      return;
    }
    
    try {
      const orderId = parseInt(id);
      if (isNaN(orderId)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Invalid order ID'
        });
        return;
      }

      const estimateData: UpdateOrderEstimateData = {
        estimatedMinutes
      };

      const result = await this.orderService.updateOrderEstimate(orderId, estimateData);
      
      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      if (error instanceof Error && error.message === 'Order not found') {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Order not found'
        });
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
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Order ID is required'
      });
      return;
    }

    if (!req.user?.userId) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    try {
      const orderIdInt = parseInt(orderId);
      if (isNaN(orderIdInt)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Invalid order ID'
        });
        return;
      }

      const verificationRequest: PaymentVerificationRequest = {
        orderId: orderIdInt,
        userId: req.user.userId
      };

      const result = await this.orderService.verifyPayment(verificationRequest);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      next(error);
    }
  }
}

// Export OrderController class
// Note: The controller instance will be created in routes with dependency injection 