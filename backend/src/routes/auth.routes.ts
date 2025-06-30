import { Router } from 'express';
import { AuthController } from '../controllers';
import { AuthService } from '../services/auth.service';
import { userRegistrationValidation, userLoginValidation } from '../middleware';
import { PrismaClient } from '@prisma/client';

const router = Router();

// TODO: This should be moved to dependency injection container
const prisma = new PrismaClient();
const authService = new AuthService(prisma);
const authController = new AuthController(authService);

/**
 * @route   POST /v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', userRegistrationValidation, authController.register);

/**
 * @route   POST /v1/auth/login
 * @desc    Login user and get JWT token
 * @access  Public
 */
router.post('/login', userLoginValidation, authController.login);

export default router; 