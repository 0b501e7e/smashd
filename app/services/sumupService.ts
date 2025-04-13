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
      // Note: API base URL already includes /v1 so we don't need it in the path
      const response = await api.post('/initiate-checkout', { orderId });
      // Only log in development to avoid cluttering logs
      if (__DEV__) {
        console.log('Initiating checkout for order ID:', orderId);
      }
      return response.data;
    } catch (error) {
      console.error('Error creating checkout:', error);
      throw new Error('Failed to create checkout. Please try again.');
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
      const response = await api.get(`/orders/${orderId}`);
      return response.data;
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
      const response = await api.get(`/orders/${orderId}/status`);
      console.log('Order status response data:', response.data);
      return response.data;
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
      const response = await api.get(`/checkouts/${checkoutId}/status`);
      console.log('SumUp checkout status response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error checking SumUp checkout status:', error);
      throw new Error('Failed to check payment status. Please try again.');
    }
  }
}; 