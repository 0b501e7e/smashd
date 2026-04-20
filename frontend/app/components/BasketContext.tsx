'use client' // Ensure this is a client component

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { buildCartItemKey, normalizeCustomizationSelection } from '@/lib/cart';
import type { CustomizationSelectionDTO, MenuItemDTO } from '@shared/contracts';

// Keep original MenuItem type for fetching menu data
export type MenuItem = MenuItemDTO;

// Define the structure for selected customizations
export type CustomizationSelection = CustomizationSelectionDTO;

// New type for items *in* the basket
export type BasketItem = {
  cartItemId: string; // Unique ID for this specific item instance in the cart (e.g., item.id + timestamp or hash of customizations)
  menuItemId: number;  // Original menu item ID
  name: string;
  quantity: number;
  unitPrice: number;   // Price per unit *including* customizations
  customizations?: CustomizationSelection;
  imageUrl?: string; // Keep image for display in cart
};

type BasketContextType = {
  basket: BasketItem[];
  addToBasket: (item: Omit<BasketItem, 'cartItemId'>) => void; // Function now takes the detailed BasketItem structure (minus generated cartItemId)
  removeFromBasket: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, newQuantity: number) => void;
  clearBasket: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
};

const BasketContext = createContext<BasketContextType | undefined>(undefined);

export const BasketProvider = ({ children }: { children: ReactNode }) => {
  const [basket, setBasket] = useState<BasketItem[]>([]);

  const addToBasket = useCallback((itemToAdd: Omit<BasketItem, 'cartItemId'>) => {
    setBasket((prevBasket) => {
      const normalizedCustomizations = normalizeCustomizationSelection(itemToAdd.customizations);
      const cartItemId = buildCartItemKey(itemToAdd.menuItemId, normalizedCustomizations);
      const existingItemIndex = prevBasket.findIndex(
        (item) => item.cartItemId === cartItemId
      );

      if (existingItemIndex > -1) {
        const updatedBasket = [...prevBasket];
        updatedBasket[existingItemIndex] = {
          ...updatedBasket[existingItemIndex],
          quantity: updatedBasket[existingItemIndex].quantity + itemToAdd.quantity,
        };
        return updatedBasket;
      } else {
        const newItem: BasketItem = {
          ...itemToAdd,
          customizations: normalizedCustomizations,
          cartItemId,
        };
        return [...prevBasket, newItem];
      }
    });
  }, []);

  const removeFromBasket = useCallback((cartItemId: string) => {
    setBasket((prevBasket) => prevBasket.filter(item => item.cartItemId !== cartItemId));
  }, []);

  const updateQuantity = useCallback((cartItemId: string, newQuantity: number) => {
    setBasket((prevBasket) =>
      prevBasket.map(item =>
        item.cartItemId === cartItemId
          ? { ...item, quantity: Math.max(0, newQuantity) }
          : item
      ).filter(item => item.quantity > 0)
    );
  }, []);

  const clearBasket = useCallback(() => {
    setBasket([]);
  }, []);

  const getTotalPrice = useCallback(() => {
    return basket.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  }, [basket]);

  const getTotalItems = useCallback(() => {
    return basket.reduce((total, item) => total + item.quantity, 0);
  }, [basket]);

  return (
    <BasketContext.Provider value={{
      basket,
      addToBasket,
      removeFromBasket,
      updateQuantity,
      clearBasket,
      getTotalPrice,
      getTotalItems
    }}>
      {children}
    </BasketContext.Provider>
  );
};

export const useBasket = () => {
  const context = useContext(BasketContext);
  if (!context) {
    throw new Error('useBasket must be used within a BasketProvider');
  }
  return context;
};
