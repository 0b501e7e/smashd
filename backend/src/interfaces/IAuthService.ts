import { RegisterRequest, LoginRequest, LoginResponse, RegisterResponse, AuthUser, UserBasicInfo } from '../types/auth.types';
import { ID } from '../types/common.types';

/**
 * Interface for Authentication Service
 * Defines all authentication and user management operations
 */
export interface IAuthService {
  // Authentication
  register(userData: RegisterRequest): Promise<RegisterResponse>;
  login(credentials: LoginRequest): Promise<LoginResponse>;
  
  // User Management  
  getUserById(id: ID): Promise<AuthUser | null>;
  getUserByEmail(email: string): Promise<AuthUser | null>;
  updateUserProfile(id: ID, updateData: Partial<AuthUser>): Promise<AuthUser>;
  
  // Password Management
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hashedPassword: string): Promise<boolean>;
  changePassword(userId: ID, currentPassword: string, newPassword: string): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  
  // JWT Token Management
  generateToken(user: UserBasicInfo): string;
  verifyToken(token: string): Promise<any>;
  
  // Validation
  validateUserExists(email: string): Promise<boolean>;
  validateEmailUnique(email: string): Promise<boolean>;
  
  // Loyalty Integration
  initializeLoyaltyPoints(userId: number): Promise<void>;
} 