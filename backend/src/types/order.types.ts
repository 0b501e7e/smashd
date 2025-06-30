import { Order, OrderItem, MenuItem } from '@prisma/client';

// =====================
// ORDER STATUS TYPES
// =====================

export type OrderStatus = 
  | 'AWAITING_PAYMENT' 
  | 'PAYMENT_CONFIRMED' 
  | 'CONFIRMED' 
  | 'PREPARING' 
  | 'READY' 
  | 'DELIVERED' 
  | 'CANCELLED'
  | 'PAYMENT_FAILED';

// =====================
// ORDER CREATION TYPES
// =====================

export interface OrderItemData {
  menuItemId: number;
  quantity: number;
  price: number;
  customizations?: Record<string, any>;
}

export interface CreateOrderData {
  items: OrderItemData[];
  total: number;
  userId?: number;
}

export interface CreateOrderResult {
  order: Order & { items: OrderItem[] };
  message: string;
}

// =====================
// ORDER QUERY TYPES
// =====================

export interface OrderWithDetails extends Order {
  items: (OrderItem & {
    menuItem: Pick<MenuItem, 'name'>;
  })[];
}

export interface OrderStatusResponse {
  id: number;
  status: OrderStatus;
  readyAt: Date | null;
  estimatedReadyTime: Date | null;
  sumupCheckoutId: string | null;
  total: number;
  createdAt: Date;
  items: OrderItemWithDetails[];
}

export interface OrderItemWithDetails {
  id: number;
  menuItemId: number;
  quantity: number;
  price: number;
  name: string;
  customizations: Record<string, any>;
}

// =====================
// ORDER UPDATE TYPES
// =====================

export interface UpdateOrderEstimateData {
  estimatedMinutes: number;
}

export interface OrderEstimateResult {
  id: number;
  estimatedReadyTime: Date;
  status: OrderStatus;
}

// =====================
// PAYMENT VERIFICATION TYPES
// =====================

export interface PaymentVerificationRequest {
  orderId: number;
  userId: number;
}

export interface PaymentVerificationResult {
  message: string;
  orderId: number;
  status: OrderStatus;
  sumupCheckoutId: string;
  sumupStatus: string;
  loyaltyPointsAwarded: number;
}

// =====================
// REPEAT ORDER TYPES
// =====================

export interface RepeatOrderData {
  orderId: number;
  userId: number;
}

export interface RepeatOrderItem {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  customizations: Record<string, any> | null;
}

export interface RepeatOrderResult {
  items: RepeatOrderItem[];
  message: string;
  unavailableItems: string[];
}

// =====================
// ORDER HISTORY TYPES
// =====================

export interface OrderHistoryQuery {
  userId: number;
  includeItems?: boolean;
  status?: OrderStatus[];
  limit?: number;
  offset?: number;
}

export interface OrderWithFullDetails extends Order {
  items: (OrderItem & {
    menuItem: MenuItem;
  })[];
}

// =====================
// ADMIN ORDER TYPES
// =====================

export interface AdminOrderQuery {
  status?: OrderStatus[];
  limit?: number;
  offset?: number;
}

export interface AdminOrderWithDetails extends Order {
  items: (OrderItem & {
    menuItem: MenuItem;
  })[];
  user: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export interface AcceptOrderData {
  orderId: number;
  estimatedMinutes: number;
}

// =====================
// ORDER VALIDATION TYPES
// =====================

export interface OrderValidationResult {
  isValid: boolean;
  errors: string[];
}

// =====================
// LOYALTY INTEGRATION TYPES
// =====================

export interface LoyaltyPointsCalculation {
  points: number;
  multiplier: number;
  baseAmount: number;
} 