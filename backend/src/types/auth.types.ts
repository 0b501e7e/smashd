import { Request } from 'express';
import { UserRole } from './common.types';

// JWT Payload interface
export interface JwtPayload {
  userId: number;
  role: UserRole;
  email?: string;
  iat?: number;
  exp?: number;
}

// User authentication data
export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  dateOfBirth: Date;
  address: string;
  phoneNumber: string;
  acceptedTerms: boolean;
}

// Minimal user data for responses
export interface UserBasicInfo {
  id: number;
  email: string;
  role: UserRole;
}

// User data for authenticated requests (middleware)
export interface AuthenticatedUser {
  userId: number;
  role: UserRole;
  email: string;
}

// Extended Request interface with user
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

// Login request/response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    role: UserRole;
  };
}

// Registration request type
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  dateOfBirth: string;
  address: string;
  phoneNumber: string;
  acceptedTerms: boolean;
}

export interface RegisterResponse {
  id: number;
  message: string;
}

// Token generation options
export interface TokenOptions {
  expiresIn?: string;
  issuer?: string;
  audience?: string;
} 