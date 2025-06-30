// API Response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Request types
export interface AuthenticatedRequest extends Express.Request {
  user?: {
    userId: number;
    role: string;
    email: string;
  };
}

// Common utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type ID = number | string;

// Database types (extending Prisma)
export type OrderStatus = 'AWAITING_PAYMENT' | 'PAYMENT_CONFIRMED' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';
export type UserRole = 'USER' | 'ADMIN';
export type MenuCategory = 'BURGER' | 'SIDE' | 'DRINK' | 'DESSERT';

// Error types
export interface AppError extends Error {
  statusCode: number;
  isOperational: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
} 