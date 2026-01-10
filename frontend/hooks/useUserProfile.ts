'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

// --- Type Definitions (Consider moving to a shared types file) ---
export interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: string;
  loyaltyPoints?: number; // Optional based on previous file
}

export interface OrderItemDetail {
  quantity: number;
  menuItem: {
    name: string;
    price: number;
  }
}

export interface OrderHistoryItem {
  id: number;
  total: number;
  status: string;
  createdAt: string; // Keep as string, format in component
  items: OrderItemDetail[];
}
// --- End Type Definitions ---

interface UseUserProfileReturn {
  user: UserProfile | null;
  orders: OrderHistoryItem[];
  isLoading: boolean;
  error: string | null;
  refetchUserProfile: () => Promise<void>;
}

export function useUserProfile(): UseUserProfileReturn {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchUserProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const token = localStorage.getItem('token');
    console.log('Using token for profile fetch:', token); // Log the token

    if (!token) {
      // Don't set error, just redirect
      setIsLoading(false); // Stop loading as we are redirecting
      router.push('/login');
      return;
    }

    try {
      // Fetch profile first to get user ID
      const profileResponse = await api.get('/users/profile');

      if (!profileResponse.ok) {
        throw new Error(`Failed to fetch user profile (${profileResponse.status})`);
      }

      const userData: UserProfile = await profileResponse.json();
      setUser(userData);

      // Fetch orders using the user ID from profile
      const ordersResponse = await api.get(`/users/${userData.id}/orders`);

      if (!ordersResponse.ok) {
        // Don't throw here, profile might still be useful. Set partial error?
        console.warn(`Failed to fetch orders (${ordersResponse.status})`);
        setOrders([]); // Set empty orders on failure
        setError('Failed to load order history.'); // Set specific error for orders
      } else {
        const ordersData: OrderHistoryItem[] = await ordersResponse.json();
        setOrders(ordersData);
      }

    } catch (err) {
      console.error('Error fetching user data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user data.');
      setUser(null); // Clear user data on critical error
      setOrders([]); // Clear orders on critical error
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]); // Add router to dependency array as it's used for navigation

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  return { user, orders, isLoading, error, refetchUserProfile: fetchUserProfile };
} 