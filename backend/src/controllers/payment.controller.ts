import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { HTTP_STATUS } from '../config/constants';
import { 
  createSumUpCheckout, 
  getSumUpCheckoutStatus, 
  testSumUpConnection, 
  getSumUpMerchantProfile 
} from '../services/sumupService';

const prisma = new PrismaClient();

/**
 * Initiate SumUp checkout
 * POST /v1/initiate-checkout
 */
export const initiateCheckout = async (req: Request, res: Response): Promise<void> => {
  const { orderId } = req.body;
  console.log(`Initiating checkout for order: ${orderId}`);

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
      const order = await prisma.order.findUnique({
        where: { id: parseInt(orderId) },
        include: { 
          items: {
            include: { menuItem: true }
          }
        }
      });

      if (!order) {
        res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Order not found'
        });
        return;
      }

      // Check if this order already has a SumUp checkout ID
      if (order.sumupCheckoutId) {
        console.log(`Order ${orderId} already has checkout ID: ${order.sumupCheckoutId}`);
        
        // Return existing checkout information
        res.json({
          orderId: order.id,
          checkoutId: order.sumupCheckoutId,
          checkoutUrl: `https://checkout.sumup.com/pay/${order.sumupCheckoutId}` // Standard URL format
        });
        return;
      }

      // Check if SumUp credentials are configured
      if (!process.env.SUMUP_CLIENT_ID || 
          !process.env.SUMUP_CLIENT_SECRET || 
          !process.env['SUMUP_MERCHANT_EMAIL']) {
        
        console.error('Missing SumUp credentials - these are required for payment processing');
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          error: 'SumUp credentials not configured'
        });
        return;
      }

      // Create SumUp checkout
      try {
        const checkoutResponse = await createSumUpCheckout(
          order.id,
          order.total,
          `Order #${order.id}`
        );

        console.log('SumUp API Response:', checkoutResponse);

        // Update the order with the SumUp checkout ID
        const updatedOrder = await prisma.order.update({
          where: { id: order.id },
          data: { sumupCheckoutId: checkoutResponse.id }
        });

        res.json({
          orderId: updatedOrder.id,
          checkoutId: checkoutResponse.id,
          checkoutUrl: checkoutResponse.hosted_checkout_url
        });
        return;

      } catch (apiError: any) {
        // Handle the specific case of duplicate checkout
        const errorMessage = apiError.message || '';
        console.log(`API error message: ${errorMessage}`);
        
        if (errorMessage.includes('DUPLICATED_CHECKOUT')) {
          console.log('Handling duplicate checkout error - returning existing checkout URL');
          
          res.json({
            orderId: order.id,
            checkoutId: order.sumupCheckoutId || 'unknown',
            checkoutUrl: `https://checkout.sumup.com/pay/${order.sumupCheckoutId}`,
            message: 'Using existing checkout'
          });
          return;
        }
        
        // Re-throw other errors to be caught by outer catch block
        throw apiError;
      }

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
};

/**
 * Check SumUp checkout status
 * GET /v1/checkout-status/:checkoutId
 */
export const getCheckoutStatus = async (req: Request, res: Response): Promise<void> => {
  const { checkoutId } = req.params;
  
  if (!checkoutId) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Checkout ID is required'
    });
    return;
  }

  try {
    console.log(`Checking status for SumUp checkout: ${checkoutId}`);
    
    // Find the order associated with this checkout
    const order = await prisma.order.findFirst({
      where: { sumupCheckoutId: checkoutId }
    });

    if (!order) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'Checkout not found'
      });
      return;
    }

    // Query SumUp API for actual status
    try {
      const sumupStatus = await getSumUpCheckoutStatus(checkoutId);
      
      res.json({
        checkoutId,
        orderId: order.id,
        status: sumupStatus.status,
        sumupData: sumupStatus
      });
    } catch (error) {
      console.error('Error querying SumUp API:', error);
      res.json({
        checkoutId,
        orderId: order.id,
        status: 'ERROR',
        error: 'Failed to query SumUp API'
      });
    }

  } catch (error) {
    console.error(`Error checking status for checkout ${checkoutId}:`, error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to check checkout status'
    });
  }
};

/**
 * Get checkout URL for a SumUp checkout ID
 * GET /v1/checkout-url/:checkoutId
 */
export const getCheckoutUrl = async (req: Request, res: Response): Promise<void> => {
  const { checkoutId } = req.params;
  
  if (!checkoutId) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: 'Missing checkout ID'
    });
    return;
  }
  
  try {
    // Find the order to verify the checkout exists
    const order = await prisma.order.findFirst({
      where: { sumupCheckoutId: checkoutId }
    });

    if (!order) {
      res.status(HTTP_STATUS.NOT_FOUND).json({
        error: 'Checkout not found'
      });
      return;
    }

    // For now, return the standard SumUp checkout URL format
    const checkoutUrl = `https://checkout.sumup.com/pay/${checkoutId}`;
    
    console.log('Checkout URL:', checkoutUrl);
    
    res.json({
      checkoutId,
      checkoutUrl,
      orderId: order.id
    });

  } catch (error) {
    console.error('Error getting checkout URL:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to get checkout URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Test SumUp connection
 * GET /v1/test/sumup-connection
 */
export const testSumUpConnectionController = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await testSumUpConnection();
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
};

/**
 * Get SumUp merchant profile
 * GET /v1/test/merchant-profile
 */
export const getMerchantProfile = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await getSumUpMerchantProfile();
    res.json(result);
  } catch (error) {
    console.error('Error getting merchant profile:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
      success: false,
      error: 'Error retrieving merchant profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Check order status with SumUp integration
 * GET /v1/test/check-order/:orderId
 */
export const checkOrderWithSumUp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    
    console.log(`Checking detailed status for order ${orderId}`);
    
    if (!orderId) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        error: 'Order ID is required' 
      });
      return;
    }

    // Find the order with full details
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      include: { 
        items: {
          include: { menuItem: true }
        }
      }
    });
    
    if (!order) {
      res.status(HTTP_STATUS.NOT_FOUND).json({ 
        error: 'Order not found' 
      });
      return;
    }
    
    // If order has a checkout ID, check with SumUp for payment status
    if (order.sumupCheckoutId) {
      try {
        const sumupStatus = await getSumUpCheckoutStatus(order.sumupCheckoutId);
        
        res.json({
          order,
          sumup_status: sumupStatus
        });
      } catch (error) {
        console.error('Error checking SumUp status:', error);
        res.json({
          order,
          sumup_error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } else {
      res.json({ order });
    }
  } catch (error) {
    console.error('Error checking order:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
      error: 'Error checking order status', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Export all payment controllers
export const paymentController = {
  initiateCheckout,
  getCheckoutStatus,
  getCheckoutUrl,
  testSumUpConnectionController,
  getMerchantProfile,
  checkOrderWithSumUp
}; 