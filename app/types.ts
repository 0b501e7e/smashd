export type OrderStatus = 'AWAITING_PAYMENT' | 'PAYMENT_CONFIRMED' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'PAYMENT_FAILED';

export type UserRole = 'ADMIN' | 'STAFF' | 'DRIVER' | 'CUSTOMER';

export type MenuCategory = 'BURGER' | 'SIDE' | 'DRINK' | 'DESSERT';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export interface CustomizationOption {
  id: string | number;
  name: string;
  price: number;
  categoryId?: number;
  category?: {
    id: number;
    name: string;
  };
}

export interface CustomizationOptions {
  extras?: string[];
  sauces?: string[];
  toppings?: string[];
}

export interface AllCustomizations {
  extras: CustomizationOption[];
  sauces: CustomizationOption[];
  toppings: CustomizationOption[];
}

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
