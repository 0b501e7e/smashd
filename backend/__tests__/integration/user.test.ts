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

// Mock users
const mockCustomerUser = {
  id: 1,
  email: 'customer@example.com',
  name: 'John Customer',
  password: '$2b$10$hashedPassword',
  role: Role.CUSTOMER,
  dateOfBirth: new Date('1990-01-01'),
  address: '123 Main Street',
  phoneNumber: '+34600000001',
  acceptedTerms: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  loyaltyPoints: {
    userId: 1,
    points: 150,
    createdAt: new Date(),
    updatedAt: new Date()
  }
};

const mockAdminUser = {
  id: 2,
  email: 'admin@smashd.com',
  name: 'Admin User',
  password: '$2b$10$hashedPassword',
  role: Role.ADMIN,
  dateOfBirth: new Date('1985-06-15'),
  address: '456 Admin Street',
  phoneNumber: '+34600000002',
  acceptedTerms: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  loyaltyPoints: null
};

const mockOtherUser = {
  id: 3,
  email: 'other@example.com',
  name: 'Other User',
  password: '$2b$10$hashedPassword',
  role: Role.CUSTOMER,
  dateOfBirth: new Date('1995-03-20'),
  address: '789 Other Street',
  phoneNumber: '+34600000003',
  acceptedTerms: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  loyaltyPoints: {
    userId: 3,
    points: 75,
    createdAt: new Date(),
    updatedAt: new Date()
  }
};

