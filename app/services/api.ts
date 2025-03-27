import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.168:5001/v1';
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

// Add a request interceptor to add the auth token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('API Request:', config.method?.toUpperCase(), config.url);
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

    if (error.response?.status === 401) {
      // Token expired or invalid
      await AsyncStorage.removeItem('token');
      // You might want to redirect to login here
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    await AsyncStorage.setItem('token', response.data.token);
    return response.data;
  },

  register: async (username: string, email: string, password: string) => {
    const response = await api.post('/auth/register', { username, email, password });
    return response.data;
  },

  logout: async () => {
    await AsyncStorage.removeItem('token');
  },
};

export const menuAPI = {
  getMenu: async () => {
    try {
      console.log('Getting menu from', `${API_URL}/menu`);
      const response = await api.get('/menu');
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
    const response = await api.get(`/menu/${id}`);
    return response.data;
  },
};

export const orderAPI = {
  createOrder: async (orderData: {
    items: Array<{ menuItemId: number; quantity: number; price: number; customizations?: any }>;
    collectionTime: string;
    total: number;
  }) => {
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  confirmPayment: async (orderId: number) => {
    const response = await api.post(`/orders/${orderId}/confirm-payment`);
    return response.data;
  },

  getUserOrders: async () => {
    const response = await api.get('/users/profile/orders');
    return response.data;
  },
  
  getOrderStatus: async (orderId: number) => {
    const response = await api.get(`/orders/${orderId}/status`);
    return response.data;
  },
};

export const userAPI = {
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },
};

export const paymentAPI = {
  initiateCheckout: async (orderId: number) => {
    const response = await api.post('/initiate-checkout', { orderId });
    return response.data;
  }
};

export default api;
