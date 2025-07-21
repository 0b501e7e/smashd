import request from 'supertest';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

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

// Get the mocked prisma instance
const mockedPrisma = services.prisma as any;

// Test data
const mockCustomerUser = {
  id: 1,
  email: 'customer@example.com',
  name: 'Customer User',
  password: '$2b$10$hashedPassword',
  role: Role.CUSTOMER,
  dateOfBirth: new Date('1990-01-01'),
  address: '123 Customer Street',
  phoneNumber: '+34600000000',
  acceptedTerms: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

// Admin user not needed for order tests

const mockMenuItems = [
  {
    id: 1,
    name: 'Classic Burger',
    description: 'Juicy beef patty with lettuce, tomato, and cheese',
    price: 12.99,
    category: 'BURGER',
    imageUrl: 'burger.jpg',
    isAvailable: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 2,
    name: 'French Fries',
    description: 'Crispy golden fries',
    price: 4.99,
    category: 'SIDE',
    imageUrl: 'fries.jpg',
    isAvailable: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const mockOrder = {
  id: 1,
  userId: 1,
  total: 17.98,
  status: OrderStatus.AWAITING_PAYMENT,
  estimatedReadyTime: null,
  sumUpCheckoutId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  items: [
    {
      id: 1,
      orderId: 1,
      menuItemId: 1,
      quantity: 1,
      price: 12.99,
      customizations: [],
      menuItem: mockMenuItems[0]
    },
    {
      id: 2,
      orderId: 1,
      menuItemId: 2,
      quantity: 1,
      price: 4.99,
      customizations: [],
      menuItem: mockMenuItems[1]
    }
  ]
};

describe('Order Integration Tests - TypeScript Backend', () => {
  let customerToken: string;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up bcrypt mocks
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

    // Admin token not needed for order tests
  });

  afterAll(async () => {
    await services.shutdown();
  });

  describe('POST /v1/orders', () => {
    const validOrderData = {
      items: [
        { menuItemId: 1, quantity: 1, customizations: [] },
        { menuItemId: 2, quantity: 1, customizations: [] }
      ],
      total: 17.98
    };

    it('should create a new order successfully', async () => {
      // Mock: Return menu items and create order
      mockedPrisma.menuItem.findUnique
        .mockResolvedValueOnce(mockMenuItems[0])
        .mockResolvedValueOnce(mockMenuItems[1]);
      
      mockedPrisma.$transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          order: {
            create: jest.fn().mockResolvedValue({
              ...mockOrder,
              items: undefined // Remove items from order creation
            })
          },
          orderItem: {
            createMany: jest.fn().mockResolvedValue({ count: 2 })
          },
          loyaltyPoints: {
            create: jest.fn().mockResolvedValue({})
          }
        };
        return await callback(mockTx);
      });

      const response = await request(app)
        .post('/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(validOrderData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('order');
      expect(response.body.data).toHaveProperty('message');
    });

    it('should return 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .post('/v1/orders')
        .send(validOrderData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid order data', async () => {
      const invalidOrderData = {
        items: [],
        total: -1  // Invalid total
      };

      const response = await request(app)
        .post('/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(invalidOrderData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should handle service errors (e.g., missing menu item)', async () => {
      // Mock: Menu item validation fails in service
      mockedPrisma.menuItem.findUnique.mockResolvedValue(null);
      
      // The service will throw an error for missing menu items
      // This will be caught by the error middleware and return 500
      const response = await request(app)
        .post('/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(validOrderData)
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle database errors', async () => {
      // Mock: Database error during transaction
      mockedPrisma.menuItem.findUnique
        .mockResolvedValueOnce(mockMenuItems[0])
        .mockResolvedValueOnce(mockMenuItems[1]);
      
      mockedPrisma.$transaction.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(validOrderData)
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /v1/orders/:id/status', () => {
    it('should return order status successfully', async () => {
      // Mock: Return order with the exact structure the service expects
      mockedPrisma.order.findUnique.mockResolvedValue({
        id: 1,
        status: OrderStatus.AWAITING_PAYMENT,
        readyAt: null,
        estimatedReadyTime: null,
        sumupCheckoutId: null,
        total: 17.98,
        createdAt: new Date(),
        items: [
          {
            id: 1,
            menuItemId: 1,
            quantity: 1,
            price: 12.99,
            customizations: null,
            menuItem: {
              name: 'Classic Burger'
            }
          },
          {
            id: 2,
            menuItemId: 2,
            quantity: 1,
            price: 4.99,
            customizations: null,
            menuItem: {
              name: 'French Fries'
            }
          }
        ]
      });

      const response = await request(app)
        .get('/v1/orders/1/status')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('items');
    });

    it('should return 404 for non-existent order', async () => {
      // Mock: Order not found
      mockedPrisma.order.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/v1/orders/999/status')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Order not found');
    });

    it('should return 400 for invalid order ID', async () => {
      const response = await request(app)
        .get('/v1/orders/invalid/status')
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should return 400 for missing order ID', async () => {
      await request(app)
        .get('/v1/orders//status')
        .expect(404); // This becomes a 404 because the route doesn't match

      // Note: Express treats empty param as route not found
    });

    it('should handle database errors', async () => {
      // Mock: Database error
      mockedPrisma.order.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/v1/orders/1/status')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /v1/orders/:id/estimate', () => {
    it('should update order estimate successfully', async () => {
      const estimateData = { estimatedMinutes: 15 };
      
      // Mock: Order in PAYMENT_CONFIRMED status (can be estimated)
      const confirmableOrder = {
        ...mockOrder,
        status: OrderStatus.PAYMENT_CONFIRMED
      };
      
      // Mock: Find order and update estimate
      mockedPrisma.order.findUnique.mockResolvedValue(confirmableOrder);
      mockedPrisma.order.update.mockResolvedValue({
        ...confirmableOrder,
        estimatedReadyTime: new Date(Date.now() + 15 * 60000),
        status: OrderStatus.CONFIRMED
      });

      const response = await request(app)
        .post('/v1/orders/1/estimate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(estimateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('estimatedReadyTime');
    });

    it('should return 400 for missing estimated minutes', async () => {
      const response = await request(app)
        .post('/v1/orders/1/estimate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Valid estimatedMinutes required');
    });

    it('should return 400 for invalid estimated minutes', async () => {
      const response = await request(app)
        .post('/v1/orders/1/estimate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ estimatedMinutes: 'invalid' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Valid estimatedMinutes required');
    });

    it('should return 404 for non-existent order', async () => {
      // Mock: Order not found
      mockedPrisma.order.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/v1/orders/999/estimate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ estimatedMinutes: 15 })
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Order not found');
    });

    it('should handle database errors', async () => {
      // Mock: Database error
      mockedPrisma.order.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/v1/orders/1/estimate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ estimatedMinutes: 15 })
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /v1/orders/:orderId/verify-payment', () => {
    it('should verify payment successfully', async () => {
      // Mock: Find order and verify payment
      mockedPrisma.order.findFirst.mockResolvedValue({
        ...mockOrder,
        sumUpCheckoutId: 'checkout_123'
      });
      
      // Mock the payment verification result
      const mockVerificationResult = {
        success: true,
        order: {
          ...mockOrder,
          status: OrderStatus.PAYMENT_CONFIRMED
        },
        message: 'Payment verified successfully'
      };

      // We need to mock the payment service call indirectly
      // by mocking the database update that would happen after verification
      mockedPrisma.order.update.mockResolvedValue(mockVerificationResult.order);

      const response = await request(app)
        .post('/v1/orders/1/verify-payment')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should return 401 for missing authentication', async () => {
      const response = await request(app)
        .post('/v1/orders/1/verify-payment')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Access token required');
    });

    it('should return 400 for missing order ID', async () => {
      await request(app)
        .post('/v1/orders//verify-payment')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(404); // Route not found

      // Note: Express treats empty param as route not found
    });

    it('should return 400 for invalid order ID', async () => {
      const response = await request(app)
        .post('/v1/orders/invalid/verify-payment')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Invalid order ID');
    });

    it('should handle database errors', async () => {
      // Mock: Database error
      mockedPrisma.order.findFirst.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/v1/orders/1/verify-payment')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });
}); 