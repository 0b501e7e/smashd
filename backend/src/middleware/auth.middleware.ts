import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, JwtPayload, AuthenticatedUser } from '../types/auth.types';
import { HTTP_STATUS } from '../config/constants';
import { sendError } from '../utils/response.utils';

/**
 * Middleware to authenticate JWT tokens
 * Extracts token from Authorization header and verifies it
 */
export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      sendError(res, 'Access token required', HTTP_STATUS.UNAUTHORIZED);
      return;
    }

    const jwtSecret = process.env['JWT_SECRET'];
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      sendError(res, 'Server configuration error', HTTP_STATUS.INTERNAL_SERVER_ERROR);
      return;
    }

    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        console.error('JWT Verification Error:', err.message);
        
        // Handle specific JWT errors
        if (err.name === 'TokenExpiredError') {
          sendError(res, 'Token has expired', HTTP_STATUS.UNAUTHORIZED);
          return;
        }
        
        if (err.name === 'JsonWebTokenError') {
          sendError(res, 'Invalid token', HTTP_STATUS.FORBIDDEN);
          return;
        }
        
        sendError(res, 'Token verification failed', HTTP_STATUS.FORBIDDEN);
        return;
      }

      // Type assertion with validation
      const payload = decoded as JwtPayload;
      
      if (!payload.userId || !payload.role) {
        sendError(res, 'Invalid token payload', HTTP_STATUS.FORBIDDEN);
        return;
      }

      // Attach user to request
      req.user = {
        userId: payload.userId,
        role: payload.role,
        email: payload.email || ''
      } as AuthenticatedUser;

      next();
    });
  } catch (error) {
    console.error('Authentication middleware error:', error);
    sendError(res, 'Authentication failed', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Middleware to check if authenticated user has admin role
 * Must be used after authenticateToken middleware
 */
export const isAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', HTTP_STATUS.UNAUTHORIZED);
      return;
    }

    if (req.user.role !== 'ADMIN') {
      sendError(res, 'Admin access required', HTTP_STATUS.FORBIDDEN);
      return;
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    sendError(res, 'Authorization failed', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't fail if token is missing
 */
export const optionalAuth = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      // No token provided, continue without authentication
      next();
      return;
    }

    const jwtSecret = process.env['JWT_SECRET'];
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      next();
      return;
    }

    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        // Token is invalid, but we continue without authentication
        console.warn('Optional auth - invalid token:', err.message);
        next();
        return;
      }

      const payload = decoded as JwtPayload;
      
      if (payload.userId && payload.role) {
        req.user = {
          userId: payload.userId,
          role: payload.role,
          email: payload.email || ''
        } as AuthenticatedUser;
      }

      next();
    });
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Continue without authentication on error
    next();
  }
};

/**
 * Middleware to check if user owns the resource or is admin
 * Compares req.user.userId with req.params.userId
 */
export const isOwnerOrAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', HTTP_STATUS.UNAUTHORIZED);
      return;
    }

    const userIdParam = req.params['userId'];
    
    if (!userIdParam) {
      sendError(res, 'User ID parameter required', HTTP_STATUS.BAD_REQUEST);
      return;
    }
    
    const resourceUserId = parseInt(userIdParam, 10);
    
    if (isNaN(resourceUserId)) {
      sendError(res, 'Invalid user ID', HTTP_STATUS.BAD_REQUEST);
      return;
    }

    // Allow if user is admin or owns the resource
    if (req.user.role === 'ADMIN' || req.user.userId === resourceUserId) {
      next();
      return;
    }

    sendError(res, 'Access denied', HTTP_STATUS.FORBIDDEN);
  } catch (error) {
    console.error('Owner/Admin middleware error:', error);
    sendError(res, 'Authorization failed', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}; 