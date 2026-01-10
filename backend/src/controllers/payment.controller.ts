import { Request, Response } from 'express';
import { HTTP_STATUS } from '../config/constants';
import { IPaymentService } from '../interfaces/IPaymentService';
import { sendSuccess, sendError } from '../utils/response.utils';

export class PaymentController {
  constructor(private paymentService: IPaymentService) { }

  /**
   * Initiate SumUp checkout
   * POST /v1/initiate-checkout
   */
  async initiateCheckout(req: Request, res: Response): Promise<void> {
    const { orderId } = req.body;
    console.log(`PaymentController: Received checkout request for order: ${orderId} (type: ${typeof orderId})`);

    if (!orderId) {
      sendError(res, 'Order ID is required', HTTP_STATUS.BAD_REQUEST);
      return;
    }

    try {
      // Add request locking to prevent duplicate calls
      const lockKey = `checkout:lock:${orderId}`;

      // Check if there's an existing ongoing checkout process for this order
      if ((global as any)[lockKey]) {
        console.log(`Checkout already in progress for order ${orderId}`);
        sendError(res, 'Checkout already in progress for this order', HTTP_STATUS.CONFLICT);
        return;
      }

      // Set lock
      (global as any)[lockKey] = true;

      try {
        const result = await this.paymentService.initiateCheckout(parseInt(orderId));
        sendSuccess(res, result);
      } catch (apiError: any) {
        // Handle the specific case of duplicate checkout
        const errorMessage = apiError.message || '';
        console.log(`API error message: ${errorMessage}`);

        if (errorMessage.includes('DUPLICATED_CHECKOUT')) {
          console.log('Handling duplicate checkout error - trying to get existing checkout');

          // Try to get the checkout URL using the service
          try {
            const result = await this.paymentService.initiateCheckout(parseInt(orderId));
            sendSuccess(res, result, 'Using existing checkout');
          } catch (fallbackError) {
            // If that fails, return a generic error
            sendError(res, 'Checkout already exists but cannot retrieve details', HTTP_STATUS.CONFLICT);
          }
          return;
        }

        // Re-throw other errors to be caught by outer catch block
        throw apiError;
      } finally {
        // Always release the lock
        (global as any)[lockKey] = false;
      }
    } catch (error) {
      console.error('Error initiating checkout:', error);
      sendError(res, 'Error initiating checkout', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Check SumUp checkout status
   * GET /v1/checkout-status/:checkoutId
   */
  async getCheckoutStatus(req: Request, res: Response): Promise<void> {
    const { checkoutId } = req.params;

    if (!checkoutId) {
      sendError(res, 'Checkout ID is required', HTTP_STATUS.BAD_REQUEST);
      return;
    }

    try {
      console.log(`Checking status for SumUp checkout: ${checkoutId}`);

      const result = await this.paymentService.getCheckoutStatus(checkoutId as string);
      sendSuccess(res, result);
    } catch (error) {
      console.error(`Error checking status for checkout ${checkoutId}:`, error);

      if (error instanceof Error && error.message === 'Checkout not found') {
        sendError(res, 'Checkout not found', HTTP_STATUS.NOT_FOUND);
        return;
      }

      // For API errors, return a structured response but marked as error
      sendError(res, 'Failed to query SumUp API', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get checkout URL for a SumUp checkout ID
   * GET /v1/checkout-url/:checkoutId
   */
  async getCheckoutUrl(req: Request, res: Response): Promise<void> {
    const { checkoutId } = req.params;

    if (!checkoutId) {
      sendError(res, 'Missing checkout ID', HTTP_STATUS.BAD_REQUEST);
      return;
    }

    try {
      const result = await this.paymentService.getCheckoutUrl(checkoutId as string);
      console.log('Checkout URL:', result.checkoutUrl);
      sendSuccess(res, result);
    } catch (error) {
      console.error('Error getting checkout URL:', error);

      if (error instanceof Error && error.message === 'Checkout not found') {
        sendError(res, 'Checkout not found', HTTP_STATUS.NOT_FOUND);
        return;
      }

      sendError(res, 'Failed to get checkout URL', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Test SumUp connection
   * GET /v1/test/sumup-connection
   */
  async testSumUpConnection(_req: Request, res: Response): Promise<void> {
    try {
      const result = await this.paymentService.testSumUpConnection();
      if (result.success) {
        sendSuccess(res, result);
      } else {
        sendError(res, 'Error connecting to SumUp', HTTP_STATUS.INTERNAL_SERVER_ERROR);
      }
    } catch (error) {
      console.error('Error testing SumUp connection:', error);
      sendError(res, 'Error connecting to SumUp', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get SumUp merchant profile
   * GET /v1/test/merchant-profile
   */
  async getMerchantProfile(_req: Request, res: Response): Promise<void> {
    try {
      const result = await this.paymentService.getMerchantProfile();
      sendSuccess(res, result);
    } catch (error) {
      console.error('Error getting merchant profile:', error);
      sendError(res, 'Error retrieving merchant profile', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Check order status with SumUp integration
   * GET /v1/test/check-order/:orderId
   */
  async checkOrderWithSumUp(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;

      console.log(`Checking detailed status for order ${orderId}`);

      if (!orderId) {
        sendError(res, 'Order ID is required', HTTP_STATUS.BAD_REQUEST);
        return;
      }

      const result = await this.paymentService.checkOrderWithSumUp(parseInt(orderId as string));
      sendSuccess(res, result);
    } catch (error) {
      console.error('Error checking order:', error);

      if (error instanceof Error && error.message === 'Order not found') {
        sendError(res, 'Order not found', HTTP_STATUS.NOT_FOUND);
        return;
      }

      sendError(res, 'Error checking order status', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  }
}
