import { Router } from 'express';
import { AuthController } from '../controllers';
import { userRegistrationValidation, userLoginValidation } from '../middleware';
import { services } from '../config/services';
import rateLimit from 'express-rate-limit';

const router = Router();

// Use centralized service container (single DB connection, shared services)
const authController = new AuthController(services.authService);

// Basic rate limiting for auth sensitive endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
});

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

/**
 * @route   POST /v1/auth/forgot-password
 * @desc    Initiate password reset
 * @access  Public
 */
router.post('/forgot-password', authLimiter, authController.forgotPassword);

/**
 * @route   POST /v1/auth/reset-password
 * @desc    Reset password using token
 * @access  Public
 */
router.post('/reset-password', authLimiter, authController.resetPassword);

export default router; 