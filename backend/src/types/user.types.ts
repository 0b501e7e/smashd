import { User, Order, OrderItem, MenuItem, LoyaltyPoints } from '@prisma/client';

// =====================
// USER PROFILE TYPES
// =====================

export interface UserProfileData {
  id: number;
  email: string;
  name: string;
  role: string;
  loyaltyPoints: number;
}

export interface UserProfileQuery {
  userId: number;
  includeLoyalty?: boolean;
  includePersonalDetails?: boolean;
}

// =====================
// USER ORDER HISTORY TYPES
// =====================

export interface UserOrdersQuery {
  userId: number;
  requestingUserId: number;
  requestingUserRole: string;
  includeItems?: boolean;
  status?: string[];
  limit?: number;
  offset?: number;
}

export interface UserOrderWithDetails extends Order {
  items: (OrderItem & {
    menuItem: MenuItem;
  })[];
}

// =====================
// LAST ORDER TYPES
// =====================

export interface LastOrderQuery {
  userId: number;
  requestingUserId: number;
  requestingUserRole: string;
  includeItems?: boolean;
}

export interface LastOrderResult extends Order {
  items: (OrderItem & {
    menuItem: MenuItem;
  })[];
}

// =====================
// REPEAT ORDER TYPES
// =====================

export interface RepeatOrderQuery {
  orderId: number;
  requestingUserId: number;
  requestingUserRole: string;
}

export interface RepeatOrderItemData {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  customizations: Record<string, any> | null;
}

export interface RepeatOrderResult {
  items: RepeatOrderItemData[];
  message: string;
  unavailableItems: string[];
}

// =====================
// USER VALIDATION TYPES
// =====================

export interface UserAccessValidation {
  userId: number;
  requestingUserId: number;
  requestingUserRole: string;
}

export interface UserAccessResult {
  isAuthorized: boolean;
  reason?: string;
}

// =====================
// LOYALTY INTEGRATION TYPES
// =====================

export interface UserLoyaltyData {
  points: number;
  tier: string;
  totalSpentThisYear: number;
  birthdayRewardSent: boolean;
}

export interface UserWithLoyalty extends User {
  loyaltyPoints: LoyaltyPoints | null;
}

// =====================
// USER QUERY FILTERS
// =====================

export interface UserOrderFilters {
  status?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  includeItems?: boolean;
  sortBy?: 'createdAt' | 'total' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// =====================
// USER STATISTICS TYPES
// =====================

export interface UserOrderStatistics {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate: Date | null;
  favoriteItems: Array<{
    menuItemId: number;
    name: string;
    orderCount: number;
  }>;
}

// =====================
// USER PREFERENCES TYPES
// =====================

export interface UserPreferences {
  favoriteItems: number[];
  allergies: string[];
  dietaryRestrictions: string[];
  preferredPaymentMethod: string;
}

// =====================
// USER UPDATE TYPES
// =====================

export interface UserProfileUpdateData {
  name?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  dateOfBirth?: Date;
}

export interface UserProfileUpdateQuery {
  userId: number;
  updateData: UserProfileUpdateData;
  requestingUserId: number;
  requestingUserRole: string;
} 