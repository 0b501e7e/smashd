// Set up test environment
process.env.NODE_ENV = 'test';

// Configure environment variables for tests
process.env.SUMUP_CLIENT_ID = 'test_client_id';
process.env.SUMUP_CLIENT_SECRET = 'test_client_secret';
process.env.SUMUP_MERCHANT_CODE = 'test_merchant_code';
process.env.SUMUP_WEBHOOK_SECRET = 'test_webhook_secret';

// Silence console output during tests
console.log = jest.fn();
console.error = jest.fn();
console.warn = jest.fn();

// Set up cleanup after all tests
afterAll(() => {
  // Any global cleanup needed
}); 