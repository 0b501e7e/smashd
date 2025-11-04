import { Response } from 'express';
import { ApiResponse } from '../types/common.types';
import { HTTP_STATUS, HttpStatus } from '../config/constants';

/**
 * Send a successful API response
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Éxito',
  statusCode: HttpStatus = HTTP_STATUS.OK
): void => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message
  };
  res.status(statusCode).json(response);
};

/**
 * Send an error API response
 */
export const sendError = (
  res: Response,
  error: string,
  statusCode: HttpStatus = HTTP_STATUS.INTERNAL_SERVER_ERROR
): void => {
  const response: ApiResponse = {
    success: false,
    error
  };
  res.status(statusCode).json(response);
};

/**
 * Send a validation error response
 */
export const sendValidationError = (
  res: Response,
  errors: Array<{ field: string; message: string }>,
  message = 'Validación fallida'
): void => {
  const response: ApiResponse = {
    success: false,
    error: message,
    data: errors
  };
  res.status(HTTP_STATUS.BAD_REQUEST).json(response);
}; 