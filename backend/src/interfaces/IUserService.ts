import {
  UserProfileData,
  UserProfileQuery,
  UserOrdersQuery,
  UserOrderWithDetails,
  LastOrderQuery,
  LastOrderResult,
  RepeatOrderQuery,
  RepeatOrderResult,
  UserAccessValidation,
  UserAccessResult,
  UserLoyaltyData,
  UserWithLoyalty,
  UserOrderFilters,
  UserOrderStatistics,
  UserProfileUpdateQuery
} from '../types/user.types';

/**
 * Interface for User Service
 * Handles all user-related business logic including profile management,
 * order history, repeat orders, loyalty integration, and access control
 */
export interface IUserService {
  // =====================
  // USER PROFILE MANAGEMENT
  // =====================
  
  /**
   * Get user profile with loyalty points
   * @param query - User profile query parameters
   * @returns User profile data with loyalty information
   */
  getUserProfile(query: UserProfileQuery): Promise<UserProfileData>;

  /**
   * Update user profile information
   * @param updateQuery - User profile update query with data and authorization
   * @returns Updated user profile data
   */
  updateUserProfile(updateQuery: UserProfileUpdateQuery): Promise<UserProfileData>;

  /**
   * Get user with loyalty points data
   * @param userId - User ID to get loyalty data for
   * @returns User with full loyalty information
   */
  getUserWithLoyalty(userId: number): Promise<UserWithLoyalty | null>;

  // =====================
  // ORDER HISTORY MANAGEMENT
  // =====================
  
  /**
   * Get user's order history with authorization checking
   * @param query - User orders query with access control parameters
   * @returns List of user's orders with optional filtering
   */
  getUserOrders(query: UserOrdersQuery): Promise<UserOrderWithDetails[]>;

  /**
   * Get user's last completed order
   * @param query - Last order query with authorization parameters
   * @returns Most recent completed order or null
   */
  getUserLastOrder(query: LastOrderQuery): Promise<LastOrderResult | null>;

  /**
   * Get user order statistics and analytics
   * @param userId - User ID to get statistics for
   * @param requestingUserId - ID of user making the request
   * @param requestingUserRole - Role of user making the request
   * @returns User order statistics and favorite items
   */
  getUserOrderStatistics(userId: number, requestingUserId: number, requestingUserRole: string): Promise<UserOrderStatistics>;

  // =====================
  // REPEAT ORDER FUNCTIONALITY
  // =====================
  
  /**
   * Prepare repeat order data for user's cart
   * @param query - Repeat order query with authorization parameters
   * @returns Available items for cart with unavailable items list
   */
  repeatOrder(query: RepeatOrderQuery): Promise<RepeatOrderResult>;

  // =====================
  // ACCESS CONTROL & VALIDATION
  // =====================
  
  /**
   * Validate if requesting user can access target user's data
   * @param validation - User access validation parameters
   * @returns Authorization result with reason if denied
   */
  validateUserAccess(validation: UserAccessValidation): Promise<UserAccessResult>;

  /**
   * Check if user exists and is active
   * @param userId - User ID to validate
   * @returns True if user exists and is active
   */
  validateUserExists(userId: number): Promise<boolean>;

  // =====================
  // LOYALTY POINTS INTEGRATION
  // =====================
  
  /**
   * Get user's loyalty points and tier information
   * @param userId - User ID to get loyalty data for
   * @returns Loyalty points data including tier and rewards status
   */
  getUserLoyaltyData(userId: number): Promise<UserLoyaltyData | null>;

  /**
   * Update user's loyalty points (called by other services)
   * @param userId - User ID to update points for
   * @param points - Points to add (positive) or subtract (negative)
   * @param reason - Reason for points change
   * @returns Updated loyalty points total
   */
  updateUserLoyaltyPoints(userId: number, points: number, reason: string): Promise<number>;

  // =====================
  // USER SEARCH & FILTERING
  // =====================
  
  /**
   * Search users by criteria (admin only)
   * @param searchTerm - Search term for name or email
   * @param requestingUserRole - Role of user making the request
   * @param limit - Maximum number of results
   * @returns List of matching users (admin access only)
   */
  searchUsers(searchTerm: string, requestingUserRole: string, limit?: number): Promise<UserProfileData[]>;

  /**
   * Get filtered order history with advanced options
   * @param userId - User ID to get orders for
   * @param filters - Advanced filter options
   * @param requestingUserId - ID of user making the request
   * @param requestingUserRole - Role of user making the request
   * @returns Filtered order history
   */
  getFilteredUserOrders(
    userId: number, 
    filters: UserOrderFilters, 
    requestingUserId: number, 
    requestingUserRole: string
  ): Promise<UserOrderWithDetails[]>;
} 