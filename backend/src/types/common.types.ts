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

// Request types - re-export from auth.types to avoid duplication
export { AuthenticatedRequest } from './auth.types';

// Common utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type ID = number | string;

// Database types (extending Prisma)
export type OrderStatus = 'AWAITING_PAYMENT' | 'PAYMENT_CONFIRMED' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'PAYMENT_FAILED';
export type UserRole = 'ADMIN' | 'STAFF' | 'DRIVER' | 'CUSTOMER';
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