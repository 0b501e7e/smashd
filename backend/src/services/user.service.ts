import { PrismaClient } from '@prisma/client';
import { IUserService } from '../interfaces/IUserService';
import {
  UserProfileData,
  UserProfileQuery,
  UserOrdersQuery,
  UserOrderWithDetails,
  LastOrderQuery,
  LastOrderResult,
  RepeatOrderQuery,
  RepeatOrderResult,
  RepeatOrderItemData,
  UserAccessValidation,
  UserAccessResult,
  UserLoyaltyData,
  UserWithLoyalty,
  UserOrderFilters,
  UserOrderStatistics,
  UserProfileUpdateQuery
} from '../types/user.types';

/**
 * UserService - Handles all user-related business logic
 * 
 * This service manages:
 * - User profile management with loyalty integration
 * - Order history retrieval with proper authorization
 * - Repeat order functionality with item availability checking
 * - User access control and validation
 * - Loyalty points integration and management
 * - User statistics and analytics
 */
export class UserService implements IUserService {
  constructor(private prisma: PrismaClient) { }

  // =====================
  // USER PROFILE MANAGEMENT
  // =====================

  async getUserProfile(query: UserProfileQuery): Promise<UserProfileData> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: query.userId },
        include: {
          loyaltyPoints: query.includeLoyalty !== false
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const profileData: UserProfileData = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        loyaltyPoints: user.loyaltyPoints?.points || 0
      };

      console.log(`UserService: Retrieved profile for user ${query.userId}`);
      return profileData;
    } catch (error) {
      console.error(`UserService: Error fetching user profile ${query.userId}:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to retrieve user profile');
    }
  }

  async updateUserProfile(updateQuery: UserProfileUpdateQuery): Promise<UserProfileData> {
    try {
      // Validate user can update this profile
      const accessValidation = await this.validateUserAccess({
        userId: updateQuery.userId,
        requestingUserId: updateQuery.requestingUserId,
        requestingUserRole: updateQuery.requestingUserRole
      });

      if (!accessValidation.isAuthorized) {
        throw new Error(accessValidation.reason || 'Not authorized to update this profile');
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: updateQuery.userId },
        data: updateQuery.updateData,
        include: { loyaltyPoints: true }
      });

      const profileData: UserProfileData = {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        loyaltyPoints: updatedUser.loyaltyPoints?.points || 0
      };

      console.log(`UserService: Updated profile for user ${updateQuery.userId}`);
      return profileData;
    } catch (error) {
      console.error(`UserService: Error updating user profile ${updateQuery.userId}:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update user profile');
    }
  }

  async getUserWithLoyalty(userId: number): Promise<UserWithLoyalty | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { loyaltyPoints: true }
      });

      return user as UserWithLoyalty | null;
    } catch (error) {
      console.error(`UserService: Error fetching user with loyalty ${userId}:`, error);
      throw new Error('Failed to retrieve user with loyalty data');
    }
  }

  // =====================
  // ORDER HISTORY MANAGEMENT
  // =====================

  async getUserOrders(query: UserOrdersQuery): Promise<UserOrderWithDetails[]> {
    try {
      // Validate user can access these orders
      const accessValidation = await this.validateUserAccess({
        userId: query.userId,
        requestingUserId: query.requestingUserId,
        requestingUserRole: query.requestingUserRole
      });

      if (!accessValidation.isAuthorized) {
        throw new Error(accessValidation.reason || 'Not authorized to view these orders');
      }

      const whereClause: any = { userId: query.userId };

      if (query.status) {
        whereClause.status = { in: query.status };
      }

      const queryOptions: any = {
        where: whereClause,
        orderBy: { createdAt: 'desc' }
      };

      if (query.includeItems !== false) {
        queryOptions.include = {
          items: {
            include: { menuItem: true }
          }
        };
      }

      if (query.limit !== undefined) queryOptions.take = query.limit;
      if (query.offset !== undefined) queryOptions.skip = query.offset;

      const orders = await this.prisma.order.findMany(queryOptions);

      console.log(`UserService: Retrieved ${orders.length} orders for user ${query.userId}`);
      return orders as UserOrderWithDetails[];
    } catch (error) {
      console.error(`UserService: Error fetching user orders for user ${query.userId}:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to retrieve user orders');
    }
  }

  async getUserLastOrder(query: LastOrderQuery): Promise<LastOrderResult | null> {
    try {
      // Validate user can access this order
      const accessValidation = await this.validateUserAccess({
        userId: query.userId,
        requestingUserId: query.requestingUserId,
        requestingUserRole: query.requestingUserRole
      });

      if (!accessValidation.isAuthorized) {
        throw new Error(accessValidation.reason || 'Not authorized to view this order');
      }

      let lastOrder;
      if (query.includeItems !== false) {
        lastOrder = await this.prisma.order.findFirst({
          where: {
            userId: query.userId,
            status: { in: ['PAYMENT_CONFIRMED', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'] }
          },
          include: {
            items: {
              include: { menuItem: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        });
      } else {
        lastOrder = await this.prisma.order.findFirst({
          where: {
            userId: query.userId,
            status: { in: ['PAYMENT_CONFIRMED', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'] }
          },
          orderBy: { createdAt: 'desc' }
        });
      }

      if (lastOrder) {
        console.log(`UserService: Retrieved last order ${lastOrder.id} for user ${query.userId}`);
      } else {
        console.log(`UserService: No previous orders found for user ${query.userId}`);
      }

      return lastOrder as LastOrderResult | null;
    } catch (error) {
      console.error(`UserService: Error fetching last order for user ${query.userId}:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to retrieve last order');
    }
  }

  async getUserOrderStatistics(userId: number, requestingUserId: number, requestingUserRole: string): Promise<UserOrderStatistics> {
    try {
      // Validate access
      const accessValidation = await this.validateUserAccess({
        userId,
        requestingUserId,
        requestingUserRole
      });

      if (!accessValidation.isAuthorized) {
        throw new Error(accessValidation.reason || 'Not authorized to view order statistics');
      }

      // Get all completed orders for the user
      const orders = await this.prisma.order.findMany({
        where: {
          userId,
          status: { in: ['DELIVERED', 'READY'] }
        },
        include: {
          items: {
            include: { menuItem: true }
          }
        }
      });

      const totalOrders = orders.length;
      const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
      const lastOrderDate = orders.length > 0 ? orders[0]?.createdAt || null : null;

      // Calculate favorite items
      const itemCounts = new Map<number, { name: string; count: number }>();
      orders.forEach(order => {
        order.items.forEach(item => {
          const existing = itemCounts.get(item.menuItemId);
          if (existing) {
            existing.count += item.quantity;
          } else {
            itemCounts.set(item.menuItemId, {
              name: item.menuItem.name,
              count: item.quantity
            });
          }
        });
      });

      const favoriteItems = Array.from(itemCounts.entries())
        .map(([menuItemId, data]) => ({
          menuItemId,
          name: data.name,
          orderCount: data.count
        }))
        .sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, 5);

      const statistics: UserOrderStatistics = {
        totalOrders,
        totalSpent,
        averageOrderValue,
        lastOrderDate,
        favoriteItems
      };

      console.log(`UserService: Generated statistics for user ${userId}`);
      return statistics;
    } catch (error) {
      console.error(`UserService: Error generating statistics for user ${userId}:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to generate user statistics');
    }
  }

  // =====================
  // REPEAT ORDER FUNCTIONALITY
  // =====================

  async repeatOrder(query: RepeatOrderQuery): Promise<RepeatOrderResult> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: query.orderId },
        include: {
          items: {
            include: { menuItem: true }
          }
        }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // Validate user can repeat this order
      const accessValidation = await this.validateUserAccess({
        userId: order.userId || 0,
        requestingUserId: query.requestingUserId,
        requestingUserRole: query.requestingUserRole
      });

      if (!accessValidation.isAuthorized) {
        throw new Error(accessValidation.reason || 'Not authorized to repeat this order');
      }

      // Check availability of items and prepare response
      const availableItems: RepeatOrderItemData[] = [];
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

      const result: RepeatOrderResult = {
        items: availableItems,
        message,
        unavailableItems
      };

      console.log(`UserService: Prepared repeat order for order ${query.orderId} - ${availableItems.length} available, ${unavailableItems.length} unavailable`);
      return result;
    } catch (error) {
      console.error(`UserService: Error repeating order ${query.orderId}:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to repeat order');
    }
  }

  // =====================
  // ACCESS CONTROL & VALIDATION
  // =====================

  async validateUserAccess(validation: UserAccessValidation): Promise<UserAccessResult> {
    try {
      // Admin can access any user's data
      if (validation.requestingUserRole === 'ADMIN') {
        return { isAuthorized: true };
      }

      // Users can only access their own data
      if (validation.userId === validation.requestingUserId) {
        return { isAuthorized: true };
      }

      return {
        isAuthorized: false,
        reason: 'Not authorized to access this user\'s data'
      };
    } catch (error) {
      console.error('UserService: Error validating user access:', error);
      return {
        isAuthorized: false,
        reason: 'Error validating access permissions'
      };
    }
  }

  async validateUserExists(userId: number): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true }
      });

      return user !== null;
    } catch (error) {
      console.error(`UserService: Error validating user exists ${userId}:`, error);
      return false;
    }
  }

  // =====================
  // LOYALTY POINTS INTEGRATION
  // =====================

  async getUserLoyaltyData(userId: number): Promise<UserLoyaltyData | null> {
    try {
      const loyaltyPoints = await this.prisma.loyaltyPoints.findUnique({
        where: { userId }
      });

      if (!loyaltyPoints) {
        return null;
      }

      // Calculate additional loyalty metrics
      const currentYear = new Date().getFullYear();
      const yearStart = new Date(currentYear, 0, 1);

      const ordersThisYear = await this.prisma.order.findMany({
        where: {
          userId,
          createdAt: { gte: yearStart },
          status: { in: ['DELIVERED', 'READY'] }
        }
      });

      const totalSpentThisYear = ordersThisYear.reduce((sum, order) => sum + order.total, 0);

      // Determine tier based on points
      let tier = 'Bronze';
      if (loyaltyPoints.points >= 1000) tier = 'Gold';
      else if (loyaltyPoints.points >= 500) tier = 'Silver';

      const loyaltyData: UserLoyaltyData = {
        points: loyaltyPoints.points,
        tier,
        totalSpentThisYear,
        birthdayRewardSent: loyaltyPoints.birthdayRewardSent
      };

      console.log(`UserService: Retrieved loyalty data for user ${userId} - ${loyaltyPoints.points} points, ${tier} tier`);
      return loyaltyData;
    } catch (error) {
      console.error(`UserService: Error fetching loyalty data for user ${userId}:`, error);
      throw new Error('Failed to retrieve loyalty data');
    }
  }

  async updateUserLoyaltyPoints(userId: number, points: number, reason: string): Promise<number> {
    try {
      const result = await this.prisma.loyaltyPoints.upsert({
        where: { userId },
        update: {
          points: { increment: points }
        },
        create: {
          userId,
          points: Math.max(0, points) // Ensure we don't create negative points
        }
      });

      console.log(`UserService: Updated loyalty points for user ${userId}: ${points > 0 ? '+' : ''}${points} points (${reason}). New total: ${result.points}`);
      return result.points;
    } catch (error) {
      console.error(`UserService: Error updating loyalty points for user ${userId}:`, error);
      throw new Error('Failed to update loyalty points');
    }
  }

  // =====================
  // USER SEARCH & FILTERING
  // =====================

  async searchUsers(searchTerm: string, requestingUserRole: string, limit: number = 10): Promise<UserProfileData[]> {
    try {
      // Only admins can search users
      if (requestingUserRole !== 'ADMIN') {
        throw new Error('Not authorized to search users');
      }

      const users = await this.prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        include: { loyaltyPoints: true },
        take: limit,
        orderBy: { createdAt: 'desc' }
      });

      const userProfiles: UserProfileData[] = users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        loyaltyPoints: user.loyaltyPoints?.points || 0
      }));

      console.log(`UserService: Found ${userProfiles.length} users matching search term "${searchTerm}"`);
      return userProfiles;
    } catch (error) {
      console.error(`UserService: Error searching users with term "${searchTerm}":`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to search users');
    }
  }

  async getFilteredUserOrders(
    userId: number,
    filters: UserOrderFilters,
    requestingUserId: number,
    requestingUserRole: string
  ): Promise<UserOrderWithDetails[]> {
    try {
      // Validate access
      const accessValidation = await this.validateUserAccess({
        userId,
        requestingUserId,
        requestingUserRole
      });

      if (!accessValidation.isAuthorized) {
        throw new Error(accessValidation.reason || 'Not authorized to view these orders');
      }

      const whereClause: any = { userId };

      // Apply filters
      if (filters.status) {
        whereClause.status = { in: filters.status };
      }

      if (filters.dateFrom || filters.dateTo) {
        whereClause.createdAt = {};
        if (filters.dateFrom) whereClause.createdAt.gte = filters.dateFrom;
        if (filters.dateTo) whereClause.createdAt.lte = filters.dateTo;
      }

      const queryOptions: any = {
        where: whereClause,
        orderBy: {
          [filters.sortBy || 'createdAt']: filters.sortOrder || 'desc'
        }
      };

      if (filters.includeItems !== false) {
        queryOptions.include = {
          items: {
            include: { menuItem: true }
          }
        };
      }

      const orders = await this.prisma.order.findMany(queryOptions);

      console.log(`UserService: Retrieved ${orders.length} filtered orders for user ${userId}`);
      return orders as UserOrderWithDetails[];
    } catch (error) {
      console.error(`UserService: Error fetching filtered orders for user ${userId}:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to retrieve filtered orders');
    }
  }
} 