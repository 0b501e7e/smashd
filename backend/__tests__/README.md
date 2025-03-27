# Testing the SumUp Integration

This directory contains tests for the SumUp integration in the backend application.

## Test Structure

The tests are organized as follows:

- `__tests__/unit/`: Unit tests for individual functions
  - `makeHttpRequest.test.js`: Tests for the HTTP request helper
  - `getSumupAccessToken.test.js`: Tests for token retrieval
  - `sumupHelpers.test.js`: Tests for webhook signature verification
  
- `__tests__/integration/`: Integration tests for API endpoints
  - `sumupEndpoints.test.js`: Tests for SumUp integration endpoints
  - `webhookHandler.test.js`: Tests for webhook processing
  
- `__tests__/mocks/`: Mock data for testing
  - `sumupApiMock.js`: Mock responses from the SumUp API

## Running Tests

You can run the tests using the following npm commands:

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run a specific test file
npx jest __tests__/unit/makeHttpRequest.test.js
```

## Test Coverage

The test suite covers:

1. Unit Tests:
   - HTTP request helper function
   - SumUp access token retrieval
   - Webhook signature verification
   
2. Integration Tests:
   - Checkout initiation endpoint
   - Webhook processing endpoint
   - Test endpoints for connection verification

## Test Environment

Tests use:
- Jest as the test runner
- SuperTest for HTTP assertions
- Mocked HTTP requests to avoid actual API calls
- Mocked Prisma client to avoid database interactions

## Adding New Tests

When adding new functionality to the SumUp integration, follow these guidelines:

1. Add unit tests for any new helper functions
2. Add integration tests for any new endpoints
3. Update mock data in `sumupApiMock.js` if needed
4. Ensure existing tests still pass after your changes 