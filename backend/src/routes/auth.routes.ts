import { Router } from 'express';
import { register, login } from '../controllers/auth.controller';
import { 
  validateUserRegistration, 
  validateUserLogin 
} from '../middleware/validation.middleware';

const router = Router();

/**
 * @route   POST /v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', ...validateUserRegistration, register);

/**
 * @route   POST /v1/auth/login
 * @desc    Login user and get JWT token
 * @access  Public
 */
router.post('/login', ...validateUserLogin, login);

export default router; 