'use client';

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../lib/apiConstants'; // Import API_BASE_URL
import { api } from '../../lib/api';

// Define interface for MenuItem
interface MenuItem {
  id: string; // Or number, depending on your backend
  name: string;
  isAvailable: boolean; // Changed from inStock to isAvailable
  // Add other relevant fields like description, price, category if needed for display
}

export default function StockManagement() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch menu items from API
  useEffect(() => {
    const fetchMenuItems = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.get('/admin/menu/all');
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || result.message || `Failed to fetch menu items: ${response.statusText}`);
        }
        setMenuItems(result.data || []);
      } catch (err: any) {
        setError(err.message || 'An unknown error occurred');
        console.error("Error fetching menu items:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMenuItems();
  }, []);

  const toggleStockStatus = async (itemId: string, currentIsAvailable: boolean) => {
    // Optimistically update UI
    setMenuItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, isAvailable: !currentIsAvailable } : item
      )
    );

    try {
      // API endpoint for updating stock status is now more specific
      const response = await api.patch(`/admin/menu/${itemId}/availability`, { isAvailable: !currentIsAvailable });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || `Failed to update stock status: ${response.statusText}`);
      }
      // Optionally, re-fetch or update from response if needed
      // const updatedItem = await response.json();
      // setMenuItems(prevItems => prevItems.map(item => item.id === itemId ? updatedItem : item));
      console.log(`Stock status for item ${itemId} updated successfully.`);
    } catch (err: any) {
      setError(err.message || 'Failed to update stock status');
      console.error("Error toggling stock status:", err);
      // Revert optimistic update on error
      setMenuItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId ? { ...item, isAvailable: currentIsAvailable } : item // Revert to original state
        )
      );
    }
  };

  if (isLoading) return <p className="text-white text-center py-10">Loading menu items...</p>;
  if (error) return <p className="text-red-500 bg-red-900 p-3 rounded text-center">Error: {error}</p>;

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg mt-6">
      <h2 className="text-2xl font-semibold mb-4 text-yellow-400">Stock Management</h2>
      {menuItems.length === 0 && !isLoading ? (
        <p className="text-white text-center">No menu items found.</p>
      ) : (
        <ul className="space-y-4">
          {menuItems.map(item => (
            <li key={item.id} className="bg-gray-700 p-4 rounded-md shadow-sm flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-white">{item.name}</h3>
                <p className={`text-sm ${item.isAvailable ? 'text-green-400' : 'text-red-400'}`}>
                  {item.isAvailable ? 'In Stock' : 'Out of Stock'}
                </p>
              </div>
              <button
                onClick={() => toggleStockStatus(item.id, item.isAvailable)}
                className={`font-bold py-2 px-4 rounded transition duration-150 
                            ${item.isAvailable ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} 
                            text-white`}
              >
                {item.isAvailable ? 'Mark as Out of Stock' : 'Mark as In Stock'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 