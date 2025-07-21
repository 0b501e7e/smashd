import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response.utils';

const prisma = new PrismaClient();
const analyticsService = new AnalyticsService(prisma);

export const analyticsController = {
  /**
   * GET /analytics/current-week
   * Get current week analytics
   */
  getCurrentWeekAnalytics: async (_req: Request, res: Response) => {
    try {
      const analytics = await analyticsService.getCurrentWeekAnalytics();
      
      sendSuccess(res, analytics, 'Current week analytics retrieved successfully');
    } catch (error: any) {
      console.error('Error getting current week analytics:', error);
      sendError(res, 'Failed to retrieve current week analytics', 500);
    }
  },

  /**
   * GET /analytics/weekly?weeks=4
   * Get analytics for multiple weeks
   */
  getWeeklyAnalyticsRange: async (req: Request, res: Response) => {
    try {
      const weeks = parseInt(req.query['weeks'] as string) || 4;
      
      // Calculate start date (weeks ago from now)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - (weeks * 7));
      
      const analytics = await analyticsService.getWeeklyAnalyticsRange(startDate, endDate);
      
      sendSuccess(res, {
        analytics,
        period: {
          weeks,
          startDate,
          endDate
        }
      }, `Analytics for last ${weeks} weeks retrieved successfully`);
    } catch (error: any) {
      console.error('Error getting weekly analytics range:', error);
      sendError(res, 'Failed to retrieve weekly analytics', 500);
    }
  },

  /**
   * GET /analytics/revenue
   * Get revenue analytics with trends
   */
  getRevenueAnalytics: async (req: Request, res: Response) => {
    try {
      const weeks = parseInt(req.query['weeks'] as string) || 8;
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - (weeks * 7));
      
      const analytics = await analyticsService.getWeeklyAnalyticsRange(startDate, endDate);
      
      // Calculate trends
      const revenueData = analytics.map(week => ({
        weekStart: week.weekStartDate,
        revenue: week.totalRevenue,
        orders: week.totalOrders,
        avgOrderValue: week.avgOrderValue,
        revenuePerHour: week.revenuePerHour
      }));

      // Calculate growth rate (if we have at least 2 weeks)
      let growthRate = 0;
      if (revenueData.length >= 2) {
        const recent = revenueData[0]?.revenue || 0;
        const previous = revenueData[1]?.revenue || 0;
        if (previous > 0) {
          growthRate = ((recent - previous) / previous) * 100;
        }
      }

      const totalRevenue = revenueData.reduce((sum, week) => sum + week.revenue, 0);
      const totalOrders = revenueData.reduce((sum, week) => sum + week.orders, 0);
      const avgRevenue = totalRevenue / weeks;

      sendSuccess(res, {
        summary: {
          totalRevenue,
          totalOrders,
          avgWeeklyRevenue: avgRevenue,
          growthRate: Math.round(growthRate * 100) / 100,
          period: `${weeks} weeks`
        },
        weeklyData: revenueData
      }, 'Revenue analytics retrieved successfully');
    } catch (error: any) {
      console.error('Error getting revenue analytics:', error);
      sendError(res, 'Failed to retrieve revenue analytics', 500);
    }
  },

  /**
   * GET /analytics/menu-performance
   * Get menu performance analytics
   */
  getMenuPerformance: async (req: Request, res: Response) => {
    try {
      const weeks = parseInt(req.query['weeks'] as string) || 4;
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - (weeks * 7));
      
      const analytics = await analyticsService.getWeeklyAnalyticsRange(startDate, endDate);
      
      // Aggregate menu data across all weeks
      const itemAggregation = new Map();
      const categoryAggregation = new Map();
      
      for (const week of analytics) {
        if (week.menuMetrics?.items) {
          for (const item of week.menuMetrics.items) {
            if (!itemAggregation.has(item.itemId)) {
              itemAggregation.set(item.itemId, {
                itemId: item.itemId,
                name: item.name,
                category: item.category,
                totalRevenue: 0,
                totalQuantity: 0,
                totalOrders: 0
              });
            }
            
            const agg = itemAggregation.get(item.itemId);
            agg.totalRevenue += item.revenue;
            agg.totalQuantity += item.totalQuantity;
            agg.totalOrders += item.orderCount;
          }
        }

        if (week.menuMetrics?.categories) {
          for (const category of week.menuMetrics.categories) {
            if (!categoryAggregation.has(category.category)) {
              categoryAggregation.set(category.category, {
                category: category.category,
                totalRevenue: 0,
                totalOrders: 0
              });
            }
            
            const agg = categoryAggregation.get(category.category);
            agg.totalRevenue += category.revenue;
            agg.totalOrders += category.orderCount;
          }
        }
      }

      const topItems = Array.from(itemAggregation.values())
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10);

      const categoryPerformance = Array.from(categoryAggregation.values())
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

      sendSuccess(res, {
        period: `${weeks} weeks`,
        topItems,
        categoryPerformance,
        summary: {
          totalItems: itemAggregation.size,
          totalCategories: categoryAggregation.size,
          totalItemRevenue: Array.from(itemAggregation.values()).reduce((sum, item) => sum + item.totalRevenue, 0)
        }
      }, 'Menu performance analytics retrieved successfully');
    } catch (error: any) {
      console.error('Error getting menu performance:', error);
      sendError(res, 'Failed to retrieve menu performance analytics', 500);
    }
  },

  /**
   * GET /analytics/customers
   * Get customer analytics
   */
  getCustomerAnalytics: async (req: Request, res: Response) => {
    try {
      const weeks = parseInt(req.query['weeks'] as string) || 4;
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - (weeks * 7));
      
      const analytics = await analyticsService.getWeeklyAnalyticsRange(startDate, endDate);
      
      const customerData = analytics.map(week => ({
        weekStart: week.weekStartDate,
        newCustomers: week.newCustomers,
        returningCustomers: week.returningCustomers,
        totalCustomers: week.totalCustomers
      }));

      const totals = {
        totalNewCustomers: customerData.reduce((sum, week) => sum + week.newCustomers, 0),
        totalReturningCustomers: customerData.reduce((sum, week) => sum + week.returningCustomers, 0),
        avgNewCustomersPerWeek: customerData.reduce((sum, week) => sum + week.newCustomers, 0) / weeks,
        avgReturningCustomersPerWeek: customerData.reduce((sum, week) => sum + week.returningCustomers, 0) / weeks
      };

      const retentionRate = totals.totalReturningCustomers > 0 
        ? (totals.totalReturningCustomers / (totals.totalNewCustomers + totals.totalReturningCustomers)) * 100 
        : 0;

      sendSuccess(res, {
        summary: {
          ...totals,
          retentionRate: Math.round(retentionRate * 100) / 100,
          period: `${weeks} weeks`
        },
        weeklyData: customerData
      }, 'Customer analytics retrieved successfully');
    } catch (error: any) {
      console.error('Error getting customer analytics:', error);
      sendError(res, 'Failed to retrieve customer analytics', 500);
    }
  },

  /**
   * POST /analytics/track
   * Track a custom analytics event
   */
  trackEvent: async (req: Request, res: Response) => {
    try {
      const { eventType, sessionId, metadata } = req.body;
      const userId = (req as any).user?.id; // From auth middleware

      if (!eventType) {
        return sendError(res, 'Event type is required', 400);
      }

      await analyticsService.trackEvent(eventType, userId, sessionId, metadata);
      
      sendSuccess(res, null, 'Event tracked successfully');
    } catch (error: any) {
      console.error('Error tracking event:', error);
      sendError(res, 'Failed to track event', 500);
    }
  },

  /**
   * POST /analytics/generate-weekly
   * Manually trigger weekly analytics generation (admin only)
   */
  generateWeeklyAnalytics: async (req: Request, res: Response) => {
    try {
      const { weekStartDate } = req.body;
      
      let startDate: Date;
      if (weekStartDate) {
        startDate = new Date(weekStartDate);
      } else {
        // Default to current week
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
        startDate = new Date(now);
        startDate.setDate(diff);
        startDate.setHours(0, 0, 0, 0);
      }

      const analytics = await analyticsService.generateWeeklyAnalytics(startDate);
      
      sendSuccess(res, analytics, 'Weekly analytics generated successfully');
    } catch (error: any) {
      console.error('Error generating weekly analytics:', error);
      sendError(res, 'Failed to generate weekly analytics', 500);
    }
  }
}; 