import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '../config/constants';
import { IMenuService } from '../interfaces/IMenuService';
import { sendSuccess, sendError } from '../utils/response.utils';
import { MenuQueryOptions } from '../types/menu.types';

/**
 * Menu Controller - Thin HTTP handler that delegates to MenuService
 */
export class MenuController {
  constructor(private menuService: IMenuService) { }

  /**
   * Get all available menu items
   * GET /v1/menu
   */
  getMenu = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('Received request for menu items');

      const options: MenuQueryOptions = {
        includeUnavailable: req.query['includeUnavailable'] === 'true',
        category: req.query['category'] as any,
        searchTerm: req.query['searchTerm'] as string,
        orderBy: (req.query['orderBy'] as any) || 'category',
        orderDirection: (req.query['orderDirection'] as any) || 'asc'
      };

      const menuItems = await this.menuService.getAllMenuItems(options);

      console.log(`Sending ${menuItems.length} menu items`);
      sendSuccess(res, menuItems, 'Menu items retrieved successfully');
    } catch (error) {
      console.error('Error fetching menu items:', error);
      next(error);
    }
  };

  /**
   * Get all customization options
   * GET /v1/menu/customizations
   */
  getCustomizations = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('Received request for customization options');

      const categoriesWithOptions = await this.menuService.getAllCustomizations();

      console.log(`Sending ${categoriesWithOptions.length} customization categories`);
      sendSuccess(res, categoriesWithOptions, 'Customization options retrieved successfully');
    } catch (error) {
      console.error('Error fetching customization options:', error);
      next(error);
    }
  };

  /**
   * Get customization options for a specific menu item
   * GET /v1/menu/:itemId/customizations
   */
  getMenuItemCustomizations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { itemId } = req.params;
      console.log(`Received request for customizations for menu item ID: ${itemId}`);

      if (!itemId) {
        sendError(res, 'Menu item ID is required', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const customizations = await this.menuService.getMenuItemCustomizations(itemId);

      console.log('Sending menu item customizations');
      sendSuccess(res, customizations, 'Menu item customizations retrieved successfully');
    } catch (error) {
      console.error('Error fetching menu item customizations:', error);
      if (error instanceof Error && error.message === 'Invalid menu item ID') {
        sendError(res, 'Invalid menu item ID', HTTP_STATUS.BAD_REQUEST);
        return;
      }
      next(error);
    }
  };

  /**
   * Get a single menu item by ID
   * GET /v1/menu/:id
   */
  getMenuItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      console.log(`Received request for menu item with ID: ${id}`);

      if (!id) {
        sendError(res, 'Menu item ID is required', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const menuItem = await this.menuService.getMenuItemById(id);

      if (!menuItem) {
        sendError(res, 'Menu item not found', HTTP_STATUS.NOT_FOUND);
        return;
      }

      sendSuccess(res, menuItem, 'Menu item retrieved successfully');
    } catch (error) {
      console.error('Error fetching menu item:', error);
      if (error instanceof Error && error.message === 'Invalid menu item ID') {
        sendError(res, 'Invalid menu item ID', HTTP_STATUS.BAD_REQUEST);
        return;
      }
      next(error);
    }
  };
}
