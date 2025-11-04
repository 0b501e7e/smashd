import { Response, NextFunction } from 'express';
import { HTTP_STATUS } from '../config/constants';
import { AuthenticatedRequest } from '../types/common.types';
import { IDriverService } from '../interfaces/IDriverService';
import { sendSuccess, sendError } from '../utils/response.utils';

/**
 * DriverController - Handles HTTP requests/responses for driver operations
 * Business logic is delegated to DriverService
 */
export class DriverController {
  constructor(private driverService: IDriverService) {}

  /**
   * Get list of ready delivery orders
   * GET /v1/driver/orders
   */
  getOrders = async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orders = await this.driverService.getReadyDeliveryOrders();
      sendSuccess(res, orders);
    } catch (error) {
      console.error('DriverController: Error fetching orders:', error);
      next(error);
    }
  };

  /**
   * Get driver's active delivery orders
   * GET /v1/driver/orders/active
   */
  getActiveOrders = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const driverId = req.user?.userId;
      if (!driverId) {
        sendError(res, 'ID de repartidor requerido', HTTP_STATUS.UNAUTHORIZED);
        return;
      }

      const orders = await this.driverService.getMyActiveOrders(driverId);
      sendSuccess(res, orders);
    } catch (error) {
      console.error('DriverController: Error fetching active orders:', error);
      next(error);
    }
  };

  /**
   * Accept an order for delivery
   * POST /v1/driver/orders/:orderId/accept
   */
  acceptOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orderId = parseInt(req.params['orderId'] || '', 10);
      const driverId = req.user?.userId;

      if (isNaN(orderId)) {
        sendError(res, 'ID de pedido inválido', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      if (!driverId) {
        sendError(res, 'ID de repartidor requerido', HTTP_STATUS.UNAUTHORIZED);
        return;
      }

      const order = await this.driverService.acceptOrder(orderId, driverId);
      sendSuccess(res, { order }, 'Pedido aceptado exitosamente');
    } catch (error) {
      console.error('DriverController: Error accepting order:', error);
      if (error instanceof Error) {
        const statusCode = error.message.includes('not found') 
          ? HTTP_STATUS.NOT_FOUND 
          : error.message.includes('not ready') 
          ? HTTP_STATUS.BAD_REQUEST 
          : HTTP_STATUS.INTERNAL_SERVER_ERROR;
        sendError(res, error.message, statusCode);
        return;
      }
      next(error);
    }
  };

  /**
   * Mark order as delivered
   * POST /v1/driver/orders/:orderId/delivered
   */
  markDelivered = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orderId = parseInt(req.params['orderId'] || '', 10);
      const driverId = req.user?.userId;

      if (isNaN(orderId)) {
        sendError(res, 'ID de pedido inválido', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      if (!driverId) {
        sendError(res, 'ID de repartidor requerido', HTTP_STATUS.UNAUTHORIZED);
        return;
      }

      const order = await this.driverService.markDelivered(orderId, driverId);
      sendSuccess(res, { order }, 'Pedido marcado como entregado exitosamente');
    } catch (error) {
      console.error('DriverController: Error marking order as delivered:', error);
      if (error instanceof Error) {
        const statusCode = error.message.includes('not found') 
          ? HTTP_STATUS.NOT_FOUND 
          : error.message.includes('not out for delivery') 
          ? HTTP_STATUS.BAD_REQUEST 
          : HTTP_STATUS.INTERNAL_SERVER_ERROR;
        sendError(res, error.message, statusCode);
        return;
      }
      next(error);
    }
  };

  /**
   * Get order details for driver view
   * GET /v1/driver/orders/:orderId
   */
  getOrderDetails = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orderId = parseInt(req.params['orderId'] || '', 10);

      if (isNaN(orderId)) {
        sendError(res, 'ID de pedido inválido', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const order = await this.driverService.getOrderDetails(orderId);

      if (!order) {
        sendError(res, 'Pedido no encontrado', HTTP_STATUS.NOT_FOUND);
        return;
      }

      sendSuccess(res, order);
    } catch (error) {
      console.error('DriverController: Error fetching order details:', error);
      if (error instanceof Error && error.message.includes('not a delivery order')) {
        sendError(res, error.message, HTTP_STATUS.BAD_REQUEST);
        return;
      }
      next(error);
    }
  };
}

