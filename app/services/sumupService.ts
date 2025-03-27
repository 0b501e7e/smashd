import { Alert } from 'react-native';
import { orderAPI, paymentAPI } from './api';

// This service manages SumUp integration
export const sumupService = {
  /**
   * Initiates the checkout process with SumUp
   * 
   * @param orderId - The ID of the order to process payment for
   * @returns The SumUp checkout ID for use with the SumUp payment sheet
   */
  initiateCheckout: async (orderId: number): Promise<string> => {
    try {
      // This calls our backend which will create a SumUp checkout and return the ID
      const response = await paymentAPI.initiateCheckout(orderId);
      return response.checkoutId;
    } catch (error) {
      console.error('Failed to initiate SumUp checkout:', error);
      throw new Error('Payment initialization failed. Please try again.');
    }
  },

  /**
   * Confirms payment was successfully processed by SumUp
   * 
   * @param orderId - The ID of the order to confirm payment for
   * @returns The updated order data
   */
  confirmPayment: async (orderId: number) => {
    try {
      return await orderAPI.confirmPayment(orderId);
    } catch (error) {
      console.error('Failed to confirm payment:', error);
      throw new Error('Payment confirmation failed. Please contact support.');
    }
  },

  /**
   * Polls the order status to check for updates from SumUp webhooks
   * 
   * @param orderId - The ID of the order to check status for
   * @returns The current order status
   */
  checkOrderStatus: async (orderId: number) => {
    try {
      const response = await orderAPI.getOrderStatus(orderId);
      return response;
    } catch (error) {
      console.error('Failed to check order status:', error);
      throw new Error('Unable to retrieve order status.');
    }
  }
}; 