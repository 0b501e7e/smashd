const { verifyWebhookSignature } = require('../../serverConfig');
const crypto = require('crypto');

describe('SumUp Helper Functions', () => {
  // Testing webhook signature verification
  describe('verifyWebhookSignature', () => {
    it('should verify valid signatures correctly', () => {
      const secret = 'test_secret';
      const payload = { event_type: 'checkout.paid', id: '123' };
      
      // Generate a valid signature
      const hmac = crypto.createHmac('sha256', secret);
      const signature = hmac.update(JSON.stringify(payload)).digest('hex');
      
      expect(verifyWebhookSignature(signature, payload, secret)).toBe(true);
    });
    
    it('should reject invalid signatures', () => {
      const secret = 'test_secret';
      const payload = { event_type: 'checkout.paid', id: '123' };
      const invalidSignature = 'invalid_signature';
      
      expect(verifyWebhookSignature(invalidSignature, payload, secret)).toBe(false);
    });
    
    it('should reject signatures generated with wrong secret', () => {
      const secret = 'test_secret';
      const wrongSecret = 'wrong_secret';
      const payload = { event_type: 'checkout.paid', id: '123' };
      
      // Generate signature with wrong secret
      const hmac = crypto.createHmac('sha256', wrongSecret);
      const signature = hmac.update(JSON.stringify(payload)).digest('hex');
      
      expect(verifyWebhookSignature(signature, payload, secret)).toBe(false);
    });
  });
}); 