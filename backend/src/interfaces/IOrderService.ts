import { Order } from '@prisma/client';
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

/**
 * Interface for Order Service
 * Handles all order-related business logic including creation, status management,
 * payment verification, loyalty integration, and admin operations
 */
export interface IOrderService {
  // =====================
  // ORDER CREATION
  // =====================
  
  /**
   * Create a new order with items
   * @param orderData - Order creation data including items and total
   * @returns Created order with success message
   */
  createOrder(orderData: CreateOrderData): Promise<CreateOrderResult>;

  // =====================
  // ORDER RETRIEVAL
  // =====================
  
  /**
   * Get order by ID with full details
   * @param orderId - Order ID to retrieve
   * @returns Order with items and menu item details
   */
  getOrderById(orderId: number): Promise<OrderWithFullDetails | null>;

  /**
   * Get order status for client polling
   * @param orderId - Order ID to check status
   * @returns Order status response with formatted data
   */
  getOrderStatus(orderId: number): Promise<OrderStatusResponse>;

  /**
   * Get user's order history
   * @param query - Order history query parameters
   * @returns List of user's orders with optional filtering
   */
  getUserOrders(query: OrderHistoryQuery): Promise<OrderWithFullDetails[]>;

  /**
   * Get user's last completed order
   * @param userId - User ID to get last order for
   * @returns Most recent completed order or null
   */
  getUserLastOrder(userId: number): Promise<OrderWithFullDetails | null>;

  // =====================
  // ORDER STATUS MANAGEMENT
  // =====================
  
  /**
   * Update order estimated preparation time
   * @param orderId - Order ID to update
   * @param estimateData - Estimated preparation time data
   * @returns Updated order with new estimate
   */
  updateOrderEstimate(orderId: number, estimateData: UpdateOrderEstimateData): Promise<OrderEstimateResult>;

  /**
   * Update order status
   * @param orderId - Order ID to update
   * @param status - New order status
   * @returns Updated order
   */
  updateOrderStatus(orderId: number, status: OrderStatus): Promise<Order>;

  // =====================
  // PAYMENT VERIFICATION
  // =====================
  
  /**
   * Verify payment status with SumUp and update order
   * @param verificationData - Payment verification request data
   * @returns Payment verification result with loyalty points
   */
  verifyPayment(verificationData: PaymentVerificationRequest): Promise<PaymentVerificationResult>;

  // =====================
  // REPEAT ORDER FUNCTIONALITY
  // =====================
  
  /**
   * Prepare repeat order data for user's cart
   * @param repeatData - Repeat order request data
   * @returns Available items for cart with unavailable items list
   */
  repeatOrder(repeatData: RepeatOrderData): Promise<RepeatOrderResult>;

  // =====================
  // ADMIN ORDER MANAGEMENT
  // =====================
  
  /**
   * Get orders for admin panel
   * @param query - Admin order query parameters
   * @returns Orders with user details for admin management
   */
  getAdminOrders(query?: AdminOrderQuery): Promise<AdminOrderWithDetails[]>;

  /**
   * Accept order and set preparation time (admin)
   * @param acceptData - Order acceptance data with estimated time
   * @returns Updated order with confirmed status
   */
  acceptOrder(acceptData: AcceptOrderData): Promise<Order>;

  /**
   * Decline order (admin)
   * @param orderId - Order ID to decline
   * @returns Updated order with cancelled status
   */
  declineOrder(orderId: number): Promise<Order>;

  // =====================
  // ORDER VALIDATION
  // =====================
  
  /**
   * Validate order ownership for user operations
   * @param orderId - Order ID to validate
   * @param userId - User ID to validate against
   * @returns True if user owns the order
   */
  validateOrderOwnership(orderId: number, userId: number): Promise<boolean>;

  /**
   * Validate order can be modified
   * @param orderId - Order ID to validate
   * @param allowedStatuses - Optional array of allowed statuses
   * @returns True if order can be modified
   */
  validateOrderModifiable(orderId: number, allowedStatuses?: OrderStatus[]): Promise<boolean>;

  // =====================
  // LOYALTY POINTS INTEGRATION
  // =====================
  
  /**
   * Award loyalty points for completed order
   * @param orderId - Order ID to award points for
   * @param userId - User ID to award points to
   * @returns Number of points awarded
   */
  awardLoyaltyPoints(orderId: number, userId: number): Promise<number>;
} 