// Mock menu items for repeat order testing
const mockMenuItems = [
  {
    id: 1,
    name: 'Classic Burger',
    description: 'Beef patty with lettuce, tomato, and cheese',
    price: 12.99,
    category: 'BURGER',
    imageUrl: 'https://example.com/burger.jpg',
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
    imageUrl: 'https://example.com/fries.jpg',
    isAvailable: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 3,
    name: 'Unavailable Item',
    description: 'This item is not available',
    price: 8.99,
    category: 'BURGER',
    imageUrl: 'https://example.com/unavailable.jpg',
    isAvailable: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Mock order history data
const mockUserOrders = [
  {
    id: 1,
    userId: 1,
    total: 17.98,
    status: OrderStatus.DELIVERED,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T11:30:00Z'),
    sumupCheckoutId: null,
    readyAt: new Date('2024-01-15T11:30:00Z'),
    estimatedReadyTime: new Date('2024-01-15T11:15:00Z'),
    items: [
      {
        id: 1,
        orderId: 1,
        menuItemId: 1,
        quantity: 1,
        price: 12.99,
        customizations: null,
        menuItem: mockMenuItems[0]
      },
      {
        id: 2,
        orderId: 1,
        menuItemId: 2,
        quantity: 1,
        price: 4.99,
        customizations: null,
        menuItem: mockMenuItems[1]
      }
    ]
  },
  {
    id: 2,
    userId: 1,
    total: 12.99,
    status: OrderStatus.PAYMENT_CONFIRMED,
    createdAt: new Date('2024-01-20T14:00:00Z'),
    updatedAt: new Date('2024-01-20T14:00:00Z'),
    sumupCheckoutId: 'checkout_456',
    readyAt: null,
    estimatedReadyTime: new Date('2024-01-20T14:30:00Z'),
    items: [
      {
        id: 3,
        orderId: 2,
        menuItemId: 1,
        quantity: 1,
        price: 12.99,
        customizations: null,
        menuItem: mockMenuItems[0]
      }
    ]
  }
];



describe('User Integration Tests - TypeScript Backend', () => {
  let customerToken: string;
  let adminToken: string;
  let otherUserToken: string;

  beforeEach(async () => {
    jest.clearAllMocks();

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

    // Get admin token
    mockedPrisma.user.findUnique.mockResolvedValue(mockAdminUser);
    const adminLoginResponse = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'admin@smashd.com', password: 'password123' });
    adminToken = adminLoginResponse.body.data.token;

    // Get other user token
    mockedPrisma.user.findUnique.mockResolvedValue(mockOtherUser);
    const otherUserLoginResponse = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'other@example.com', password: 'password123' });
    otherUserToken = otherUserLoginResponse.body.data.token;
  });

  afterAll(async () => {
    await services.shutdown();
  });

  describe('GET /v1/users/profile', () => {
    it('should return user profile with loyalty points', async () => {
      mockedPrisma.user.findUnique.mockResolvedValue(mockCustomerUser);

      const response = await request(app)
        .get('/v1/users/profile')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', 1);
      expect(response.body).toHaveProperty('email', 'customer@example.com');
      expect(response.body).toHaveProperty('name', 'John Customer');
      expect(response.body).toHaveProperty('role', 'CUSTOMER');
      expect(response.body).toHaveProperty('loyaltyPoints', 150);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .get('/v1/users/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent user', async () => {
      // Mock: User not found
      mockedPrisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/v1/users/profile')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'User not found');
    });

    it('should handle database errors', async () => {
      // Mock: Database error
      mockedPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/v1/users/profile')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Error fetching user profile');
    });
  });

  describe('GET /v1/users/:userId/orders', () => {
    it('should return user orders when authenticated user requests own orders', async () => {
      // Mock: Return user's orders
      mockedPrisma.order.findMany.mockResolvedValue(mockUserOrders);

      const response = await request(app)
        .get('/v1/users/1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('id', 1);
      expect(response.body[0]).toHaveProperty('status', 'DELIVERED');
      expect(response.body[0]).toHaveProperty('total', 17.98);
      expect(response.body[0]).toHaveProperty('items');
    });

    it('should allow admin to access any user orders', async () => {
      // Mock: Return another user's orders (admin access)
      mockedPrisma.order.findMany.mockResolvedValue(mockUserOrders);

      const response = await request(app)
        .get('/v1/users/1/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(2);
    });

    it('should deny access to other users orders for non-admin users', async () => {
      const response = await request(app)
        .get('/v1/users/1/orders')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Access denied');
    });

    it('should return 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .get('/v1/users/1/orders')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle database errors', async () => {
      // Mock: Database error
      mockedPrisma.order.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/v1/users/1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Error fetching user orders');
    });
  });

  describe('GET /v1/users/:userId/last-order', () => {
    it('should return user last order when authenticated user requests own order', async () => {
      // Mock: Return user's last order
      mockedPrisma.order.findFirst.mockResolvedValue(mockUserOrders[0]);

      const response = await request(app)
        .get('/v1/users/1/last-order')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', 1);
      expect(response.body).toHaveProperty('status', 'DELIVERED');
      expect(response.body).toHaveProperty('total', 17.98);
      expect(response.body).toHaveProperty('items');
    });

    it('should allow admin to access any user last order', async () => {
      // Mock: Return another user's last order (admin access)
      mockedPrisma.order.findFirst.mockResolvedValue(mockUserOrders[0]);

      const response = await request(app)
        .get('/v1/users/1/last-order')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', 1);
    });

    it('should return 404 when user has no orders', async () => {
      // Mock: No orders found
      mockedPrisma.order.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/v1/users/1/last-order')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'No previous orders found');
    });

    it('should deny access to other users orders for non-admin users', async () => {
      const response = await request(app)
        .get('/v1/users/1/last-order')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Access denied');
    });

    it('should handle database errors', async () => {
      // Mock: Database error
      mockedPrisma.order.findFirst.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/v1/users/1/last-order')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Error fetching last order');
    });
  });

  describe('GET /v1/users/orders/:orderId/repeat', () => {
    it('should repeat order successfully for authenticated user', async () => {
      // Mock: Return the order to repeat and menu items
      mockedPrisma.order.findUnique.mockResolvedValue(mockUserOrders[0]);

      mockedPrisma.menuItem.findUnique
        .mockResolvedValueOnce(mockMenuItems[0])
        .mockResolvedValueOnce(mockMenuItems[1]);

      const response = await request(app)
        .get('/v1/users/orders/1/repeat')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body.items).toBeInstanceOf(Array);
      expect(response.body.items).toHaveLength(2);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('unavailableItems');
    });

    it('should return 404 for non-existent order', async () => {
      // Mock: Order not found
      mockedPrisma.order.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/v1/users/orders/999/repeat')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Pedido no encontrado');
    });

    it('should deny access to other users orders', async () => {
      // Mock: Return order belonging to another user
      const otherUserOrder = {
        ...mockUserOrders[0],
        userId: 999 // Different user ID
      };
      mockedPrisma.order.findUnique.mockResolvedValue(otherUserOrder);

      const response = await request(app)
        .get('/v1/users/orders/1/repeat')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Not authorized to access this user\'s data');
    });

    it('should allow admin to repeat any order', async () => {
      // Mock: Return order and menu items for admin
      mockedPrisma.order.findUnique.mockResolvedValue(mockUserOrders[0]);

      mockedPrisma.menuItem.findUnique
        .mockResolvedValueOnce(mockMenuItems[0])
        .mockResolvedValueOnce(mockMenuItems[1]);

      const response = await request(app)
        .get('/v1/users/orders/1/repeat')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
    });

    it('should handle unavailable menu items gracefully', async () => {
      // Mock: Return order with one unavailable item
      mockedPrisma.order.findUnique.mockResolvedValue(mockUserOrders[0]);

      mockedPrisma.menuItem.findUnique
        .mockResolvedValueOnce(mockMenuItems[0]) // Available
        .mockResolvedValueOnce(null); // Unavailable

      const response = await request(app)
        .get('/v1/users/orders/1/repeat')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body.items).toHaveLength(1); // Only available items
    });

    it('should return empty order when all items unavailable', async () => {
      // Mock: Return order but no menu items available
      mockedPrisma.order.findUnique.mockResolvedValue(mockUserOrders[0]);

      mockedPrisma.menuItem.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/v1/users/orders/1/repeat')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body.items).toHaveLength(0);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('unavailableItems');
    });
  });
}); 