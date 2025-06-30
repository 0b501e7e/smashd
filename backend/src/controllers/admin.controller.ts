import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { HTTP_STATUS } from '../config/constants';
import { AuthenticatedRequest } from '../types/common.types';
import { getSumupAccessToken, makeHttpRequest } from '../services/sumupService';

const prisma = new PrismaClient();

// =================
// MENU MANAGEMENT
// =================

/**
 * Get all menu items for admin (including unavailable ones)
 * GET /v1/admin/menu/all
 */
export const getAllMenuItems = async (_req: AuthenticatedRequest, res: Response) => {
  console.log('Received request for all admin menu items');
  
  try {
    const menuItems = await prisma.menuItem.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        category: true,
        imageUrl: true,
        isAvailable: true
      }
    });

    res.json(menuItems);
    return;
  } catch (error) {
    console.error('Error fetching all admin menu items:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Error fetching all admin menu items'
    });
  }
};

/**
 * Create new menu item
 * POST /v1/admin/menu
 */
export const createMenuItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      errors: errors.array()
    });
    return;
  }

  const { name, description, price, category, imageUrl } = req.body;

  try {
    const menuItem = await prisma.menuItem.create({
      data: { name, description, price, category, imageUrl, isAvailable: true },
    });

    console.log(`Menu item created successfully: ${name} (ID: ${menuItem.id})`);
    res.status(HTTP_STATUS.CREATED).json(menuItem);
    return;
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Error creating menu item'
    });
  }
};

/**
 * Update menu item
 * PUT /v1/admin/menu/:id
 */
export const updateMenuItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      errors: errors.array()
    });
    return;
  }

  const { id } = req.params;
  const { name, description, price, category, isAvailable, imageUrl } = req.body;

  if (!id) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Menu item ID is required'
    });
    return;
  }

  try {
    const itemId = parseInt(id);
    if (isNaN(itemId)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Invalid menu item ID'
      });
      return;
    }

    const updatedMenuItem = await prisma.menuItem.update({
      where: { id: itemId },
      data: { name, description, price, category, isAvailable, imageUrl },
    });

    console.log(`Menu item updated successfully: ${name} (ID: ${itemId})`);
    res.json(updatedMenuItem);
    return;
  } catch (error) {
    console.error('Error updating menu item:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'Menu item not found'
      });
      return;
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Error updating menu item'
    });
  }
};

/**
 * Update menu item availability only
 * PATCH /v1/admin/menu/:id/availability
 */
export const updateMenuItemAvailability = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      errors: errors.array()
    });
    return;
  }

  const { id } = req.params;
  const { isAvailable } = req.body;

  if (!id) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Menu item ID is required'
    });
    return;
  }

  try {
    const itemId = parseInt(id);
    if (isNaN(itemId)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Invalid menu item ID'
      });
      return;
    }

    const menuItem = await prisma.menuItem.findUnique({
      where: { id: itemId },
    });

    if (!menuItem) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'Menu item not found'
      });
      return;
    }

    const updatedMenuItem = await prisma.menuItem.update({
      where: { id: itemId },
      data: { isAvailable },
    });

    console.log(`Menu item availability updated: ${menuItem.name} (ID: ${itemId}) -> ${isAvailable}`);
    res.json(updatedMenuItem);
    return;
  } catch (error) {
    console.error(`Error updating availability for menu item ${id}:`, error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'Menu item not found during update.'
      });
      return;
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Error updating menu item availability'
    });
  }
};

/**
 * Delete menu item
 * DELETE /v1/admin/menu/:id
 */
export const deleteMenuItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  if (!id) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Menu item ID is required'
    });
    return;
  }

  try {
    const itemId = parseInt(id);
    if (isNaN(itemId)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Invalid menu item ID'
      });
      return;
    }

    const deletedMenuItem = await prisma.menuItem.delete({
      where: { id: itemId },
    });

    console.log(`Menu item deleted successfully: ${deletedMenuItem.name} (ID: ${itemId})`);
    res.json({ message: 'Menu item deleted successfully', deletedMenuItem });
    return;
  } catch (error) {
    console.error('Error deleting menu item:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'Menu item not found'
      });
      return;
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Error deleting menu item'
    });
  }
};

/**
 * Upload menu item image
 * POST /v1/admin/menu-items/upload-image
 */
export const uploadMenuItemImage = (req: Request, res: Response): void => {
  if ((req as any).fileValidationError) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: (req as any).fileValidationError
    });
    return;
  }

  if (!(req as any).file) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'No image file uploaded.'
    });
    return;
  }

  // The path should be relative to the /images route served by the backend
  const imageUrl = `/menu-items/${(req as any).file.filename}`;
  console.log(`Menu item image uploaded successfully: ${imageUrl}`);
  
  res.json({ imageUrl: imageUrl });
    return;};

