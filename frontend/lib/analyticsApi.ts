import { api } from './api';

export interface WeeklyAnalytics {
  week: string;
  revenue: number;
  orders: number;
  customers: number;
  weekStartDate: string;
  weekEndDate: string;
  totalRevenue: number;
  revenuePerHour: number;
  totalOrders: number;
  avgOrderValue: number; // Changed from averageOrderValue to match backend
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
}

export interface RevenueAnalytics {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    avgWeeklyRevenue: number;
    growthRate: number;
    period: string;
  };
  weeklyData: Array<{
    weekStart: string;
    revenue: number;
    orders: number;
    avgOrderValue: number;
    revenuePerHour: number;
  }>;
}

export interface MenuPerformance {
  period: string;
  topItems: Array<{
    itemId: number;
    name: string;
    category: string;
    totalRevenue: number;
    totalQuantity: number;
    totalOrders: number;
  }>;
  categoryPerformance: Array<{
    category: string;
    totalRevenue: number;
    totalOrders: number;
  }>;
  summary: {
    totalItems: number;
    totalCategories: number;
    totalItemRevenue: number;
  };
}

export interface CustomerAnalytics {
  summary: {
    totalNewCustomers: number;
    totalReturningCustomers: number;
    avgNewCustomersPerWeek: number;
    avgReturningCustomersPerWeek: number;
    retentionRate: number;
    period: string;
  };
  weeklyData: Array<{
    weekStart: string;
    newCustomers: number;
    returningCustomers: number;
    totalCustomers: number;
  }>;
}

export const analyticsAPI = {
  async getCurrentWeek(): Promise<WeeklyAnalytics> {
    try {
      const response = await api.get('/analytics/current-week');

      if (!response.ok) {
        throw new Error(`Analytics API Error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || {};
    } catch (error) {
      console.error('Failed to fetch current week analytics:', error);
      throw error;
    }
  },

  async getRevenue(weeks: number = 8): Promise<RevenueAnalytics> {
    try {
      const response = await api.get(`/analytics/revenue?weeks=${weeks}`);

      if (!response.ok) {
        throw new Error(`Analytics API Error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || { summary: { totalRevenue: 0, totalOrders: 0, avgWeeklyRevenue: 0, growthRate: 0, period: '' }, weeklyData: [] };
    } catch (error) {
      console.error('Failed to fetch revenue analytics:', error);
      throw error;
    }
  },

  async getMenuPerformance(weeks: number = 4): Promise<MenuPerformance> {
    try {
      const response = await api.get(`/analytics/menu-performance?weeks=${weeks}`);

      if (!response.ok) {
        throw new Error(`Analytics API Error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || { period: '', topItems: [], categoryPerformance: [], summary: { totalItems: 0, totalCategories: 0, totalItemRevenue: 0 } };
    } catch (error) {
      console.error('Failed to fetch menu performance:', error);
      throw error;
    }
  },

  async getCustomers(weeks: number = 4): Promise<CustomerAnalytics> {
    try {
      const response = await api.get(`/analytics/customers?weeks=${weeks}`);

      if (!response.ok) {
        throw new Error(`Analytics API Error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || {
        summary: {
          totalNewCustomers: 0,
          totalReturningCustomers: 0,
          avgNewCustomersPerWeek: 0,
          avgReturningCustomersPerWeek: 0,
          retentionRate: 0,
          period: ''
        },
        weeklyData: []
      };
    } catch (error) {
      console.error('Failed to fetch customer analytics:', error);
      throw error;
    }
  },

  async generateWeeklyAnalytics(): Promise<void> {
    try {
      const response = await api.post('/analytics/generate-weekly', {});

      if (!response.ok) {
        throw new Error(`Analytics API Error: ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to generate weekly analytics:', error);
      throw error;
    }
  }
};

// Also export as default for backward compatibility
export default analyticsAPI; 