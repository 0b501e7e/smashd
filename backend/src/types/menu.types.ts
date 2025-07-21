import { MenuCategory } from './common.types';

// Core Menu Item types
export interface MenuItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  category: MenuCategory;
  imageUrl: string | null;
  isAvailable: boolean;
  sumupProductId?: string | null;
}

export interface MenuItemCreateData {
  name: string;
  description: string;
  price: number;
  category: MenuCategory;
  imageUrl: string;
  isAvailable?: boolean;
}

export interface MenuItemUpdateData {
  name?: string;
  description?: string;
  price?: number;
  category?: MenuCategory;
  imageUrl?: string;
  isAvailable?: boolean;
}

// Customization types
export interface CustomizationCategory {
  id: number;
  name: string;
  options: CustomizationOption[];
}

export interface CustomizationOption {
  id: number;
  name: string;
  price: number;
  categoryId: number;
  category?: Omit<CustomizationCategory, 'options'>;
}

export interface CustomizationOptionCreateData {
  name: string;
  price: number;
  categoryId: number;
}

export interface CustomizationCategoryCreateData {
  name: string;
  options?: CustomizationOptionCreateData[];
}

// Service method return types
export interface MenuWithCustomizations {
  items: MenuItem[];
  customizations: CustomizationCategory[];
}

export interface MenuItemWithCustomizations extends MenuItem {
  availableCustomizations: Record<string, CustomizationOption[]>;
}

// Query options
export interface MenuQueryOptions {
  includeUnavailable?: boolean;
  category?: MenuCategory;
  searchTerm?: string;
  orderBy?: 'name' | 'price' | 'category';
  orderDirection?: 'asc' | 'desc';
} 