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

export function hasConfirmedPayment(status: string | null | undefined): boolean {
  return status ? confirmedPaymentStatuses.has(status.toUpperCase()) : false;
}
