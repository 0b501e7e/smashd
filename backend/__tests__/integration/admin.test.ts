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
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      customizationCategory: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      customizationOption: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      menuItemCustomizationOption: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
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
const mockAdminUser = {
  id: 1,
  email: 'admin@smashd.com',
  name: 'Admin User',
  password: '$2b$10$hashedPassword',
  role: Role.ADMIN,
  dateOfBirth: new Date('1985-06-15'),
  address: '456 Admin Street',
  phoneNumber: '+34600000001',
  acceptedTerms: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  loyaltyPoints: null
};

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

// Mock menu items
const mockMenuItems = [
  {
    id: 1,
    name: 'Classic Burger',
    description: 'Beef patty with lettuce, tomato, and cheese',
    price: 12.99,
    category: 'BURGER',
    imageUrl: '/images/menu-items/burger.jpg',
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
    imageUrl: '/images/menu-items/fries.jpg',
    isAvailable: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Mock orders for admin panel - simplified to one order to match test expectations
const mockAdminOrders = [
  {
    id: 1,
    userId: 2,
    total: 17.98,
    status: OrderStatus.PAYMENT_CONFIRMED,
    estimatedReadyTime: null,
    sumUpCheckoutId: 'checkout_123',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    user: {
      id: 2,
      name: 'Customer User',
      email: 'customer@example.com'
    },
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
  }
];

// Mock customization data - simplified to match test expectations
const mockCustomizationCategories = [
  {
    id: 1,
    name: 'Size',
    createdAt: new Date(),
    updatedAt: new Date(),
    options: [
      { id: 1, name: 'Regular', price: 0.00, categoryId: 1, createdAt: new Date(), updatedAt: new Date() },
      { id: 2, name: 'Large', price: 2.00, categoryId: 1, createdAt: new Date(), updatedAt: new Date() }
    ]
  }
];

const mockCustomizationOptions = [
  {
    id: 1,
    name: 'Regular',
    price: 0.00,
    categoryId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: { id: 1, name: 'Size' }
  },
  {
    id: 2,
    name: 'Large',
    price: 2.00,
    categoryId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: { id: 1, name: 'Size' }
  }
];

describe('Admin Integration Tests - TypeScript Backend', () => {
  let adminToken: string;
  let customerToken: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    mockedBcrypt.hash.mockResolvedValue('$2b$10$hashedPassword' as never);
    mockedBcrypt.compare.mockImplementation((password: any, _hash: string): Promise<boolean> => {
      return Promise.resolve(password === 'password123');
    });

    // Get admin token
    mockedPrisma.user.findUnique.mockResolvedValue(mockAdminUser);
    const adminLoginResponse = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'admin@smashd.com', password: 'password123' });
    adminToken = adminLoginResponse.body.data.token;

    // Get customer token for non-admin test cases
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
  // MENU MANAGEMENT TESTS
  // =====================

  describe('GET /v1/admin/menu/all', () => {
    it('should return all menu items for admin including unavailable ones', async () => {
      mockedPrisma.menuItem.findMany.mockResolvedValue(mockMenuItems);

      const response = await request(app)
        .get('/v1/admin/menu/all')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('id', 1);
      expect(response.body[0]).toHaveProperty('name', 'Classic Burger');
      expect(response.body[0]).toHaveProperty('isAvailable', true);
      expect(response.body[1]).toHaveProperty('isAvailable', false); // Should include unavailable items
    });

    it('should deny access for non-admin users', async () => {
      const response = await request(app)
        .get('/v1/admin/menu/all')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Admin access required');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/v1/admin/menu/all')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access token required');
    });
  });

  describe('POST /v1/admin/menu', () => {
    const validMenuItemData = {
      name: 'New Burger',
      description: 'A delicious new burger',
      price: 14.99,
      category: 'BURGER',
      imageUrl: '/images/menu-items/new-burger.jpg',
      isAvailable: true
    };

    it('should create a new menu item successfully', async () => {
      const createdMenuItem = { id: 3, ...validMenuItemData, createdAt: new Date(), updatedAt: new Date() };
      mockedPrisma.menuItem.create.mockResolvedValue(createdMenuItem);

      const response = await request(app)
        .post('/v1/admin/menu')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validMenuItemData)
        .expect(201);

      expect(response.body).toHaveProperty('id', 3);
      expect(response.body).toHaveProperty('name', 'New Burger');
      expect(response.body).toHaveProperty('price', 14.99);
      expect(response.body).toHaveProperty('category', 'BURGER');
    });

    it('should deny access for non-admin users', async () => {
      const response = await request(app)
        .post('/v1/admin/menu')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(validMenuItemData)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Admin access required');
    });
  });

  describe('PUT /v1/admin/menu/:id', () => {
    const updateData = {
      name: 'Updated Burger',
      description: 'Updated description',
      price: 15.99,
      category: 'BURGER',
      imageUrl: '/images/menu-items/updated-burger.jpg',
      isAvailable: true
    };

    it('should update menu item successfully', async () => {
      const updatedMenuItem = { id: 1, ...updateData, createdAt: new Date(), updatedAt: new Date() };
      mockedPrisma.menuItem.update.mockResolvedValue(updatedMenuItem);

      const response = await request(app)
        .put('/v1/admin/menu/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('id', 1);
      expect(response.body).toHaveProperty('name', 'Updated Burger');
      expect(response.body).toHaveProperty('price', 15.99);
    });

    it('should return 404 for non-existent menu item', async () => {
      mockedPrisma.menuItem.update.mockRejectedValue({ code: 'P2025' });

      const response = await request(app)
        .put('/v1/admin/menu/999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Menu item not found');
    });

    it('should return 400 for invalid menu item ID', async () => {
      const response = await request(app)
        .put('/v1/admin/menu/invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid menu item ID');
    });
  });

  describe('PATCH /v1/admin/menu/:id/availability', () => {
    it('should update menu item availability', async () => {
      const menuItem = { ...mockMenuItems[0], isAvailable: false };
      mockedPrisma.menuItem.findUnique.mockResolvedValue(mockMenuItems[0]);
      mockedPrisma.menuItem.update.mockResolvedValue(menuItem);

      const response = await request(app)
        .patch('/v1/admin/menu/1/availability')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isAvailable: false })
        .expect(200);

      expect(response.body).toHaveProperty('id', 1);
      expect(response.body).toHaveProperty('isAvailable', false);
    });

    it('should return 404 for non-existent menu item', async () => {
      mockedPrisma.menuItem.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .patch('/v1/admin/menu/999/availability')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isAvailable: false })
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Menu item not found');
    });
  });

  describe('DELETE /v1/admin/menu/:id', () => {
    it('should delete menu item successfully', async () => {
      const mockTx = {
        menuItemCustomizationOption: {
          deleteMany: jest.fn().mockResolvedValue({ count: 2 })
        },
        menuItem: {
          delete: jest.fn().mockResolvedValue(mockMenuItems[0])
        }
      };
      mockedPrisma.menuItem.findUnique.mockResolvedValue(mockMenuItems[0]);
      mockedPrisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      const response = await request(app)
        .delete('/v1/admin/menu/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Classic Burger');
      expect(response.body).toHaveProperty('deletedMenuItem');
      expect(response.body.deletedMenuItem).toHaveProperty('id', 1);
    });

    it('should return 404 for non-existent menu item', async () => {
      mockedPrisma.menuItem.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .delete('/v1/admin/menu/999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Menu item not found');
    });
  });

  // =====================
  // ORDER MANAGEMENT TESTS
  // =====================

  describe('GET /v1/admin/orders', () => {
    it('should return orders for admin dashboard', async () => {
      mockedPrisma.order.findMany.mockResolvedValue(mockAdminOrders);

      const response = await request(app)
        .get('/v1/admin/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty('id', 1);
      expect(response.body[0]).toHaveProperty('status', 'PAYMENT_CONFIRMED');
      expect(response.body[0]).toHaveProperty('user');
      expect(response.body[0].user).toHaveProperty('name', 'Customer User');
      expect(response.body[0]).toHaveProperty('items');
      expect(response.body[0].items).toHaveLength(2);
    });

    it('should deny access for non-admin users', async () => {
      const response = await request(app)
        .get('/v1/admin/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Admin access required');
    });
  });

  describe('POST /v1/admin/orders/:orderId/accept', () => {
    it('should return 400 for non-existent order', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/v1/admin/orders/999/accept')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estimatedMinutes: 15 })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should return 400 for order that cannot be accepted', async () => {
      const confirmedOrder = { ...mockAdminOrders[0], status: OrderStatus.DELIVERED };
      mockedPrisma.order.findUnique.mockResolvedValue(confirmedOrder);

      const response = await request(app)
        .post('/v1/admin/orders/1/accept')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estimatedMinutes: 15 })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Validation failed');
    });

    it('should return 400 for invalid order ID', async () => {
      const response = await request(app)
        .post('/v1/admin/orders/invalid/accept')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estimatedMinutes: 15 })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('POST /v1/admin/orders/:orderId/decline', () => {
    it('should return 400 for order that cannot be declined', async () => {
      const deliveredOrder = { ...mockAdminOrders[0], status: OrderStatus.DELIVERED };
      mockedPrisma.order.findUnique.mockResolvedValue(deliveredOrder);

      const response = await request(app)
        .post('/v1/admin/orders/1/decline')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Test reason' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Validation failed');
    });
  });

  // =====================
  // CUSTOMIZATION MANAGEMENT TESTS
  // =====================

  describe('GET /v1/admin/customization-categories', () => {
    it('should return all customization categories with options', async () => {
      mockedPrisma.customizationCategory.findMany.mockResolvedValue(mockCustomizationCategories);

      const response = await request(app)
        .get('/v1/admin/customization-categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty('id', 1);
      expect(response.body[0]).toHaveProperty('name', 'Size');
      expect(response.body[0]).toHaveProperty('options');
      expect(response.body[0].options).toHaveLength(2);
      expect(response.body[0].options[0]).toHaveProperty('name', 'Regular');
      expect(response.body[0].options[0]).toHaveProperty('price', 0);
    });

    it('should deny access for non-admin users', async () => {
      const response = await request(app)
        .get('/v1/admin/customization-categories')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Admin access required');
    });
  });

  describe('POST /v1/admin/customization-categories', () => {
    const validCategoryData = {
      name: 'Sauce',
      options: [
        { name: 'Ketchup', price: 0.00 },
        { name: 'BBQ Sauce', price: 0.50 }
      ]
    };

    it('should create customization category with options', async () => {
      const createdCategory = {
        id: 3,
        name: 'Sauce',
        createdAt: new Date(),
        updatedAt: new Date(),
        options: [
          { id: 5, name: 'Ketchup', price: 0.00, categoryId: 3, createdAt: new Date(), updatedAt: new Date() },
          { id: 6, name: 'BBQ Sauce', price: 0.50, categoryId: 3, createdAt: new Date(), updatedAt: new Date() }
        ]
      };
      
      mockedPrisma.customizationCategory.create.mockResolvedValue(createdCategory);

      const response = await request(app)
        .post('/v1/admin/customization-categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validCategoryData)
        .expect(201);

      expect(response.body).toHaveProperty('id', 3);
      expect(response.body).toHaveProperty('name', 'Sauce');
      expect(response.body).toHaveProperty('options');
      expect(response.body.options).toHaveLength(2);
      expect(response.body.options[0]).toHaveProperty('name', 'Ketchup');
    });

    it('should deny access for non-admin users', async () => {
      const response = await request(app)
        .post('/v1/admin/customization-categories')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(validCategoryData)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Admin access required');
    });
  });

  describe('GET /v1/admin/customization-options', () => {
    it('should return all customization options with category info', async () => {
      mockedPrisma.customizationOption.findMany.mockResolvedValue(mockCustomizationOptions);

      const response = await request(app)
        .get('/v1/admin/customization-options')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('id', 1);
      expect(response.body[0]).toHaveProperty('name', 'Regular');
      expect(response.body[0]).toHaveProperty('category');
      expect(response.body[0].category).toHaveProperty('name', 'Size');
    });
  });

  describe('GET /v1/admin/customization-options/:menuItemId', () => {
    it('should return linked customization option IDs', async () => {
      const mockLinks = [
        { customizationOptionId: 1 },
        { customizationOptionId: 2 }
      ];
      mockedPrisma.menuItemCustomizationOption.findMany.mockResolvedValue(mockLinks);

      const response = await request(app)
        .get('/v1/admin/customization-options/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('optionIds');
      expect(response.body.optionIds).toBeInstanceOf(Array);
      expect(response.body.optionIds).toEqual([1, 2]);
    });

    it('should return 400 for invalid menu item ID', async () => {
      const response = await request(app)
        .get('/v1/admin/customization-options/invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('POST /v1/admin/customization-options/:menuItemId', () => {
    it('should set linked customization options successfully', async () => {
      const mockTx = {
        menuItemCustomizationOption: {
          deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
          createMany: jest.fn().mockResolvedValue({ count: 2 })
        }
      };
      mockedPrisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      const response = await request(app)
        .post('/v1/admin/customization-options/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ optionIds: [1, 2] })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('updated successfully');
    });

    it('should handle empty option IDs array', async () => {
      const mockTx = {
        menuItemCustomizationOption: {
          deleteMany: jest.fn().mockResolvedValue({ count: 2 })
        }
      };
      mockedPrisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      const response = await request(app)
        .post('/v1/admin/customization-options/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ optionIds: [] })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for invalid optionIds', async () => {
      const response = await request(app)
        .post('/v1/admin/customization-options/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ optionIds: 'not-an-array' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'optionIds must be an array');
    });

    it('should return 400 for invalid customization option IDs', async () => {
      mockedPrisma.$transaction.mockRejectedValue({ code: 'P2003' });

      const response = await request(app)
        .post('/v1/admin/customization-options/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ optionIds: [999] })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'One or more customization option IDs are invalid');
    });
  });

  // =====================
  // SUMUP INTEGRATION TESTS
  // =====================

  describe('POST /v1/admin/sync-menu-to-sumup', () => {
    it('should sync menu to SumUp successfully', async () => {
      const mockSyncResponse = {
        success: true,
        message: 'Successfully synced 2 menu items to SumUp',
        syncedItems: 2
      };

      // Mock the service response rather than the complex SumUp API calls
      jest.spyOn(services.adminService, 'syncMenuToSumUp').mockResolvedValue(mockSyncResponse);

      const response = await request(app)
        .post('/v1/admin/sync-menu-to-sumup')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Successfully synced');
      expect(response.body).toHaveProperty('syncedItems', 2);
    });

    it('should handle sync errors gracefully', async () => {
      const mockSyncResponse = {
        success: false,
        message: 'Synced 1 items with 1 errors',
        syncedItems: 1,
        errors: ['Burger Item: API rate limit exceeded']
      };

      jest.spyOn(services.adminService, 'syncMenuToSumUp').mockResolvedValue(mockSyncResponse);

      const response = await request(app)
        .post('/v1/admin/sync-menu-to-sumup')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toBeInstanceOf(Array);
      expect(response.body.errors).toHaveLength(1);
    });

    it('should deny access for non-admin users', async () => {
      const response = await request(app)
        .post('/v1/admin/sync-menu-to-sumup')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Admin access required');
    });
  });

  describe('POST /v1/admin/menu-items/upload-image', () => {
    it('should handle missing file upload', async () => {
      const response = await request(app)
        .post('/v1/admin/menu-items/upload-image')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'No file uploaded');
    });
  });
}); 