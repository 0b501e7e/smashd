import { PrismaClient, MenuItem, Order } from '@prisma/client';
import { IAdminService } from '../interfaces/IAdminService';
import {
  AdminMenuItemData,
  AdminMenuItemUpdateData,
  AdminOrderWithDetails,
  OrderAcceptData,
  OrderDeclineData,
  CustomizationCategoryWithOptions,
  CreateCustomizationCategoryData,
  CustomizationOptionWithCategory,
  MenuItemCustomizationLinkData,
  SumUpSyncResponse,
  ImageUploadResult
} from '../types/admin.types';
import { getSumupAccessToken, makeHttpRequest } from './sumupService';
import path from 'path';
import fs from 'fs';

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
  constructor(private prisma: PrismaClient) {}

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
      throw new Error('Failed to fetch menu items for admin');
    }
  }

  async createMenuItem(menuItemData: AdminMenuItemData): Promise<MenuItem> {
    try {
      const menuItem = await this.prisma.menuItem.create({
        data: {
          name: menuItemData.name,
          description: menuItemData.description,
          price: menuItemData.price,
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

      // Delete menu item and related customization links in transaction
      const deletedMenuItem = await this.prisma.$transaction(async (tx) => {
        // Delete customization links first
        await tx.menuItemCustomizationOption.deleteMany({
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
      // Create upload directory if it doesn't exist
      const uploadDir = path.join(process.cwd(), 'public', 'images', 'menu-items');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const timestamp = Date.now();
      const filename = `menu-item-${timestamp}${fileExtension}`;
      const filepath = path.join(uploadDir, filename);

      // Save file
      fs.writeFileSync(filepath, file.buffer);

      // Generate URL
      const imageUrl = `/images/menu-items/${filename}`;

      console.log(`AdminService: Image uploaded successfully: ${filename}`);
      return { imageUrl };
    } catch (error) {
      console.error('AdminService: Error uploading image:', error);
      throw new Error('Failed to upload image');
    }
  }

  // =====================
  // ADMIN ORDER MANAGEMENT
  // =====================

  async getAdminOrders(): Promise<AdminOrderWithDetails[]> {
    try {
      const orders = await this.prisma.order.findMany({
        where: {
          status: { in: ['PAYMENT_CONFIRMED', 'CONFIRMED', 'PREPARING', 'READY'] }
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
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      console.log(`AdminService: Retrieved ${orders.length} orders for admin panel`);
      return orders as AdminOrderWithDetails[];
    } catch (error) {
      console.error('AdminService: Error fetching orders for admin:', error);
      throw new Error('Failed to fetch orders for admin');
    }
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
        throw new Error(`Order in status ${order.status} cannot be accepted`);
      }

      const estimatedReadyTime = new Date(Date.now() + (acceptData.estimatedMinutes * 60000));

      const updatedOrder = await this.prisma.order.update({
        where: { id: acceptData.orderId },
        data: {
          estimatedReadyTime,
          status: 'CONFIRMED'
        }
      });

      console.log(`AdminService: Order ${acceptData.orderId} accepted with ${acceptData.estimatedMinutes} minute estimate`);
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
        throw new Error(`Order in status ${order.status} cannot be declined`);
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
      throw new Error('Failed to fetch customization categories');
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
      throw new Error('Failed to fetch customization options');
    }
  }

  async getLinkedCustomizationOptions(menuItemId: number): Promise<number[]> {
    try {
      const links = await this.prisma.menuItemCustomizationOption.findMany({
        where: { menuItemId },
        select: { customizationOptionId: true }
      });

      const optionIds = links.map(link => link.customizationOptionId);
      console.log(`AdminService: Retrieved ${optionIds.length} linked customization options for menu item ${menuItemId}`);
      return optionIds;
    } catch (error) {
      console.error(`AdminService: Error fetching linked customization options for menu item ${menuItemId}:`, error);
      throw new Error('Failed to fetch linked customization options');
    }
  }

  async setLinkedCustomizationOptions(linkData: MenuItemCustomizationLinkData): Promise<{ message: string }> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // Delete all existing links for this menu item
        await tx.menuItemCustomizationOption.deleteMany({
          where: { menuItemId: linkData.menuItemId }
        });

        // Create new links if optionIds is not empty
        if (linkData.optionIds && linkData.optionIds.length > 0) {
          await tx.menuItemCustomizationOption.createMany({
            data: linkData.optionIds.map(optionId => ({
              menuItemId: linkData.menuItemId,
              customizationOptionId: optionId
            })),
            skipDuplicates: true
          });
        }
      });

      console.log(`AdminService: Updated customization options for menu item ${linkData.menuItemId}: ${linkData.optionIds.length} options linked`);
      
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
  // SUMUP INTEGRATION
  // =====================

  async syncMenuToSumUp(): Promise<SumUpSyncResponse> {
    try {
      // Get SumUp access token
      const accessToken = await getSumupAccessToken();
      
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
      throw new Error(error instanceof Error ? error.message : 'Failed to sync menu to SumUp');
    }
  }
} 