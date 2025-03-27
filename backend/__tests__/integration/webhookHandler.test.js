const request = require('supertest');
const crypto = require('crypto');

// Setup mock objects
const mockOrderUpdate = jest.fn();
const mockFindFirst = jest.fn();

// Mock env variables
process.env.SUMUP_WEBHOOK_SECRET = 'test_webhook_secret';

// Mock the prisma client
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      order: {
        findFirst: mockFindFirst,
        update: mockOrderUpdate
      }
    }))
  };
});

// Import modules after mocking
const { app, verifyWebhookSignature } = require('../../serverConfig');

describe('Webhook Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockFindFirst.mockImplementation(({ where }) => {
      // Return matching order based on reference
      if (where.reference === 'ORD-123456') {
        return Promise.resolve({
          id: 1,
          reference: 'ORD-123456',
          status: 'PENDING',
          totalAmount: 21.98
        });
      }
      return Promise.resolve(null);
    });
    
    mockOrderUpdate.mockResolvedValue({
      id: 1,
      status: 'PAID',
      reference: 'ORD-123456'
    });
  });
  
  describe('POST /v1/sumup-webhook', () => {
    it('should process a paid webhook event correctly', async () => {
      // Prepare webhook payload
      const webhookPayload = {
        event_type: 'checkout.paid',
        checkout_reference: 'ORD-123456',
        id: 'chk_123',
        transaction_code: 'TR123456',
        amount: 21.98,
        currency: 'USD',
        timestamp: new Date().toISOString(),
        status: 'PAID'
      };
      
      // Generate a valid signature
      const hmac = crypto.createHmac('sha256', process.env.SUMUP_WEBHOOK_SECRET);
      const signature = hmac.update(JSON.stringify(webhookPayload)).digest('hex');
      
      // Make request with valid signature
      const response = await request(app)
        .post('/v1/sumup-webhook')
        .set('x-payload-signature', signature)
        .send(webhookPayload);
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Webhook processed successfully');
      
      // Verify the order was updated
      expect(mockOrderUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ status: 'PAID' })
      });
    });
    
    it('should handle failed payment webhook events', async () => {
      // Prepare webhook payload
      const webhookPayload = {
        event_type: 'checkout.failed',
        checkout_reference: 'ORD-123456',
        id: 'chk_123',
        transaction_code: 'TR123456',
        amount: 21.98,
        currency: 'USD',
        timestamp: new Date().toISOString(),
        status: 'FAILED'
      };
      
      // Generate a valid signature
      const hmac = crypto.createHmac('sha256', process.env.SUMUP_WEBHOOK_SECRET);
      const signature = hmac.update(JSON.stringify(webhookPayload)).digest('hex');
      
      // Make request with valid signature
      const response = await request(app)
        .post('/v1/sumup-webhook')
        .set('x-payload-signature', signature)
        .send(webhookPayload);
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      
      // Verify the order was updated
      expect(mockOrderUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ status: 'FAILED' })
      });
    });
    
    it('should reject requests with invalid signatures', async () => {
      // Prepare webhook payload
      const webhookPayload = {
        event_type: 'checkout.paid',
        checkout_reference: 'ORD-123456'
      };
      
      // Make request with invalid signature
      const response = await request(app)
        .post('/v1/sumup-webhook')
        .set('x-payload-signature', 'invalid-signature')
        .send(webhookPayload);
      
      // Assertions
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid webhook signature');
      
      // Verify no order update was attempted
      expect(mockOrderUpdate).not.toHaveBeenCalled();
    });
    
    it('should respond with 404 for unknown order references', async () => {
      // Prepare webhook payload with unknown reference
      const webhookPayload = {
        event_type: 'checkout.paid',
        checkout_reference: 'UNKNOWN-REF',
        id: 'chk_123'
      };
      
      // Generate a valid signature
      const hmac = crypto.createHmac('sha256', process.env.SUMUP_WEBHOOK_SECRET);
      const signature = hmac.update(JSON.stringify(webhookPayload)).digest('hex');
      
      // Make request with valid signature
      const response = await request(app)
        .post('/v1/sumup-webhook')
        .set('x-payload-signature', signature)
        .send(webhookPayload);
      
      // Assertions
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Order not found');
      
      // Verify no order update was attempted
      expect(mockOrderUpdate).not.toHaveBeenCalled();
    });
  });
}); 