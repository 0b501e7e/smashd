import { ValidationChain, ValidationError } from 'express-validator';

// Validation schema type
export interface ValidationSchema {
  [key: string]: ValidationChain[];
}

// Validation error response
export interface ValidationErrorResponse {
  success: false;
  error: string;
  details: ValidationError[];
}

// Custom validation result
export interface CustomValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Common validation options
export interface ValidationOptions {
  optional?: boolean;
  trim?: boolean;
  escape?: boolean;
}

// String validation options
export interface StringValidationOptions extends ValidationOptions {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
}

// Number validation options
export interface NumberValidationOptions extends ValidationOptions {
  min?: number;
  max?: number;
  isInteger?: boolean;
}

// Array validation options
export interface ArrayValidationOptions extends ValidationOptions {
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
}

// Email validation options
export interface EmailValidationOptions extends ValidationOptions {
  normalizeEmail?: boolean;
  allowDisplayName?: boolean;
}

// Date validation options
export interface DateValidationOptions extends ValidationOptions {
  format?: string;
  minDate?: Date;
  maxDate?: Date;
}

// File validation options
export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  required?: boolean;
}

// Custom validator function type
export type CustomValidator<T = any> = (value: T, meta: { req: any; location: string; path: string }) => boolean | Promise<boolean>;

// Validation group types for different entities
export interface UserRegistrationValidation {
  email: string;
  password: string;
  name: string;
  dateOfBirth: string;
  address: string;
  phoneNumber: string;
  acceptedTerms: boolean;
}

export interface UserLoginValidation {
  email: string;
  password: string;
}

export interface MenuItemValidation {
  name: string;
  description: string;
  price: number;
  category: 'BURGER' | 'SIDE' | 'DRINK' | 'DESSERT';
  imageUrl: string;
  isAvailable?: boolean;
}

export interface OrderItemValidation {
  menuItemId: number;
  quantity: number;
  price: number;
  customizations?: Record<string, any>;
}

export interface OrderValidation {
  items: OrderItemValidation[];
  total: number;
}

export interface CustomizationCategoryValidation {
  name: string;
  options: {
    name: string;
    price: number;
  }[];
} 