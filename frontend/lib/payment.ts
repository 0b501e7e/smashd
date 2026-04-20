export const PENDING_ORDER_ID_KEY = 'pendingOrderId';

const confirmedPaymentStatuses = new Set([
  'PAID',
  'PAYMENT_CONFIRMED',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'COMPLETED',
]);

export function extractOrderIdFromOrderResponse(response: any): number | null {
  const orderId = response?.data?.order?.id ?? response?.order?.id ?? response?.id;
  return typeof orderId === 'number' ? orderId : null;
}

export function extractCheckoutUrl(response: any): string | null {
  return response?.checkoutUrl || response?.data?.checkoutUrl || null;
}

export function hasConfirmedPayment(status: string | null | undefined): boolean {
  return status ? confirmedPaymentStatuses.has(status.toUpperCase()) : false;
}
