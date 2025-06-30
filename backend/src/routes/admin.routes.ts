import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { services } from '../config/services';
import { 
  authenticateToken, 
  isAdmin,
  validateCreateMenuItem,
  validateUpdateMenuItem,
  validateOrderId,
  validateCreateCustomizationCategory,
  validateMenuItemId,
  uploadMenuItemImage
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
router.post('/menu-items/upload-image', uploadMenuItemImage.single('menuItemImage'), adminController.uploadMenuItemImage.bind(adminController));

// Order management
router.get('/orders', adminController.getAdminOrders.bind(adminController));
router.post('/orders/:orderId/accept', validateOrderId, adminController.acceptOrder.bind(adminController));
router.post('/orders/:orderId/decline', validateOrderId, adminController.declineOrder.bind(adminController));

// Customization management
router.get('/customization-categories', adminController.getCustomizationCategories.bind(adminController));
router.post('/customization-categories', validateCreateCustomizationCategory, adminController.createCustomizationCategory.bind(adminController));
router.get('/customization-options', adminController.getCustomizationOptions.bind(adminController));
router.get('/customization-options/:menuItemId', validateMenuItemId, adminController.getLinkedCustomizationOptions.bind(adminController));
router.post('/customization-options/:menuItemId', validateMenuItemId, adminController.setLinkedCustomizationOptions.bind(adminController));

// SumUp integration
router.post('/sync-menu-to-sumup', adminController.syncMenuToSumUp.bind(adminController));

export default router; 