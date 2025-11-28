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
  constructor(private orderService: IOrderService) { }

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
        error: 'ID de pedido requerido'
      });
      return;
    }

    try {
      const orderId = parseInt(id);
      if (isNaN(orderId)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'ID de pedido inválido'
        });
        return;
      }

      const orderStatus = await this.orderService.getOrderStatus(orderId);

      res.json({
        success: true,
        data: orderStatus
      });

    } catch (error) {
      if (error instanceof Error && error.message === 'Pedido no encontrado') {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Pedido no encontrado'
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
        error: 'ID de pedido requerido'
      });
      return;
    }

    if (!estimatedMinutes || typeof estimatedMinutes !== 'number') {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Se requiere un tiempo estimado válido (estimatedMinutes)'
      });
      return;
    }

    try {
      const orderId = parseInt(id);
      if (isNaN(orderId)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'ID de pedido inválido'
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
      if (error instanceof Error && error.message === 'Pedido no encontrado') {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Pedido no encontrado'
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
        error: 'ID de pedido requerido'
      });
      return;
    }

    try {
      const orderIdInt = parseInt(orderId);
      if (isNaN(orderIdInt)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'ID de pedido inválido'
        });
        return;
      }

      const verificationRequest: PaymentVerificationRequest = { orderId: orderIdInt };

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