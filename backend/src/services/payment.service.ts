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