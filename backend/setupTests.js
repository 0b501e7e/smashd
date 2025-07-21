// Set up test environment
process.env.NODE_ENV = 'test';

// Load environment configuration (will load .env.test if available)
require('./src/config/env').loadEnvironment();

// Configure additional test environment variables (these override .env.test if needed)
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_all_tests';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
process.env.SUMUP_CLIENT_ID = process.env.SUMUP_CLIENT_ID || 'test_client_id';
process.env.SUMUP_CLIENT_SECRET = process.env.SUMUP_CLIENT_SECRET || 'test_client_secret';
process.env.SUMUP_MERCHANT_CODE = process.env.SUMUP_MERCHANT_CODE || 'test_merchant_code';
process.env.SUMUP_WEBHOOK_SECRET = process.env.SUMUP_WEBHOOK_SECRET || 'test_webhook_secret';

// Silence console output during tests
console.log = jest.fn();
console.error = jest.fn();
console.warn = jest.fn();

// Set up cleanup after all tests
afterAll(() => {
  // Any global cleanup needed
}); 