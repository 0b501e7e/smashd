import { Order, CustomizationCategory, CustomizationOption } from '@prisma/client';
import type { PaymentMethod } from '@/types/order.types';

// =====================
// ADMIN MENU MANAGEMENT
// =====================

export interface AdminMenuItemData {
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  promotionTitle?: string;
  vatRate?: number;
  category: 'BURGER' | 'SIDE' | 'DRINK' | 'DESSERT';
  imageUrl: string;
  isAvailable?: boolean;
}

export interface AdminMenuItemUpdateData extends AdminMenuItemData {
  isAvailable: boolean;
}

// =====================
// ADMIN ORDER MANAGEMENT
// =====================

export interface OrderAcceptData {
  orderId: number;
  estimatedMinutes: number;
}

export interface OrderDeclineData {
  orderId: number;
  reason?: string;
}

export interface QuickCreateOrderItem {
  menuItemId: number;
  quantity: number;
  unitPrice?: number; // frontend-calculated price including customizations
  customizations?: Record<string, any>;
}

export interface QuickCreateOrderData {
  items: QuickCreateOrderItem[];
  paymentMethod: Exclude<PaymentMethod, 'SUMUP'>;
  staffUserId: number;
}

export interface AdminOrderWithDetails extends Order {
  items: {
    id: number;
    menuItemId: number;
    quantity: number;
    price: number;
    customizations: string | null;
    menuItem: {
      name: string;
      category: string;
    };
  }[];
  user?: {
    id: number;
    name: string;
    email: string;
  } | null;
  driver?: {
    id: number;
    name: string;
    email: string;
    phoneNumber?: string;
  } | null;
}

// =====================
// CUSTOMIZATION MANAGEMENT
// =====================

export interface CustomizationCategoryWithOptions extends CustomizationCategory {
  options: CustomizationOption[];
}

export interface CreateCustomizationCategoryData {
  name: string;
  options: {
    name: string;
    price: number;
  }[];
}

export interface UpdateCustomizationCategoryData {
  name: string;
}

export interface UpdateCustomizationOptionData {
  name?: string;
  price?: number;
}

export interface CustomizationOptionWithCategory extends CustomizationOption {
  category: {
    id: number;
    name: string;
  };
}

export interface MenuItemCustomizationLinkData {
  menuItemId: number;
  options: { optionId: number; isDefault: boolean }[];
}

// =====================
// FILE UPLOAD
// =====================

export interface ImageUploadResult {
  imageUrl: string;
}

// =====================
// STOCK MANAGEMENT
// =====================

export interface RecipeIngredientInput {
  inventoryItemId: number;
  quantity: number;
}

export interface InventoryItemData {
  name: string;
  unit?: string;
  currentQuantity?: number;
  lowStockThreshold?: number;
  isActive?: boolean;
}

export interface InventoryAdjustmentData {
  quantityDelta: number;
  note?: string;
}

export interface InventoryItemWithUsage {
  id: number;
  name: string;
  unit: string;
  currentQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  isLowStock: boolean;
}

export interface RecipeIngredientView {
  inventoryItemId: number;
  inventoryItemName: string;
  quantity: number;
}

export interface MenuItemStockView {
  id: number;
  name: string;
  category: string;
  isAvailable: boolean;
  recipe: RecipeIngredientView[];
}

export interface CustomizationOptionStockView {
  id: number;
  name: string;
  price: number;
  recipe: RecipeIngredientView[];
}

export interface CustomizationCategoryStockView {
  id: number;
  name: string;
  options: CustomizationOptionStockView[];
}

export interface StockOverview {
  inventoryItems: InventoryItemWithUsage[];
  menuItems: MenuItemStockView[];
  customizationCategories: CustomizationCategoryStockView[];
}

// =====================
// SUMUP INTEGRATION
// =====================

export interface SumUpSyncResponse {
  success: boolean;
  message: string;
  syncedItems?: number;
  errors?: string[];
} 
