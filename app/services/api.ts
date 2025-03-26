import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: 'http://192.168.1.28:5001/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add the auth token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
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
    const response = await api.get('/menu');
    return response.data;
  },
};

export const orderAPI = {
  createOrder: async (orderData: {
    items: Array<{ menuItemId: number; quantity: number }>;
    collectionTime: string;
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
  },
};

export default api;
