import { paymentAPI } from './api';

/**
 * Service for handling SumUp payment operations
 */
export const sumupService = {
  /**
   * Initiates a payment checkout with SumUp
   * 
   * @param orderId - Order ID to process payment for
   * @returns Checkout details including checkout URL and ID
   */
  initiateCheckout: async (orderId: number) => {
    const response = await paymentAPI.initiateCheckout(orderId);
    return response;
  },
  
  /**
   * Checks the current payment status of an order
   * 
   * @param orderId - Order ID to check status for
   * @returns Current order status
   */
  getPaymentStatus: async (orderId: number) => {
    const response = await paymentAPI.getOrderStatus(orderId);
    return response;
  }
}; 