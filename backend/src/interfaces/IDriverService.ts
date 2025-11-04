import { Order } from '@prisma/client';

/**
 * Driver order details for driver view
 */
export interface DriverOrderDetails {
  id: number;
  orderCode: string | null;
  deliveryAddress: string | null;
  status: string;
  total: number;
  createdAt: Date;
  user: {
    id: number;
    name: string;
    phoneNumber: string;
  } | null;
  items: Array<{
    id: number;
    quantity: number;
    price: number;
    menuItem: {
      id: number;
      name: string;
    };
  }>;
}

/**
 * Interface for Driver Service
 * Handles driver-related operations for delivery orders
 */
export interface IDriverService {
  /**
   * Get list of ready delivery orders
   * @returns List of orders ready for delivery pickup
   */
  getReadyDeliveryOrders(): Promise<DriverOrderDetails[]>;

  /**
   * Get driver's active delivery orders (OUT_FOR_DELIVERY)
   * @param driverId - Driver user ID
   * @returns List of orders currently being delivered by this driver
   */
  getMyActiveOrders(driverId: number): Promise<DriverOrderDetails[]>;

  /**
   * Accept an order for delivery
   * @param orderId - Order ID to accept
   * @param driverId - Driver user ID
   * @returns Updated order
   */
  acceptOrder(orderId: number, driverId: number): Promise<Order>;

  /**
   * Mark order as delivered
   * @param orderId - Order ID to mark as delivered
   * @param driverId - Driver user ID
   * @returns Updated order
   */
  markDelivered(orderId: number, driverId: number): Promise<Order>;

  /**
   * Get order details for driver view
   * @param orderId - Order ID to retrieve
   * @returns Order details with delivery address
   */
  getOrderDetails(orderId: number): Promise<DriverOrderDetails | null>;
}

