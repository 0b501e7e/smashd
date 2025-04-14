'use client' // Ensure this is a client component

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Keep original MenuItem type for fetching menu data
export type MenuItem = {
  id: number;         // Corresponds to the database ID
  name: string;
  price: number;      // Base price from the database
  imageUrl: string;
  description: string;
  category: string;
};

// Define the structure for selected customizations
export type CustomizationSelection = {
  extras?: string[]; // e.g., ["Extra Patty", "Bacon"]
  sauces?: string[]; // e.g., ["Ketchup", "Special Sauce"]
  toppings?: string[]; // e.g., ["Lettuce", "Onion", "Jalapenos"]
};

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

  // Function to generate a unique ID for cart items
  const generateCartItemId = (menuItemId: number, customizations?: CustomizationSelection) => {
    const custString = JSON.stringify(customizations || {});
    // Simple unique ID combining item ID and a hash/representation of customizations
    return `${menuItemId}-${custString}-${Date.now()}`; // Added timestamp for uniqueness even with same customization
  };

  const addToBasket = (itemToAdd: Omit<BasketItem, 'cartItemId'>) => {
    setBasket((prevBasket) => {
      const cartItemId = generateCartItemId(itemToAdd.menuItemId, itemToAdd.customizations);
      // Check if an identical item (same menuItemId AND same customizations) already exists
      // Note: This simple check might need refinement depending on how complex customizations get
      const existingItemIndex = prevBasket.findIndex(
          (item) => item.menuItemId === itemToAdd.menuItemId &&
                   JSON.stringify(item.customizations || {}) === JSON.stringify(itemToAdd.customizations || {})
      );

      if (existingItemIndex > -1) {
        // Update quantity of existing item
        const updatedBasket = [...prevBasket];
        updatedBasket[existingItemIndex] = {
          ...updatedBasket[existingItemIndex],
          quantity: updatedBasket[existingItemIndex].quantity + itemToAdd.quantity,
        };
        return updatedBasket;
      } else {
        // Add as new item
        const newItem: BasketItem = {
            ...itemToAdd,
            cartItemId: cartItemId, // Add the generated unique ID
        };
        return [...prevBasket, newItem];
      }
    });
  };

  const removeFromBasket = (cartItemId: string) => {
    setBasket((prevBasket) => prevBasket.filter(item => item.cartItemId !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, newQuantity: number) => {
    setBasket((prevBasket) =>
      prevBasket.map(item =>
        item.cartItemId === cartItemId
          ? { ...item, quantity: Math.max(0, newQuantity) } // Prevent negative quantity
          : item
      ).filter(item => item.quantity > 0) // Remove item if quantity becomes 0
    );
  };

  const clearBasket = () => {
    setBasket([]);
  };

  const getTotalPrice = () => {
    return basket.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  };

  const getTotalItems = () => {
      return basket.reduce((total, item) => total + item.quantity, 0);
  }

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