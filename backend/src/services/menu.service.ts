import { PrismaClient } from '@prisma/client';
import { IMenuService } from '../interfaces/IMenuService';
import {
  MenuItem,
  MenuItemCreateData,
  MenuItemUpdateData,
  CustomizationCategory,
  CustomizationOption,
  CustomizationCategoryCreateData,
  MenuQueryOptions,
  MenuWithCustomizations
} from '../types/menu.types';
import { ID, MenuCategory } from '../types/common.types';

/**
 * Menu Service Implementation
 * Contains all menu-related business logic
 */
export class MenuService implements IMenuService {
  constructor(private prisma: PrismaClient) { }

  /**
   * Helper method to convert Prisma result to MenuItem with proper typing
   */
  private mapToMenuItem(item: any): MenuItem {
    return {
      ...item,
      category: item.category as MenuCategory
    };
  }

  /**
   * Get all menu items with optional filtering
   */
  async getAllMenuItems(options: MenuQueryOptions = {}): Promise<MenuItem[]> {
    const {
      includeUnavailable = false,
      category,
      searchTerm,
      orderBy = 'category',
      orderDirection = 'asc'
    } = options;

    const where: any = {};

    if (!includeUnavailable) {
      where.isAvailable = true;
    }

    if (category) {
      where.category = category;
    }

    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }

    const orderByField = orderBy === 'name' ? { name: orderDirection }
      : orderBy === 'price' ? { price: orderDirection }
        : { category: orderDirection };

