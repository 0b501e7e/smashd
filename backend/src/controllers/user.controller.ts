import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { HTTP_STATUS } from '../config/constants';
import { AuthenticatedRequest } from '../types/common.types';

const prisma = new PrismaClient();

/**
 * Get user profile with loyalty points
 * GET /v1/users/profile
 */
export const getUserProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        error: 'User not authenticated'
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { loyaltyPoints: true }
    });

    if (!user) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'User not found'
      });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      loyaltyPoints: user.loyaltyPoints?.points || 0
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Error fetching user profile'
    });
  }
};

/**
 * Get user's order history
 * GET /v1/users/:userId/orders
 */
export const getUserOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

  // Check if the user is authorized to view these orders
  if (parseInt(userId) !== req.user.userId && req.user.role !== 'ADMIN') {
    res.status(HTTP_STATUS.FORBIDDEN).json({
      error: 'Not authorized to view these orders'
    });
    return;
  }

  try {
    const orders = await prisma.order.findMany({
      where: { userId: parseInt(userId) },
      include: {
        items: {
          include: { menuItem: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(orders);
    return;
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Error fetching user orders'
    });
  }
};

/**
 * Get user's last order for repeat functionality
 * GET /v1/users/:userId/last-order
 */
export const getUserLastOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

  // Check if the user is authorized to view this order
  if (parseInt(userId) !== req.user.userId && req.user.role !== 'ADMIN') {
    res.status(HTTP_STATUS.FORBIDDEN).json({
      error: 'Not authorized to view this order'
    });
    return;
  }

  try {
    const lastOrder = await prisma.order.findFirst({
      where: {
        userId: parseInt(userId),
        status: { in: ['PAYMENT_CONFIRMED', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'] }
      },
      include: {
        items: {
          include: { menuItem: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!lastOrder) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'No previous orders found'
      });
      return;
    }

    res.json(lastOrder);
    return;
  } catch (error) {
    console.error('Error fetching last order:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Error fetching last order'
    });
  }
};

/**
 * Repeat user's last order (prepare items for cart)
 * GET /v1/orders/:orderId/repeat
 */
export const repeatOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    const order = await prisma.order.findUnique({
      where: { id: orderIdInt },
      include: {
        items: {
          include: { menuItem: true }
        }
      }
    });

    if (!order) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'Order not found'
      });
      return;
    }

    // Check if user owns this order or is admin
    if (order.userId !== req.user.userId && req.user.role !== 'ADMIN') {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        error: 'Not authorized to repeat this order'
      });
      return;
    }

    // Check availability of items and prepare response
    const availableItems: any[] = [];
    const unavailableItems: string[] = [];
    let message = 'All items from your previous order are available and ready to be added to cart.';

    for (const orderItem of order.items) {
      const currentMenuItem = await prisma.menuItem.findUnique({
        where: { id: orderItem.menuItemId }
      });

      if (currentMenuItem && currentMenuItem.isAvailable) {
        availableItems.push({
          menuItemId: orderItem.menuItemId,
          name: orderItem.menuItem.name,
          price: currentMenuItem.price, // Use current price
          quantity: orderItem.quantity,
          customizations: orderItem.customizations ? JSON.parse(orderItem.customizations as string) : null
        });
      } else {
        unavailableItems.push(orderItem.menuItem.name);
      }
    }

    if (unavailableItems.length > 0) {
      message = `Some items are no longer available: ${unavailableItems.join(', ')}. Available items ready to be added to cart.`;
    }

    res.json({
      items: availableItems,
      message,
      unavailableItems
    });

  } catch (error) {
    console.error('Error repeating order:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Error repeating order'
    });
  }
};

// Export all user controllers
export const userController = {
  getUserProfile,
  getUserOrders,
  getUserLastOrder,
  repeatOrder
}; 