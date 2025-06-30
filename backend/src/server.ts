// Load environment configuration first
import { loadEnvironment } from './config/env';
loadEnvironment();

import express, { Request, Response } from 'express';
import { APP_CONFIG, HTTP_STATUS } from './config/constants';
import { services } from './config/services';
import testRoutes from './routes/test.routes';
import authRoutes from './routes/auth.routes';
import menuRoutes from './routes/menu.routes';
import notificationRoutes from './routes/notification.routes';
import userRoutes from './routes/user.routes';
import orderRoutes from './routes/order.routes';
import adminRoutes from './routes/admin.routes';
import paymentRoutes from './routes/payment.routes';
import { initializeLoyaltyCron } from './jobs/loyaltyCron';
import {
  corsMiddleware,
  logCorsConfiguration,
  configureStaticFiles,
  globalErrorHandler,
  handleNotFound,
  setupProcessErrorHandlers
} from './middleware';

const app = express();

// Setup process error handlers first
setupProcessErrorHandlers();

// Log CORS configuration
logCorsConfiguration();

// Middleware setup
app.use(corsMiddleware);
app.use(express.json());

// Configure static file serving
configureStaticFiles(app);

// Root route (matches original server.js)
app.get('/', (_req: Request, res: Response) => {
  res.json({ 
    status: 'Backend is running', 
    timestamp: new Date().toISOString() 
  });
});

// Health check routes
app.get('/health', async (_req: Request, res: Response) => {
  try {
    // Test database connection (matches original /v1/health)
    await services.prisma.$queryRaw`SELECT 1`;
    res.status(HTTP_STATUS.OK).json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      environment: APP_CONFIG.NODE_ENV,
      version: '1.0.0'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// v1 health route (matches original server.js /v1/health)
app.get('/v1/health', async (_req: Request, res: Response) => {
  try {
    await services.prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString() 
    });
  }
});

// API Routes
app.use('/v1/auth', authRoutes);
app.use('/v1/menu', menuRoutes);
app.use('/v1/notifications', notificationRoutes);
app.use('/v1/users', userRoutes);
app.use('/v1/orders', orderRoutes);
app.use('/v1/admin', adminRoutes);
app.use('/v1/payment', paymentRoutes);

// Test routes for validation and authentication middleware
app.use('/v1/test', testRoutes);

// Handle 404 for unmatched routes
app.use(handleNotFound);

// Global error handling middleware (must be last)
app.use(globalErrorHandler);

// Start server
const startServer = (): void => {
  const server = app.listen(APP_CONFIG.PORT, () => {
    console.log(`🚀 TypeScript server running on port ${APP_CONFIG.PORT}`);
    console.log(`🌍 Environment: ${APP_CONFIG.NODE_ENV}`);
    console.log(`📝 Health check: http://localhost:${APP_CONFIG.PORT}/health`);
    console.log(`🧪 Test routes: http://localhost:${APP_CONFIG.PORT}/v1/test/status`);
    console.log(`💾 Database: Connected via Service Container`);
    
    // Initialize loyalty cron jobs
    initializeLoyaltyCron();
  });

  // Graceful shutdown handling
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);
    
    server.close(async () => {
      console.log('✅ HTTP server closed');
      
      try {
        await services.shutdown();
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('❌ Forceful shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  // Listen for shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

if (require.main === module) {
  startServer();
}

export { app }; 