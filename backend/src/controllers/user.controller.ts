import { Response } from 'express';
import { HTTP_STATUS } from '../config/constants';
import { AuthenticatedRequest } from '../types/common.types';
import { IUserService } from '../interfaces/IUserService';
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
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          error: 'User not authenticated'
        });
        return;
      }

      const query: UserProfileQuery = {
        userId: req.user.userId,
        includeLoyalty: true
      };

      const profileData = await this.userService.getUserProfile(query);

      res.json(profileData);

    } catch (error) {
      console.error('Error fetching user profile:', error);

      if (error instanceof Error && error.message === 'User not found') {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          error: error.message
        });
        return;
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Error fetching user profile'
      });
    }
  }

  /**
   * Get user's order history
   * GET /v1/users/:userId/orders
   */
  async getUserOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { userId } = req.params;

    if (!userId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'User ID is required'
      });
      return;
    }

    if (!req.user?.userId) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: 'User not authenticated'
      });
      return;
    }

    try {
      const query: UserOrdersQuery = {
        userId: parseInt(userId),
        requestingUserId: req.user.userId,
        requestingUserRole: req.user.role,
        includeItems: true
      };

      const orders = await this.userService.getUserOrders(query);
      res.json(orders);

    } catch (error) {
      console.error('Error fetching user orders:', error);

      if (error instanceof Error && error.message.includes('Not authorized')) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          error: error.message
        });
        return;
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Error fetching user orders'
      });
    }
  }

  /**
   * Get user's last order for repeat functionality
   * GET /v1/users/:userId/last-order
   */
  async getUserLastOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { userId } = req.params;

    if (!userId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'User ID is required'
      });
      return;
    }

    if (!req.user?.userId) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: 'User not authenticated'
      });
      return;
    }

    try {
      const query: LastOrderQuery = {
        userId: parseInt(userId),
        requestingUserId: req.user.userId,
        requestingUserRole: req.user.role,
        includeItems: true
      };

      const lastOrder = await this.userService.getUserLastOrder(query);

      if (!lastOrder) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'No previous orders found'
        });
        return;
      }

      res.json(lastOrder);

    } catch (error) {
      console.error('Error fetching last order:', error);

      if (error instanceof Error && error.message.includes('Not authorized')) {
        res.status(HTTP_STATUS.FORBIDDEN).json({
          error: error.message
        });
        return;
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Error fetching last order'
      });
    }
  }

  /**
   * Repeat user's last order (prepare items for cart)
   * GET /v1/orders/:orderId/repeat
   */
  async repeatOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { orderId } = req.params;

    if (!orderId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Order ID is required'
      });
      return;
    }

    if (!req.user?.userId) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: 'User not authenticated'
      });
      return;
    }

    try {
      const orderIdInt = parseInt(orderId);
      if (isNaN(orderIdInt)) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: 'Invalid order ID'
        });
        return;
      }

      const query: RepeatOrderQuery = {
        orderId: orderIdInt,
        requestingUserId: req.user.userId,
        requestingUserRole: req.user.role
      };

      const result = await this.userService.repeatOrder(query);
      res.json(result);

    } catch (error) {
      console.error('Error repeating order:', error);

      if (error instanceof Error) {
        if (error.message === 'Order not found' || error.message === 'Pedido no encontrado') {
          res.status(HTTP_STATUS.NOT_FOUND).json({
            error: error.message
          });
          return;
        }

        if (error.message.includes('Not authorized')) {
          res.status(HTTP_STATUS.FORBIDDEN).json({
            error: error.message
          });
          return;
        }
      }

      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Error repeating order'
      });
    }
  }
} 