import type {
  CustomizationCategoryDTO,
  CustomizationOptionDTO,
  CustomizationSelectionDTO,
  MenuCategoryDTO,
  OrderStatusDTO
} from '@shared/contracts';

export type OrderStatus = OrderStatusDTO;

export type UserRole = 'ADMIN' | 'STAFF' | 'DRIVER' | 'CUSTOMER';

export type MenuCategory = MenuCategoryDTO;

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export interface CustomizationOption extends CustomizationOptionDTO {
  category?: {
    id: number;
    name: string;
  };
}

export interface CustomizationCategory extends CustomizationCategoryDTO<CustomizationOption> {}

export interface CustomizationOptions extends CustomizationSelectionDTO {}

export type AllCustomizations = CustomizationCategory[];

export interface CartItem {
  id: string | number;
  name: string;
  price: number;
  quantity: number;
  customizations?: CustomizationOptions;
}

export interface Order {
  id: number;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  userId?: number;
  sumupCheckoutId?: string;
}

export interface CartContextType {
  cart: CartItem[];
  order: {
    items: CartItem[];
    total: number;
  };
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: string | number) => void;
  updateQuantity: (itemId: string | number, quantity: number) => void;
  clearCart: () => void;
  createOrder: () => Promise<Order | null>;
  setOrder: (order: any) => void;
}
