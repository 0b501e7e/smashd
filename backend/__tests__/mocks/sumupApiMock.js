// Mock responses for SumUp API
module.exports = {
  accessTokenResponse: {
    access_token: 'mock_access_token',
    token_type: 'bearer',
    expires_in: 3600
  },
  
  checkoutResponse: {
    id: 'checkout_123456',
    checkout_reference: 'ORDER-123',
    amount: 29.99,
    currency: 'EUR',
    status: 'PENDING',
    date: new Date().toISOString(),
    merchant_code: 'MERCHANT123'
  },
  
  webhookEvents: {
    paid: {
      event_type: 'checkout.paid',
      checkout_reference: 'ORDER-123',
      status: 'PAID'
    },
    failed: {
      event_type: 'checkout.failed',
      checkout_reference: 'ORDER-123',
      status: 'FAILED'
    },
    confirmed: {
      event_type: 'order.confirmed',
      checkout_reference: 'ORDER-123',
      status: 'CONFIRMED'
    },
    ready: {
      event_type: 'order.ready',
      checkout_reference: 'ORDER-123',
      status: 'READY'
    }
  },
  
  productResponse: {
    id: 'product_123',
    name: 'Test Burger',
    description: 'A test burger',
    price: '9.99',
    category: 'BURGER'
  }
}; 