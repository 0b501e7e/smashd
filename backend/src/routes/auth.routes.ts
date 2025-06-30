import { Router } from 'express';
import { authController } from '../controllers';
import { userRegistrationValidation, userLoginValidation } from '../middleware';

const router = Router();

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