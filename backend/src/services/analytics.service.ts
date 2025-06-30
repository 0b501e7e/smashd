import { PrismaClient } from '@prisma/client';

// Types
export interface AnalyticsEvent {
  id: number;
  eventType: string;
  userId?: number;
  sessionId?: string;
  metadata?: any;
  createdAt: Date;
}

export interface WeeklyMetrics {
  id?: number;
  weekStartDate: Date;
  weekEndDate: Date;
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  revenuePerHour: number;
  newCustomers: number;
  returningCustomers: number;
  totalCustomers: number;
  topItems?: any;
  menuMetrics?: any;
  metadata?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export class AnalyticsService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // =====================
  // EVENT TRACKING METHODS
  // =====================

  /**
   * Track a generic analytics event
   */
  async trackEvent(
    eventType: string,
    userId?: number,
    sessionId?: string,
    metadata?: any
  ): Promise<void> {
    try {
      const data: any = {
        eventType,
        metadata: metadata || {},
      };
      
      if (userId) {
        data.userId = userId;
      }
      
      if (sessionId) {
        data.sessionId = sessionId;
      }

      await this.prisma.analyticsEvent.create({
        data,
      });

      console.log(`📊 Analytics event tracked: ${eventType}`);
    } catch (error) {
      console.error('❌ Failed to track analytics event:', error);
      // Don't throw - analytics failures shouldn't break the app
    }
  }

