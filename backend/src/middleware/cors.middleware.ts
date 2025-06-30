import cors, { CorsOptions } from 'cors';
import { Request } from 'express';
import { APP_CONFIG } from '../config/constants';

/**
 * CORS configuration for different environments
 */
const createCorsOptions = (): CorsOptions => {
  const isDevelopment = APP_CONFIG.NODE_ENV === 'development';
  const isProduction = APP_CONFIG.NODE_ENV === 'production';

  // Development CORS - more permissive for local development
  if (isDevelopment) {
    return {
      origin: [
        'http://localhost:3000',  // Next.js frontend
        'http://localhost:3001',  // Alternative frontend port
        'http://localhost:8081',  // React Native Metro bundler
        'http://localhost:19006', // Expo web
        'http://192.168.1.100:3000', // Local network access
        'http://127.0.0.1:3000'   // Alternative localhost
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Cache-Control',
        'Pragma'
      ],
      exposedHeaders: ['Content-Length', 'X-JSON'],
      maxAge: 86400, // 24 hours
      preflightContinue: false,
      optionsSuccessStatus: 200
    };
  }

  // Production CORS - more restrictive
  if (isProduction) {
    const allowedOrigins = [
      'https://smashd.app',           // Production frontend
      'https://www.smashd.app',       // Production frontend with www
      'https://admin.smashd.app',     // Admin panel
      'https://api.smashd.app'        // API domain
    ];

    // Add any additional origins from environment variables
    const additionalOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    allowedOrigins.push(...additionalOrigins);

    return {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.warn(`🚫 CORS blocked origin: ${origin}`);
          callback(new Error('Not allowed by CORS'), false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization'
      ],
      maxAge: 86400, // 24 hours
      preflightContinue: false,
      optionsSuccessStatus: 200
    };
  }

  // Staging/Test environment - moderate restrictions
  return {
    origin: [
      'http://localhost:3000',
      'https://staging.smashd.app',
      'https://test.smashd.app'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control'
    ],
    maxAge: 3600, // 1 hour
    preflightContinue: false,
    optionsSuccessStatus: 200
  };
};

/**
 * Create CORS middleware instance
 */
export const corsMiddleware = cors(createCorsOptions());

/**
 * Custom CORS handler for specific routes that need different settings
 */
export const createCustomCors = (options: Partial<CorsOptions>) => {
  const defaultOptions = createCorsOptions();
  const mergedOptions = { ...defaultOptions, ...options };
  return cors(mergedOptions);
};

/**
 * CORS options for file uploads (may need different settings)
 */
export const uploadCorsOptions: CorsOptions = {
  ...createCorsOptions(),
  methods: ['POST', 'OPTIONS'],
  maxAge: 3600 // Shorter cache for upload endpoints
};

/**
 * CORS middleware for file upload routes
 */
export const uploadCorsMiddleware = cors(uploadCorsOptions);

/**
 * Health check specific CORS (very permissive for monitoring)
 */
export const healthCheckCorsOptions: CorsOptions = {
  origin: '*',
  methods: ['GET'],
  allowedHeaders: ['Content-Type'],
  maxAge: 300 // 5 minutes
};

/**
 * CORS middleware for health check routes
 */
export const healthCheckCorsMiddleware = cors(healthCheckCorsOptions);

/**
 * Log CORS configuration on startup
 */
export const logCorsConfiguration = (): void => {
  const config = createCorsOptions();
  console.log('🌐 CORS Configuration:');
  console.log(`   Environment: ${APP_CONFIG.NODE_ENV}`);
  
  if (Array.isArray(config.origin)) {
    console.log('   Allowed Origins:');
    config.origin.forEach(origin => console.log(`     - ${origin}`));
  } else if (typeof config.origin === 'string') {
    console.log(`   Allowed Origin: ${config.origin}`);
  } else {
    console.log('   Origin: Custom function (production mode)');
  }
  
  console.log(`   Credentials: ${config.credentials}`);
  console.log(`   Methods: ${config.methods}`);
};

/**
 * Preflight handler for complex CORS requests
 */
export const handlePreflight = (req: Request, res: any, next: any): void => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    res.sendStatus(200);
  } else {
    next();
  }
}; 