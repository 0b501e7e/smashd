import { Request, Response, NextFunction } from 'express';
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
      // Validation is handled by middleware, no need to check here
      const result = await this.authService.register(req.body);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: result,
        message: result.message
      });

    } catch (error) {
      console.error('Registration error:', error);
      
      if (error instanceof Error && (error.message === 'El correo electrónico ya está en uso' || error.message === 'Email already in use')) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: error.message.includes('correo') ? error.message : 'El correo electrónico ya está en uso'
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
      // Validation is handled by middleware, no need to check here
      const result = await this.authService.login(req.body);

      res.json({
        success: true,
        data: result,
        message: 'Inicio de sesión exitoso'
      });

    } catch (error) {
      console.error('Login error:', error);
      
      if (error instanceof Error && (error.message === 'Credenciales inválidas' || error.message === 'Invalid credentials')) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: error.message.includes('Credenciales') ? error.message : 'Credenciales inválidas'
        });
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
        res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'El correo electrónico es requerido' });
        return;
      }
      await this.authService.forgotPassword(email);
      res.json({ success: true, message: 'Si existe una cuenta, se ha enviado un correo de restablecimiento' });
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
        res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, error: 'El token y la contraseña son requeridos' });
        return;
      }
      await this.authService.resetPassword(token, password);
      res.json({ success: true, message: 'Contraseña actualizada exitosamente' });
    } catch (error) {
      if (error instanceof Error && (error.message.includes('Token inválido') || error.message.includes('Invalid or expired token'))) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ 
          success: false, 
          error: error.message.includes('Token inválido') ? error.message : 'Token inválido o expirado' 
        });
        return;
      }
      next(error);
    }
  };
} 