  /**
   * Track order placement
   */
  async trackOrderPlaced(orderId: number, userId?: number, sessionId?: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { menuItem: true } } }
    });

    if (!order) {
      console.error(`Order ${orderId} not found for analytics tracking`);
      return;
    }

    await this.trackEvent('order_placed', userId, sessionId, {
      orderId,
      total: order.total,
      itemCount: order.items.length,
      items: order.items.map(item => ({
        menuItemId: item.menuItemId,
        name: item.menuItem.name,
        quantity: item.quantity,
        price: item.price
      }))
    });
  }

  /**
   * Track screen/page views
   */
  async trackScreenView(
    screenName: string,
    userId?: number,
    sessionId?: string,
    metadata?: any
  ): Promise<void> {
    await this.trackEvent('screen_viewed', userId, sessionId, {
      screenName,
      ...metadata
    });
  }

  /**
   * Track menu item interactions
   */
  async trackItemInteraction(
    action: 'viewed' | 'clicked' | 'customized' | 'added_to_cart',
    itemId: number,
    userId?: number,
    sessionId?: string,
    metadata?: any
  ): Promise<void> {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: itemId }
    });

    await this.trackEvent(`item_${action}`, userId, sessionId, {
      itemId,
      itemName: menuItem?.name,
      action,
      ...metadata
    });
  }

  /**
   * Track user registration
   */
  async trackUserRegistration(userId: number): Promise<void> {
    await this.trackEvent('user_registered', userId, undefined, {
      userId,
      registrationDate: new Date()
    });
  }

  // =====================
  // WEEKLY AGGREGATION METHODS
  // =====================

  /**
   * Calculate and store weekly analytics
   */
  async generateWeeklyAnalytics(weekStartDate: Date): Promise<WeeklyMetrics> {
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6); // 7 days total
    weekEndDate.setHours(23, 59, 59, 999); // End of day

    console.log(`📊 Generating weekly analytics for ${weekStartDate.toISOString()} to ${weekEndDate.toISOString()}`);

    // Get all orders for the week
    const weeklyOrders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: weekStartDate,
          lte: weekEndDate
        },
        status: {
          not: 'CANCELLED' // Exclude cancelled orders
        }
      },
      include: {
        items: { include: { menuItem: true } },
        user: true
      }
    });

    // Calculate revenue metrics
    const totalRevenue = weeklyOrders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = weeklyOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Assuming 4 hours operation per day, 7 days a week = 28 hours
    const operatingHours = 28; // You can make this configurable
    const revenuePerHour = totalRevenue / operatingHours;

    // Calculate customer metrics
    const customerIds = weeklyOrders
      .filter(order => order.userId)
      .map(order => order.userId!);
    
    const uniqueCustomers = [...new Set(customerIds)];
    const totalCustomers = uniqueCustomers.length;

    // Find new customers (first order in this week)
    const newCustomerCount = await this.calculateNewCustomers(uniqueCustomers, weekStartDate);
    const returningCustomers = totalCustomers - newCustomerCount;

    // Calculate menu performance
    const menuMetrics = await this.calculateMenuMetrics(weeklyOrders);

    // Get top performing items
    const topItems = menuMetrics.items
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 10); // Top 10 items

    const weeklyData = {
      weekStartDate,
      weekEndDate,
      totalRevenue,
      totalOrders,
      avgOrderValue,
      revenuePerHour,
      newCustomers: newCustomerCount,
      returningCustomers,
      totalCustomers,
      topItems,
      menuMetrics,
      metadata: {
        operatingHours,
        dataGeneratedAt: new Date()
      }
    };

    // Store in database
    await this.prisma.weeklyAnalytics.upsert({
      where: { weekStartDate },
      update: weeklyData,
      create: weeklyData
    });

    console.log(`✅ Weekly analytics generated: €${totalRevenue.toFixed(2)} revenue, ${totalOrders} orders`);

    return weeklyData;
  }

  /**
   * Calculate new customers for the week
   */
  private async calculateNewCustomers(customerIds: number[], weekStartDate: Date): Promise<number> {
    let newCustomerCount = 0;

    for (const customerId of customerIds) {
      const firstOrder = await this.prisma.order.findFirst({
        where: { userId: customerId },
        orderBy: { createdAt: 'asc' }
      });

      if (firstOrder && firstOrder.createdAt >= weekStartDate) {
        newCustomerCount++;
      }
    }

    return newCustomerCount;
  }

  /**
   * Calculate detailed menu performance metrics
   */
  private async calculateMenuMetrics(orders: any[]): Promise<any> {
    const itemMetrics = new Map();
    const categoryMetrics = new Map();

    // Process all order items
    for (const order of orders) {
      for (const item of order.items) {
        const itemId = item.menuItemId;
        const itemName = item.menuItem.name;
        const category = item.menuItem.category;
        const itemRevenue = item.price * item.quantity;

        // Item-level metrics
        if (!itemMetrics.has(itemId)) {
          itemMetrics.set(itemId, {
            itemId,
            name: itemName,
            category,
            orderCount: 0,
            totalQuantity: 0,
            revenue: 0,
            avgPrice: 0
          });
        }

        const itemData = itemMetrics.get(itemId);
        itemData.orderCount += 1;
        itemData.totalQuantity += item.quantity;
        itemData.revenue += itemRevenue;
        itemData.avgPrice = itemData.revenue / itemData.totalQuantity;

        // Category-level metrics
        if (!categoryMetrics.has(category)) {
          categoryMetrics.set(category, {
            category,
            orderCount: 0,
            revenue: 0,
            itemCount: 0
          });
        }

        const categoryData = categoryMetrics.get(category);
        categoryData.orderCount += item.quantity;
        categoryData.revenue += itemRevenue;
      }
    }

    // Count unique items per category
    for (const [category] of categoryMetrics) {
      const itemsInCategory = Array.from(itemMetrics.values())
        .filter(item => item.category === category);
      categoryMetrics.get(category).itemCount = itemsInCategory.length;
    }

    return {
      items: Array.from(itemMetrics.values()),
      categories: Array.from(categoryMetrics.values()),
      summary: {
        totalUniqueItems: itemMetrics.size,
        totalCategories: categoryMetrics.size
      }
    };
  }

  // =====================
  // DATA RETRIEVAL METHODS
  // =====================

  /**
   * Get weekly analytics data
   */
  async getWeeklyAnalytics(weekStartDate: Date): Promise<WeeklyMetrics | null> {
    const analytics = await this.prisma.weeklyAnalytics.findUnique({
      where: { weekStartDate }
    });

    return analytics;
  }

  /**
   * Get analytics for multiple weeks
   */
  async getWeeklyAnalyticsRange(startDate: Date, endDate: Date): Promise<WeeklyMetrics[]> {
    const analytics = await this.prisma.weeklyAnalytics.findMany({
      where: {
        weekStartDate: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { weekStartDate: 'desc' }
    });

    return analytics;
  }

  /**
   * Get current week analytics (or generate if missing)
   */
  async getCurrentWeekAnalytics(): Promise<WeeklyMetrics> {
    const now = new Date();
    const weekStartDate = this.getWeekStartDate(now);
    
    let analytics = await this.getWeeklyAnalytics(weekStartDate);
    
    if (!analytics) {
      analytics = await this.generateWeeklyAnalytics(weekStartDate);
    }

    return analytics;
  }

  /**
   * Get the start of the week (Monday) for a given date
   */
  private getWeekStartDate(date: Date): Date {
    const weekStart = new Date(date);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  // =====================
  // MAINTENANCE METHODS
  // =====================

  /**
   * Clean up old analytics events (data retention)
   */
  async cleanupOldEvents(retentionDays: number = 90): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const deletedCount = await this.prisma.analyticsEvent.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    console.log(`🧹 Cleaned up ${deletedCount.count} old analytics events`);
  }
} 