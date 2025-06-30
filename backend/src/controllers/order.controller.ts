import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { HTTP_STATUS } from '../config/constants';
import { AuthenticatedRequest } from '../types/common.types';
import { getSumUpCheckoutStatus } from '../services/sumupService';

const prisma = new PrismaClient();

/**
 * Create a new order
 * POST /v1/orders
 */
export const createOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      errors: errors.array()
    });
  }

  const { items, total } = req.body;
  const userId = req.user?.userId; // This will be undefined for unregistered users
  console.log("STARTING ORDER CREATION");

  try {
    // Start a transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Create the order
      const newOrder = await prisma.order.create({
        data: {
          userId: userId || null, // Explicitly set to null for unregistered users
          total,
          status: 'AWAITING_PAYMENT',
          items: {
            create: items.map((item: any) => ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              price: item.price,
              customizations: item.customizations ? JSON.stringify(item.customizations) : null
            }))
          }
        },
        include: { items: true }
      });

      return { order: newOrder };
    });

    const responseMessage = userId
      ? `Order created successfully. Complete payment to earn loyalty points!`
      : 'Order created successfully. Complete the payment to confirm your order.';

    console.log('Order creation completed. Response:', JSON.stringify({
      order: result.order,
      message: responseMessage
    }, null, 2));

    res.status(HTTP_STATUS.CREATED).json({
      order: result.order,
      message: responseMessage
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Error creating order'
    });
  }
};

/**
 * Get order status (for mobile app polling)
 * GET /v1/orders/:id/status
 */
export const getOrderStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  if (!id) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Order ID is required'
    });
    return;
  }

  try {
    const orderId = parseInt(id);
    if (isNaN(orderId)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Invalid order ID'
      });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        readyAt: true,
        estimatedReadyTime: true,
        sumupCheckoutId: true,
        total: true,
        createdAt: true,
        items: {
          select: {
            id: true,
            menuItemId: true,
            quantity: true,
            price: true,
            customizations: true,
            menuItem: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });
    
    if (!order) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'Order not found'
      });
      return;
    }
    
    // Transform the items to include the menu item name
    const transformedOrder = {
      ...order,
      items: order.items.map(item => ({
        id: item.id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: item.price,
        name: item.menuItem?.name || `Item #${item.menuItemId}`,
        customizations: item.customizations ? JSON.parse(item.customizations as string) : {}
      }))
    };
    
    res.json(transformedOrder);
    return;
  } catch (error) {
    console.error('Error fetching order status:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Error fetching order status'
    });
  }
};

/**
 * Update order estimated time (for business use)
 * POST /v1/orders/:id/estimate
 */
export const updateOrderEstimate = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { estimatedMinutes } = req.body;
  
  if (!id) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Order ID is required'
    });
    return;
  }
  
  if (!estimatedMinutes || typeof estimatedMinutes !== 'number') {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Valid estimatedMinutes required'
    });
    return;
  }
  
  try {
    const orderId = parseInt(id);
    if (isNaN(orderId)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Invalid order ID'
      });
      return;
    }

    const estimatedReadyTime = new Date(Date.now() + (estimatedMinutes * 60000));
    
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { 
        estimatedReadyTime,
        status: 'CONFIRMED'
      }
    });
    
    res.json(updatedOrder);
    return;
  } catch (error) {
    console.error('Error updating order estimate:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Error updating order estimate'
    });
  }
};

/**
 * Verify payment status with SumUp and update order
 * POST /v1/orders/:orderId/verify-payment
 */
export const verifyPayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

  const authenticatedUserId = req.user.userId;

  try {
    const orderIdInt = parseInt(orderId);
    if (isNaN(orderIdInt)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Invalid order ID'
      });
      return;
    }

    // 1. Find the order in the database
    const order = await prisma.order.findUnique({
      where: { id: orderIdInt }
    });

    if (!order) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'Order not found'
      });
      return;
    }

    // Security Check: Ensure the user requesting verification owns the order
    if (order.userId !== authenticatedUserId) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        error: 'Not authorized to verify this order'
      });
      return;
    }

    // 2. Check if order requires verification
    if (!order.sumupCheckoutId || order.status !== 'AWAITING_PAYMENT') {
      console.log(`Order ${orderId} status is ${order.status}, no verification needed or possible.`);
      res.json(order);
      return;
    }

    // 3. Query SumUp API for checkout status
    console.log(`Payment verification requested for order ${orderId} with SumUp checkout ${order.sumupCheckoutId}`);
    
    try {
      const sumupStatus = await getSumUpCheckoutStatus(order.sumupCheckoutId);
      console.log('SumUp checkout status:', sumupStatus);

      // Update order status based on SumUp response
      let newStatus: string = order.status;
      if (sumupStatus.status === 'PAID') {
        newStatus = 'PAYMENT_CONFIRMED';
        
        // Award loyalty points if user is registered
        if (order.userId) {
          try {
            const loyaltyPointsToAdd = Math.floor(order.total * 0.1); // 10% of order total as points
            
            await prisma.loyaltyPoints.upsert({
              where: { userId: order.userId },
              update: { 
                points: { increment: loyaltyPointsToAdd }
              },
              create: { 
                userId: order.userId, 
                points: loyaltyPointsToAdd 
              }
            });
            
            console.log(`Awarded ${loyaltyPointsToAdd} loyalty points to user ${order.userId}`);
          } catch (loyaltyError) {
            console.error('Error awarding loyalty points:', loyaltyError);
            // Don't fail the order if loyalty points fail
          }
        }
      } else if (sumupStatus.status === 'FAILED') {
        newStatus = 'PAYMENT_FAILED';
      }

      // Update order status if it changed
      const updatedOrder = await prisma.order.update({
        where: { id: orderIdInt },
        data: { status: newStatus as any }
      });

      res.json({
        message: 'Payment verification completed',
        orderId: updatedOrder.id,
        status: updatedOrder.status,
        sumupCheckoutId: order.sumupCheckoutId,
        sumupStatus: sumupStatus.status,
        loyaltyPointsAwarded: order.userId && sumupStatus.status === 'PAID' ? Math.floor(order.total * 0.1) : 0
      });

    } catch (sumupError) {
      console.error('Error checking SumUp status:', sumupError);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Error verifying payment with SumUp',
        details: sumupError instanceof Error ? sumupError.message : 'Unknown error'
      });
      return;
    }

  } catch (error) {
    console.error(`Error verifying payment for order ${orderId}:`, error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Error verifying payment'
    });
  }
};

// Export all order controllers
export const orderController = {
  createOrder,
  getOrderStatus,
  updateOrderEstimate,
  verifyPayment
}; 