    const items = await this.prisma.menuItem.findMany({
      where,
      orderBy: orderByField,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        category: true,
        imageUrl: true,
        isAvailable: true,
        sumupProductId: true
      }
    });

    // Type cast category from string to MenuCategory
    return items.map(item => ({
      ...item,
      category: item.category as MenuCategory
    })) as MenuItem[];
  }

  /**
   * Get menu item by ID
   */
  async getMenuItemById(id: ID): Promise<MenuItem | null> {
    const numericId = typeof id === 'string' ? parseInt(id) : id;

    if (isNaN(numericId)) {
      throw new Error('Invalid menu item ID');
    }

    const item = await this.prisma.menuItem.findUnique({
      where: { id: numericId },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        category: true,
        imageUrl: true,
        isAvailable: true,
        sumupProductId: true
      }
    });

    return item ? this.mapToMenuItem(item) : null;
  }

  /**
   * Create new menu item
   */
  async createMenuItem(data: MenuItemCreateData): Promise<MenuItem> {
    const { isAvailable = true, ...itemData } = data;

    const item = await this.prisma.menuItem.create({
      data: {
        ...itemData,
        isAvailable
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        category: true,
        imageUrl: true,
        isAvailable: true,
        sumupProductId: true
      }
    });

    return this.mapToMenuItem(item);
  }

  /**
   * Update menu item
   */
  async updateMenuItem(id: ID, data: MenuItemUpdateData): Promise<MenuItem> {
    const numericId = typeof id === 'string' ? parseInt(id) : id;

    if (isNaN(numericId)) {
      throw new Error('Invalid menu item ID');
    }

    // Check if item exists
    const existingItem = await this.prisma.menuItem.findUnique({
      where: { id: numericId }
    });

    if (!existingItem) {
      throw new Error('Menu item not found');
    }

    const item = await this.prisma.menuItem.update({
      where: { id: numericId },
      data,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        category: true,
        imageUrl: true,
        isAvailable: true,
        sumupProductId: true
      }
    });

    return this.mapToMenuItem(item);
  }

  /**
   * Delete menu item
   */
  async deleteMenuItem(id: ID): Promise<void> {
    const numericId = typeof id === 'string' ? parseInt(id) : id;

    if (isNaN(numericId)) {
      throw new Error('Invalid menu item ID');
    }

    // Check if item exists
    const existingItem = await this.prisma.menuItem.findUnique({
      where: { id: numericId }
    });

    if (!existingItem) {
      throw new Error('Menu item not found');
    }

    await this.prisma.menuItem.delete({
      where: { id: numericId }
    });
  }

  /**
   * Toggle menu item availability
   */
  async toggleMenuItemAvailability(id: ID, isAvailable: boolean): Promise<MenuItem> {
    const numericId = typeof id === 'string' ? parseInt(id) : id;

    if (isNaN(numericId)) {
      throw new Error('Invalid menu item ID');
    }

    const item = await this.prisma.menuItem.update({
      where: { id: numericId },
      data: { isAvailable },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        category: true,
        imageUrl: true,
        isAvailable: true,
        sumupProductId: true
      }
    });

    return this.mapToMenuItem(item);
  }

  /**
   * Get all customization categories with options
   */
  async getAllCustomizations(): Promise<CustomizationCategory[]> {
    return await this.prisma.customizationCategory.findMany({
      include: {
        options: {
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Get customization options by category
   */
  async getCustomizationsByCategory(categoryId: ID): Promise<CustomizationOption[]> {
    const numericId = typeof categoryId === 'string' ? parseInt(categoryId) : categoryId;

    if (isNaN(numericId)) {
      throw new Error('Invalid category ID');
    }

    return await this.prisma.customizationOption.findMany({
      where: { categoryId: numericId },
      include: { category: true },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Get customization options for a specific menu item
   */
  async getMenuItemCustomizations(menuItemId: ID): Promise<Record<string, CustomizationOption[]>> {
    const numericId = typeof menuItemId === 'string' ? parseInt(menuItemId) : menuItemId;

    if (isNaN(numericId)) {
      throw new Error('Invalid menu item ID');
    }

    // Get linked customization options for this menu item
    const linkedOptions = await this.prisma.menuItemCustomizationOption.findMany({
      where: { menuItemId: numericId },
      include: {
        customizationOption: {
          include: { category: true }
        }
      }
    });

    // Group options by category dynamically
    const groupedOptions: Record<string, CustomizationOption[]> = {};

    for (const link of linkedOptions) {
      const option = link.customizationOption;
      const categoryName = option.category.name;

      if (!groupedOptions[categoryName]) {
        groupedOptions[categoryName] = [];
      }

      groupedOptions[categoryName].push({
        id: option.id,
        name: option.name,
        price: option.price,
        categoryId: option.categoryId,
        category: option.category
      });
    }

    return groupedOptions;
  }

  /**
   * Create customization category with options
   */
  async createCustomizationCategory(data: CustomizationCategoryCreateData): Promise<CustomizationCategory> {
    const { options = [], ...categoryData } = data;

    return await this.prisma.customizationCategory.create({
      data: {
        ...categoryData,
        options: {
          create: options.map(option => ({
            name: option.name,
            price: option.price
          }))
        }
      },
      include: {
        options: {
          orderBy: { name: 'asc' }
        }
      }
    });
  }

  /**
   * Get menu with customizations in one call
   */
  async getMenuWithCustomizations(options: MenuQueryOptions = {}): Promise<MenuWithCustomizations> {
    const [items, customizations] = await Promise.all([
      this.getAllMenuItems(options),
      this.getAllCustomizations()
    ]);

    return { items, customizations };
  }

  /**
   * Get all menu items for admin (including unavailable)
   */
  async getAllMenuItemsForAdmin(): Promise<MenuItem[]> {
    return await this.getAllMenuItems({ includeUnavailable: true });
  }

  /**
   * Link customization options to a menu item
   */
  async linkCustomizationOptions(menuItemId: ID, optionIds: number[]): Promise<void> {
    const numericId = typeof menuItemId === 'string' ? parseInt(menuItemId) : menuItemId;

    if (isNaN(numericId)) {
      throw new Error('Invalid menu item ID');
    }

    // Use transaction to ensure atomicity
    await this.prisma.$transaction(async (tx) => {
      // Delete existing links
      await tx.menuItemCustomizationOption.deleteMany({
        where: { menuItemId: numericId }
      });

      // Create new links if options provided
      if (optionIds.length > 0) {
        await tx.menuItemCustomizationOption.createMany({
          data: optionIds.map(optionId => ({
            menuItemId: numericId,
            customizationOptionId: optionId
          })),
          skipDuplicates: true
        });
      }
    });
  }

  /**
   * Get linked customization option IDs for a menu item
   */
  async getLinkedCustomizationOptions(menuItemId: ID): Promise<number[]> {
    const numericId = typeof menuItemId === 'string' ? parseInt(menuItemId) : menuItemId;

    if (isNaN(numericId)) {
      throw new Error('Invalid menu item ID');
    }

    const links = await this.prisma.menuItemCustomizationOption.findMany({
      where: { menuItemId: numericId },
      select: { customizationOptionId: true }
    });

    return links.map(link => link.customizationOptionId);
  }
} 