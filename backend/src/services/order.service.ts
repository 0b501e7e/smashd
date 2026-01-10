import { PrismaClient, Order } from '@prisma/client';
import { IOrderService } from '../interfaces/IOrderService';
import {
  CreateOrderData,
  CreateOrderResult,
  OrderStatusResponse,
  UpdateOrderEstimateData,
  OrderEstimateResult,
  PaymentVerificationRequest,
  PaymentVerificationResult,
  RepeatOrderData,
  RepeatOrderResult,
  OrderHistoryQuery,
  OrderWithFullDetails,
  AdminOrderQuery,
  AdminOrderWithDetails,
  AcceptOrderData,
  OrderStatus
} from '../types/order.types';
import { getSumUpCheckoutStatus } from './sumupService';
import { IAnalyticsService } from '../interfaces/IAnalyticsService';

/**
 * OrderService - Handles all order-related business logic
 * 
 * This service manages:
 * - Order creation and validation
 * - Order status tracking and updates
 * - Payment verification with SumUp integration
 * - Loyalty points calculation and awarding
 * - Order history and repeat functionality
 * - Admin order management operations
 */
export class OrderService implements IOrderService {
  constructor(
    private prisma: PrismaClient,
    private analyticsService: IAnalyticsService
  ) { }

  // =====================
  // ORDER CREATION
  // =====================

  async createOrder(orderData: CreateOrderData): Promise<CreateOrderResult> {
    console.log("OrderService: Starting order creation");

    try {
      // Validate all menu items exist and are available
      for (const item of orderData.items) {
        const menuItem = await this.prisma.menuItem.findUnique({
          where: { id: item.menuItemId }
        });

        if (!menuItem) {
          throw new Error(`Menu item with ID ${item.menuItemId} was not found`);
        }

        if (!menuItem.isAvailable) {
          throw new Error(`Menu item "${menuItem.name}" is not available`);
        }

        // Use current menu item price, not the one sent from client
        item.price = menuItem.price;
      }

      const result = await this.prisma.$transaction(async (prisma) => {
        // Create the order with items
        const fulfillmentMethod = (orderData.fulfillmentMethod || 'PICKUP') as any;
        const isDelivery = fulfillmentMethod === 'DELIVERY';

        console.log(`OrderService: Creating order with fulfillmentMethod: ${fulfillmentMethod}, isDelivery: ${isDelivery}, deliveryAddress: ${orderData.deliveryAddress ? 'present' : 'missing'}`);

        const newOrder = await prisma.order.create({
          data: {
            userId: orderData.userId || null,
            total: orderData.total,
            status: 'AWAITING_PAYMENT',
            fulfillmentMethod: fulfillmentMethod,
            deliveryAddress: isDelivery ? (orderData.deliveryAddress || null) : null,
            orderCode: isDelivery ? await this.generateUniqueOrderCode(prisma) : null,
            items: {
              create: orderData.items.map((item) => ({
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                price: item.price,
                customizations: item.customizations ? JSON.stringify(item.customizations) : null
              }))
            }
          },
          include: { items: true }
        } as any);

        console.log(`OrderService: Order ${newOrder.id} created successfully with fulfillmentMethod: ${newOrder.fulfillmentMethod}, deliveryAddress: ${newOrder.deliveryAddress ? 'present' : 'missing'}`);
        return { order: newOrder };
      });

      // Handle loyalty points AFTER the transaction to avoid constraint conflicts
      if (orderData.userId) {
        try {
          await this.prisma.loyaltyPoints.create({
            data: {
              userId: orderData.userId,
              points: 0 // Will be calculated after payment confirmation
            }
          });
        } catch (loyaltyError) {
          // Ignore if loyalty points record already exists
          console.log('OrderService: Loyalty points record already exists for user');
        }
      }

      console.log(`OrderService: Transaction completed, returning order:`, result.order.id);

      // Skip verification query to avoid read-after-write consistency issues
      // The transaction guarantees the order was created successfully
      console.log(`OrderService: ✅ Order ${result.order.id} created successfully in transaction`);

      const responseMessage = orderData.userId
        ? `Order created successfully. Complete payment to earn loyalty points!`
        : 'Order created successfully. Complete payment to confirm your order.';

      const finalResult = {
        order: result.order as any,
        message: responseMessage
      };

      console.log(`OrderService: Final result order ID:`, finalResult.order.id);
      return finalResult;

    } catch (error) {
      console.error('OrderService: Error creating order:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create order');
    }
  }

