import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { authenticateToken, isAdmin } from '../middleware/auth.middleware';

const router = Router();

// All analytics routes require authentication
router.use(authenticateToken);

// Analytics Dashboard Routes (Admin only)
router.get('/current-week', isAdmin, analyticsController.getCurrentWeekAnalytics);
router.get('/weekly', isAdmin, analyticsController.getWeeklyAnalyticsRange);
router.get('/revenue', isAdmin, analyticsController.getRevenueAnalytics);
router.get('/menu-performance', isAdmin, analyticsController.getMenuPerformance);
router.get('/customers', isAdmin, analyticsController.getCustomerAnalytics);

// Event tracking (any authenticated user)
router.post('/track', analyticsController.trackEvent);

// Admin-only management routes
router.post('/generate-weekly', isAdmin, analyticsController.generateWeeklyAnalytics);

export default router; 