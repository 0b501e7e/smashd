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
import { MenuItem, Order } from '@prisma/client';

/**
 * Interface for Admin Service
 * Handles admin-related business logic extracted from original server.js
 */
export interface IAdminService {
  // =====================
  // ADMIN MENU MANAGEMENT
  // =====================

  /**
   * Get all menu items for admin (including unavailable ones)
   * @returns List of all menu items
   */
  getAllMenuItems(): Promise<MenuItem[]>;

  /**
   * Create new menu item
   * @param menuItemData - Data for new menu item
   * @returns Created menu item
   */
  createMenuItem(menuItemData: AdminMenuItemData): Promise<MenuItem>;

  /**
   * Update existing menu item
   * @param menuItemId - ID of menu item to update
   * @param updateData - Data to update
   * @returns Updated menu item
   */
  updateMenuItem(menuItemId: number, updateData: AdminMenuItemUpdateData): Promise<MenuItem>;

  /**
   * Update menu item availability only
   * @param menuItemId - ID of menu item
   * @param isAvailable - New availability status
   * @returns Updated menu item
   */
  updateMenuItemAvailability(menuItemId: number, isAvailable: boolean): Promise<MenuItem>;

  /**
   * Delete menu item
   * @param menuItemId - ID of menu item to delete
   * @returns Success message
   */
  deleteMenuItem(menuItemId: number): Promise<{ message: string; deletedMenuItem: MenuItem }>;

  /**
   * Handle menu item image upload
   * @param file - Uploaded file
   * @returns Upload result with image URL
   */
  uploadMenuItemImage(file: Express.Multer.File): Promise<ImageUploadResult>;

  // =====================
  // ADMIN ORDER MANAGEMENT
  // =====================

  /**
   * Get orders for admin dashboard
   * @returns List of orders with details
   */
  getAdminOrders(): Promise<AdminOrderWithDetails[]>;

  /**
   * Accept order and set estimated preparation time
   * @param acceptData - Order ID and estimated minutes
   * @returns Updated order
   */
  acceptOrder(acceptData: OrderAcceptData): Promise<Order>;

  /**
   * Decline order and mark as cancelled
   * @param declineData - Order ID and optional reason
   * @returns Updated order
   */
  declineOrder(declineData: OrderDeclineData): Promise<Order>;

  /**
   * Mark order as ready for pickup or delivery
   * @param orderId - Order ID to mark ready
   * @returns Updated order
   */
  markOrderReady(orderId: number): Promise<Order>;

  /**
   * Assign a driver to an order
   * @param orderId - Order ID to assign
   * @param driverId - Driver ID to assign
   * @returns Updated order
   */
  assignDriver(orderId: number, driverId: number): Promise<Order>;

  /**
   * Complete a pickup order (mark as delivered)
   * @param orderId - Order ID to complete
   * @returns Updated order
   */
  completePickup(orderId: number): Promise<Order>;

  // =====================
  // CUSTOMIZATION MANAGEMENT
  // =====================

  /**
   * Get all customization categories with options
   * @returns List of categories with their options
   */
  getCustomizationCategories(): Promise<CustomizationCategoryWithOptions[]>;

  /**
   * Create new customization category with options
   * @param categoryData - Category name and options
   * @returns Created category
   */
  createCustomizationCategory(categoryData: CreateCustomizationCategoryData): Promise<CustomizationCategoryWithOptions>;

  /**
   * Update customization category
   * @param categoryId - ID of category to update
   * @param data - New data for the category
   * @returns Updated category
   */
  updateCustomizationCategory(categoryId: number, data: { name: string }): Promise<CustomizationCategoryWithOptions>;

  /**
   * Delete customization category and all its options
   * @param categoryId - ID of category to delete
   * @returns Success message
   */
  deleteCustomizationCategory(categoryId: number): Promise<{ message: string }>;

  /**
   * Create new customization option within a category
   * @param data - Option data including categoryId
   * @returns Created option with category info
   */
  createCustomizationOption(data: { name: string, price: number, categoryId: number }): Promise<CustomizationOptionWithCategory>;

  /**
   * Update customization option
   * @param optionId - ID of option to update
   * @param data - New data for the option
   * @returns Updated option
   */
  updateCustomizationOption(optionId: number, data: Partial<{ name: string, price: number }>): Promise<CustomizationOptionWithCategory>;

  /**
   * Delete customization option
   * @param optionId - ID of option to delete
   * @returns Success message
   */
  deleteCustomizationOption(optionId: number): Promise<{ message: string }>;

  /**
   * Get all customization options with category info
   * @returns List of options with category details
   */
  getCustomizationOptions(): Promise<CustomizationOptionWithCategory[]>;

  /**
   * Get linked customization options for a menu item
   * @param menuItemId - Menu item ID
   * @returns List of linked customization option IDs
   */
  getLinkedCustomizationOptions(menuItemId: number): Promise<number[]>;

  /**
   * Set linked customization options for a menu item
   * @param linkData - Menu item ID and option IDs to link
   * @returns Success message
   */
  setLinkedCustomizationOptions(linkData: MenuItemCustomizationLinkData): Promise<{ message: string }>;

  // =====================
  // SUMUP INTEGRATION
  // =====================

  /**
   * Sync menu items to SumUp product catalog
   * @returns Sync operation results
   */
  syncMenuToSumUp(): Promise<SumUpSyncResponse>;

  /**
   * Get all online drivers
   * @returns List of online drivers
   */
  getAvailableDrivers(): Promise<any[]>;
} 