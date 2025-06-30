import { createContext, useContext, useState } from 'react';
import api from '@/services/api';
import { CartItem, Order } from '@/types';

type CustomizationOptions = {
  extras?: string[];
  sauces?: string[];
  toppings?: string[];
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  total: number;
  order: {
    items: CartItem[];
    total: number;
  };
  createOrder: () => Promise<Order | null>;
  setOrder: (order: any) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [order, setOrder] = useState<{items: CartItem[], total: number}>({ items: [], total: 0 });

  const addItem = (newItem: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    const itemQuantity = newItem.quantity || 1;
    
    setItems(currentItems => {
      // Only consider it the same item if the ID and customizations match
      const existingItemIndex = currentItems.findIndex(item => 
        item.id === newItem.id && 
        JSON.stringify(item.customizations) === JSON.stringify(newItem.customizations)
      );
      
      if (existingItemIndex !== -1) {
        return currentItems.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + itemQuantity }
            : item
        );
      }
      
      return [...currentItems, { ...newItem, quantity: itemQuantity }];
    });
  };

  const removeItem = (id: number) => {
    setItems(currentItems => currentItems.filter(item => item.id !== id));
  };

  const updateQuantity = (id: number, quantity: number) => {
    setItems(currentItems => {
      if (quantity <= 0) {
        // Remove item when quantity reaches 0 or below
        return currentItems.filter(item => item.id !== id);
      }
      
      return currentItems.map(item =>
        item.id === id ? { ...item, quantity } : item
      );
    });
  };

  const clearCart = () => {
    setItems([]);
  };

  // Create a new order in the database
  const createOrder = async (): Promise<Order | null> => {
    try {
      const orderData = {
        items: items,
        total: total
      };
      
      const response = await api.post('/orders', orderData);
      const newOrder = response.data;
      
      // Set the current order
      setOrder({
        items: [...items],
        total: total
      });
      
      // Clear the cart after creating the order
      clearCart();
      
      return newOrder;
    } catch (error) {
      console.error('Failed to create order:', error);
      return null;
    }
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        total,
        order,
        createOrder,
        setOrder
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
