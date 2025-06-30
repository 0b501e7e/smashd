import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { HTTP_STATUS } from '../config/constants';
import { sendError } from '../utils/response.utils';

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    isOperational: boolean = true,
    code?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code || '';

    // Ensure the name of this error is the same as the class name
    this.name = this.constructor.name;

    // This clips the constructor invocation from the stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Database error handler
 */
export const handleDatabaseError = (error: any): AppError => {
  // Prisma specific errors
  if (error.code === 'P2002') {
    return new AppError(
      'Duplicate entry. This record already exists.',
      HTTP_STATUS.CONFLICT,
      true,
      'DUPLICATE_ENTRY'
    );
  }

  if (error.code === 'P2025') {
    return new AppError(
      'Record not found.',
      HTTP_STATUS.NOT_FOUND,
      true,
      'RECORD_NOT_FOUND'
    );
  }

  if (error.code === 'P2003') {
    return new AppError(
      'Foreign key constraint failed.',
      HTTP_STATUS.BAD_REQUEST,
      true,
      'FOREIGN_KEY_CONSTRAINT'
    );
  }

  // Generic database error
  return new AppError(
    'Database operation failed.',
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    false,
    'DATABASE_ERROR'
  );
};

/**
 * JWT error handler
 */
export const handleJWTError = (error: any): AppError => {
  if (error.name === 'JsonWebTokenError') {
    return new AppError(
      'Invalid token. Please log in again.',
      HTTP_STATUS.UNAUTHORIZED,
      true,
      'INVALID_TOKEN'
    );
  }

  if (error.name === 'TokenExpiredError') {
    return new AppError(
      'Your token has expired. Please log in again.',
      HTTP_STATUS.UNAUTHORIZED,
      true,
      'TOKEN_EXPIRED'
    );
  }

  return new AppError(
    'Authentication failed.',
    HTTP_STATUS.UNAUTHORIZED,
    true,
    'AUTH_ERROR'
  );
};

/**
 * Validation error handler
 */
export const handleValidationError = (error: any): AppError => {
  const message = error.message || 'Validation failed';
  return new AppError(message, HTTP_STATUS.BAD_REQUEST, true, 'VALIDATION_ERROR');
};

/**
 * Cast error handler (for type conversion errors)
 */
export const handleCastError = (error: any): AppError => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return new AppError(message, HTTP_STATUS.BAD_REQUEST, true, 'CAST_ERROR');
};

/**
 * Log error details
 */
const logError = (error: AppError | Error, req: Request): void => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    ...(error instanceof AppError && {
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      code: error.code
    })
  };

  if (error instanceof AppError && error.isOperational) {
    console.warn('⚠️  Operational Error:', errorInfo);
  } else {
    console.error('💥 Programming Error:', errorInfo);
  }
};

/**
 * Send error response in development
 */
const sendErrorDev = (err: AppError, res: Response): void => {
  res.status(err.statusCode).json({
    success: false,
    error: err.message,
    stack: err.stack,
    code: err.code,
    statusCode: err.statusCode
  });
};

/**
 * Send error response in production
 */
const sendErrorProd = (err: AppError, res: Response): void => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    sendError(res, err.message, err.statusCode as any);
  } else {
    // Programming or other unknown error: don't leak error details
    console.error('ERROR:', err);
    sendError(res, 'Something went wrong!', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Global error handling middleware
 */
export const globalErrorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let error = new AppError(
    err.message || 'Something went wrong', 
    Number(err.statusCode) || HTTP_STATUS.INTERNAL_SERVER_ERROR
  );

  // Log the error
  logError(err, req);

  // Handle specific error types
  if (err.code && err.code.startsWith('P')) {
    error = handleDatabaseError(err);
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = handleJWTError(err);
  } else if (err.name === 'ValidationError') {
    error = handleValidationError(err);
  } else if (err.name === 'CastError') {
    error = handleCastError(err);
  }

  // Send appropriate error response
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

/**
 * Catch async errors wrapper
 */
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle unhandled routes (404)
 */
export const handleNotFound = (req: Request, _res: Response, next: NextFunction): void => {
  const err = new AppError(`Can't find ${req.originalUrl} on this server!`, HTTP_STATUS.NOT_FOUND);
  next(err);
};

/**
 * Handle unhandled promise rejections
 */
export const handleUnhandledRejection = (reason: any, _promise: Promise<any>): void => {
  console.error('💥 Unhandled Promise Rejection:', reason);
  console.log('Shutting down...');
  process.exit(1);
};

/**
 * Handle uncaught exceptions
 */
export const handleUncaughtException = (error: Error): void => {
  console.error('💥 Uncaught Exception:', error);
  console.log('Shutting down...');
  process.exit(1);
};

/**
 * Setup process error handlers
 */
export const setupProcessErrorHandlers = (): void => {
  process.on('unhandledRejection', handleUnhandledRejection);
  process.on('uncaughtException', handleUncaughtException);
};

// Export the AppError class and middleware
export { AppError as default }; 