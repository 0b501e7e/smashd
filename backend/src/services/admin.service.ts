import { PrismaClient, MenuItem, Order } from '@prisma/client';
import { OrderService } from './order.service';
import { IAdminService } from '../interfaces/IAdminService';
import { INotificationService } from '../interfaces/INotificationService';
import {
  AdminMenuItemData,
  AdminMenuItemUpdateData,
  AdminOrderWithDetails,
  OrderAcceptData,
  OrderDeclineData,
  QuickCreateOrderData,
  CustomizationCategoryWithOptions,
  CreateCustomizationCategoryData,
  CustomizationOptionWithCategory,
  MenuItemCustomizationLinkData,
  SumUpSyncResponse,
  ImageUploadResult,
  InventoryAdjustmentData,
  InventoryItemData,
  InventoryItemWithUsage,
  RecipeIngredientInput,
  StockOverview
} from '../types/admin.types';
import { makeHttpRequest } from './sumupService';
import { InventoryService } from './inventory.service';

/**
 * AdminService - Handles admin-related business logic
 * 
 * This service manages admin functionality extracted from original server.js:
 * - Admin menu management (CRUD, availability, images)
 * - Admin order management (get, accept, decline)
 * - Customization management (categories, options, linking)
 * - SumUp integration and synchronization
 */
export class AdminService implements IAdminService {
  constructor(
    private prisma: PrismaClient,
    private orderService: OrderService,
    private inventoryService: InventoryService,
    private notificationService?: INotificationService
  ) { }

  // =====================
  // ADMIN MENU MANAGEMENT
  // =====================

  async getAllMenuItems(): Promise<MenuItem[]> {
    try {
      const menuItems = await this.prisma.menuItem.findMany({
        orderBy: [
          { category: 'asc' },
          { name: 'asc' }
        ]
      });

      console.log(`AdminService: Retrieved ${menuItems.length} menu items for admin (including unavailable)`);
      return menuItems;
    } catch (error) {
      console.error('AdminService: Error fetching all menu items for admin:', error);
      throw new Error('Failed to retrieve menu items for admin');
    }
  }

  async createMenuItem(menuItemData: AdminMenuItemData): Promise<MenuItem> {
    try {
      const menuItem = await this.prisma.menuItem.create({
        data: {
          name: menuItemData.name,
          description: menuItemData.description,
          price: menuItemData.price,
          originalPrice: menuItemData.originalPrice ?? null,
          promotionTitle: menuItemData.promotionTitle ?? null,
          vatRate: menuItemData.vatRate || 0.10,
          category: menuItemData.category,
          imageUrl: menuItemData.imageUrl,
          isAvailable: menuItemData.isAvailable ?? true
        }
      });

      console.log(`AdminService: Menu item created successfully: ${menuItemData.name} (ID: ${menuItem.id})`);
      return menuItem;
    } catch (error) {
      console.error('AdminService: Error creating menu item:', error);
      throw new Error('Failed to create menu item');
    }
  }

