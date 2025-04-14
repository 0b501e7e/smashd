'use client'; // Assuming this hook might be used in client components

import { useState, useEffect } from 'react';
import { MenuItem } from '@/app/components/BasketContext'; // Corrected import path

interface UseMenuReturn {
  menuItems: Record<string, MenuItem[]>;
  isLoading: boolean;
  error: string | null;
  fetchMenuItems: () => Promise<void>; // Expose refetch function if needed
}

export function useMenu(): UseMenuReturn {
  const [menuItems, setMenuItems] = useState<Record<string, MenuItem[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMenuItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
          throw new Error("API URL not configured in environment variables.");
      }
      const menuEndpoint = `${apiUrl}/menu`;
      console.log('Getting menu from', menuEndpoint); // Keep log for debugging
      const response = await fetch(menuEndpoint);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: MenuItem[] = await response.json();
      console.log('Menu response data:', data); // Keep log for debugging

      // Group items by category
      const groupedItems = data.reduce((acc, item) => {
        const category = item.category || 'UNCATEGORIZED'; // Handle items potentially missing a category
        if (!acc[category]) {
          acc[category] = [];
        }
        // Prevent duplicates just in case API returns them
        if (!acc[category].some((existingItem: MenuItem) => existingItem.id === item.id)) {
          acc[category].push(item);
        }
        return acc;
      }, {} as Record<string, MenuItem[]>);

      setMenuItems(groupedItems);
    } catch (err) {
      console.error('Error fetching menu items:', err);
      // Set a user-friendly error message
      setError(err instanceof Error ? err.message : 'Failed to load menu items. Please try again later.');
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Fetch on initial mount

  return { menuItems, isLoading, error, fetchMenuItems };
} 