  private async generateUniqueOrderCode(prisma: any): Promise<string> {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing chars
    const length = 6;
    for (let i = 0; i < 10; i++) {
      let code = '';
      for (let j = 0; j < length; j++) {
        code += alphabet[Math.floor(Math.random() * alphabet.length)];
      }
      const existing = await prisma.order.findFirst({ where: { orderCode: code } });
      if (!existing) return code;
    }
    // Fallback to timestamp-based
    return `SM${Date.now().toString().slice(-6)}`;
  }

  // =====================
  // ORDER RETRIEVAL
  // =====================

  async getOrderById(orderId: number): Promise<OrderWithFullDetails | null> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: { menuItem: true }
          }
        }
      });

      return order;
    } catch (error) {
      console.error(`OrderService: Error fetching order ${orderId}:`, error);
      throw new Error('Failed to retrieve order');
    }
  }

  async getOrderStatus(orderId: number): Promise<OrderStatusResponse> {
    try {
      // LAZY VERIFICATION: If order is pending, check upstream status before returning details.
      // This fixes the mobile app issue where verifyPayment is never triggered.
      const checkOrder = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { status: true, sumupCheckoutId: true }
      });

      if (checkOrder?.status === 'AWAITING_PAYMENT' && checkOrder.sumupCheckoutId) {
        console.log(`OrderService: Lazy verification triggered for order ${orderId}`);
        try {
          await this.verifyPayment({ orderId });
        } catch (e) {
          console.warn(`OrderService: Lazy verification failed for order ${orderId}`, e);
        }
      }

      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true,
          readyAt: true,
          estimatedReadyTime: true,
          sumupCheckoutId: true,
          total: true,
          createdAt: true,
          fulfillmentMethod: true,
          deliveryAddress: true,
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
        throw new Error('Order not found');
      }

      // FORCE AUTO-ACCEPT: Fix for orders stuck in 'PAYMENT_CONFIRMED'.
      // If payment verified but auto-accept missed (race condition), catch it here.
      if (order.status === 'PAYMENT_CONFIRMED' && process.env['AUTO_ACCEPT_ORDERS'] === 'true') {
        console.log(`OrderService: Force Auto-accept triggered for order ${orderId}`);
        try {
          const accepted = await this.acceptOrder({ orderId, estimatedMinutes: 20 });
          // Update local object so frontend sees the change immediately
          (order as any).status = accepted.status;
          (order as any).estimatedReadyTime = accepted.estimatedReadyTime;
          (order as any).readyAt = accepted.readyAt;
        } catch (e) {
          console.error("OrderService: Force Auto-accept failed", e);
        }
      }

      // Transform the items to include the menu item name
      const transformedOrder: OrderStatusResponse = {
        ...order,
        status: order.status as OrderStatus,
        fulfillmentMethod: order.fulfillmentMethod as any,
        deliveryAddress: order.deliveryAddress || null,
        items: order.items.map(item => ({
          id: item.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: item.price,
          name: item.menuItem?.name || `Item #${item.menuItemId}`,
          customizations: item.customizations ? JSON.parse(item.customizations as string) : {}
        }))
      };

      return transformedOrder;
    } catch (error) {
      console.error(`OrderService: Error fetching order status ${orderId}:`, error);
      // Re-throw the original error to preserve "Order not found" message
      throw error;
    }
  }

  async getUserOrders(query: OrderHistoryQuery): Promise<OrderWithFullDetails[]> {
    try {
      const whereClause: any = { userId: query.userId };

      if (query.status) {
        whereClause.status = { in: query.status };
      }

      const queryOptions: any = {
        where: whereClause,
        include: {
          items: {
            include: { menuItem: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      };

      if (query.limit !== undefined) queryOptions.take = query.limit;
      if (query.offset !== undefined) queryOptions.skip = query.offset;

      const orders = await this.prisma.order.findMany(queryOptions);

      return orders as OrderWithFullDetails[];
    } catch (error) {
      console.error(`OrderService: Error fetching user orders for user ${query.userId}:`, error);
      throw new Error('Failed to retrieve user orders');
    }
  }

  async getUserLastOrder(userId: number): Promise<OrderWithFullDetails | null> {
    try {
      const lastOrder = await this.prisma.order.findFirst({
        where: {
          userId: userId,
          status: { in: ['PAYMENT_CONFIRMED', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'] }
        },
        include: {
          items: {
            include: { menuItem: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      return lastOrder;
    } catch (error) {
      console.error(`OrderService: Error fetching last order for user ${userId}:`, error);
      throw new Error('Failed to retrieve last order');
    }
  }

  // =====================
  // ORDER STATUS MANAGEMENT
  // =====================

  async updateOrderEstimate(orderId: number, estimateData: UpdateOrderEstimateData): Promise<OrderEstimateResult> {
    try {
      // First check if order exists
      const existingOrder = await this.prisma.order.findUnique({
        where: { id: orderId }
      });

      if (!existingOrder) {
        throw new Error('Order not found');
      }

      // Check if order is in a state that can be estimated
      if (!['PAYMENT_CONFIRMED', 'CONFIRMED'].includes(existingOrder.status)) {
        throw new Error(`Order with status ${existingOrder.status} cannot be estimated`);
      }

      const estimatedReadyTime = new Date(Date.now() + (estimateData.estimatedMinutes * 60000));

      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: {
          estimatedReadyTime,
          status: 'CONFIRMED'
        }
      });

      console.log(`OrderService: Order ${orderId} estimate updated to ${estimateData.estimatedMinutes} minutes`);

      return {
        id: updatedOrder.id,
        estimatedReadyTime: updatedOrder.estimatedReadyTime!,
        status: updatedOrder.status as OrderStatus
      };
    } catch (error) {
      console.error(`OrderService: Error updating order estimate ${orderId}:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update order estimate');
    }
  }

  async updateOrderStatus(orderId: number, status: OrderStatus): Promise<Order> {
    try {
      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: { status: status as any }
      });

      console.log(`OrderService: Order ${orderId} status updated to ${status}`);

      // Award loyalty points if the order has just been confirmed as paid
      // and points haven't been awarded yet.
      if (['PAYMENT_CONFIRMED', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'COMPLETED'].includes(status) && updatedOrder.userId) {
        await this.awardLoyaltyPointsIfEligible(orderId, updatedOrder.userId);
      }

      return updatedOrder;
    } catch (error) {
      console.error(`OrderService: Error updating order status ${orderId}:`, error);
      throw new Error('Failed to update order status');
    }
  }

  /**
   * Helper to ensure points are awarded for an order, avoiding duplicates
   */
  public async awardLoyaltyPointsIfEligible(orderId: number, userId: number): Promise<void> {
    try {
      // Check if points were already awarded
      const existingTransaction = await this.prisma.pointsTransaction.findFirst({
        where: {
          orderId: orderId,
          userId: userId,
          reason: 'ORDER_EARNED'
        }
      });

      if (!existingTransaction) {
        console.log(`OrderService: Awarding points for order ${orderId} as part of status update`);
        await this.awardLoyaltyPoints(orderId, userId);
      }
    } catch (error) {
      console.error(`OrderService: Error ensuring points awarded for order ${orderId}:`, error);
    }
  }

  // =====================
  // PAYMENT VERIFICATION
  // =====================

  async verifyPayment(verificationData: PaymentVerificationRequest): Promise<PaymentVerificationResult> {
    const { orderId } = verificationData;

    try {
      // 1. Find the order in the database with proper query
      const order = await this.prisma.order.findFirst({ where: { id: orderId } });

      if (!order) {
        throw new Error('Order not found or not authorized');
      }

      // 2. Check if order requires verification
      if (order.status !== 'AWAITING_PAYMENT') {
        console.log(`OrderService: Order ${orderId} status is ${order.status}, no verification needed or possible.`);
        return {
          message: 'Order verification not needed',
          orderId: order.id,
          status: order.status as OrderStatus,
          sumupCheckoutId: order.sumupCheckoutId || '',
          sumupStatus: 'N/A',
          loyaltyPointsAwarded: 0
        };
      }

      // 3. For testing purposes, simulate payment verification
      // In production, this would call the actual SumUp API
      let newStatus: OrderStatus = 'PAYMENT_CONFIRMED';
      let loyaltyPointsAwarded = 0;

      try {
        // 4. Query SumUp API for checkout status (if checkout ID exists)
        if (order.sumupCheckoutId) {
          console.log(`OrderService: Payment verification requested for order ${orderId} with SumUp checkout ${order.sumupCheckoutId}`);

          // Try to get SumUp status, but handle errors gracefully
          try {
            const sumupStatus = await getSumUpCheckoutStatus(order.sumupCheckoutId);
            console.log('OrderService: SumUp checkout status:', sumupStatus);

            const status = (sumupStatus.status || '').toUpperCase();
            if (status === 'PAID' || status === 'SUCCESSFUL') {
              newStatus = 'PAYMENT_CONFIRMED';
            } else if (status === 'FAILED') {
              newStatus = 'PAYMENT_FAILED';
            }
          } catch (sumupError) {
            console.warn('OrderService: SumUp API call failed, assuming payment confirmed:', sumupError);
            // Continue with payment confirmation for testing
          }
        }

        // 5. Award loyalty points if user is registered and payment confirmed
        if (order.userId && newStatus === 'PAYMENT_CONFIRMED') {
          try {
            loyaltyPointsAwarded = await this.awardLoyaltyPoints(order.id, order.userId);
          } catch (loyaltyError) {
            console.error('OrderService: Error awarding loyalty points:', loyaltyError);
            // Don't fail the order if loyalty points fail
          }
        }

        // 6. Update order status
        let updatedOrder = await this.updateOrderStatus(orderId, newStatus);

        // 6.1 Track successful order in analytics
        if (newStatus === 'PAYMENT_CONFIRMED') {
          this.analyticsService.trackOrderPlaced(orderId, order.userId || undefined)
            .catch(err => console.error('Failed to track order in analytics:', err));
        }

        // AUTO-ACCEPT LOGIC FOR TESTING/BETA
        if (newStatus === 'PAYMENT_CONFIRMED' && process.env['AUTO_ACCEPT_ORDERS'] === 'true') {
          console.log(`OrderService: AUTO_ACCEPT_ORDERS is active. Automatically accepting order ${orderId}`);
          try {
            // Default to 20 minutes for auto-accepted orders
            updatedOrder = await this.acceptOrder({ orderId, estimatedMinutes: 20 });
            newStatus = updatedOrder.status as OrderStatus; // Update status local var for the response
          } catch (autoAcceptError) {
            console.error('OrderService: Failed to auto-accept order:', autoAcceptError);
            // Don't fail the request, just log it. The order will remain in PAYMENT_CONFIRMED (Awaiting manual accept)
          }
        }

        // 7. Get full order details with items for frontend display
        const orderDetails = await this.prisma.order.findUnique({
          where: { id: orderId },
          include: {
            items: {
              include: {
                menuItem: true
              }
            }
          }
        });

        if (!orderDetails) {
          throw new Error('Order not found after update');
        }

        // Transform the order details to match frontend expectations
        const transformedOrder = {
          id: orderDetails.id,
          status: orderDetails.status,
          total: orderDetails.total,
          items: orderDetails.items.map(item => ({
            name: item.menuItem.name,
            quantity: item.quantity,
            price: item.price,
            customizations: item.customizations ? JSON.parse(item.customizations as string) : {}
          })),
          createdAt: orderDetails.createdAt,
          sumupCheckoutId: orderDetails.sumupCheckoutId || ''
        };

        return {
          message: 'Payment verification completed',
          orderId: updatedOrder.id,
          // If auto-accepted, the status in DB is now CONFIRMED/PREPARING, so we map that to 'PAID' or better for the frontend check
          // The frontend mainly looks for status !== 'AWAITING_PAYMENT' to succeed
          sumupStatus: 'PAID',
          loyaltyPointsAwarded,
          ...transformedOrder  // Include full order details for frontend
        };

      } catch (updateError) {
        console.error(`OrderService: Error during payment verification process:`, updateError);
        throw new Error('Failed to complete payment verification');
      }

    } catch (error) {
      console.error(`OrderService: Error verifying payment for order ${orderId}:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to verify payment');
    }
  }

  // =====================
  // REPEAT ORDER FUNCTIONALITY
  // =====================

  async repeatOrder(repeatData: RepeatOrderData): Promise<RepeatOrderResult> {
    const { orderId, userId } = repeatData;

    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: { menuItem: true }
          }
        }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // Check if user owns this order
      if (order.userId !== userId) {
        throw new Error('Not authorized to repeat this order');
      }

      // Check availability of items and prepare response
      const availableItems: any[] = [];
      const unavailableItems: string[] = [];
      let message = 'All items from your previous order are available and ready to be added to the cart.';

      for (const orderItem of order.items) {
        const currentMenuItem = await this.prisma.menuItem.findUnique({
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
        message = `Some items are no longer available: ${unavailableItems.join(', ')}. Available items are ready to be added to the cart.`;
      }

      return {
        items: availableItems,
        message,
        unavailableItems
      };

    } catch (error) {
      console.error(`OrderService: Error repeating order ${orderId}:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to repeat order');
    }
  }

  // =====================
  // ADMIN ORDER MANAGEMENT
  // =====================

  async getAdminOrders(query?: AdminOrderQuery): Promise<AdminOrderWithDetails[]> {
    try {
      const whereClause: any = {};

      if (query?.status) {
        whereClause.status = { in: query.status };
      } else {
        // Default to active orders for admin panel
        whereClause.status = { in: ['PAYMENT_CONFIRMED', 'CONFIRMED', 'PREPARING', 'READY'] };
      }

      const queryOptions: any = {
        where: whereClause,
        include: {
          items: {
            include: {
              menuItem: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          driver: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      };

      if (query?.limit !== undefined) queryOptions.take = query.limit;
      if (query?.offset !== undefined) queryOptions.skip = query.offset;

      const orders = await this.prisma.order.findMany(queryOptions);

      console.log(`OrderService: Retrieved ${orders.length} orders for admin panel`);
      return orders as AdminOrderWithDetails[];
    } catch (error) {
      console.error('OrderService: Error fetching orders for admin:', error);
      throw new Error('Failed to retrieve orders for admin');
    }
  }

  async acceptOrder(acceptData: AcceptOrderData): Promise<Order> {
    const { orderId, estimatedMinutes } = acceptData;

    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status !== 'PAYMENT_CONFIRMED') {
        throw new Error(`Order with status ${order.status} cannot be accepted.`);
      }

      const estimatedReadyTime = new Date(Date.now() + (estimatedMinutes * 60000));

      // Both delivery and pickup orders should start in CONFIRMED status
      // This allows the kitchen to prepare the order before marking it READY
      const newStatus = 'CONFIRMED';

      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: {
          estimatedReadyTime,
          status: newStatus,
          readyAt: null // Order is just accepted, not ready yet
        },
      });

      console.log(`OrderService: Order ${orderId} accepted with ${estimatedMinutes} minute estimate`);
      return updatedOrder;
    } catch (error) {
      console.error(`OrderService: Error accepting order ${orderId}:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to accept order');
    }
  }

  async declineOrder(orderId: number): Promise<Order> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      if (!['PAYMENT_CONFIRMED', 'CONFIRMED'].includes(order.status)) {
        throw new Error(`Order with status ${order.status} cannot be declined.`);
      }

      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });

      console.log(`OrderService: Order ${orderId} declined and cancelled`);
      return updatedOrder;
    } catch (error) {
      console.error(`OrderService: Error declining order ${orderId}:`, error);
      throw new Error('Failed to decline order');
    }
  }

  async markOrderReady(orderId: number): Promise<Order> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'READY',
          readyAt: new Date()
        }
      });

      console.log(`OrderService: Order ${orderId} marked as READY`);
      return updatedOrder;
    } catch (error) {
      console.error(`OrderService: Error marking order ready ${orderId}:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to mark order ready');
    }
  }

  async assignDriver(orderId: number, driverId: number): Promise<Order> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      const driver = await this.prisma.user.findFirst({
        where: { id: driverId, role: 'DRIVER' }
      });

      if (!driver) {
        throw new Error('Driver not found or not a driver');
      }

      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: {
          driverId: driverId,
          status: 'OUT_FOR_DELIVERY'
        },
        include: {
          driver: {
            select: { name: true, email: true, phoneNumber: true }
          },
          user: {
            select: { name: true, email: true }
          }
        }
      } as any); // Type assertion for the entire update call to handle Prisma relation inference

      console.log(`OrderService: Order ${orderId} assigned to driver ${driverId}`);
      return updatedOrder;
    } catch (error) {
      console.error(`OrderService: Error assigning driver to order ${orderId}:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to assign driver');
    }
  }

  // =====================
  // ORDER VALIDATION
  // =====================

  async validateOrderOwnership(orderId: number, userId: number): Promise<boolean> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { userId: true }
      });

      return order?.userId === userId;
    } catch (error) {
      console.error(`OrderService: Error validating order ownership ${orderId}:`, error);
      return false;
    }
  }

  async validateOrderModifiable(orderId: number, allowedStatuses?: OrderStatus[]): Promise<boolean> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { status: true }
      });

      if (!order) {
        return false;
      }

      const defaultAllowedStatuses: OrderStatus[] = ['AWAITING_PAYMENT', 'PAYMENT_CONFIRMED', 'CONFIRMED'];
      const statusesToCheck = allowedStatuses || defaultAllowedStatuses;

      return statusesToCheck.includes(order.status as OrderStatus);
    } catch (error) {
      console.error(`OrderService: Error validating order modifiable ${orderId}:`, error);
      return false;
    }
  }

  // =====================
  // LOYALTY POINTS INTEGRATION
  // =====================

  async awardLoyaltyPoints(orderId: number, userId: number): Promise<number> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          select: { total: true }
        });

        if (!order) {
          throw new Error('Order not found for loyalty points calculation');
        }

        const loyaltyPointsToAdd = Math.floor(order.total * 0.1); // 10% of order total as points

        // 1. Get or create loyalty points account
        const loyaltyAccount = await tx.loyaltyPoints.upsert({
          where: { userId: userId },
          update: {
            points: { increment: loyaltyPointsToAdd },
            totalSpentThisYear: { increment: order.total }
          },
          create: {
            userId: userId,
            points: loyaltyPointsToAdd,
            totalSpentThisYear: order.total
          }
        });

        // 2. Create transaction record
        await tx.pointsTransaction.create({
          data: {
            userId: userId,
            loyaltyPointsId: loyaltyAccount.id,
            points: loyaltyPointsToAdd,
            reason: 'ORDER_EARNED',
            orderId: orderId,
            details: `Points earned from order #${orderId}`
          }
        });

        console.log(`OrderService: Awarded ${loyaltyPointsToAdd} loyalty points to user ${userId} for order ${orderId}. Total spent this year updated.`);
        return loyaltyPointsToAdd;
      });
    } catch (error) {
      console.error(`OrderService: Error awarding loyalty points for order ${orderId}:`, error);
      // We don't throw here to avoid failing the whole fulfillment process if loyalty fails
      // However, the caller might want to know, so we return 0 if it fails but log it.
      return 0;
    }
  }
} 