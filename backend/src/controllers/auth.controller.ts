import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { HTTP_STATUS, APP_CONFIG } from '../config/constants';
import { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from '../types/auth.types';

const prisma = new PrismaClient();

/**
 * User Registration Controller
 * POST /v1/auth/register
 */
export const register = async (req: Request<{}, RegisterResponse, RegisterRequest>, res: Response<RegisterResponse>): Promise<void> => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      errors: errors.array()
    } as any);
    return;
  }

  const { email, password, name, dateOfBirth, address, phoneNumber, acceptedTerms } = req.body;

  try {
    // Check if email already exists (case-insensitive)
    const existingUser = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' }
      }
    });

    if (existingUser) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Email already in use'
      } as any);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
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

    // Create initial loyalty points record for the user
    await prisma.loyaltyPoints.create({
      data: {
        userId: user.id,
        points: 0
      }
    });

    console.log(`User registered successfully: ${user.email} (ID: ${user.id})`);

    res.status(HTTP_STATUS.CREATED).json({
      id: user.id,
      message: 'User registered successfully'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Error registering user'
    } as any);
  }
};

/**
 * User Login Controller
 * POST /v1/auth/login
 */
export const login = async (req: Request<{}, LoginResponse, LoginRequest>, res: Response<LoginResponse>): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      errors: errors.array()
    } as any);
    return;
  }

  const { email, password } = req.body;

  try {
    // Find user by email (case-insensitive)
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Invalid credentials'
      } as any);
      return;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Invalid credentials'
      } as any);
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      APP_CONFIG.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log(`User logged in successfully: ${user.email} (ID: ${user.id})`);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Error logging in'
    } as any);
  }
};

// Export all auth controllers
export const authController = {
  register,
  login
}; 