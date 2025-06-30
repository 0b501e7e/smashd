import express, { Request, Response } from 'express';
import { APP_CONFIG, HTTP_STATUS } from './config/constants';
import testRoutes from './routes/test.routes';
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

// Health check route
app.get('/health', (_req: Request, res: Response) => {
  res.status(HTTP_STATUS.OK).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: APP_CONFIG.NODE_ENV,
    version: '1.0.0'
  });
});

// Test routes for validation and authentication middleware
app.use('/test', testRoutes);

// Handle 404 for unmatched routes
app.use(handleNotFound);

// Global error handling middleware (must be last)
app.use(globalErrorHandler);

// Start server
const startServer = (): void => {
  app.listen(APP_CONFIG.PORT, () => {
    console.log(`🚀 TypeScript server running on port ${APP_CONFIG.PORT}`);
    console.log(`🌍 Environment: ${APP_CONFIG.NODE_ENV}`);
    console.log(`📝 Health check: http://localhost:${APP_CONFIG.PORT}/health`);
    console.log(`🧪 Test routes: http://localhost:${APP_CONFIG.PORT}/test/status`);
  });
};

if (require.main === module) {
  startServer();
}

export { app }; 