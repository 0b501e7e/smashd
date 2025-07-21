export interface IPaymentService {
  initiateCheckout(orderId: number): Promise<{ orderId: number; checkoutId: string; checkoutUrl: string }>;
  getCheckoutStatus(checkoutId: string): Promise<{ checkoutId: string; orderId: number; status: string; sumupData: any }>;
  getCheckoutUrl(checkoutId: string): Promise<{ checkoutId: string; checkoutUrl: string; orderId: number }>;
  testSumUpConnection(): Promise<{ success: boolean; message: string; token_prefix?: string; error?: string }>;
  getMerchantProfile(): Promise<any>;
  checkOrderWithSumUp(orderId: number): Promise<{ order: any; sumup_status?: any; sumup_error?: string }>;
} 