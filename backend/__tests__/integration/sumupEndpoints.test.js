const request = require('supertest');
const express = require('express');
const sumupMocks = require('../mocks/sumupApiMock');

// Mock the makeHttpRequest and getSumupAccessToken functions
const makeHttpRequest = jest.fn();
const getSumupAccessToken = jest.fn();

// Create a mock app for testing
const app = express();
app.use(express.json());

// Mock the PrismaClient
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      order: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          orderItems: [
            {
              id: 1,
              menuItemId: 1,
              quantity: 2,
              menuItem: {
                id: 1,
                name: 'Burger',
                price: 10.99,
                description: 'Delicious burger'
              }
            }
          ],
          totalAmount: 21.98,
          status: 'AWAITING_PAYMENT',
          sumupCheckoutId: 'chk_123456',
          reference: 'ORD-123456'
        }),
        update: jest.fn().mockResolvedValue({
          id: 1,
          status: 'PAID'
        })
      },
      loyaltyPoints: {
        findUnique: jest.fn().mockResolvedValue({
          userId: 1,
          points: 100
        }),
        update: jest.fn().mockResolvedValue({
          userId: 1,
          points: 120
        })
      }
    }))
  };
});

// Define mock routes for testing (based on actual server endpoints)
app.post('/v1/initiate-checkout', async (req, res) => {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }
    
    // Get the mocked checkout response
    try {
      const checkoutResponse = await makeHttpRequest();
      return res.status(200).json({
        checkout_id: checkoutResponse.id,
        payment_link: 'https://example.com/checkout',
        status: checkoutResponse.status
      });
    } catch (error) {
      return res.status(500).json({ error: `Failed to initiate checkout: ${error.message}` });
    }
  } catch (error) {
    return res.status(500).json({ error: `Failed to initiate checkout: ${error.message}` });
  }
});

// Mock the polling endpoint for payment verification
app.post('/v1/orders/:orderId/verify-payment', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Mock checking SumUp status
    const checkoutDetails = await makeHttpRequest();
    
    if (checkoutDetails.status === 'PAID') {
      return res.status(200).json({
        success: true,
        message: 'Payment verified and order updated',
        orderStatus: 'PAID'
      });
    } else {
      return res.status(200).json({
        success: false,
        message: 'Payment not yet confirmed',
        orderStatus: 'AWAITING_PAYMENT'
      });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// Mock the checkout status endpoint
app.get('/v1/checkouts/:checkoutId/status', async (req, res) => {
  try {
    const { checkoutId } = req.params;
    
    const checkoutDetails = await makeHttpRequest();
    
    return res.status(200).json({
      checkout_id: checkoutId,
      status: checkoutDetails.status,
      amount: checkoutDetails.amount,
      currency: checkoutDetails.currency
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to check checkout status' });
  }
});

app.get('/v1/test/sumup-connection', async (req, res) => {
  try {
    await getSumupAccessToken();
    return res.status(200).json({ connected: true });
  } catch (error) {
    return res.status(500).json({ 
      connected: false,
      error: `Failed to connect to SumUp: ${error.message}`
    });
  }
});

describe('SumUp API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default mock behaviors
    makeHttpRequest.mockResolvedValue(sumupMocks.checkoutResponse);
    getSumupAccessToken.mockResolvedValue('mock_access_token');
  });
  
  describe('POST /v1/initiate-checkout', () => {
    it('should successfully initiate a checkout', async () => {
      // Setup mock response
      makeHttpRequest.mockResolvedValueOnce(sumupMocks.checkoutResponse);
      
      // Make request
      const response = await request(app)
        .post('/v1/initiate-checkout')
        .send({ orderId: 1 });
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('checkout_id');
      expect(response.body).toHaveProperty('payment_link');
    });
    
    it('should return 400 if orderId is missing', async () => {
      // Make request without orderId
      const response = await request(app)
        .post('/v1/initiate-checkout')
        .send({});
      
      // Assertions
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
    
    it('should return 500 if checkout request fails', async () => {
      // Setup mock to throw an error
      makeHttpRequest.mockRejectedValueOnce(new Error('Checkout API error'));
      
      // Make request
      const response = await request(app)
        .post('/v1/initiate-checkout')
        .send({ orderId: 1 });
      
      // Assertions
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
  
  describe('POST /v1/orders/:orderId/verify-payment', () => {
    it('should verify successful payment', async () => {
      // Setup mock response for paid status
      makeHttpRequest.mockResolvedValueOnce({
        status: 'PAID',
        amount: 21.98,
        currency: 'USD'
      });
      
      // Make request
      const response = await request(app)
        .post('/v1/orders/1/verify-payment')
        .send();
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('orderStatus', 'PAID');
    });
    
    it('should handle pending payment', async () => {
      // Setup mock response for pending status
      makeHttpRequest.mockResolvedValueOnce({
        status: 'PENDING',
        amount: 21.98,
        currency: 'USD'
      });
      
      // Make request
      const response = await request(app)
        .post('/v1/orders/1/verify-payment')
        .send();
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('orderStatus', 'AWAITING_PAYMENT');
    });
    
    it('should handle verification errors', async () => {
      // Setup mock to throw an error
      makeHttpRequest.mockRejectedValueOnce(new Error('SumUp API error'));
      
      // Make request
      const response = await request(app)
        .post('/v1/orders/1/verify-payment')
        .send();
      
      // Assertions
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
  
  describe('GET /v1/checkouts/:checkoutId/status', () => {
    it('should return checkout status', async () => {
      // Setup mock response
      makeHttpRequest.mockResolvedValueOnce({
        status: 'PAID',
        amount: 21.98,
        currency: 'USD'
      });
      
      // Make request
      const response = await request(app)
        .get('/v1/checkouts/chk_123456/status');
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('checkout_id', 'chk_123456');
      expect(response.body).toHaveProperty('status', 'PAID');
      expect(response.body).toHaveProperty('amount', 21.98);
    });
    
    it('should handle status check errors', async () => {
      // Setup mock to throw an error
      makeHttpRequest.mockRejectedValueOnce(new Error('Status check failed'));
      
      // Make request
      const response = await request(app)
        .get('/v1/checkouts/chk_123456/status');
      
      // Assertions
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
  
  describe('GET /v1/test/sumup-connection', () => {
    it('should test SumUp connection successfully', async () => {
      // Make request
      const response = await request(app)
        .get('/v1/test/sumup-connection');
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('connected', true);
    });
    
    it('should handle connection failures', async () => {
      // Setup mock to throw an error
      getSumupAccessToken.mockRejectedValueOnce(new Error('Connection failed'));
      
      // Make request
      const response = await request(app)
        .get('/v1/test/sumup-connection');
      
      // Assertions
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('connected', false);
    });
  });
}); 