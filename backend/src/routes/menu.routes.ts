import { Router } from 'express';
import { MenuController } from '../controllers';
import { MenuService } from '../services/menu.service';
import { PrismaClient } from '@prisma/client';

const router = Router();

// TODO: This should be moved to dependency injection container
const prisma = new PrismaClient();
const menuService = new MenuService(prisma);
const menuController = new MenuController(menuService);

// Public menu routes
router.get('/', menuController.getMenu);
router.get('/customizations', menuController.getCustomizations);
router.get('/:id', menuController.getMenuItem);

// Route for menu item customizations (matches original /v1/menu-items/:itemId/customizations)
router.get('-items/:itemId/customizations', menuController.getMenuItemCustomizations);

export default router; 