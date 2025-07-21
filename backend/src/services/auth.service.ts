import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { IAuthService } from '../interfaces/IAuthService';
import { 
  RegisterRequest, 
  LoginRequest, 
  LoginResponse, 
  RegisterResponse,
  AuthUser,
  UserBasicInfo 
} from '../types/auth.types';
import { ID, UserRole } from '../types/common.types';
import { APP_CONFIG } from '../config/constants';

/**
 * Authentication Service Implementation
 * Contains all authentication and user management business logic
 */
export class AuthService implements IAuthService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Register a new user
   */
  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    const { email, password, name, dateOfBirth, address, phoneNumber, acceptedTerms } = userData;

    // Check if email already exists (case-insensitive)
    const emailExists = await this.validateEmailUnique(email);
    if (!emailExists) {
      throw new Error('Email already in use');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create user in transaction to ensure consistency
    const result = await this.prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          name,
          dateOfBirth: new Date(dateOfBirth),
          address,
          phoneNumber,
          acceptedTerms
        },
      });

      // Initialize loyalty points
      await this.initializeLoyaltyPoints(user.id, tx);

      return user;
    });

    console.log(`User registered successfully: ${result.email} (ID: ${result.id})`);

    return {
      id: result.id,
      message: 'User registered successfully'
    };
  }

  /**
   * Authenticate user login
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const { email, password } = credentials;

    // Find user by email with password for authentication
    const user = await this.getUserForAuthentication(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token
    const userInfo: UserBasicInfo = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    const token = this.generateToken(userInfo);

    console.log(`User logged in successfully: ${user.email} (ID: ${user.id})`);

    return {
      token,
      user: userInfo
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(id: ID): Promise<AuthUser | null> {
    const numericId = typeof id === 'string' ? parseInt(id) : id;
    
    if (isNaN(numericId)) {
      throw new Error('Invalid user ID');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: numericId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        dateOfBirth: true,
        address: true,
        phoneNumber: true,
        acceptedTerms: true,
        password: false // Exclude password from results
      }
    });

    return user ? {
      ...user,
      role: user.role as UserRole
    } : null;
  }

  /**
   * Get user by email (case-insensitive) - excludes password
   */
  async getUserByEmail(email: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        dateOfBirth: true,
        address: true,
        phoneNumber: true,
        acceptedTerms: true,
        password: false // Exclude password for security
      }
    });

    return user ? {
      ...user,
      role: user.role as UserRole
    } : null;
  }

  /**
   * Get user by email for authentication (includes password)
   * Private method used only for authentication
   */
  private async getUserForAuthentication(email: string): Promise<(AuthUser & { password: string }) | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        dateOfBirth: true,
        address: true,
        phoneNumber: true,
        acceptedTerms: true,
        password: true // Include password for authentication
      }
    });

    return user ? {
      ...user,
      role: user.role as UserRole
    } : null;
  }

  /**
   * Update user profile
   */
  async updateUserProfile(id: ID, updateData: Partial<AuthUser>): Promise<AuthUser> {
    const numericId = typeof id === 'string' ? parseInt(id) : id;
    
    if (isNaN(numericId)) {
      throw new Error('Invalid user ID');
    }

    // Remove sensitive fields that shouldn't be updated this way
    const { password, ...safeUpdateData } = updateData as any;

    const updatedUser = await this.prisma.user.update({
      where: { id: numericId },
      data: safeUpdateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        dateOfBirth: true,
        address: true,
        phoneNumber: true,
        acceptedTerms: true,
        password: false
      }
    });

    return {
      ...updatedUser,
      role: updatedUser.role as UserRole
    };
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * Change user password
   */
  async changePassword(userId: ID, currentPassword: string, newPassword: string): Promise<void> {
    const numericId = typeof userId === 'string' ? parseInt(userId) : userId;
    
    if (isNaN(numericId)) {
      throw new Error('Invalid user ID');
    }

    // Get current user with password
    const user = await this.prisma.user.findUnique({
      where: { id: numericId },
      select: { password: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await this.verifyPassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password and update
    const hashedNewPassword = await this.hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: numericId },
      data: { password: hashedNewPassword }
    });
  }

  /**
   * Generate JWT token
   */
  generateToken(user: UserBasicInfo): string {
    return jwt.sign(
      { userId: user.id, role: user.role, email: user.email },
      APP_CONFIG.JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<any> {
    try {
      return jwt.verify(token, APP_CONFIG.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Check if user exists by email
   */
  async validateUserExists(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true }
    });
    return !!user;
  }

  /**
   * Check if email is unique (not already taken)
   */
  async validateEmailUnique(email: string): Promise<boolean> {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' }
      },
      select: { id: true }
    });
    return !existingUser; // Returns true if email is unique
  }

  /**
   * Initialize loyalty points for new user
   */
  async initializeLoyaltyPoints(userId: number, tx?: any): Promise<void> {
    const prismaClient = tx || this.prisma;
    
    await prismaClient.loyaltyPoints.create({
      data: {
        userId: userId,
        points: 0
      }
    });
  }
} 