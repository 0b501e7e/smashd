import { Router } from 'express';
import { MenuController } from '../controllers';
import { services } from '../config/services';

const router = Router();

// Use centralized service container (single DB connection, shared services)
const menuController = new MenuController(services.menuService);

// Public menu routes
router.get('/promotions', menuController.getPromotions);
router.get('/', menuController.getMenu);
router.get('/customizations', menuController.getCustomizations);
router.get('/:id', menuController.getMenuItem);

// Route for menu item customizations (matches original /v1/menu-items/:itemId/customizations)
router.get('/items/:itemId/customizations', menuController.getMenuItemCustomizations);

export default router; 