import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Get the host from Expo when running in development
const getLocalHost = () => {
  const debuggerHost = Constants.expoConfig?.hostUri || 'localhost';
  const host = debuggerHost.split(':')[0];
  return host;
};

// Get API URL with fallback for production
const getApiUrl = () => {
  // Try to get from expo config extra first (for app.config.js)
  const extraApiUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL;
  // Then try from process.env (for .env files)
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL;
  
  const apiUrl = extraApiUrl || envApiUrl;
  
  if (!apiUrl) {
    console.error('EXPO_PUBLIC_API_URL is not defined! This will cause app to crash.');
    // Fallback to your production URL
    return 'https://backend-production-e9ac.up.railway.app';
  }
  
  console.log('🌐 Found API URL:', apiUrl);
  
  return Platform.OS === 'web' 
    ? apiUrl 
    : apiUrl.replace('localhost', getLocalHost());
};

export const API_URL = getApiUrl();
console.log('Using API URL:', API_URL);

// Create axios instance with proper error handling
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Set timeout to avoid long-running requests
  timeout: 10000,
});

// Track guest mode status
let isGuestMode = false;

// Function to set guest mode
export const setGuestMode = (enabled: boolean) => {
  isGuestMode = enabled;
  // Store the guest mode status for persistence across app restarts
  AsyncStorage.setItem('guestMode', enabled ? 'true' : 'false');
};

// Function to check if in guest mode with better error handling
export const checkGuestMode = async () => {
  try {
    const guestMode = await AsyncStorage.getItem('guestMode');
    isGuestMode = guestMode === 'true';
    return isGuestMode;
  } catch (error) {
    console.error('Error checking guest mode:', error);
    // Default to guest mode if there's an error
    isGuestMode = true;
    return isGuestMode;
  }
};

