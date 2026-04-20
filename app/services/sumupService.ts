import { orderAPI, paymentAPI } from './api';

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
      return await paymentAPI.initiateCheckout(orderId);
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ Checkout creation failed:', error);
      }
      throw error;
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
      return await orderAPI.getOrderStatus(orderId);
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
      return await orderAPI.getOrderStatus(orderId);
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
      return await paymentAPI.getCheckoutStatus(checkoutId);
    } catch (error) {
      console.error('Error checking SumUp checkout status:', error);
      throw new Error('Failed to check payment status. Please try again.');
    }
  }
}; 
