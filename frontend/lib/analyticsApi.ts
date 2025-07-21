const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/v1';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

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
  averageOrderValue: number;
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  weeklyData: Array<{
    week: string;
    revenue: number;
  }>;
}

export interface MenuPerformance {
  itemName: string;
  sales: number;
  revenue: number;
}

export interface CustomerAnalytics {
  newCustomers: number;
  returningCustomers: number;
  averageOrderValue: number;
  totalCustomers: number;
  weeklyData: Array<{
    week: string;
    newCustomers: number;
    returningCustomers: number;
  }>;
}

export const analyticsAPI = {
  async getCurrentWeek(): Promise<WeeklyAnalytics> {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/current-week`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

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
      const response = await fetch(`${API_BASE_URL}/analytics/revenue?weeks=${weeks}`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Analytics API Error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || { totalRevenue: 0, weeklyData: [] };
    } catch (error) {
      console.error('Failed to fetch revenue analytics:', error);
      throw error;
    }
  },

  async getMenuPerformance(weeks: number = 4): Promise<MenuPerformance> {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/menu-performance?weeks=${weeks}`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Analytics API Error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Failed to fetch menu performance:', error);
      throw error;
    }
  },

  async getCustomers(weeks: number = 4): Promise<CustomerAnalytics> {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/customers?weeks=${weeks}`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Analytics API Error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || { newCustomers: 0, returningCustomers: 0, averageOrderValue: 0, totalCustomers: 0, weeklyData: [] };
    } catch (error) {
      console.error('Failed to fetch customer analytics:', error);
      throw error;
    }
  },

  async generateWeeklyAnalytics(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/generate-weekly`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

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