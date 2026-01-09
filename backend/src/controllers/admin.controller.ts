import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { HTTP_STATUS } from '../config/constants';
import { AuthenticatedRequest } from '../types/common.types';
import { IAdminService } from '../interfaces/IAdminService';
import { sendSuccess, sendError, sendValidationError } from '../utils/response.utils';
import {
  AdminMenuItemData,
  AdminMenuItemUpdateData,
  OrderAcceptData,
  OrderDeclineData,
  CreateCustomizationCategoryData,
  MenuItemCustomizationLinkData
} from '../types/admin.types';

/**
 * AdminController - Thin HTTP handlers for admin operations
 * Delegates all business logic to AdminService following established pattern
 */
export class AdminController {
  constructor(private adminService: IAdminService) { }

  // =====================
  // MENU MANAGEMENT
  // =====================

  /**
   * Get all menu items for admin (including unavailable ones)
   * GET /v1/admin/menu/all
   */
  async getAllMenuItems(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('AdminController: Received request for all admin menu items');

      const menuItems = await this.adminService.getAllMenuItems();
      sendSuccess(res, menuItems);
    } catch (error) {
      console.error('AdminController: Error fetching all admin menu items:', error);
      next(error);
    }
  }

  /**
   * Create new menu item
   * POST /v1/admin/menu
   */
  async createMenuItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        sendValidationError(res, errors.array() as any);
        return;
      }

      const menuItemData: AdminMenuItemData = req.body;
      const menuItem = await this.adminService.createMenuItem(menuItemData);

      console.log(`AdminController: Menu item created successfully: ${menuItemData.name} (ID: ${menuItem.id})`);
      sendSuccess(res, menuItem, 'Menu item created successfully', HTTP_STATUS.CREATED);
    } catch (error) {
      console.error('AdminController: Error creating menu item:', error);
      next(error);
    }
  }

  /**
   * Update menu item
   * PUT /v1/admin/menu/:id
   */
  async updateMenuItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        sendValidationError(res, errors.array() as any);
        return;
      }

      const { id } = req.params;

      if (!id) {
        sendError(res, 'Menu item ID is required', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const itemId = parseInt(id);

      if (isNaN(itemId)) {
        sendError(res, 'Invalid menu item ID', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const updateData: AdminMenuItemUpdateData = req.body;
      const updatedMenuItem = await this.adminService.updateMenuItem(itemId, updateData);

      console.log(`AdminController: Menu item updated successfully: ${updateData.name} (ID: ${itemId})`);
      sendSuccess(res, updatedMenuItem);
    } catch (error) {
      console.error('AdminController: Error updating menu item:', error);
      if (error instanceof Error && error.message === 'Menu item not found') {
        sendError(res, error.message, HTTP_STATUS.NOT_FOUND);
        return;
      }
      next(error);
    }
  }

  /**
   * Update menu item availability only
   * PATCH /v1/admin/menu/:id/availability
   */
  async updateMenuItemAvailability(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        sendValidationError(res, errors.array() as any);
        return;
      }

      const { id } = req.params;
      const { isAvailable } = req.body;

      if (!id) {
        sendError(res, 'Menu item ID is required', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const itemId = parseInt(id);

      if (isNaN(itemId)) {
        sendError(res, 'Invalid menu item ID', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const updatedMenuItem = await this.adminService.updateMenuItemAvailability(itemId, isAvailable);

      console.log(`AdminController: Menu item availability updated: ${updatedMenuItem.name} (ID: ${itemId}) -> ${isAvailable}`);
      sendSuccess(res, updatedMenuItem);
    } catch (error) {
      console.error('AdminController: Error updating menu item availability:', error);
      if (error instanceof Error && error.message === 'Menu item not found') {
        sendError(res, error.message, HTTP_STATUS.NOT_FOUND);
        return;
      }
      next(error);
    }
  }

  /**
   * Delete menu item
   * DELETE /v1/admin/menu/:id
   */
  async deleteMenuItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        sendError(res, 'Menu item ID is required', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const itemId = parseInt(id);

      if (isNaN(itemId)) {
        sendError(res, 'Invalid menu item ID', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const result = await this.adminService.deleteMenuItem(itemId);

      console.log(`AdminController: Menu item deleted successfully: ${result.deletedMenuItem.name} (ID: ${itemId})`);
      sendSuccess(res, result);
    } catch (error) {
      console.error('AdminController: Error deleting menu item:', error);
      if (error instanceof Error && error.message === 'Menu item not found') {
        sendError(res, error.message, HTTP_STATUS.NOT_FOUND);
        return;
      }
      next(error);
    }
  }

  /**
   * Upload menu item image
   * POST /v1/admin/menu-items/upload-image
   */
  async uploadMenuItemImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        sendError(res, 'No file uploaded', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const result = await this.adminService.uploadMenuItemImage(req.file);

      console.log(`AdminController: Image uploaded successfully: ${result.imageUrl}`);
      sendSuccess(res, result);
    } catch (error) {
      console.error('AdminController: Error uploading image:', error);
      next(error);
    }
  }

  // =====================
  // ORDER MANAGEMENT
  // =====================

  /**
   * Get orders for admin dashboard
   * GET /v1/admin/orders
   */
  async getAdminOrders(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('AdminController: Received request for admin orders');

      const orders = await this.adminService.getAdminOrders();
      sendSuccess(res, orders);
    } catch (error) {
      console.error('AdminController: Error fetching admin orders:', error);
      next(error);
    }
  }

  /**
   * Accept order and set estimated preparation time
   * POST /v1/admin/orders/:id/accept
   */
  async acceptOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        sendValidationError(res, errors.array() as any);
        return;
      }

      const { id: orderId } = req.params;
      const { estimatedMinutes } = req.body;

      if (!orderId) {
        sendError(res, 'Order ID is required', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const orderIdNum = parseInt(orderId);

      if (isNaN(orderIdNum)) {
        sendError(res, 'Invalid order ID', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const acceptData: OrderAcceptData = {
        orderId: orderIdNum,
        estimatedMinutes
      };

      const updatedOrder = await this.adminService.acceptOrder(acceptData);

      console.log(`AdminController: Order ${orderIdNum} accepted with ${estimatedMinutes} minute estimate`);
      sendSuccess(res, updatedOrder);
    } catch (error) {
      console.error('AdminController: Error accepting order:', error);
      if (error instanceof Error && (
        error.message.includes('not found') ||
        error.message.includes('cannot be accepted')
      )) {
        sendError(res, error.message, HTTP_STATUS.BAD_REQUEST);
        return;
      }
      next(error);
    }
  }

  /**
   * Decline order and mark as cancelled
   * POST /v1/admin/orders/:id/decline
   */
  async declineOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: orderId } = req.params;
      const { reason } = req.body;

      if (!orderId) {
        sendError(res, 'Order ID is required', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const orderIdNum = parseInt(orderId);

      if (isNaN(orderIdNum)) {
        sendError(res, 'Invalid order ID', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const declineData: OrderDeclineData = {
        orderId: orderIdNum,
        reason
      };

      const updatedOrder = await this.adminService.declineOrder(declineData);

      console.log(`AdminController: Order ${orderIdNum} declined and cancelled${reason ? ` (reason: ${reason})` : ''}`);
      sendSuccess(res, updatedOrder);
    } catch (error) {
      console.error('AdminController: Error declining order:', error);
      if (error instanceof Error && (
        error.message.includes('not found') ||
        error.message.includes('cannot be declined')
      )) {
        sendError(res, error.message, HTTP_STATUS.BAD_REQUEST);
        return;
      }
      next(error);
    }
  }

  // =====================
  // CUSTOMIZATION MANAGEMENT
  // =====================

  /**
   * Get all customization categories with options
   * GET /v1/admin/customization-categories
   */
  async getCustomizationCategories(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('AdminController: Received request for customization categories');

      const categories = await this.adminService.getCustomizationCategories();
      sendSuccess(res, categories);
    } catch (error) {
      console.error('AdminController: Error fetching customization categories:', error);
      next(error);
    }
  }

  /**
   * Create new customization category with options
   * POST /v1/admin/customization-categories
   */
  async createCustomizationCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        sendValidationError(res, errors.array() as any);
        return;
      }

      const categoryData: CreateCustomizationCategoryData = req.body;
      const category = await this.adminService.createCustomizationCategory(categoryData);

      console.log(`AdminController: Customization category created: ${categoryData.name} with ${categoryData.options.length} options`);
      sendSuccess(res, category, 'Customization category created successfully', HTTP_STATUS.CREATED);
    } catch (error) {
      console.error('AdminController: Error creating customization category:', error);
      next(error);
    }
  }

  /**
   * Update customization category
   * PUT /v1/admin/customization-categories/:id
   */
  async updateCustomizationCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const categoryData = req.body;

      if (!id) {
        sendError(res, 'Category ID is required', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const updatedCategory = await this.adminService.updateCustomizationCategory(parseInt(id), categoryData);
      sendSuccess(res, updatedCategory);
    } catch (error) {
      console.error('AdminController: Error updating customization category:', error);
      next(error);
    }
  }

  /**
   * Delete customization category
   * DELETE /v1/admin/customization-categories/:id
   */
  async deleteCustomizationCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        sendError(res, 'Category ID is required', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const result = await this.adminService.deleteCustomizationCategory(parseInt(id));
      sendSuccess(res, result);
    } catch (error) {
      console.error('AdminController: Error deleting customization category:', error);
      next(error);
    }
  }

  /**
   * Create customization option
   * POST /v1/admin/customization-options
   */
  async createCustomizationOption(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const optionData = req.body;
      const option = await this.adminService.createCustomizationOption(optionData);
      sendSuccess(res, option, 'Customization option created successfully', HTTP_STATUS.CREATED);
    } catch (error) {
      console.error('AdminController: Error creating customization option:', error);
      next(error);
    }
  }

  /**
   * Update customization option
   * PUT /v1/admin/customization-options/:id
   */
  async updateCustomizationOption(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const optionData = req.body;

      if (!id) {
        sendError(res, 'Option ID is required', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const updatedOption = await this.adminService.updateCustomizationOption(parseInt(id), optionData);
      sendSuccess(res, updatedOption);
    } catch (error) {
      console.error('AdminController: Error updating customization option:', error);
      next(error);
    }
  }

  /**
   * Delete customization option
   * DELETE /v1/admin/customization-options/:id
   */
  async deleteCustomizationOption(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        sendError(res, 'Option ID is required', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const result = await this.adminService.deleteCustomizationOption(parseInt(id));
      sendSuccess(res, result);
    } catch (error) {
      console.error('AdminController: Error deleting customization option:', error);
      next(error);
    }
  }

  /**
   * Get all customization options with category info
   * GET /v1/admin/customization-options
   */
  async getCustomizationOptions(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('AdminController: Received request for customization options');

      const options = await this.adminService.getCustomizationOptions();
      sendSuccess(res, options);
    } catch (error) {
      console.error('AdminController: Error fetching customization options:', error);
      next(error);
    }
  }

  /**
   * Get linked customization options for a menu item
   * GET /v1/admin/customization-options/:menuItemId
   */
  async getLinkedCustomizationOptions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { menuItemId } = req.params;

      if (!menuItemId) {
        sendError(res, 'Menu item ID is required', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const itemId = parseInt(menuItemId);

      if (isNaN(itemId)) {
        sendError(res, 'Invalid menu item ID', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const optionIds = await this.adminService.getLinkedCustomizationOptions(itemId);

      console.log(`AdminController: Retrieved ${optionIds.length} linked customization options for menu item ${itemId}`);
      sendSuccess(res, { optionIds });
    } catch (error) {
      console.error('AdminController: Error fetching linked customization options:', error);
      next(error);
    }
  }

  /**
   * Set linked customization options for a menu item
   * POST /v1/admin/customization-options/:menuItemId
   */
  async setLinkedCustomizationOptions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        sendValidationError(res, errors.array() as any);
        return;
      }

      const { menuItemId } = req.params;
      const { optionIds } = req.body;

      if (!menuItemId) {
        sendError(res, 'Menu item ID is required', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const itemId = parseInt(menuItemId);

      if (isNaN(itemId)) {
        sendError(res, 'Invalid menu item ID', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      if (!Array.isArray(optionIds)) {
        sendError(res, 'optionIds must be an array', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const linkData: MenuItemCustomizationLinkData = {
        menuItemId: itemId,
        optionIds
      };

      const result = await this.adminService.setLinkedCustomizationOptions(linkData);

      console.log(`AdminController: Updated customization options for menu item ${itemId}: ${optionIds.length} options linked`);
      sendSuccess(res, result);
    } catch (error) {
      console.error('AdminController: Error setting linked customization options:', error);
      if (error instanceof Error && error.message.includes('invalid')) {
        sendError(res, error.message, HTTP_STATUS.BAD_REQUEST);
        return;
      }
      next(error);
    }
  }

  // =====================
  // SUMUP INTEGRATION
  // =====================

  /**
   * Sync menu items to SumUp product catalog
   * POST /v1/admin/sync-menu-to-sumup
   */
  async syncMenuToSumUp(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('AdminController: Received request to sync menu to SumUp');

      const syncResult = await this.adminService.syncMenuToSumUp();

      console.log(`AdminController: SumUp sync completed - ${syncResult.syncedItems} synced, success: ${syncResult.success}`);
      sendSuccess(res, syncResult);
    } catch (error) {
      console.error('AdminController: Error syncing menu to SumUp:', error);
      next(error);
    }
  }
}
