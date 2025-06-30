import { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '../config/constants';
import { IMenuService } from '../interfaces/IMenuService';
import { ApiResponse } from '../types/common.types';
import { MenuItem, CustomizationCategory, MenuQueryOptions } from '../types/menu.types';

/**
 * Menu Controller - Thin HTTP handler that delegates to MenuService
 */
export class MenuController {
  constructor(private menuService: IMenuService) {}

  /**
   * Get all available menu items
   * GET /v1/menu
   */
  getMenu = async (req: Request, res: Response<ApiResponse<MenuItem[]>>, next: NextFunction): Promise<void> => {
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
      res.json({
        success: true,
        data: menuItems,
        message: 'Menu items retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching menu items:', error);
      next(error);
    }
  };

  /**
   * Get all customization options
   * GET /v1/menu/customizations
   */
  getCustomizations = async (_req: Request, res: Response<ApiResponse<CustomizationCategory[]>>, next: NextFunction): Promise<void> => {
    try {
      console.log('Received request for customization options');
      
      const categoriesWithOptions = await this.menuService.getAllCustomizations();

      console.log(`Sending ${categoriesWithOptions.length} customization categories`);
      res.json({
        success: true,
        data: categoriesWithOptions,
        message: 'Customization options retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching customization options:', error);
      next(error);
    }
  };

  /**
   * Get customization options for a specific menu item
   * GET /v1/menu/:itemId/customizations
   */
  getMenuItemCustomizations = async (req: Request, res: Response<ApiResponse<Record<string, any>>>, next: NextFunction): Promise<void> => {
    try {
      const { itemId } = req.params;
      console.log(`Received request for customizations for menu item ID: ${itemId}`);

      if (!itemId) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Menu item ID is required'
        });
        return;
      }

      const customizations = await this.menuService.getMenuItemCustomizations(itemId);
      
      console.log('Sending menu item customizations');
      res.json({
        success: true,
        data: customizations,
        message: 'Menu item customizations retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching menu item customizations:', error);
      if (error instanceof Error && error.message === 'Invalid menu item ID') {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Invalid menu item ID'
        });
        return;
      }
      next(error);
    }
  };

  /**
   * Get a single menu item by ID
   * GET /v1/menu/:id
   */
  getMenuItem = async (req: Request, res: Response<ApiResponse<MenuItem>>, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      console.log(`Received request for menu item with ID: ${id}`);
      
      if (!id) {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Menu item ID is required'
        });
        return;
      }

      const menuItem = await this.menuService.getMenuItemById(id);
      
      if (!menuItem) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Menu item not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: menuItem,
        message: 'Menu item retrieved successfully'
      });
    } catch (error) {
      console.error('Error fetching menu item:', error);
      if (error instanceof Error && error.message === 'Invalid menu item ID') {
        res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Invalid menu item ID'
        });
        return;
      }
      next(error);
    }
  };
} 