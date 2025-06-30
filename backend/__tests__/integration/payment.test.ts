import request from 'supertest';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock SumUp service functions
jest.mock('../../src/services/sumupService', () => ({
  createSumUpCheckout: jest.fn(),
  getSumUpCheckoutStatus: jest.fn(),
  testSumUpConnection: jest.fn(),
  getSumUpMerchantProfile: jest.fn(),
}));

// Mock the entire Prisma client but preserve enums
jest.mock('@prisma/client', () => {
  const actualPrisma = jest.requireActual('@prisma/client');
  return {
    ...actualPrisma, // Keep enums and types
    PrismaClient: jest.fn().mockImplementation(() => ({
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      order: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      orderItem: {
        findMany: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
      },
      menuItem: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      loyaltyPoints: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
      $connect: jest.fn(),
      $disconnect: jest.fn(),
    })),
  };
});

// Now import everything that depends on Prisma
import { app } from '../../src/server';
import { services } from '../../src/config/services';
import { Role, OrderStatus } from '@prisma/client';
import * as sumupService from '../../src/services/sumupService';

// Get the mocked instances
const mockedPrisma = services.prisma as any;
const mockedSumupService = sumupService as jest.Mocked<typeof sumupService>;

// Mock users
const mockCustomerUser = {
  id: 2,
  email: 'customer@example.com',
  name: 'Customer User',
  password: '$2b$10$hashedPassword',
  role: Role.CUSTOMER,
  dateOfBirth: new Date('1990-01-01'),
  address: '123 Customer Street',
  phoneNumber: '+34600000002',
  acceptedTerms: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  loyaltyPoints: { points: 150 }
};

// Mock orders
const mockOrder = {
  id: 1,
  userId: 2,
  total: 17.98,
  status: OrderStatus.AWAITING_PAYMENT,
  estimatedReadyTime: null,
  sumupCheckoutId: null,
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T10:00:00Z'),
  items: [
    {
      id: 1,
      menuItemId: 1,
      quantity: 1,
      price: 12.99,
      customizations: null,
      menuItem: {
        name: 'Classic Burger',
        category: 'BURGER'
      }
    },
    {
      id: 2,
      menuItemId: 2,
      quantity: 1,
      price: 4.99,
      customizations: null,
      menuItem: {
        name: 'French Fries',
        category: 'SIDE'
      }
    }
  ]
};

const mockOrderWithCheckout = {
  ...mockOrder,
  sumupCheckoutId: 'checkout_123456'
};

// Mock SumUp responses
const mockSumUpCheckoutResponse = {
  id: 'checkout_123456',
  hosted_checkout_url: 'https://checkout.sumup.com/pay/checkout_123456',
  status: 'PENDING'
};

const mockSumUpStatusResponse = {
  id: 'checkout_123456',
  status: 'PAID',
  amount: 17.98,
  currency: 'EUR',
  checkout_reference: 'ORDER-1'
};

const mockMerchantProfile = {
  success: true,
  profile: {
    merchant_profile: {
      merchant_code: 'MERCHANT123'
    },
    personal_profile: {
      email: 'merchant@example.com'
    }
  },
  merchant_code: 'MERCHANT123',
  merchant_email: 'merchant@example.com',
  message: 'You should set these values in your environment variables'
};

