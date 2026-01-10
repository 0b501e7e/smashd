import { Response } from 'express';
import { HTTP_STATUS } from '../config/constants';
import { AuthenticatedRequest } from '../types/common.types';
import { IUserService } from '../interfaces/IUserService';
import { sendSuccess, sendError } from '../utils/response.utils';
import {
  UserProfileQuery,
  UserOrdersQuery,
  LastOrderQuery,
  RepeatOrderQuery
} from '../types/user.types';

/**
 * User Controller - Thin HTTP handler that delegates to UserService
 */
export class UserController {
  constructor(private userService: IUserService) { }

  /**
   * Get user profile with loyalty points
   * GET /v1/users/profile
   */
  async getUserProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        sendError(res, 'User not authenticated', HTTP_STATUS.UNAUTHORIZED);
        return;
      }

      const query: UserProfileQuery = {
        userId: req.user.userId,
        includeLoyalty: true
      };

      const profileData = await this.userService.getUserProfile(query);
      sendSuccess(res, profileData);
    } catch (error) {
      console.error('Error fetching user profile:', error);

      if (error instanceof Error && error.message === 'User not found') {
        sendError(res, error.message, HTTP_STATUS.NOT_FOUND);
        return;
      }

      sendError(res, 'Error fetching user profile', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get user's order history
   * GET /v1/users/:userId/orders
   */
  async getUserOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { userId } = req.params;

    if (!userId) {
      sendError(res, 'User ID is required', HTTP_STATUS.BAD_REQUEST);
      return;
    }

    if (!req.user?.userId) {
      sendError(res, 'User not authenticated', HTTP_STATUS.UNAUTHORIZED);
      return;
    }

    try {
      const query: UserOrdersQuery = {
        userId: parseInt(userId as string),
        requestingUserId: req.user.userId,
        requestingUserRole: req.user.role,
        includeItems: true
      };

      const orders = await this.userService.getUserOrders(query);
      sendSuccess(res, orders);
    } catch (error) {
      console.error('Error fetching user orders:', error);

      if (error instanceof Error && error.message.includes('Not authorized')) {
        sendError(res, error.message, HTTP_STATUS.FORBIDDEN);
        return;
      }

      sendError(res, 'Error fetching user orders', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get user's last order for repeat functionality
   * GET /v1/users/:userId/last-order
   */
  async getUserLastOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { userId } = req.params;

    if (!userId) {
      sendError(res, 'User ID is required', HTTP_STATUS.BAD_REQUEST);
      return;
    }

    if (!req.user?.userId) {
      sendError(res, 'User not authenticated', HTTP_STATUS.UNAUTHORIZED);
      return;
    }

    try {
      const query: LastOrderQuery = {
        userId: parseInt(userId as string),
        requestingUserId: req.user.userId,
        requestingUserRole: req.user.role,
        includeItems: true
      };

      const lastOrder = await this.userService.getUserLastOrder(query);

      if (!lastOrder) {
        sendError(res, 'No previous orders found', HTTP_STATUS.NOT_FOUND);
        return;
      }

      sendSuccess(res, lastOrder);
    } catch (error) {
      console.error('Error fetching last order:', error);

      if (error instanceof Error && error.message.includes('Not authorized')) {
        sendError(res, error.message, HTTP_STATUS.FORBIDDEN);
        return;
      }

      sendError(res, 'Error fetching last order', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Repeat user's last order (prepare items for cart)
   * GET /v1/orders/:orderId/repeat
   */
  async repeatOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { orderId } = req.params;

    if (!orderId) {
      sendError(res, 'Order ID is required', HTTP_STATUS.BAD_REQUEST);
      return;
    }

    if (!req.user?.userId) {
      sendError(res, 'User not authenticated', HTTP_STATUS.UNAUTHORIZED);
      return;
    }

    try {
      const orderIdInt = parseInt(orderId as string);
      if (isNaN(orderIdInt)) {
        sendError(res, 'Invalid order ID', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const query: RepeatOrderQuery = {
        orderId: orderIdInt,
        requestingUserId: req.user.userId,
        requestingUserRole: req.user.role
      };

      const result = await this.userService.repeatOrder(query);
      sendSuccess(res, result);
    } catch (error) {
      console.error('Error repeating order:', error);

      if (error instanceof Error) {
        if (error.message === 'Order not found') {
          sendError(res, error.message, HTTP_STATUS.NOT_FOUND);
          return;
        }

        if (error.message.includes('Not authorized')) {
          sendError(res, error.message, HTTP_STATUS.FORBIDDEN);
          return;
        }
      }

      sendError(res, 'Error repeating order', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }
}
