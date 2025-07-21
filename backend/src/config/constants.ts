export const APP_CONFIG = {
  PORT: parseInt(process.env['PORT'] || '5001', 10),
  NODE_ENV: process.env['NODE_ENV'] || 'development',
  JWT_SECRET: process.env['JWT_SECRET'] || '',
  DATABASE_URL: process.env['DATABASE_URL'] || '',
} as const;

export const API_VERSIONS = {
  V1: '/v1',
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export type HttpStatus = typeof HTTP_STATUS[keyof typeof HTTP_STATUS]; 