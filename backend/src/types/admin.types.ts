import { Order, CustomizationCategory, CustomizationOption } from '@prisma/client';

// =====================
// ADMIN MENU MANAGEMENT
// =====================

export interface AdminMenuItemData {
  name: string;
  description: string;
  price: number;
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
  optionIds: number[];
}

// =====================
// FILE UPLOAD
// =====================

export interface ImageUploadResult {
  imageUrl: string;
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