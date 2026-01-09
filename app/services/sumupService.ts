import api from './api';

/**
 * Service for handling SumUp payment operations
 */
export const sumupService = {
  /**
   * Initiates a checkout with the backend
   * 
   * @param orderId - Order ID to process payment for
   * @returns Checkout information including ID and checkout URL
   */
  createCheckout: async (orderId: number) => {
    try {
      if (__DEV__) {
        console.log('🔄 Initiating checkout for order ID:', orderId);
        console.log('🌐 API base URL:', api.defaults.baseURL);
      }

      // Use the correct payment API endpoint
      const response = await api.post('/v1/payment/initiate-checkout', { orderId });

      if (__DEV__) {
        console.log('✅ Checkout response received:', response.data);
      }

      // Validate the response has the required fields
      // Backend returns { success: true, data: { ... } }
      const responseData = response.data?.data || response.data;
      const { checkoutId, checkoutUrl, orderId: responseOrderId } = responseData;

      if (!checkoutId || !checkoutUrl) {
        console.error('❌ Invalid checkout response - missing required fields');
        console.error('Expected: checkoutId and checkoutUrl');
        console.error('Received:', response.data);
        throw new Error('Invalid checkout response from server');
      }

      return {
        checkoutId,
        checkoutUrl,
        orderId: responseOrderId || orderId
      };

    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ Checkout creation failed:', error);
        console.error('Status:', error.response?.status);
        console.error('Response:', error.response?.data);
        console.error('Request URL:', error.config?.url);
        console.error('Request method:', error.config?.method);
        console.error('Request headers:', error.config?.headers);
      }

      // Handle specific error cases
      if (error.response?.status === 409) {
        throw new Error('Checkout already in progress. Please wait and try again.');
      } else if (error.response?.status === 404) {
        throw new Error('Order not found. Please try creating a new order.');
      } else if (error.response?.status === 400) {
        const errorMsg = error.response?.data?.error || 'Invalid order data';
        throw new Error(`Bad request: ${errorMsg}`);
      } else if (error.response?.status >= 500) {
        const errorMsg = error.response?.data?.error || 'Server error';
        throw new Error(`Server error: ${errorMsg}`);
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout. Please check your internet connection and try again.');
      } else if (error.code === 'NETWORK_ERROR') {
        throw new Error('Network error. Please check your internet connection and try again.');
      } else {
        const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
        throw new Error(`Failed to create checkout: ${errorMsg}`);
      }
    }
  },

  /**
   * Gets the current order status
   * 
   * @param orderId - Order ID to check
   * @returns Current order status
   */
  getOrderStatus: async (orderId: number) => {
    try {
      const response = await api.get(`/v1/orders/${orderId}`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error getting order status:', error);
      throw new Error('Failed to get order status. Please try again.');
    }
  },

  /**
   * Gets the current payment status of an order
   * 
   * @param orderId - Order ID to check payment status for
   * @returns Order payment status
   */
  getPaymentStatus: async (orderId: number) => {
    try {
      console.log('Fetching order status for order ID:', orderId);
      const response = await api.get(`/v1/orders/${orderId}/status`);
      console.log('Order status response data:', response.data);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error checking payment status:', error);
      throw new Error('Failed to check payment status. Please try again.');
    }
  },

  /**
   * Gets the current status of a SumUp checkout directly from the SumUp API via our backend
   * 
   * @param checkoutId - SumUp checkout ID to check
   * @returns Checkout status from SumUp
   */
  getSumupCheckoutStatus: async (checkoutId: string) => {
    try {
      console.log('Fetching SumUp checkout status for ID:', checkoutId);
      const response = await api.get(`/v1/payment/checkouts/${checkoutId}/status`);
      console.log('SumUp checkout status response:', response.data);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error checking SumUp checkout status:', error);
      throw new Error('Failed to check payment status. Please try again.');
    }
  }
}; 