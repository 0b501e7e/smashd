import React, { createContext, useContext, ReactNode } from 'react';

// Define your root store type
type RootStoreType = {
  // Add your store properties here
  initialized: boolean;
};

// Create an initial state
const initialState: RootStoreType = {
  initialized: true
};

// Create the context
const RootStoreContext = createContext<RootStoreType | undefined>(undefined);

// Provider component
export const RootStoreProvider = ({ children }: { children: ReactNode }) => {
  // You can add more complex state management here if needed
  const store = initialState;
  
  return (
    <RootStoreContext.Provider value={store}>
      {children}
    </RootStoreContext.Provider>
  );
};

// Hook to use the store
export const useRootStore = () => {
  const context = useContext(RootStoreContext);
  if (context === undefined) {
    throw new Error('useRootStore must be used within RootStoreProvider');
  }
  return context;
}; 