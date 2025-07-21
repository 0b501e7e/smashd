import { Request, Response } from 'express';
import { HTTP_STATUS } from '../config/constants';
import { IPaymentService } from '../interfaces/IPaymentService';

export class PaymentController {
  constructor(private paymentService: IPaymentService) {}

  /**
   * Initiate SumUp checkout
   * POST /v1/initiate-checkout
   */
  async initiateCheckout(req: Request, res: Response): Promise<void> {
    const { orderId } = req.body;
    console.log(`PaymentController: Received checkout request for order: ${orderId} (type: ${typeof orderId})`);

    if (!orderId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Order ID is required'
      });
      return;
    }

    try {
      // Add request locking to prevent duplicate calls
      const lockKey = `checkout:lock:${orderId}`;
      
      // Check if there's an existing ongoing checkout process for this order
      if ((global as any)[lockKey]) {
        console.log(`Checkout already in progress for order ${orderId}`);
        res.status(HTTP_STATUS.CONFLICT).json({ 
          error: 'Checkout already in progress for this order',
          status: 'PENDING'
        });
        return;
      }
      
      // Set lock
      (global as any)[lockKey] = true;
      
      try {
        const result = await this.paymentService.initiateCheckout(parseInt(orderId));
        res.json(result);
      } catch (apiError: any) {
        // Handle the specific case of duplicate checkout
        const errorMessage = apiError.message || '';
        console.log(`API error message: ${errorMessage}`);
        
        if (errorMessage.includes('DUPLICATED_CHECKOUT')) {
          console.log('Handling duplicate checkout error - trying to get existing checkout');
          
          // Try to get the checkout URL using the service
          try {
            const result = await this.paymentService.initiateCheckout(parseInt(orderId));
            res.json({
              ...result,
              message: 'Using existing checkout'
            });
          } catch (fallbackError) {
            // If that fails, return a generic error
            res.status(HTTP_STATUS.CONFLICT).json({
              error: 'Checkout already exists but cannot retrieve details',
              orderId: parseInt(orderId)
            });
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
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Error initiating checkout',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check SumUp checkout status
   * GET /v1/checkout-status/:checkoutId
   */
  async getCheckoutStatus(req: Request, res: Response): Promise<void> {
    const { checkoutId } = req.params;
    
    if (!checkoutId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Checkout ID is required'
      });
      return;
    }

    try {
      console.log(`Checking status for SumUp checkout: ${checkoutId}`);
      
      const result = await this.paymentService.getCheckoutStatus(checkoutId);
      res.json(result);
    } catch (error) {
      console.error(`Error checking status for checkout ${checkoutId}:`, error);
      
      if (error instanceof Error && error.message === 'Checkout not found') {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Checkout not found'
        });
        return;
      }
      
      // For API errors, return a structured response
      res.json({
        checkoutId,
        orderId: 0,
        status: 'ERROR',
        error: 'Failed to query SumUp API'
      });
    }
  }

  /**
   * Get checkout URL for a SumUp checkout ID
   * GET /v1/checkout-url/:checkoutId
   */
  async getCheckoutUrl(req: Request, res: Response): Promise<void> {
    const { checkoutId } = req.params;
    
    if (!checkoutId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Missing checkout ID'
      });
      return;
    }
    
    try {
      const result = await this.paymentService.getCheckoutUrl(checkoutId);
      console.log('Checkout URL:', result.checkoutUrl);
      res.json(result);
    } catch (error) {
      console.error('Error getting checkout URL:', error);
      
      if (error instanceof Error && error.message === 'Checkout not found') {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Checkout not found'
        });
        return;
      }
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to get checkout URL',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
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
        res.json(result);
      } else {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(result);
      }
    } catch (error) {
      console.error('Error testing SumUp connection:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        error: 'Error connecting to SumUp',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get SumUp merchant profile
   * GET /v1/test/merchant-profile
   */
  async getMerchantProfile(_req: Request, res: Response): Promise<void> {
    try {
      const result = await this.paymentService.getMerchantProfile();
      res.json(result);
    } catch (error) {
      console.error('Error getting merchant profile:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
        success: false,
        error: 'Error retrieving merchant profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
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
        res.status(HTTP_STATUS.BAD_REQUEST).json({ 
          error: 'Order ID is required' 
        });
        return;
      }

      const result = await this.paymentService.checkOrderWithSumUp(parseInt(orderId));
      res.json(result);
    } catch (error) {
      console.error('Error checking order:', error);
      
      if (error instanceof Error && error.message === 'Order not found') {
        res.status(HTTP_STATUS.NOT_FOUND).json({ 
          error: 'Order not found' 
        });
        return;
      }
      
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
        error: 'Error checking order status', 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
} 