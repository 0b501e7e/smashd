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
import { ID } from '../types/common.types';

/**
 * Interface for Menu Service
 * Defines all menu-related business operations
 */
export interface IMenuService {
  // Menu Items
  getAllMenuItems(options?: MenuQueryOptions): Promise<MenuItem[]>;
  getActivePromotions(): Promise<MenuItem[]>;
  getMenuItemById(id: ID): Promise<MenuItem | null>;
  createMenuItem(data: MenuItemCreateData): Promise<MenuItem>;
  updateMenuItem(id: ID, data: MenuItemUpdateData): Promise<MenuItem>;
  deleteMenuItem(id: ID): Promise<void>;
  toggleMenuItemAvailability(id: ID, isAvailable: boolean): Promise<MenuItem>;

  // Customizations
  getAllCustomizations(): Promise<CustomizationCategory[]>;
  getCustomizationsByCategory(categoryId: ID): Promise<CustomizationOption[]>;
  getMenuItemCustomizations(menuItemId: ID): Promise<Record<string, CustomizationOption[]>>;
  createCustomizationCategory(data: CustomizationCategoryCreateData): Promise<CustomizationCategory>;

  // Combined operations
  getMenuWithCustomizations(options?: MenuQueryOptions): Promise<MenuWithCustomizations>;

  // Admin operations
  getAllMenuItemsForAdmin(): Promise<MenuItem[]>;
  linkCustomizationOptions(menuItemId: ID, optionIds: number[]): Promise<void>;
  getLinkedCustomizationOptions(menuItemId: ID): Promise<number[]>;
} 