// =================
// ORDER MANAGEMENT
// =================

/**
 * Get orders for admin panel
 * GET /v1/admin/orders
 */
export const getAdminOrders = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ['PAYMENT_CONFIRMED', 'CONFIRMED', 'PREPARING', 'READY'] }
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`Retrieved ${orders.length} orders for admin panel`);
    res.json(orders);
    return;
  } catch (error) {
    console.error('Error fetching orders for admin:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Error fetching orders'
    });
  }
};

/**
 * Accept order and set preparation time
 * POST /v1/admin/orders/:orderId/accept
 */
export const acceptOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      errors: errors.array()
    });
  }

  const { orderId } = req.params;
  const { estimatedMinutes } = req.body;

  if (!orderId) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Order ID is required'
    });
    return;
  }

  try {
    const orderIdInt = parseInt(orderId);
    if (isNaN(orderIdInt)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Invalid order ID'
      });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderIdInt }
    });

    if (!order) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'Order not found'
      });
      return;
    }

    if (order.status !== 'PAYMENT_CONFIRMED') {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: `Order in status ${order.status} cannot be accepted.`
      });
      return;
    }

    const estimatedReadyTime = new Date(Date.now() + (estimatedMinutes * 60000));

    const updatedOrder = await prisma.order.update({
      where: { id: orderIdInt },
      data: {
        estimatedReadyTime,
        status: 'CONFIRMED',
      },
    });

    console.log(`Order ${orderId} accepted with ${estimatedMinutes} minute estimate`);
    res.json(updatedOrder);
    return;
  } catch (error) {
    console.error(`Error accepting order ${orderId}:`, error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Error accepting order'
    });
  }
};

/**
 * Decline order
 * POST /v1/admin/orders/:orderId/decline
 */
export const declineOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { orderId } = req.params;

  if (!orderId) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Order ID is required'
    });
    return;
  }

  try {
    const orderIdInt = parseInt(orderId);
    if (isNaN(orderIdInt)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Invalid order ID'
      });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderIdInt }
    });

    if (!order) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'Order not found'
      });
      return;
    }

    if (!['PAYMENT_CONFIRMED', 'CONFIRMED'].includes(order.status)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: `Order in status ${order.status} cannot be declined.`
      });
      return;
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderIdInt },
      data: { status: 'CANCELLED' },
    });

    console.log(`Order ${orderId} declined and cancelled`);
    res.json(updatedOrder);
    return;
  } catch (error) {
    console.error(`Error declining order ${orderId}:`, error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Error declining order'
    });
  }
};

// =================
// CUSTOMIZATION MANAGEMENT
// =================

/**
 * Get all customization categories
 * GET /v1/admin/customization-categories
 */
export const getCustomizationCategories = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const categories = await prisma.customizationCategory.findMany({
      include: {
        options: {
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(categories);
    return;
  } catch (error) {
    console.error('Error fetching customization categories for admin:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to fetch customization categories'
    });
  }
};

/**
 * Create new customization category
 * POST /v1/admin/customization-categories
 */
export const createCustomizationCategory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      errors: errors.array()
    });
  }

  const { name, options } = req.body;

  try {
    const category = await prisma.customizationCategory.create({
      data: {
        name,
        options: {
          create: options.map((option: any) => ({
            name: option.name,
            price: option.price
          }))
        }
      }
    });

    console.log(`Customization category created: ${name} with ${options.length} options`);
    res.status(HTTP_STATUS.CREATED).json(category);
    return;
  } catch (error) {
    console.error('Error creating customization category:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Error creating customization category'
    });
  }
};

/**
 * Get all customization options
 * GET /v1/admin/customization-options
 */
export const getCustomizationOptions = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const options = await prisma.customizationOption.findMany({
      include: {
        category: {
          select: { name: true, id: true }
        }
      },
      orderBy: [
        { category: { name: 'asc' } },
        { name: 'asc' }
      ]
    });

    res.json(options);
    return;
  } catch (error) {
    console.error('Error fetching all customization options for admin:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to fetch all customization options'
    });
  }
};

/**
 * Get linked customization options for a menu item
 * GET /v1/admin/menu-items/:menuItemId/linked-customization-options
 */
