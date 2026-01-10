import { Router, Request, Response, NextFunction } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { services } from '../config/services';
import {
  authenticateToken,
  isAdmin,
  validateCreateMenuItem,
  validateUpdateMenuItem,
  validateOrderId,
  validateCreateCustomizationCategory,
  validateMenuItemId
} from '../middleware';

const router = Router();

// Use centralized service container (single DB connection, shared services)
const adminController = new AdminController(services.adminService);

// All admin routes require authentication and admin role
router.use(authenticateToken, isAdmin);

// Menu management
router.get('/menu/all', adminController.getAllMenuItems.bind(adminController));
router.post('/menu', validateCreateMenuItem, adminController.createMenuItem.bind(adminController));
router.put('/menu/:id', validateUpdateMenuItem, adminController.updateMenuItem.bind(adminController));
router.patch('/menu/:id/availability', adminController.updateMenuItemAvailability.bind(adminController));
router.delete('/menu/:id', adminController.deleteMenuItem.bind(adminController));

// Order management
router.get('/orders', adminController.getAdminOrders.bind(adminController));
router.post('/orders/:id/accept', validateOrderId, adminController.acceptOrder.bind(adminController));
router.post('/orders/:id/decline', validateOrderId, adminController.declineOrder.bind(adminController));
router.post('/orders/:id/ready', validateOrderId, adminController.markOrderReady.bind(adminController));
router.post('/orders/:id/assign-driver', validateOrderId, adminController.assignDriver.bind(adminController));

// Driver management
router.get('/drivers/available', adminController.getAvailableDrivers.bind(adminController));

// Customization management
router.get('/customization-categories', (req: Request, res: Response, next: NextFunction) => adminController.getCustomizationCategories(req, res, next));
router.post('/customization-categories', validateCreateCustomizationCategory, (req: Request, res: Response, next: NextFunction) => adminController.createCustomizationCategory(req, res, next));
router.put('/customization-categories/:id', (req: Request, res: Response, next: NextFunction) => adminController.updateCustomizationCategory(req, res, next));
router.delete('/customization-categories/:id', (req: Request, res: Response, next: NextFunction) => adminController.deleteCustomizationCategory(req, res, next));

router.get('/customization-options', (req: Request, res: Response, next: NextFunction) => adminController.getCustomizationOptions(req, res, next));
router.post('/customization-options', (req: Request, res: Response, next: NextFunction) => adminController.createCustomizationOption(req, res, next));
router.put('/customization-options/:id', (req: Request, res: Response, next: NextFunction) => adminController.updateCustomizationOption(req, res, next));
router.delete('/customization-options/:id', (req: Request, res: Response, next: NextFunction) => adminController.deleteCustomizationOption(req, res, next));
router.get('/customization-options/:menuItemId', validateMenuItemId, adminController.getLinkedCustomizationOptions.bind(adminController));
router.post('/customization-options/:menuItemId', validateMenuItemId, adminController.setLinkedCustomizationOptions.bind(adminController));

// SumUp integration
router.post('/sync-menu-to-sumup', adminController.syncMenuToSumUp.bind(adminController));

export default router; 