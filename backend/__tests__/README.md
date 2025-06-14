# Testing the Backend API

This directory contains comprehensive tests for the backend application, covering authentication, menu management, order processing, and SumUp integration.

## Test Structure

The tests are organized as follows:

- `__tests__/unit/`: Unit tests for individual functions
  - `makeHttpRequest.test.js`: Tests for the HTTP request helper
  - `getSumupAccessToken.test.js`: Tests for token retrieval
  
- `__tests__/integration/`: Integration tests for API endpoints
  - `auth.test.js`: Authentication and JWT middleware tests
  - `menu.test.js`: Menu management and admin CRUD operations
  - `orders.test.js`: Order creation, management, and admin operations
  - `sumupEndpoints.test.js`: SumUp integration endpoints (polling-based)
  
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

# Run specific test suites
npx jest __tests__/integration/auth.test.js
npx jest __tests__/integration/menu.test.js
npx jest __tests__/integration/orders.test.js
npx jest __tests__/unit/
```

## Test Coverage

The test suite now covers:

### 1. Authentication Tests (`auth.test.js`)
- **User Registration**: Valid/invalid data, email uniqueness, validation errors
- **User Login**: Valid/invalid credentials, JWT token generation
- **JWT Middleware**: Token validation, authorization, access control
- **Error Handling**: Database errors, validation failures

### 2. Menu Management Tests (`menu.test.js`)
- **Public Menu Access**: Available items, customization options, specific items
- **Admin Menu CRUD**: Create, read, update, delete menu items
- **Menu Availability**: Toggle item availability
- **Authorization**: Admin-only access control
- **Error Handling**: Database errors, validation failures, not found scenarios

### 3. Order Management Tests (`orders.test.js`)
- **Order Creation**: Valid orders, validation, order items
- **User Order History**: Personal orders, access control
- **Order Repeat**: Duplicate previous orders
- **Order Status**: Public status checking
- **Admin Order Management**: View all orders, accept/decline orders
- **Authorization**: User-specific access, admin privileges
- **Error Handling**: Database errors, not found scenarios

### 4. SumUp Integration Tests (`sumupEndpoints.test.js`)
- **Checkout Initiation**: Payment link generation
- **Payment Verification**: Polling-based status checking
- **Checkout Status**: Direct SumUp API status queries
- **Connection Testing**: SumUp API connectivity
- **Error Handling**: API failures, network issues

### 5. Unit Tests
- **HTTP Request Helper**: Network request functionality
- **SumUp Token Management**: Access token retrieval and validation

## Payment System Architecture

The current payment system uses **polling** instead of webhooks:
- Orders are created with `AWAITING_PAYMENT` status
- Frontend/mobile apps poll `/v1/orders/:orderId/verify-payment` to check payment status
- Backend queries SumUp API directly to verify payment completion
- `/v1/checkouts/:checkoutId/status` provides direct checkout status from SumUp

## Test Environment

Tests use:
- **Jest** as the test runner with 74 comprehensive tests
- **SuperTest** for HTTP assertions and endpoint testing
- **Mocked dependencies**: Prisma client, bcrypt, JWT, external APIs
- **Express test apps**: Isolated testing environments for each feature set
- **Comprehensive validation**: Input validation, error scenarios, edge cases

## Test Statistics

- **Total Tests**: 74 tests across 6 test suites
- **Test Categories**:
  - Authentication: 16 tests
  - Menu Management: 19 tests  
  - Order Management: 21 tests
  - SumUp Integration: 10 tests
  - Unit Tests: 8 tests
- **Coverage Areas**: All major API endpoints and business logic
- **Error Scenarios**: Database failures, validation errors, authorization issues

## Adding New Tests

When adding new functionality, follow these guidelines:

1. **Create comprehensive test suites** for new endpoints
2. **Test both success and failure scenarios**
3. **Include input validation tests** for all user inputs
4. **Test authorization and access control** for protected endpoints
5. **Mock external dependencies** to ensure test isolation
6. **Update this README** when adding new test categories
7. **Follow existing patterns** for consistency across test suites

## Future Improvements

Areas that could benefit from additional testing:
- **File upload functionality** (image uploads for menu items)
- **Database integration tests** with real database transactions
- **End-to-end workflow tests** (complete order lifecycle)
- **Performance testing** for high-load scenarios
- **Security testing** for authentication and authorization edge cases 