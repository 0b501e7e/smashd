import React, { createContext, useContext, useState, ReactNode } from 'react';

export type MenuItem = {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
  description: string;
  category: string;
};

type BasketContextType = {
  basket: MenuItem[];
  addToBasket: (item: MenuItem) => void;
  clearBasket: () => void;
};

const BasketContext = createContext<BasketContextType | undefined>(undefined);

export const BasketProvider = ({ children }: { children: ReactNode }) => {
  const [basket, setBasket] = useState<MenuItem[]>([]);

  const addToBasket = (item: MenuItem) => {
    setBasket((prevBasket) => [...prevBasket, item]);
  };

  const clearBasket = () => {
    setBasket([]);
  };

  return (
    <BasketContext.Provider value={{ basket, addToBasket, clearBasket }}>
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