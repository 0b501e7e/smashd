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
  // Add any other properties that may be in cart items
}

export interface Order {
  id: number;
  items: CartItem[];
  total: number;
  status: string;
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