// Add a request interceptor to add the auth token to requests
api.interceptors.request.use(
  async (config) => {
    // Skip token for guest mode on non-public endpoints
    if (!isGuestMode) {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    console.log('API Request:', config.method?.toUpperCase(), config.url, isGuestMode ? '(Guest Mode)' : '');
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  async (error) => {
    // Log comprehensive error information
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Error Response:', {
        status: error.response.status,
        url: error.config?.url,
        data: error.response.data,
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('API No Response Error:', {
        url: error.config?.url,
        method: error.config?.method,
        request: error.request._response || 'No response data',
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('API Error:', error.message, error.config?.url);
    }

    // In guest mode, we don't care about 401 errors for certain endpoints
    if (isGuestMode && error.response?.status === 401) {
      // For public endpoints like menu, just continue without auth
      if (error.config?.url?.includes('/v1/menu')) {
        return { data: [] }; // Return empty data instead of error
      }
    } else if (error.response?.status === 401) {
      // Token expired or invalid
      await AsyncStorage.removeItem('token');
      // You might want to redirect to login here
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/v1/auth/login', { email, password });
    await AsyncStorage.setItem('token', response.data.token);
    setGuestMode(false); // Disable guest mode on login
    return response.data;
  },

  register: async (
    email: string, 
    password: string, 
    name: string, 
    dateOfBirth: string, 
    address: string, 
    phoneNumber: string, 
    acceptedTerms: boolean
  ) => {
    const response = await api.post('/v1/auth/register', { 
      email, 
      password, 
      name, 
      dateOfBirth, 
      address, 
      phoneNumber, 
      acceptedTerms 
    });
    setGuestMode(false); // Disable guest mode on registration
    return response.data;
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
    setGuestMode(false); // Reset guest mode on logout
  },
};

// Define the structure for all customizations, mirroring the frontend type
type CustomizationOption = {
  id: string;
  name: string;
  price: number;
};

type AllCustomizations = {
  extras: CustomizationOption[];
  sauces: CustomizationOption[];
  toppings: CustomizationOption[];
};

export const menuAPI = {
  getMenu: async () => {
    try {
      console.log('Getting menu from', `${API_URL}/v1/menu`);
      const response = await api.get('/v1/menu');
      console.log('Menu response data:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Menu fetch error:', error);
      // If axios error, log more details
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Error request:', error.request);
      }
      throw error;
    }
  },
  
  getMenuItemById: async (id: number) => {
    const response = await api.get(`/v1/menu/${id}`);
    return response.data;
  },

  // New function to fetch customizations for a menu item
  getItemCustomizations: async (id: number): Promise<AllCustomizations> => {
    const response = await api.get(`/v1/menu-items/${id}/customizations`);
    return response.data;
  },
};

export const orderAPI = {
  createOrder: async (orderData: {
    items: Array<{ menuItemId: number; quantity: number; price: number; customizations?: any }>;
    collectionTime: string;
    total: number;
  }) => {
    const response = await api.post('/v1/orders', orderData);
    return response.data;
  },

  confirmPayment: async (orderId: number, paymentData: any) => {
    const response = await api.post(`/v1/orders/${orderId}/payment-confirm`, {
      ...paymentData
    });
    return response.data;
  },

  getUserOrders: async (userId: number) => {
    console.log(`[api.ts] Fetching orders for userId: ${userId} via /users/:userId/orders`);
    const response = await api.get(`/v1/users/${userId}/orders`);
    return response.data;
  },
  
  getOrderStatus: async (orderId: number) => {
    try {
      console.log(`Fetching order status for order ID: ${orderId}`);
      const response = await api.get(`/v1/orders/${orderId}/status`);
      
      // Log and validate the response data
      console.log(`Order status response data:`, response.data);
      
      // Check if response data has the expected structure
      if (!response.data || !response.data.id) {
        console.warn(`Invalid order status response for order ${orderId}:`, response.data);
        throw new Error('Invalid order data received');
      }
      
      return response.data;
    } catch (error) {
      console.error(`Error getting order status for order ${orderId}:`, error);
      throw error;
    }
  },
  repeatOrder: async (orderId: number) => {
    // Ensure the endpoint matches your backend route for repeating an order
    const response = await api.post('/v1/orders/repeat', { orderId });
    return response.data;
  },
};

export const userAPI = {
  getProfile: async () => {
    const response = await api.get('/v1/users/profile');
    return response.data;
  },
  getLastOrder: async (userId: number) => {
    // Ensure the endpoint matches your backend route for fetching a user's last order
    const response = await api.get(`/v1/users/${userId}/last-order`);
    return response.data;
  },
};

export const paymentAPI = {
  /**
   * Initiates a payment checkout session with SumUp
   * 
   * @param orderId - Order ID to process payment for
   * @param redirectUrl - Optional URL to redirect after payment
   * @returns Checkout information including ID and URL
   */
  initiateCheckout: async (orderId: number, redirectUrl?: string) => {
    try {
      const payload = { orderId };
      if (redirectUrl) {
        Object.assign(payload, { redirectUrl });
      }
      const response = await api.post('/v1/initiate-checkout', payload);
      return response.data;
    } catch (error: any) {
      console.error('Error initiating checkout:', error);
      
      // Check if we have an API error response
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      }
      
      // Otherwise, throw a generic error
      throw new Error('Failed to initialize payment. Please try again.');
    }
  },

  /**
   * Gets the current order status
   * 
   * @param orderId - Order ID to check
   * @returns Order status and details
   */
  getOrderStatus: async (orderId: number) => {
    try {
      console.log(`Fetching order status for order ID: ${orderId}`);
      const response = await api.get(`/v1/orders/${orderId}/status`);
      
      // Log and validate the response data
      console.log(`Order status response data:`, response.data);
      
      // Check if response data has the expected structure
      if (!response.data || !response.data.id) {
        console.warn(`Invalid order status response for order ${orderId}:`, response.data);
        throw new Error('Invalid order data received');
      }
      
      return response.data;
    } catch (error) {
      console.error(`Error getting order status for order ${orderId}:`, error);
      throw error;
    }
  },
  repeatOrder: async (orderId: number) => {
    // Ensure the endpoint matches your backend route for repeating an order
    const response = await api.post('/v1/orders/repeat', { orderId });
    return response.data;
  },
};

export default api;
