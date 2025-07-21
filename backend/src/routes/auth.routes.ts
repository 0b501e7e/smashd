import { Router } from 'express';
import { AuthController } from '../controllers';
import { userRegistrationValidation, userLoginValidation } from '../middleware';
import { services } from '../config/services';

const router = Router();

// Use centralized service container (single DB connection, shared services)
const authController = new AuthController(services.authService);

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