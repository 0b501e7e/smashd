import { Router } from 'express';
import { adminController } from '../controllers';
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

// All admin routes require authentication and admin role
router.use(authenticateToken, isAdmin);

// Menu management
router.get('/menu/all', adminController.getAllMenuItems);
router.post('/menu', validateCreateMenuItem, adminController.createMenuItem);
router.put('/menu/:id', validateUpdateMenuItem, adminController.updateMenuItem);
router.patch('/menu/:id/availability', adminController.updateMenuItemAvailability);
router.delete('/menu/:id', adminController.deleteMenuItem);
router.post('/menu-items/upload-image', uploadMenuItemImage.single('menuItemImage'), adminController.uploadMenuItemImage);

// Order management
router.get('/orders', adminController.getAdminOrders);
router.post('/orders/:orderId/accept', validateOrderId, adminController.acceptOrder);
router.post('/orders/:orderId/decline', validateOrderId, adminController.declineOrder);

// Customization management
router.get('/customization-categories', adminController.getCustomizationCategories);
router.post('/customization-categories', validateCreateCustomizationCategory, adminController.createCustomizationCategory);
router.get('/customization-options', adminController.getCustomizationOptions);
router.get('/menu-items/:menuItemId/linked-customization-options', validateMenuItemId, adminController.getLinkedCustomizationOptions);
router.post('/menu-items/:menuItemId/linked-customization-options', validateMenuItemId, adminController.setLinkedCustomizationOptions);

// SumUp integration
router.post('/sync-menu-to-sumup', adminController.syncMenuToSumUp);

export default router; 