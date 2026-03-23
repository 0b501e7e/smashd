import { Order, OrderItem, MenuItem } from '@prisma/client';
import type {
  CreateOrderItemDTO,
  FulfillmentMethodDTO,
  OrderStatusDTO,
  OrderStatusItemDTO,
  OrderStatusResponseDTO
} from '@shared/contracts';

// =====================
// ORDER STATUS TYPES
// =====================

export type OrderStatus = OrderStatusDTO;

// =====================
// ORDER CREATION TYPES
// =====================

export interface OrderItemData extends CreateOrderItemDTO {}

export interface CreateOrderData {
  items: OrderItemData[];
  total?: number;
  userId?: number;
  fulfillmentMethod?: FulfillmentMethodDTO;
  deliveryAddress?: string;
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

export interface OrderStatusResponse extends Omit<OrderStatusResponseDTO, 'items'> {
  items: OrderItemWithDetails[];
}

export interface OrderItemWithDetails extends OrderStatusItemDTO {}

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
  userId?: number;
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
  driver?: {
    id: number;
    name: string;
    email: string;
    phoneNumber?: string;
  } | null;
}

export interface AssignDriverData {
  orderId: number;
  driverId: number;
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
