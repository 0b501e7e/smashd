import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
console.log("🚦 API BASE URL at runtime:", Constants?.expoConfig?.extra?.EXPO_PUBLIC_API_URL);

// Get the host from Expo when running in development
const getLocalHost = () => {
  const debuggerHost = Constants.expoConfig?.hostUri || 'localhost';
  const host = debuggerHost.split(':')[0];
  return host;
};

// Get API URL with fallback for production
const getApiUrl = () => {
  // Get from expo config extra (from app.config.js variants)
  const apiUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL;

  if (!apiUrl) {
    console.error('EXPO_PUBLIC_API_URL is not defined in app config! This will cause app to crash.');
    // Fallback to your production URL
    return 'https://backend-production-e9ac.up.railway.app';
  }

  console.log('🌐 Found API URL from app config:', apiUrl);
  console.log('🎯 App Variant:', Constants.expoConfig?.extra?.EXPO_PUBLIC_APP_ENV || 'production');
  console.log('🔧 Full Expo Config Extra:', Constants.expoConfig?.extra);

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
    'X-App-Platform': 'react-native', // Identify React Native requests
  },
  // Set timeout to avoid long-running requests (increased for production)
  timeout: 15000,
});

// Track guest mode status
let isGuestMode = false;

// Initialize guest mode from storage on app start
const initializeGuestMode = async () => {
  try {
    const guestMode = await AsyncStorage.getItem('guestMode');
    isGuestMode = guestMode === 'true';

    // If we have a valid JWT token, clear guest mode
    const token = await AsyncStorage.getItem('token');
    if (token && isGuestMode) {
      console.log('Clearing guest mode - user has valid token');
      await AsyncStorage.removeItem('guestMode');
      isGuestMode = false;
    }
  } catch (error) {
    console.error('Error initializing guest mode:', error);
    isGuestMode = false;
  }
};

// Initialize immediately
initializeGuestMode();

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
    // Ensure guest mode is properly initialized for this request
    await checkGuestMode();

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

    // In guest mode, we don't care about 401 errors for user-specific endpoints
    if (isGuestMode && error.response?.status === 401) {
      const url = error.config?.url || '';
      // For guest mode, silently handle 401s for user-specific endpoints
      if (url.includes('/v1/menu') ||
        url.includes('/v1/users/profile') ||
        (url.includes('/v1/users/') && url.includes('/last-order'))) {
        console.log('Silently handling 401 in guest mode for:', url);
        return { data: null }; // Return null data instead of error
      }
    } else if (error.response?.status === 401) {
      // Token expired or invalid (only when not in guest mode)
      await AsyncStorage.removeItem('token');
      isGuestMode = false; // Reset guest mode if token was invalid
      // You might want to redirect to login here
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email: string, password: string) => {
    console.log('🔐 Login attempt:', { email, apiUrl: API_URL });
    console.log('🌐 Full login URL:', `${API_URL}/v1/auth/login`);
    const response = await api.post('/v1/auth/login', { email, password });
    console.log('✅ Login successful:', response.data);

    // Extract token from the nested data structure
    const token = response.data?.data?.token;
    if (token) {
      await AsyncStorage.setItem('token', token);
      console.log('💾 Token saved successfully');
    } else {
      console.error('❌ No token found in response:', response.data);
    }

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

  // Forgot / Reset password
  forgotPassword: async (email: string) => {
    const res = await api.post('/v1/auth/forgot-password', { email });
    return res.data;
  },

  resetPassword: async (token: string, password: string) => {
    const res = await api.post('/v1/auth/reset-password', { token, password });
    return res.data;
  },
};

// Define the structure for all customizations, mirroring the frontend type
type CustomizationOption = {
  id: string | number; // Support both string and number IDs for flexibility
  name: string;
  price: number;
};

type AllCustomizations = {
  extras: CustomizationOption[];
  sauces: CustomizationOption[];
  toppings: CustomizationOption[];
};