export const getLinkedCustomizationOptions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { menuItemId } = req.params;

  if (!menuItemId) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Menu item ID is required'
    });
    return;
  }

  try {
    const itemId = parseInt(menuItemId);
    if (isNaN(itemId)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Invalid menu item ID'
      });
      return;
    }

    const links = await prisma.menuItemCustomizationOption.findMany({
      where: { menuItemId: itemId },
      select: { customizationOptionId: true }
    });

    res.json(links.map(link => link.customizationOptionId));
    return;
  } catch (error) {
    console.error(`Error fetching linked customization options for menu item ${menuItemId}:`, error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to fetch linked customization options',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Set linked customization options for a menu item
 * POST /v1/admin/menu-items/:menuItemId/linked-customization-options
 */
export const setLinkedCustomizationOptions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      errors: errors.array()
    });
    return;
  }

  const { menuItemId } = req.params;
  const { optionIds } = req.body;

  if (!menuItemId) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Menu item ID is required'
    });
    return;
  }

  try {
    const itemId = parseInt(menuItemId);
    if (isNaN(itemId)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Invalid menu item ID'
      });
      return;
    }

    // Use a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Delete all existing links for this menu item
      await tx.menuItemCustomizationOption.deleteMany({
        where: { menuItemId: itemId }
      });

      // Create new links if optionIds is not empty
      if (optionIds && optionIds.length > 0) {
        await tx.menuItemCustomizationOption.createMany({
          data: optionIds.map((optId: number) => ({
            menuItemId: itemId,
            customizationOptionId: optId
          })),
          skipDuplicates: true
        });
      }
    });

    console.log(`Updated customization options for menu item ${itemId}: ${optionIds.length} options linked`);
    res.status(HTTP_STATUS.OK).json({
      message: 'Customization options updated successfully for menu item.'
    });

  } catch (error) {
    console.error(`Error updating linked customization options for menu item ${menuItemId}:`, error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2003') {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'One or more customization option IDs are invalid.'
      });
    }
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to update linked customization options'
    });
  }
};

/**
 * Sync menu items to SumUp product catalog
 * POST /v1/admin/sync-menu-to-sumup
 */
export const syncMenuToSumUp = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Get SumUp access token
    const accessToken = await getSumupAccessToken();
    
    // Fetch all available menu items
    const menuItems = await prisma.menuItem.findMany({
      where: { isAvailable: true }
    });
    
    const results: Array<{ id: number; action: string }> = [];
    
    // Process each menu item
    for (const item of menuItems) {
      const productData = {
        name: item.name,
        description: item.description,
        price: item.price.toString(), // SumUp expects string
        category: item.category
      };
      
      // If we already have a SumUp product ID, update it
      if (item.sumupProductId) {
        await makeHttpRequest({
          hostname: 'api.sumup.com',
          path: `/v0.1/me/products/${item.sumupProductId}`,
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }, JSON.stringify(productData));
        
        results.push({ id: item.id, action: 'updated' });
      } 
      // Otherwise create a new product
      else {
        const response = await makeHttpRequest({
          hostname: 'api.sumup.com',
          path: '/v0.1/me/products',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }, JSON.stringify(productData));
        
        // Store SumUp product ID in our database
        await prisma.menuItem.update({
          where: { id: item.id },
          data: { sumupProductId: response.id }
        });
        
        results.push({ id: item.id, action: 'created' });
      }
    }
    
    console.log(`Successfully synced ${menuItems.length} menu items to SumUp`);
    res.json({ 
      success: true, 
      results,
      message: `Synced ${menuItems.length} menu items to SumUp`
    });

  } catch (error) {
    console.error('Error syncing menu to SumUp:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
      error: 'Error syncing menu to SumUp',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Test endpoint to manually update order status
 * POST /v1/test/update-order-status
 */
export const updateOrderStatusTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, status = 'PAID' } = req.body;
    
    if (!orderId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        error: 'Missing order ID' 
      });
      return;
    }
    
    console.log(`Manually updating order ${orderId} to status: ${status}`);
    
    // Find the order first
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
    });
    
    if (!order) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ 
        error: 'Order not found' 
      });
      return;
    }
    
    console.log(`Current order status before manual update: ${order.status}`);
    
    // Update the order status
    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(orderId) },
      data: { status: status as any }
    });
    
    console.log(`Manually updated order ${orderId} status to ${status}`);
    
    res.json({
      success: true,
      message: `Order ${orderId} updated with status ${status}`,
      order: updatedOrder
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
      error: 'Error updating order status', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Export all admin controllers
export const adminController = {
  // Menu management
  getAllMenuItems,
  createMenuItem,
  updateMenuItem,
  updateMenuItemAvailability,
  deleteMenuItem,
  uploadMenuItemImage,
  
  // Order management
  getAdminOrders,
  acceptOrder,
  declineOrder,
  
  // Customization management
  getCustomizationCategories,
  createCustomizationCategory,
  getCustomizationOptions,
  getLinkedCustomizationOptions,
  setLinkedCustomizationOptions,
  
  // SumUp integration
  syncMenuToSumUp,
  
  // Test utilities
  updateOrderStatusTest
}; 