  async updateMenuItem(menuItemId: number, updateData: AdminMenuItemUpdateData): Promise<MenuItem> {
    try {
      const updatedMenuItem = await this.prisma.menuItem.update({
        where: { id: menuItemId },
        data: updateData
      });

      console.log(`AdminService: Menu item updated successfully: ${updateData.name || 'Item'} (ID: ${menuItemId})`);
      return updatedMenuItem;
    } catch (error) {
      console.error(`AdminService: Error updating menu item ${menuItemId}:`, error);
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        throw new Error('Menu item not found');
      }
      throw new Error('Failed to update menu item');
    }
  }

  async updateMenuItemAvailability(menuItemId: number, isAvailable: boolean): Promise<MenuItem> {
    try {
      const menuItem = await this.prisma.menuItem.findUnique({
        where: { id: menuItemId }
      });

      if (!menuItem) {
        throw new Error('Menu item not found');
      }

      const updatedMenuItem = await this.prisma.menuItem.update({
        where: { id: menuItemId },
        data: { isAvailable }
      });

      console.log(`AdminService: Menu item availability updated: ${menuItem.name} (ID: ${menuItemId}) -> ${isAvailable}`);
      return updatedMenuItem;
    } catch (error) {
      console.error(`AdminService: Error updating availability for menu item ${menuItemId}:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update menu item availability');
    }
  }

  async deleteMenuItem(menuItemId: number): Promise<{ message: string; deletedMenuItem: MenuItem }> {
    try {
      // Check if menu item exists first
      const menuItem = await this.prisma.menuItem.findUnique({
        where: { id: menuItemId }
      });

      if (!menuItem) {
        throw new Error('Menu item not found');
      }

      // Check if menu item has associated orders
      const orderItemCount = await this.prisma.orderItem.count({
        where: { menuItemId }
      });

      if (orderItemCount > 0) {
        // Soft delete: mark as unavailable instead of deleting to preserve order history
        const updatedMenuItem = await this.prisma.menuItem.update({
          where: { id: menuItemId },
          data: { isAvailable: false }
        });
        console.log(`AdminService: Menu item soft-deleted (has ${orderItemCount} order references): ${updatedMenuItem.name} (ID: ${menuItemId})`);
        return {
          message: `Menu item "${updatedMenuItem.name}" has been removed from the menu (archived due to existing orders)`,
          deletedMenuItem: updatedMenuItem
        };
      }

      // Hard delete: no orders reference this item, safe to fully remove
      const deletedMenuItem = await this.prisma.$transaction(async (tx) => {
        // Delete customization links first (both join tables)
        await tx.menuItemCustomizationOption.deleteMany({
          where: { menuItemId }
        });
        await tx.menuItemCustomizationCategory.deleteMany({
          where: { menuItemId }
        });

        // Delete the menu item
        return await tx.menuItem.delete({
          where: { id: menuItemId }
        });
      });

      console.log(`AdminService: Menu item deleted successfully: ${deletedMenuItem.name} (ID: ${menuItemId})`);
      return {
        message: `Menu item "${deletedMenuItem.name}" deleted successfully`,
        deletedMenuItem
      };
    } catch (error) {
      console.error(`AdminService: Error deleting menu item ${menuItemId}:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to delete menu item');
    }
  }

  async uploadMenuItemImage(file: Express.Multer.File): Promise<ImageUploadResult> {
    try {
      // The file has already been saved to disk by the Multer diskStorage middleware.
      // We just need to return the public URL based on the file path.

      if (!file.path) {
        throw new Error('Image file path is missing');
      }

      // Convert path to URL format (e.g., 'public/images/menu-items/image.jpg' -> '/images/menu-items/image.jpg')
      const normalizedPath = file.path.replace(/\\/g, '/');

      // Check if it's already a full URL (from Cloudinary)
      if (normalizedPath.startsWith('http')) {
        return { imageUrl: normalizedPath };
      }

      const imageUrl = normalizedPath.startsWith('public/')
        ? normalizedPath.substring(6) // Remove 'public' but keep the leading slash: '/images/menu-items/...'
        : (normalizedPath.startsWith('/') ? normalizedPath : '/' + normalizedPath);

      console.log(`AdminService: Image processed successfully: ${file.filename}`);
      return { imageUrl };
    } catch (error) {
      console.error('AdminService: Error processing uploaded image:', error);
      throw new Error('Failed to upload image');
    }
  }

  // =====================
  // STOCK MANAGEMENT
  // =====================

  async getStockOverview(): Promise<StockOverview> {
    return this.inventoryService.getStockOverview();
  }

  async createInventoryItem(data: InventoryItemData): Promise<InventoryItemWithUsage> {
    return this.inventoryService.createInventoryItem(data);
  }

  async updateInventoryItem(id: number, data: InventoryItemData): Promise<InventoryItemWithUsage> {
    return this.inventoryService.updateInventoryItem(id, data);
  }

  async adjustInventoryItem(id: number, data: InventoryAdjustmentData): Promise<InventoryItemWithUsage> {
    return this.inventoryService.adjustInventoryItem(id, data);
  }

  async setMenuItemRecipe(menuItemId: number, ingredients: RecipeIngredientInput[]): Promise<{ message: string }> {
    return this.inventoryService.setMenuItemRecipe(menuItemId, ingredients);
  }

  async setCustomizationOptionRecipe(optionId: number, ingredients: RecipeIngredientInput[]): Promise<{ message: string }> {
    return this.inventoryService.setCustomizationOptionRecipe(optionId, ingredients);
  }

  // =====================
  // ADMIN ORDER MANAGEMENT
  // =====================

  async getAdminOrders(): Promise<AdminOrderWithDetails[]> {
    try {
      const orders = await this.prisma.order.findMany({
        where: {
          status: { in: ['PAYMENT_CONFIRMED', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] }
        },
        include: {
          items: {
            include: {
              menuItem: {
                select: {
                  name: true,
                  category: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          driver: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      console.log(`AdminService: Retrieved ${orders.length} orders for admin panel`);
      return orders as AdminOrderWithDetails[];
    } catch (error) {
      console.error('AdminService: Error fetching orders for admin:', error);
      throw new Error('Failed to retrieve orders for admin');
    }
  }

  async createQuickOrder(data: QuickCreateOrderData): Promise<AdminOrderWithDetails> {
    const { items, paymentMethod, staffUserId } = data;

    if (!items || items.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    // Fetch and validate all menu items in one query
    const menuItemIds = items.map(i => i.menuItemId);
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } }
    });

    if (menuItems.length !== menuItemIds.length) {
      const foundIds = menuItems.map(m => m.id);
      const missing = menuItemIds.filter(id => !foundIds.includes(id));
      throw new Error(`Menu item(s) not found: ${missing.join(', ')}`);
    }

    const unavailable = menuItems.filter(m => !m.isAvailable);
    if (unavailable.length > 0) {
      throw new Error(`Item(s) not available: ${unavailable.map(m => m.name).join(', ')}`);
    }

    const priceMap = new Map(menuItems.map(m => [m.id, m.price]));
    const round = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

    const total = items.reduce((sum, item) => {
      const unitPrice = item.unitPrice ?? priceMap.get(item.menuItemId) ?? 0;
      return sum + unitPrice * item.quantity;
    }, 0);

    const order = await this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId: staffUserId,
          total: round(total),
          status: 'CONFIRMED',
          paymentMethod,
          fulfillmentMethod: 'PICKUP',
          items: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            create: items.map(item => ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              price: round(item.unitPrice ?? priceMap.get(item.menuItemId) ?? 0),
              customizations: item.customizations ?? null,
            })) as any
          }
        },
        include: {
          items: {
            include: {
              menuItem: { select: { name: true, category: true } }
            }
          },
          user: { select: { id: true, name: true, email: true } },
          driver: { select: { id: true, name: true, email: true, phoneNumber: true } }
        }
      });

      await this.inventoryService.depleteStockForOrderTx(tx, createdOrder.id);

      return createdOrder;
    });

    console.log(`AdminService: Quick order created (ID: ${order.id}, method: ${paymentMethod}, total: ${order.total})`);
    return order as AdminOrderWithDetails;
  }

  async acceptOrder(acceptData: OrderAcceptData): Promise<Order> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: acceptData.orderId }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status !== 'PAYMENT_CONFIRMED') {
        throw new Error(`Order with status ${order.status} cannot be accepted`);
      }

      console.log(`AdminService: Accepting order ${acceptData.orderId}`);
      console.log(`AdminService: Order fulfillmentMethod: ${order.fulfillmentMethod}, deliveryAddress: ${order.deliveryAddress ? 'present' : 'missing'}`);

      const estimatedReadyTime = new Date(Date.now() + (acceptData.estimatedMinutes * 60000));

      // Both delivery and pickup orders should start in CONFIRMED status
      // This allows the kitchen to prepare the order before marking it READY
      const newStatus = 'CONFIRMED';

      console.log(`AdminService: Setting order ${acceptData.orderId} to status: ${newStatus} (fulfillmentMethod: ${order.fulfillmentMethod}, hasDeliveryAddress: ${!!order.deliveryAddress})`);

      const updatedOrder = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.order.update({
          where: { id: acceptData.orderId },
          data: {
            estimatedReadyTime,
            status: newStatus,
            readyAt: null // Order is just accepted, not ready yet
          }
        });

        if (!order.stockDeductedAt) {
          await this.inventoryService.depleteStockForOrderTx(tx, acceptData.orderId);
        }

        return updated;
      });

      // Award loyalty points if eligible
      if (updatedOrder.userId) {
        await this.orderService.awardLoyaltyPointsIfEligible(updatedOrder.id, updatedOrder.userId);
      }

      console.log(`AdminService: Order ${acceptData.orderId} updated successfully. New status: ${updatedOrder.status}, readyAt: ${updatedOrder.readyAt}`);

      // Send notification to customer
      if (this.notificationService && order.userId) {
        try {
          await this.notificationService.sendOrderStatusUpdate(acceptData.orderId, newStatus);
        } catch (notificationError) {
          console.error('AdminService: Failed to send notification:', notificationError);
          // Don't fail the accept operation if notification fails
        }
      }

      console.log(`AdminService: Order ${acceptData.orderId} accepted with ${acceptData.estimatedMinutes} minute estimate, status: ${newStatus}`);
      return updatedOrder;
    } catch (error) {
      console.error(`AdminService: Error accepting order ${acceptData.orderId}:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to accept order');
    }
  }

  async declineOrder(declineData: OrderDeclineData): Promise<Order> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: declineData.orderId }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      if (!['PAYMENT_CONFIRMED', 'CONFIRMED'].includes(order.status)) {
        throw new Error(`Order with status ${order.status} cannot be declined`);
      }

      const updatedOrder = await this.prisma.order.update({
        where: { id: declineData.orderId },
        data: { status: 'CANCELLED' }
      });

      console.log(`AdminService: Order ${declineData.orderId} declined and cancelled${declineData.reason ? ` (reason: ${declineData.reason})` : ''}`);
      return updatedOrder;
    } catch (error) {
      console.error(`AdminService: Error declining order ${declineData.orderId}:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to decline order');
    }
  }

  async markOrderReady(orderId: number): Promise<Order> {
    return this.orderService.markOrderReady(orderId);
  }

  async assignDriver(orderId: number, driverId: number): Promise<Order> {
    const updatedOrder = await this.orderService.assignDriver(orderId, driverId);

    // Trigger notification via notificationService if available
    if (this.notificationService) {
      // 1. Notify Customer
      this.notificationService.sendOrderStatusUpdate(orderId, 'OUT_FOR_DELIVERY')
        .catch(err => console.error('AdminService: Failed to notify customer about delivery:', err));

      // 2. Notify Driver
      // (Assuming notificationService has a method to notify a specific user about an assignment)
      // I'll check NotificationService later, but for now I'll just use sendNotification if it exists
      this.notificationService.sendNotification({
        userId: driverId,
        type: 'ORDER_UPDATE',
        title: '🚚 New Delivery Assigned!',
        message: `You have been assigned order #${orderId}. Tap to view details and start delivery.`,
        metadata: { orderId, status: 'OUT_FOR_DELIVERY' },
        pushData: {
          sound: 'default',
          badge: 1,
          data: { orderId, type: 'assignment' }
        }
      }).catch(err => console.error('AdminService: Failed to notify driver about assignment:', err));
    }

    return updatedOrder;
  }

  async completePickup(orderId: number): Promise<Order> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status !== 'READY') {
        throw new Error(`Order with status ${order.status} cannot be completed. Only READY orders can be marked as picked up.`);
      }

      if (order.fulfillmentMethod !== 'PICKUP') {
        throw new Error('Only pickup orders can be completed using this endpoint.');
      }

      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'DELIVERED',
          readyAt: new Date() // Mark when it was picked up
        }
      });

      console.log(`AdminService: Pickup order ${orderId} completed successfully and marked as delivered`);
      return updatedOrder;
    } catch (error) {
      console.error(`AdminService: Error completing pickup order ${orderId}:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to complete pickup order');
    }
  }

  // =====================
  // CUSTOMIZATION MANAGEMENT
  // =====================

  async getCustomizationCategories(): Promise<CustomizationCategoryWithOptions[]> {
    try {
      const categories = await this.prisma.customizationCategory.findMany({
        include: {
          options: {
            orderBy: { name: 'asc' }
          }
        },
        orderBy: { name: 'asc' }
      });

      console.log(`AdminService: Retrieved ${categories.length} customization categories`);
      return categories;
    } catch (error) {
      console.error('AdminService: Error fetching customization categories:', error);
      throw new Error('Failed to retrieve customization categories');
    }
  }

  async createCustomizationCategory(categoryData: CreateCustomizationCategoryData): Promise<CustomizationCategoryWithOptions> {
    try {
      const category = await this.prisma.customizationCategory.create({
        data: {
          name: categoryData.name,
          options: {
            create: categoryData.options.map(option => ({
              name: option.name,
              price: option.price
            }))
          }
        },
        include: {
          options: true
        }
      });

      console.log(`AdminService: Customization category created: ${categoryData.name} with ${categoryData.options.length} options`);
      return category;
    } catch (error) {
      console.error('AdminService: Error creating customization category:', error);
      throw new Error('Failed to create customization category');
    }
  }

  async updateCustomizationCategory(categoryId: number, data: { name: string }): Promise<CustomizationCategoryWithOptions> {
    try {
      const updatedCategory = await this.prisma.customizationCategory.update({
        where: { id: categoryId },
        data,
        include: {
          options: true
        }
      });
      return updatedCategory;
    } catch (error) {
      console.error(`AdminService: Error updating customization category ${categoryId}:`, error);
      throw new Error('Failed to update customization category');
    }
  }

  async deleteCustomizationCategory(categoryId: number): Promise<{ message: string }> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const options = await tx.customizationOption.findMany({
          where: { categoryId }
        });

        const optionIds = options.map(o => o.id);

        if (optionIds.length > 0) {
          // Delete link table records for all options in this category
          await tx.menuItemCustomizationOption.deleteMany({
            where: { customizationOptionId: { in: optionIds } }
          });

          // Delete options
          await tx.customizationOption.deleteMany({
            where: { categoryId }
          });
        }

        // Delete any join table entries for the category itself if they exist (old schema support)
        await tx.menuItemCustomizationCategory.deleteMany({
          where: { categoryId }
        });

        // Finally delete category
        await tx.customizationCategory.delete({
          where: { id: categoryId }
        });
      });

      return { message: 'Customization category deleted successfully' };
    } catch (error) {
      console.error(`AdminService: Error deleting customization category ${categoryId}:`, error);
      throw new Error('Failed to delete customization category');
    }
  }

  async createCustomizationOption(data: { name: string, price: number, categoryId: number }): Promise<CustomizationOptionWithCategory> {
    try {
      const option = await this.prisma.customizationOption.create({
        data: {
          name: data.name,
          price: data.price,
          categoryId: data.categoryId
        },
        include: {
          category: {
            select: { id: true, name: true }
          }
        }
      });
      return option as CustomizationOptionWithCategory;
    } catch (error) {
      console.error('AdminService: Error creating customization option:', error);
      throw new Error('Failed to create customization option');
    }
  }

  async updateCustomizationOption(optionId: number, data: Partial<{ name: string, price: number }>): Promise<CustomizationOptionWithCategory> {
    try {
      const updatedOption = await this.prisma.customizationOption.update({
        where: { id: optionId },
        data,
        include: {
          category: {
            select: { id: true, name: true }
          }
        }
      });
      return updatedOption as CustomizationOptionWithCategory;
    } catch (error) {
      console.error(`AdminService: Error updating customization option ${optionId}:`, error);
      throw new Error('Failed to update customization option');
    }
  }

  async deleteCustomizationOption(optionId: number): Promise<{ message: string }> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // Delete link table records first
        await tx.menuItemCustomizationOption.deleteMany({
          where: { customizationOptionId: optionId }
        });

        // Delete option
        await tx.customizationOption.delete({
          where: { id: optionId }
        });
      });
      return { message: 'Customization option deleted successfully' };
    } catch (error) {
      console.error(`AdminService: Error deleting customization option ${optionId}:`, error);
      throw new Error('Failed to delete customization option');
    }
  }


  async getCustomizationOptions(): Promise<CustomizationOptionWithCategory[]> {
    try {
      const options = await this.prisma.customizationOption.findMany({
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

      console.log(`AdminService: Retrieved ${options.length} customization options`);
      return options;
    } catch (error) {
      console.error('AdminService: Error fetching customization options:', error);
      throw new Error('Failed to retrieve customization options');
    }
  }

  async getLinkedCustomizationOptions(menuItemId: number): Promise<{ optionId: number, isDefault: boolean }[]> {
    try {
      const links = await this.prisma.menuItemCustomizationOption.findMany({
        where: { menuItemId },
        select: { customizationOptionId: true, isDefault: true }
      });

      const options = links.map(link => ({
        optionId: link.customizationOptionId,
        isDefault: link.isDefault
      }));
      console.log(`AdminService: Retrieved ${options.length} linked customization options for menu item ${menuItemId}`);
      return options;
    } catch (error) {
      console.error(`AdminService: Error fetching linked customization options for menu item ${menuItemId}:`, error);
      throw new Error('Failed to retrieve linked customization options');
    }
  }

  async setLinkedCustomizationOptions(linkData: MenuItemCustomizationLinkData): Promise<{ message: string }> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // Delete all existing links for this menu item
        await tx.menuItemCustomizationOption.deleteMany({
          where: { menuItemId: linkData.menuItemId }
        });

        // Create new links if options array is not empty
        if (linkData.options && linkData.options.length > 0) {
          await tx.menuItemCustomizationOption.createMany({
            data: linkData.options.map(opt => ({
              menuItemId: linkData.menuItemId,
              customizationOptionId: opt.optionId,
              isDefault: opt.isDefault
            })),
            skipDuplicates: true
          });
        }
      });

      console.log(`AdminService: Updated customization options for menu item ${linkData.menuItemId}: ${linkData.options.length} options linked`);

      return {
        message: 'Customization options updated successfully for menu item'
      };
    } catch (error) {
      console.error(`AdminService: Error updating linked customization options for menu item ${linkData.menuItemId}:`, error);
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2003') {
        throw new Error('One or more customization option IDs are invalid');
      }
      throw new Error('Failed to update linked customization options');
    }
  }

  // =====================
  // SETTINGS
  // =====================

  async getDeliveryRadius(): Promise<number> {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key: 'delivery_radius_km' }
    });
    return setting ? parseFloat(setting.value) : 5; // Default 5km
  }

  async setDeliveryRadius(radius: number): Promise<void> {
    await this.prisma.appSetting.upsert({
      where: { key: 'delivery_radius_km' },
      update: { value: String(radius) },
      create: { key: 'delivery_radius_km', value: String(radius) },
    });
    console.log(`AdminService: Delivery radius updated to ${radius} km`);
  }

  // =====================
  // SUMUP INTEGRATION
  // =====================

  async syncMenuToSumUp(): Promise<SumUpSyncResponse> {
    try {
      // Get SumUp access token
      const accessToken = process.env['SUMUP_API_KEY'];
      if (!accessToken) throw new Error('SUMUP_API_KEY is not set');

      // Fetch all available menu items
      const menuItems = await this.prisma.menuItem.findMany({
        where: { isAvailable: true }
      });

      let syncedItems = 0;
      const errors: string[] = [];

      // Process each menu item
      for (const item of menuItems) {
        try {
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

            syncedItems++;
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
            await this.prisma.menuItem.update({
              where: { id: item.id },
              data: { sumupProductId: response.id }
            });

            syncedItems++;
          }
        } catch (itemError) {
          console.error(`AdminService: Error syncing item ${item.id} to SumUp:`, itemError);
          errors.push(`${item.name}: ${itemError instanceof Error ? itemError.message : 'Unknown error'}`);
        }
      }

      const success = errors.length === 0;
      const message = success
        ? `Successfully synced ${syncedItems} menu items to SumUp`
        : `Synced ${syncedItems} items with ${errors.length} errors`;

      console.log(`AdminService: SumUp sync completed - ${syncedItems} synced, ${errors.length} errors`);
      const response: SumUpSyncResponse = {
        success,
        message,
        syncedItems
      };

      if (errors.length > 0) {
        response.errors = errors;
      }

      return response;

    } catch (error) {
      console.error('AdminService: Error syncing menu to SumUp:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to sync menu with SumUp');
    }
  }

  async getAvailableDrivers(): Promise<any[]> {
    try {
      const drivers = await this.prisma.user.findMany({
        where: {
          role: 'DRIVER',
          isOnline: true
        },
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true
        }
      });
      return drivers;
    } catch (error) {
      console.error('AdminService: Error fetching available drivers:', error);
      throw new Error('Failed to retrieve available drivers');
    }
  }
} 
