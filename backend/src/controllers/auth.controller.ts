import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '../config/constants';
import { IAuthService } from '../interfaces/IAuthService';
import { sendSuccess, sendError } from '../utils/response.utils';

/**
 * Auth Controller - Thin HTTP handler that delegates to AuthService
 */
export class AuthController {
  constructor(private authService: IAuthService) { }

  /**
   * User Registration Controller
   * POST /v1/auth/register
   */
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validation is handled by middleware
      const result = await this.authService.register(req.body);
      sendSuccess(res, result, result.message, HTTP_STATUS.CREATED);
    } catch (error) {
      console.error('Registration error:', error);

      if (error instanceof Error && (
        error.message.includes('correo electrónico ya está en uso') ||
        error.message.includes('Email already in use')
      )) {
        sendError(res, 'Email already in use', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      next(error);
    }
  };

  /**
   * User Login Controller
   * POST /v1/auth/login
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validation is handled by middleware
      const result = await this.authService.login(req.body);
      sendSuccess(res, result, 'Login successful');
    } catch (error) {
      console.error('Login error:', error);

      if (error instanceof Error && (
        error.message.includes('Credenciales inválidas') ||
        error.message.includes('Invalid credentials')
      )) {
        sendError(res, 'Invalid credentials', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      next(error);
    }
  };

  /**
   * Forgot Password
   * POST /v1/auth/forgot-password
   */
  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body as { email?: string };
      if (!email) {
        sendError(res, 'Email is required', HTTP_STATUS.BAD_REQUEST);
        return;
      }
      await this.authService.forgotPassword(email);
      sendSuccess(res, null, 'If an account exists, a reset email has been sent');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Reset Password
   * POST /v1/auth/reset-password
   */
  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token, password } = req.body as { token?: string; password?: string };
      if (!token || !password) {
        sendError(res, 'Token and password are required', HTTP_STATUS.BAD_REQUEST);
        return;
      }
      await this.authService.resetPassword(token, password);
      sendSuccess(res, null, 'Password updated successfully');
    } catch (error) {
      if (error instanceof Error && (
        error.message.includes('Token inválido') ||
        error.message.includes('Invalid or expired token')
      )) {
        sendError(res, 'Invalid or expired token', HTTP_STATUS.BAD_REQUEST);
        return;
      }
      next(error);
    }
  };
}
