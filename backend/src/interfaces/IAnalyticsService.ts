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

export interface IAnalyticsService {
  // Event tracking
  trackEvent(eventType: string, userId?: number, sessionId?: string, metadata?: any): Promise<void>;
  trackOrderPlaced(orderId: number, userId?: number, sessionId?: string): Promise<void>;
  trackScreenView(screenName: string, userId?: number, sessionId?: string, metadata?: any): Promise<void>;
  trackItemInteraction(action: 'viewed' | 'clicked' | 'customized' | 'added_to_cart', itemId: number, userId?: number, sessionId?: string, metadata?: any): Promise<void>;
  trackUserRegistration(userId: number): Promise<void>;

  // Weekly analytics
  generateWeeklyAnalytics(weekStartDate: Date): Promise<WeeklyMetrics>;
  getWeeklyAnalytics(weekStartDate: Date): Promise<WeeklyMetrics | null>;
  getWeeklyAnalyticsRange(startDate: Date, endDate: Date): Promise<WeeklyMetrics[]>;
  getCurrentWeekAnalytics(): Promise<WeeklyMetrics>;

  // Maintenance
  cleanupOldEvents(retentionDays?: number): Promise<void>;
} 