export const menuAPI = {
  getMenuItems: async () => {
    try {
      const response = await api.get('/v1/menu');
      const menuItems = response.data?.data;
      console.log(`Sending ${menuItems?.length} menu items`);
      return menuItems;
    } catch (error: any) {
      console.error('Menu fetch error:', error);
      throw error;
    }
  },

  getMenuItemById: async (id: number) => {
    const response = await api.get(`/v1/menu/${id}`);
    return response.data?.data;
  },

  // New function to fetch customizations for a menu item
  getItemCustomizations: async (id: number): Promise<AllCustomizations> => {
    try {
      console.log(`🔧 Fetching customizations for menu item ${id} from ${API_URL}/v1/menu/items/${id}/customizations`);
      const response = await api.get(`/v1/menu/items/${id}/customizations`);
      console.log('✅ Customizations response status:', response.status);
      console.log('📦 Customizations response data:', JSON.stringify(response.data, null, 2));

      const customizationsData = response.data?.data;

      if (!customizationsData) {
        console.warn('⚠️ No customizations data received');
        return { extras: [], sauces: [], toppings: [] };
      }

      // Support both legacy fixed categories and dynamic grouping
      const result: AllCustomizations = {
        extras: customizationsData.Extras || customizationsData.extras || [],
        sauces: customizationsData.Sauces || customizationsData.sauces || [],
        toppings: customizationsData.Toppings || customizationsData.toppings || []
      };

      // If we have other categories, we could potentially handle them here
      // but the mobile app UI expects extras, sauces, toppings specifically.

      console.log('🎯 Transformed customizations:', JSON.stringify(result, null, 2));
      return result;
    } catch (error: any) {
      console.error(`❌ Error fetching customizations for item ${id}:`, error);
      return { extras: [], sauces: [], toppings: [] };
    }
  },

  // Fetch all general customizations (fallback for items with no specific customizations)
  getGeneralCustomizations: async (): Promise<AllCustomizations> => {
    const response = await api.get('/v1/menu/customizations');
    const categories = response.data?.data || response.data || [];

    // Transform backend categories into expected format
    const customizations: AllCustomizations = {
      extras: [],
      sauces: [],
      toppings: []
    };

    categories.forEach((category: any) => {
      const categoryName = category.name.toLowerCase();
      if (categoryName === 'extras') {
        customizations.extras = category.options.map((option: any) => ({
          id: option.id.toString(),
          name: option.name,
          price: option.price || 0
        }));
      } else if (categoryName === 'sauces') {
        customizations.sauces = category.options.map((option: any) => ({
          id: option.id.toString(),
          name: option.name,
          price: option.price || 0
        }));
      } else if (categoryName === 'toppings') {
        customizations.toppings = category.options.map((option: any) => ({
          id: option.id.toString(),
          name: option.name,
          price: option.price || 0
        }));
      }
    });

    return customizations;
  },
};

export const orderAPI = {
  createOrder: async (orderData: {
    items: Array<{ menuItemId: number; quantity: number; price: number; customizations?: any }>;
    total: number;
    fulfillmentMethod?: 'PICKUP' | 'DELIVERY';
    deliveryAddress?: string;
  }) => {
    const response = await api.post('/v1/orders', orderData);
    return response.data?.data;
  },

  verifyPayment: async (orderId: number, paymentData: any) => {
    const response = await api.post(`/v1/orders/${orderId}/verify-payment`, {
      ...paymentData
    });
    return response.data?.data;
  },

  getUserOrders: async (userId: number) => {
    const response = await api.get(`/v1/users/${userId}/orders`);
    return response.data?.data;
  },

  getOrderStatus: async (orderId: number) => {
    const response = await api.get(`/v1/orders/${orderId}/status`);
    return response.data?.data;
  },
  repeatOrder: async (orderId: number) => {
    const response = await api.get(`/v1/users/orders/${orderId}/repeat`);
    return response.data?.data;
  },
};

export const analyticsAPI = {
  trackEvent: async (eventType: string, sessionId?: string, metadata?: any) => {
    try {
      const response = await api.post('/v1/analytics/track', {
        eventType,
        sessionId,
        metadata
      });
      return response.data;
    } catch (error) {
      console.error('Error tracking analytics event:', error);
      return null;
    }
  }
};

export const userAPI = {
  getProfile: async () => {
    const response = await api.get('/v1/users/profile');
    return response.data?.data;
  },
  getLastOrder: async (userId: number) => {
    const response = await api.get(`/v1/users/${userId}/last-order`);
    return response.data?.data;
  },
};

export const driverAPI = {
  getOrders: async () => {
    const response = await api.get('/v1/driver/orders');
    return response.data?.data;
  },

  getActiveOrders: async () => {
    const response = await api.get('/v1/driver/orders/active');
    return response.data?.data;
  },

  getOrderDetails: async (orderId: number) => {
    const response = await api.get(`/v1/driver/orders/${orderId}`);
    return response.data?.data;
  },

  acceptOrder: async (orderId: number) => {
    const response = await api.post(`/v1/driver/orders/${orderId}/accept`);
    return response.data?.data;
  },

  markDelivered: async (orderId: number) => {
    const response = await api.post(`/v1/driver/orders/${orderId}/delivered`);
    return response.data?.data;
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
      const response = await api.post('/v1/payment/initiate-checkout', payload);
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

  getOrderStatus: async (orderId: number) => {
    return orderAPI.getOrderStatus(orderId);
  }
};

export default api;
