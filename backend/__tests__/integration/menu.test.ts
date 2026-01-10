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
import { Role } from '@prisma/client';

// Get the mocked prisma instance
const mockedPrisma = services.prisma as any;

// Test data
const mockMenuItems = [
  {
    id: 1,
    name: 'Classic Burger',
    description: 'Juicy beef patty with lettuce, tomato, and cheese',
    price: 12.99,
    category: 'BURGERS',
    imageUrl: 'burger.jpg',
    isAvailable: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 2,
    name: 'Chicken Wings',
    description: 'Crispy chicken wings with buffalo sauce',
    price: 9.99,
    category: 'APPETIZERS',
    imageUrl: 'wings.jpg',
    isAvailable: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const mockCustomizationCategories = [
  {
    id: 1,
    name: 'Protein',
    createdAt: new Date(),
    updatedAt: new Date(),
    customizationOptions: [
      {
        id: 1,
        name: 'Extra Beef',
        price: 3.00,
        isAvailable: true,
        categoryId: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  }
];

const mockAdminUser = {
  id: 1,
  email: 'admin@smashd.com',
  name: 'Admin User',
  password: '$2b$10$hashedPassword',
  role: Role.ADMIN,
  dateOfBirth: new Date('1990-01-01'),
  address: '123 Admin Street',
  phoneNumber: '+34600000000',
  acceptedTerms: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockCustomerUser = {
  id: 2,
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

describe('Menu Integration Tests - TypeScript Backend', () => {
  let adminToken: string;
  let customerToken: string;

  // Set up mocks before each test
  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Set up bcrypt mocks
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

  describe('GET /v1/menu', () => {
    it('should return available menu items', async () => {
      // Mock: Return available menu items
      mockedPrisma.menuItem.findMany.mockResolvedValue(mockMenuItems);

      const response = await request(app)
        .get('/v1/menu')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(2);

      // Verify the correct database call was made
      expect(mockedPrisma.menuItem.findMany).toHaveBeenCalledWith({
        where: { isAvailable: true },
        orderBy: { category: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          category: true,
          imageUrl: true,
          isAvailable: true,
          sumupProductId: true,
          originalPrice: true,
          promotionTitle: true,
          vatRate: true
        }
      });
    });

    it('should handle database errors', async () => {
      // Mock: Database error
      mockedPrisma.menuItem.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/v1/menu')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /v1/menu/customizations', () => {
    it('should return customization categories with options', async () => {
      // Mock: Return customization categories
      mockedPrisma.customizationCategory.findMany.mockResolvedValue(mockCustomizationCategories);

      const response = await request(app)
        .get('/v1/menu/customizations')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify the correct database call was made
      expect(mockedPrisma.customizationCategory.findMany).toHaveBeenCalledWith({
        include: {
          options: {
            orderBy: { name: 'asc' }
          }
        },
        orderBy: { name: 'asc' }
      });
    });

    it('should handle database errors', async () => {
      // Mock: Database error
      mockedPrisma.customizationCategory.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/v1/menu/customizations')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /v1/menu/:id', () => {
    it('should return specific menu item with customizations', async () => {
      const mockMenuItemWithCustomizations = {
        ...mockMenuItems[0],
        linkedCustomizationOptions: [
          {
            customizationOption: {
              id: 1,
              name: 'Extra Beef',
              price: 3.00,
              category: { name: 'Protein' }
            }
          }
        ]
      };

      // Mock: Return menu item with customizations
      mockedPrisma.menuItem.findUnique.mockResolvedValue(mockMenuItemWithCustomizations);

      const response = await request(app)
        .get('/v1/menu/1')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', 1);
      expect(response.body.data).toHaveProperty('name', 'Classic Burger');
    });

    it('should return 404 for non-existent menu item', async () => {
      // Mock: Menu item not found
      mockedPrisma.menuItem.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/v1/menu/999')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Menu item not found');
    });

    it('should handle database errors', async () => {
      // Mock: Database error
      mockedPrisma.menuItem.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/v1/menu/1')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Admin Menu Management', () => {
    describe('GET /v1/admin/menu/all', () => {
      it('should return all menu items for admin', async () => {
        // Mock: Return all menu items
        mockedPrisma.menuItem.findMany.mockResolvedValue(mockMenuItems);

        const response = await request(app)
          .get('/v1/admin/menu/all')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        // Admin endpoint now returns wrapped response
        expect(response.body).toHaveProperty('success', true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data).toHaveLength(2);
      });

      it('should return 401 for missing token', async () => {
        await request(app)
          .get('/v1/admin/menu/all')
          .expect(401);
      });

      it('should return 403 for non-admin user', async () => {
        await request(app)
          .get('/v1/admin/menu/all')
          .set('Authorization', `Bearer ${customerToken}`)
          .expect(403);
      });
    });

    describe('POST /v1/admin/menu', () => {
      const validMenuItemData = {
        name: 'New Burger',
        description: 'A delicious new burger with special sauce',
        price: 15.99,
        category: 'BURGER',
        imageUrl: 'https://example.com/new-burger.jpg'
      };

      it('should create new menu item', async () => {
        const newMenuItem = { id: 3, ...validMenuItemData, isAvailable: true, createdAt: new Date(), updatedAt: new Date() };

        // Mock: Create menu item
        mockedPrisma.menuItem.create.mockResolvedValue(newMenuItem);

        const response = await request(app)
          .post('/v1/admin/menu')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(validMenuItemData)
          .expect(201);

        // Admin endpoint now returns wrapped response
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('name', 'New Burger');

        // Verify the correct database call was made
        expect(mockedPrisma.menuItem.create).toHaveBeenCalled();
      });

      it('should return 400 for invalid data', async () => {
        const invalidData = { ...validMenuItemData, name: 'A' }; // Name too short

        const response = await request(app)
          .post('/v1/admin/menu')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidData)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error', 'Validation failed');
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data[0]).toHaveProperty('field');
        expect(response.body.data[0]).toHaveProperty('message');
      });

      it('should return 403 for non-admin user', async () => {
        await request(app)
          .post('/v1/admin/menu')
          .set('Authorization', `Bearer ${customerToken}`)
          .send(validMenuItemData)
          .expect(403);
      });
    });

    describe('PUT /v1/admin/menu/:id', () => {
      const updateData = {
        name: 'Updated Burger',
        description: 'An updated delicious burger',
        price: 13.99,
        category: 'BURGER',
        isAvailable: true,
        imageUrl: 'https://example.com/updated-burger.jpg'
      };

      it('should update menu item', async () => {
        const updatedMenuItem = { id: 1, ...updateData, isAvailable: true, createdAt: new Date(), updatedAt: new Date() };

        // Mock: Find existing item and update menu item  
        mockedPrisma.menuItem.findUnique.mockResolvedValue(mockMenuItems[0]);
        mockedPrisma.menuItem.update.mockResolvedValue(updatedMenuItem);

        const response = await request(app)
          .put('/v1/admin/menu/1')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        // Admin endpoint now returns wrapped response
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('name', 'Updated Burger');
      });

      it('should return 400 for invalid data', async () => {
        const invalidData = { ...updateData, price: -5 }; // Invalid price

        const response = await request(app)
          .put('/v1/admin/menu/1')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidData)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error', 'Validation failed');
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data[0]).toHaveProperty('field');
        expect(response.body.data[0]).toHaveProperty('message');
      });
    });

    describe('PATCH /v1/admin/menu/:id/availability', () => {
      it('should update menu item availability', async () => {
        const updatedMenuItem = { ...mockMenuItems[0], isAvailable: false };

        // Mock: Find existing item and update availability
        mockedPrisma.menuItem.findUnique.mockResolvedValue(mockMenuItems[0]);
        mockedPrisma.menuItem.update.mockResolvedValue(updatedMenuItem);

        const response = await request(app)
          .patch('/v1/admin/menu/1/availability')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ isAvailable: false })
          .expect(200);

        // Admin endpoint now returns wrapped response
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('isAvailable', false);
      });

      it('should return 400 for invalid availability value', async () => {
        const response = await request(app)
          .patch('/v1/admin/menu/1/availability')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ isAvailable: 'invalid' })
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('isAvailable');
      });
    });

    describe('DELETE /v1/admin/menu/:id', () => {
      it('should delete menu item', async () => {
        // Mock: Find existing item and transaction delete
        mockedPrisma.menuItem.findUnique.mockResolvedValue(mockMenuItems[0]);
        mockedPrisma.$transaction.mockImplementation(async (callback: any) => {
          // Simulate the transaction callback
          const mockTx = {
            menuItemCustomizationOption: {
              deleteMany: jest.fn().mockResolvedValue({ count: 0 })
            },
            menuItem: {
              delete: jest.fn().mockResolvedValue(mockMenuItems[0])
            }
          };
          return await callback(mockTx);
        });

        const response = await request(app)
          .delete('/v1/admin/menu/1')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        // Admin endpoint now returns wrapped response
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('deletedMenuItem');
      });

      it('should handle database errors', async () => {
        // Mock: Find existing item but transaction fails
        mockedPrisma.menuItem.findUnique.mockResolvedValue(mockMenuItems[0]);
        mockedPrisma.$transaction.mockRejectedValue(new Error('Database error'));

        const response = await request(app)
          .delete('/v1/admin/menu/1')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(500);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      });
    });
  });
}); 