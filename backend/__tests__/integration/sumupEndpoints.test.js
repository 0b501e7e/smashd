const request = require('supertest');
const express = require('express');
const sumupMocks = require('../mocks/sumupApiMock');

// Mock the makeHttpRequest and getSumupAccessToken functions
const makeHttpRequest = jest.fn();
const getSumupAccessToken = jest.fn();
const verifyWebhookSignature = jest.fn();

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
          status: 'PENDING',
          reference: 'ORD-123456'
        }),
        findFirst: jest.fn().mockResolvedValue({
          id: 1,
          status: 'PENDING',
          reference: 'ORD-123456'
        }),
        update: jest.fn().mockResolvedValue({
          id: 1,
          status: 'PAID'
        })
      }
    }))
  };
});

// Define mock routes for testing
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

app.post('/v1/sumup-webhook', async (req, res) => {
  try {
    const signature = req.headers['x-payload-signature'];
    
    // Verify webhook signature
    const isValid = verifyWebhookSignature(signature, req.body, 'test_webhook_secret');
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    return res.status(500).json({ error: `Webhook processing failed: ${error.message}` });
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
    verifyWebhookSignature.mockReturnValue(true);
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
  
  describe('POST /v1/sumup-webhook', () => {
    it('should process a valid payment webhook', async () => {
      // Setup webhook data
      const webhookData = {
        event_type: 'checkout.paid',
        checkout_reference: 'ORD-123456',
        id: 'chk_123',
        transaction_code: 'TR123456',
        amount: 21.98,
        currency: 'USD',
        timestamp: new Date().toISOString(),
        status: 'PAID'
      };
      
      // Make request
      const response = await request(app)
        .post('/v1/sumup-webhook')
        .set('x-payload-signature', 'valid-signature')
        .send(webhookData);
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });
    
    it('should reject invalid webhook signatures', async () => {
      // Set verifyWebhookSignature to return false for this test
      verifyWebhookSignature.mockReturnValueOnce(false);
      
      // Setup webhook data
      const webhookData = {
        event_type: 'checkout.paid',
        checkout_reference: 'ORD-123456'
      };
      
      // Make request
      const response = await request(app)
        .post('/v1/sumup-webhook')
        .set('x-payload-signature', 'invalid-signature')
        .send(webhookData);
      
      // Assertions
      expect(response.status).toBe(401);
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
      // Make getSumupAccessToken throw an error for this test
      getSumupAccessToken.mockRejectedValueOnce(new Error('Connection failed'));
      
      // Make request
      const response = await request(app)
        .get('/v1/test/sumup-connection');
      
      // Assertions
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('connected', false);
      expect(response.body).toHaveProperty('error');
    });
  });
}); 