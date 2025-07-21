import { PrismaClient } from '@prisma/client';
import { IPaymentService } from '../interfaces/IPaymentService';
import { 
  createSumUpCheckout, 
  getSumUpCheckoutStatus, 
  testSumUpConnection, 
  getSumUpMerchantProfile 
} from './sumupService';

export class PaymentService implements IPaymentService {
  constructor(private prisma: PrismaClient) {}

  async initiateCheckout(orderId: number): Promise<{ orderId: number; checkoutId: string; checkoutUrl: string }> {
    console.log(`PaymentService: Looking for order ${orderId}`);
    
    // Initial delay to handle database connection pooling/replication lag
    console.log(`PaymentService: Waiting 100ms for database consistency...`);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Enhanced retry mechanism with exponential backoff to handle read-after-write consistency issues
    let order = null;
    let attempts = 0;
    const maxAttempts = 5;
    const baseDelay = 50; // Start with 50ms

    while (!order && attempts < maxAttempts) {
      attempts++;
      console.log(`PaymentService: Attempt ${attempts} to find order ${orderId}`);
      
      order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { 
          items: {
            include: { menuItem: true }
          }
        }
      });

      if (!order && attempts < maxAttempts) {
        const delay = baseDelay * Math.pow(2, attempts - 1); // Exponential backoff: 50ms, 100ms, 200ms, 400ms
        console.log(`PaymentService: Order not found on attempt ${attempts}, waiting ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.log(`PaymentService: Order query result after ${attempts} attempts:`, order ? `Found order ${order.id}` : 'Order not found');

    if (!order) {
      // Try to find recent orders to debug
      const recentOrders = await this.prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, createdAt: true, status: true }
      });
      console.log(`PaymentService: Recent orders for debugging:`, recentOrders);
      throw new Error(`Order not found after ${attempts} attempts: ${orderId}`);
    }

    // Check if this order already has a SumUp checkout ID
    if (order.sumupCheckoutId) {
      return {
        orderId: order.id,
        checkoutId: order.sumupCheckoutId,
        checkoutUrl: `https://checkout.sumup.com/pay/${order.sumupCheckoutId}`
      };
    }

    // Check if SumUp credentials are configured
    if (!process.env.SUMUP_CLIENT_ID || 
        !process.env.SUMUP_CLIENT_SECRET || 
        !process.env['SUMUP_MERCHANT_EMAIL']) {
      throw new Error('SumUp credentials not configured');
    }

    // Create SumUp checkout using imported utility function
    const checkoutResponse = await createSumUpCheckout(
      order.id,
      order.total,
      `Order #${order.id}`
    );

    // Update the order with the SumUp checkout ID
    const updatedOrder = await this.prisma.order.update({
      where: { id: order.id },
      data: { sumupCheckoutId: checkoutResponse.id }
    });

    return {
      orderId: updatedOrder.id,
      checkoutId: checkoutResponse.id,
      checkoutUrl: checkoutResponse.hosted_checkout_url
    };
  }

  async getCheckoutStatus(checkoutId: string): Promise<{ checkoutId: string; orderId: number; status: string; sumupData: any }> {
    // Find the order associated with this checkout
    const order = await this.prisma.order.findFirst({
      where: { sumupCheckoutId: checkoutId }
    });

    if (!order) {
      throw new Error('Checkout not found');
    }

    // Query SumUp API using imported utility function
    const sumupStatus = await getSumUpCheckoutStatus(checkoutId);
    
    return {
      checkoutId,
      orderId: order.id,
      status: sumupStatus.status,
      sumupData: sumupStatus
    };
  }

  async getCheckoutUrl(checkoutId: string): Promise<{ checkoutId: string; checkoutUrl: string; orderId: number }> {
    // Find the order to verify the checkout exists
    const order = await this.prisma.order.findFirst({
      where: { sumupCheckoutId: checkoutId }
    });

    if (!order) {
      throw new Error('Checkout not found');
    }

    // Return the standard SumUp checkout URL format
    const checkoutUrl = `https://checkout.sumup.com/pay/${checkoutId}`;
    
    return {
      checkoutId,
      checkoutUrl,
      orderId: order.id
    };
  }

  async testSumUpConnection(): Promise<{ success: boolean; message: string; token_prefix?: string; error?: string }> {
    // Use imported utility function
    return await testSumUpConnection();
  }

  async getMerchantProfile(): Promise<any> {
    // Use imported utility function
    return await getSumUpMerchantProfile();
  }

  async checkOrderWithSumUp(orderId: number): Promise<{ order: any; sumup_status?: any; sumup_error?: string }> {
    // Find the order with full details
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { 
        items: {
          include: { menuItem: true }
        }
      }
    });
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    // If order has a checkout ID, check with SumUp for payment status
    if (order.sumupCheckoutId) {
      try {
        // Use imported utility function
        const sumupStatus = await getSumUpCheckoutStatus(order.sumupCheckoutId);
        return {
          order,
          sumup_status: sumupStatus
        };
      } catch (error) {
        return {
          order,
          sumup_error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    } else {
      return { order };
    }
  }
} 