describe('Payment Integration Tests - TypeScript Backend', () => {
  let customerToken: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Clear any global locks
    (global as any)['checkout:lock:1'] = false;
    
    mockedBcrypt.hash.mockResolvedValue('$2b$10$hashedPassword' as never);
    mockedBcrypt.compare.mockImplementation((password: any, _hash: string): Promise<boolean> => {
      return Promise.resolve(password === 'password123');
    });

    // Get customer token
    mockedPrisma.user.findUnique.mockResolvedValue(mockCustomerUser);
    const customerLoginResponse = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'customer@example.com', password: 'password123' });
    customerToken = customerLoginResponse.body.data.token;
  });

  afterAll(async () => {
    await services.shutdown();
  });

  // =====================
  // CHECKOUT INITIATION TESTS
  // =====================

  describe('POST /v1/payment/initiate-checkout', () => {
    it('should initiate checkout successfully for new order', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockedPrisma.order.update.mockResolvedValue(mockOrderWithCheckout);
      mockedSumupService.createSumUpCheckout.mockResolvedValue(mockSumUpCheckoutResponse);

      const response = await request(app)
        .post('/v1/payment/initiate-checkout')
        .send({ orderId: 1 })
        .expect(200);

      expect(response.body).toHaveProperty('orderId', 1);
      expect(response.body).toHaveProperty('checkoutId', 'checkout_123456');
      expect(response.body).toHaveProperty('checkoutUrl', 'https://checkout.sumup.com/pay/checkout_123456');
      expect(mockedSumupService.createSumUpCheckout).toHaveBeenCalledWith(1, 17.98, 'Order #1');
    });

    it('should return existing checkout for order with existing checkout ID', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue(mockOrderWithCheckout);

      const response = await request(app)
        .post('/v1/payment/initiate-checkout')
        .send({ orderId: 1 })
        .expect(200);

      expect(response.body).toHaveProperty('orderId', 1);
      expect(response.body).toHaveProperty('checkoutId', 'checkout_123456');
      expect(response.body).toHaveProperty('checkoutUrl', 'https://checkout.sumup.com/pay/checkout_123456');
      expect(mockedSumupService.createSumUpCheckout).not.toHaveBeenCalled();
    });

    it('should return 400 for missing order ID', async () => {
      const response = await request(app)
        .post('/v1/payment/initiate-checkout')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Order ID is required');
    });

    it('should return 500 for non-existent order', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/v1/payment/initiate-checkout')
        .send({ orderId: 999 })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Error initiating checkout');
      expect(response.body).toHaveProperty('details', 'Order not found');
    });

    it('should handle SumUp credentials not configured', async () => {
      const originalEnv = process.env;
      const { SUMUP_CLIENT_ID, ...envWithoutSumUp } = originalEnv;
      process.env = envWithoutSumUp as any;

      mockedPrisma.order.findUnique.mockResolvedValue(mockOrder);

      const response = await request(app)
        .post('/v1/payment/initiate-checkout')
        .send({ orderId: 1 })
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Error initiating checkout');
      expect(response.body).toHaveProperty('details', 'SumUp credentials not configured');

      process.env = originalEnv;
    });

    it('should handle duplicate checkout error', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockedSumupService.createSumUpCheckout
        .mockRejectedValueOnce(new Error('DUPLICATED_CHECKOUT'))
        .mockResolvedValueOnce(mockSumUpCheckoutResponse);
      mockedPrisma.order.update.mockResolvedValue(mockOrderWithCheckout);

      const response = await request(app)
        .post('/v1/payment/initiate-checkout')
        .send({ orderId: 1 })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Using existing checkout');
      expect(response.body).toHaveProperty('checkoutId', 'checkout_123456');
    });

    it('should return 409 for concurrent checkout requests', async () => {
      // Set a lock to simulate concurrent request
      (global as any)['checkout:lock:1'] = true;

      const response = await request(app)
        .post('/v1/payment/initiate-checkout')
        .send({ orderId: 1 })
        .expect(409);

      expect(response.body).toHaveProperty('error', 'Checkout already in progress for this order');
      expect(response.body).toHaveProperty('status', 'PENDING');
    });
  });

  // =====================
  // CHECKOUT STATUS TESTS
  // =====================

  describe('GET /v1/payment/checkouts/:checkoutId/status', () => {
    it('should return checkout status successfully', async () => {
      mockedPrisma.order.findFirst.mockResolvedValue(mockOrderWithCheckout);
      mockedSumupService.getSumUpCheckoutStatus.mockResolvedValue(mockSumUpStatusResponse);

      const response = await request(app)
        .get('/v1/payment/checkouts/checkout_123456/status')
        .expect(200);

      expect(response.body).toHaveProperty('checkoutId', 'checkout_123456');
      expect(response.body).toHaveProperty('orderId', 1);
      expect(response.body).toHaveProperty('status', 'PAID');
      expect(response.body).toHaveProperty('sumupData');
      expect(response.body.sumupData).toEqual(mockSumUpStatusResponse);
    });

    it('should return 404 for non-existent checkout', async () => {
      mockedPrisma.order.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/v1/payment/checkouts/nonexistent/status')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Checkout not found');
    });

    it('should handle SumUp API errors gracefully', async () => {
      mockedPrisma.order.findFirst.mockResolvedValue(mockOrderWithCheckout);
      mockedSumupService.getSumUpCheckoutStatus.mockRejectedValue(new Error('SumUp API error'));

      const response = await request(app)
        .get('/v1/payment/checkouts/checkout_123456/status')
        .expect(200);

      expect(response.body).toHaveProperty('checkoutId', 'checkout_123456');
      expect(response.body).toHaveProperty('orderId', 0);
      expect(response.body).toHaveProperty('status', 'ERROR');
      expect(response.body).toHaveProperty('error', 'Failed to query SumUp API');
    });
  });

  // =====================
  // CHECKOUT URL TESTS
  // =====================

  describe('GET /v1/payment/checkout-url/:checkoutId', () => {
    it('should return checkout URL successfully', async () => {
      mockedPrisma.order.findFirst.mockResolvedValue(mockOrderWithCheckout);

      const response = await request(app)
        .get('/v1/payment/checkout-url/checkout_123456')
        .expect(200);

      expect(response.body).toHaveProperty('checkoutId', 'checkout_123456');
      expect(response.body).toHaveProperty('checkoutUrl', 'https://checkout.sumup.com/pay/checkout_123456');
      expect(response.body).toHaveProperty('orderId', 1);
    });

    it('should return 404 for non-existent checkout', async () => {
      mockedPrisma.order.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/v1/payment/checkout-url/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Checkout not found');
    });
  });

  // =====================
  // SUMUP CONNECTION TESTS
  // =====================

  describe('GET /v1/payment/test/sumup-connection', () => {
    it('should test SumUp connection successfully', async () => {
      const mockConnectionResponse = {
        success: true,
        message: 'SumUp connection successful',
        token_prefix: 'abc12...'
      };
      mockedSumupService.testSumUpConnection.mockResolvedValue(mockConnectionResponse);

      const response = await request(app)
        .get('/v1/payment/test/sumup-connection')
        .expect(200);

      expect(response.body).toEqual(mockConnectionResponse);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'SumUp connection successful');
      expect(response.body).toHaveProperty('token_prefix');
    });

    it('should handle connection failure', async () => {
      const mockConnectionResponse = {
        success: false,
        message: 'Error connecting to SumUp',
        error: 'Invalid credentials'
      };
      mockedSumupService.testSumUpConnection.mockResolvedValue(mockConnectionResponse);

      const response = await request(app)
        .get('/v1/payment/test/sumup-connection')
        .expect(500);

      expect(response.body).toEqual(mockConnectionResponse);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle service errors', async () => {
      mockedSumupService.testSumUpConnection.mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app)
        .get('/v1/payment/test/sumup-connection')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Error connecting to SumUp');
      expect(response.body).toHaveProperty('details', 'Service unavailable');
    });
  });

  // =====================
  // MERCHANT PROFILE TESTS
  // =====================

  describe('GET /v1/payment/test/merchant-profile', () => {
    it('should get merchant profile successfully', async () => {
      mockedSumupService.getSumUpMerchantProfile.mockResolvedValue(mockMerchantProfile);

      const response = await request(app)
        .get('/v1/payment/test/merchant-profile')
        .expect(200);

      expect(response.body).toEqual(mockMerchantProfile);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('profile');
      expect(response.body).toHaveProperty('merchant_code', 'MERCHANT123');
    });

    it('should handle merchant profile errors', async () => {
      mockedSumupService.getSumUpMerchantProfile.mockRejectedValue(new Error('Unauthorized'));

      const response = await request(app)
        .get('/v1/payment/test/merchant-profile')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Error retrieving merchant profile');
      expect(response.body).toHaveProperty('details', 'Unauthorized');
    });
  });

  // =====================
  // CHECK ORDER WITH SUMUP TESTS
  // =====================

  describe('GET /v1/payment/test/check-order/:orderId', () => {
    it('should check order with SumUp status successfully', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue(mockOrderWithCheckout);
      mockedSumupService.getSumUpCheckoutStatus.mockResolvedValue(mockSumUpStatusResponse);

      const response = await request(app)
        .get('/v1/payment/test/check-order/1')
        .expect(200);

      expect(response.body).toHaveProperty('order');
      expect(response.body).toHaveProperty('sumup_status');
      expect(response.body.order).toEqual(mockOrderWithCheckout);
      expect(response.body.sumup_status).toEqual(mockSumUpStatusResponse);
    });

    it('should check order without SumUp checkout ID', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue(mockOrder);

      const response = await request(app)
        .get('/v1/payment/test/check-order/1')
        .expect(200);

      expect(response.body).toHaveProperty('order');
      expect(response.body).not.toHaveProperty('sumup_status');
      expect(response.body.order).toEqual(mockOrder);
    });

    it('should handle SumUp API errors for order check', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue(mockOrderWithCheckout);
      mockedSumupService.getSumUpCheckoutStatus.mockRejectedValue(new Error('API rate limit exceeded'));

      const response = await request(app)
        .get('/v1/payment/test/check-order/1')
        .expect(200);

      expect(response.body).toHaveProperty('order');
      expect(response.body).toHaveProperty('sumup_error', 'API rate limit exceeded');
      expect(response.body).not.toHaveProperty('sumup_status');
    });

    it('should return 404 for non-existent order', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/v1/payment/test/check-order/999')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Order not found');
    });

    it('should return 500 for invalid order ID', async () => {
      const response = await request(app)
        .get('/v1/payment/test/check-order/invalid')
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Error checking order status');
    });
  });
}); 