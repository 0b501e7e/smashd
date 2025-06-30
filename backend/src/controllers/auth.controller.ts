import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { HTTP_STATUS } from '../config/constants';
import { IAuthService } from '../interfaces/IAuthService';
import { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from '../types/auth.types';

/**
 * Auth Controller - Thin HTTP handler that delegates to AuthService
 */
export class AuthController {
  constructor(private authService: IAuthService) {}

  /**
   * User Registration Controller
   * POST /v1/auth/register
   */
  register = async (req: Request<{}, RegisterResponse, RegisterRequest>, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          errors: errors.array()
        } as any);
        return;
      }

      const result = await this.authService.register(req.body);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: result,
        message: result.message
      });

    } catch (error) {
      console.error('Registration error:', error);
      
      if (error instanceof Error && error.message === 'Email already in use') {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: error.message
        });
        return;
      }

      next(error);
    }
  };

  /**
   * User Login Controller
   * POST /v1/auth/login
   */
  login = async (req: Request<{}, LoginResponse, LoginRequest>, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          errors: errors.array()
        } as any);
        return;
      }

      const result = await this.authService.login(req.body);

      res.json({
        success: true,
        data: result,
        message: 'Login successful'
      });

    } catch (error) {
      console.error('Login error:', error);
      
      if (error instanceof Error && error.message === 'Invalid credentials') {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: error.message
        });
        return;
      }

      next(error);
    }
  };
} 