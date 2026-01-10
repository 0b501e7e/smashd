import { PrismaClient, Order } from '@prisma/client';
import { OrderService } from './order.service';
import { IDriverService, DriverOrderDetails } from '../interfaces/IDriverService';
import { INotificationService } from '../interfaces/INotificationService';

/**
 * DriverService - Handles driver delivery operations
 * 
 * This service manages:
 * - Retrieving ready delivery orders
 * - Accepting orders for delivery
 * - Marking orders as delivered
 * - Driver-specific order views
 */
export class DriverService implements IDriverService {
  constructor(
    private prisma: PrismaClient,
    private orderService: OrderService,
    private notificationService: INotificationService
  ) { }

  /**
   * Get list of ready delivery orders
   * Returns orders with status READY and fulfillmentMethod DELIVERY
   */
  async getReadyDeliveryOrders(): Promise<DriverOrderDetails[]> {
    try {
      console.log('DriverService: Fetching ready delivery orders...');
      const orders = await this.prisma.order.findMany({
        where: {
          status: 'READY',
          fulfillmentMethod: 'DELIVERY',
          deliveryAddress: { not: null }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phoneNumber: true
            }
          },
          items: {
            include: {
              menuItem: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'asc' // Oldest first (FIFO)
        }
      });

      console.log(`DriverService: Found ${orders.length} ready delivery orders`);
      if (orders.length === 0) {
        // Debug: Check what orders exist
        const allDeliveryOrders = await this.prisma.order.findMany({
          where: {
            fulfillmentMethod: 'DELIVERY',
            deliveryAddress: { not: null }
          },
          select: {
            id: true,
            status: true,
            fulfillmentMethod: true,
            deliveryAddress: true
          }
        });
        console.log(`DriverService: Total delivery orders with address: ${allDeliveryOrders.length}`);
        console.log('DriverService: Delivery orders by status:',
          allDeliveryOrders.reduce((acc, o) => {
            acc[o.status] = (acc[o.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        );
      }

      return orders.map(order => ({
        id: order.id,
        orderCode: order.orderCode,
        deliveryAddress: order.deliveryAddress,
        status: order.status,
        fulfillmentMethod: order.fulfillmentMethod,
        total: order.total,
        createdAt: order.createdAt,
        user: order.user ? {
          id: order.user.id,
          name: order.user.name,
          phoneNumber: order.user.phoneNumber
        } : null,
        items: order.items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price,
          menuItem: {
            id: item.menuItem.id,
            name: item.menuItem.name
          }
        }))
      }));
    } catch (error) {
      console.error('DriverService: Error fetching ready delivery orders:', error);
      throw new Error('Failed to retrieve ready delivery orders');
    }
  }

  /**
   * Get driver's active delivery orders (OUT_FOR_DELIVERY)
   * Returns orders that the driver has accepted and are currently being delivered
   */
  async getMyActiveOrders(driverId: number): Promise<DriverOrderDetails[]> {
    try {
      console.log(`DriverService: Fetching active orders for driver ${driverId}...`);
      const orders = await this.prisma.order.findMany({
        where: {
          status: 'OUT_FOR_DELIVERY',
          fulfillmentMethod: 'DELIVERY',
          deliveryAddress: { not: null },
          driverId: driverId
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phoneNumber: true
            }
          },
          items: {
            include: {
              menuItem: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'asc' // Oldest first
        }
      });

      console.log(`DriverService: Found ${orders.length} active delivery orders for driver ${driverId}`);

      return orders.map(order => ({
        id: order.id,
        orderCode: order.orderCode,
        deliveryAddress: order.deliveryAddress,
        status: order.status,
        fulfillmentMethod: order.fulfillmentMethod,
        total: order.total,
        createdAt: order.createdAt,
        user: order.user ? {
          id: order.user.id,
          name: order.user.name,
          phoneNumber: order.user.phoneNumber
        } : null,
        items: order.items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price,
          menuItem: {
            id: item.menuItem.id,
            name: item.menuItem.name
          }
        }))
      }));
    } catch (error) {
      console.error(`DriverService: Error fetching active orders for driver ${driverId}:`, error);
      throw new Error('Failed to retrieve active delivery orders');
    }
  }

  /**
   * Accept an order for delivery
   * Updates order status to OUT_FOR_DELIVERY and notifies customer
   */
  async acceptOrder(orderId: number, driverId: number): Promise<Order> {
    try {
      // Verify order exists and is in correct state
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status !== 'READY') {
        throw new Error(`Order is not ready for delivery. Current status: ${order.status}`);
      }

      if (order.fulfillmentMethod !== 'DELIVERY') {
        throw new Error('Order is not a delivery order');
      }

      if (!order.deliveryAddress) {
        throw new Error('Order does not have a delivery address');
      }

      // Update order status
      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'OUT_FOR_DELIVERY',
          driverId: driverId
        }
      });

      // Notify customer if order has user (NOT the driver)
      if (order.userId && order.user) {
        // Verify we're not sending notification to the driver
        if (order.userId === driverId) {
          console.error(`⚠️ DriverService: Attempted to send notification to driver ${driverId} instead of customer ${order.userId}. Skipping.`);
        } else {
          try {
            console.log(`DriverService: Sending notification to customer ${order.userId} (not driver ${driverId}) about order ${orderId}`);
            await this.notificationService.sendNotification({
              userId: order.userId, // This should be the customer's ID, not the driver's
              type: 'ORDER_STATUS_UPDATE',
              title: 'Your order is on its way',
              message: `The driver has picked up your order #${orderId} and is on the way to your address.`,
              metadata: {
                orderId: orderId,
                status: 'OUT_FOR_DELIVERY',
                deliveryAddress: order.deliveryAddress
              },
              pushData: {
                title: 'Your order is on its way',
                body: `The driver has picked up your order #${orderId} and is on the way.`
              }
            });
            console.log(`DriverService: Notification sent to customer ${order.userId} successfully`);
          } catch (notificationError) {
            console.error(`DriverService: Failed to send notification to customer ${order.userId}:`, notificationError);
            // Don't fail the accept operation if notification fails
          }
        }
      }

      console.log(`DriverService: Order ${orderId} accepted by driver ${driverId}`);
      return updatedOrder;
    } catch (error) {
      console.error(`DriverService: Error accepting order ${orderId}:`, error);
      throw error instanceof Error ? error : new Error('Failed to accept order');
    }
  }

  /**
   * Mark order as delivered
   * Updates order status to DELIVERED
   */
  async markDelivered(orderId: number, driverId: number): Promise<Order> {
    try {
      // Verify order exists and is in correct state
      const order = await this.prisma.order.findUnique({
        where: { id: orderId }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status !== 'OUT_FOR_DELIVERY') {
        throw new Error(`Order is not out for delivery. Current status: ${order.status}`);
      }

      // Update order status
      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'DELIVERED'
        }
      });

      // Award loyalty points if not already awarded
      if (updatedOrder.userId) {
        await this.orderService.awardLoyaltyPointsIfEligible(updatedOrder.id, updatedOrder.userId);
      }

      // Notify customer if order has user (NOT the driver)
      if (order.userId) {
        // Verify we're not sending notification to the driver
        if (order.userId === driverId) {
          console.error(`⚠️ DriverService: Attempted to send delivery notification to driver ${driverId} instead of customer ${order.userId}. Skipping.`);
        } else {
          try {
            const user = await this.prisma.user.findUnique({
              where: { id: order.userId }
            });

            if (user) {
              console.log(`DriverService: Sending delivery notification to customer ${order.userId} (not driver ${driverId}) about order ${orderId}`);
              await this.notificationService.sendNotification({
                userId: order.userId, // This should be the customer's ID, not the driver's
                type: 'ORDER_STATUS_UPDATE',
                title: 'Order delivered',
                message: `Your order #${orderId} has been successfully delivered. Thank you for your purchase!`,
                metadata: {
                  orderId: orderId,
                  status: 'DELIVERED'
                },
                pushData: {
                  title: 'Order delivered',
                  body: `Your order #${orderId} has been successfully delivered.`
                }
              });
              console.log(`DriverService: Delivery notification sent to customer ${order.userId} successfully`);
            }
          } catch (notificationError) {
            console.error(`DriverService: Failed to send delivery notification to customer ${order.userId}:`, notificationError);
            // Don't fail the deliver operation if notification fails
          }
        }
      }

      console.log(`DriverService: Order ${orderId} marked as delivered by driver ${driverId}`);
      return updatedOrder;
    } catch (error) {
      console.error(`DriverService: Error marking order ${orderId} as delivered:`, error);
      throw error instanceof Error ? error : new Error('Failed to mark order as delivered');
    }
  }

  /**
   * Get order details for driver view
   * Returns order with delivery address and customer information
   */
  async getOrderDetails(orderId: number): Promise<DriverOrderDetails | null> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phoneNumber: true
            }
          },
          items: {
            include: {
              menuItem: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      if (!order) {
        return null;
      }

      // Only return delivery orders
      if (order.fulfillmentMethod !== 'DELIVERY') {
        throw new Error('Order is not a delivery order');
      }

      return {
        id: order.id,
        orderCode: order.orderCode,
        deliveryAddress: order.deliveryAddress,
        status: order.status,
        fulfillmentMethod: order.fulfillmentMethod,
        total: order.total,
        createdAt: order.createdAt,
        user: order.user ? {
          id: order.user.id,
          name: order.user.name,
          phoneNumber: order.user.phoneNumber
        } : null,
        items: order.items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price,
          menuItem: {
            id: item.menuItem.id,
            name: item.menuItem.name
          }
        }))
      };
    } catch (error) {
      console.error(`DriverService: Error fetching order details ${orderId}:`, error);
      throw error instanceof Error ? error : new Error('Failed to retrieve order details');
    }
  }
}

