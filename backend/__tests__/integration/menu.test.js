const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Mock the PrismaClient
const mockPrisma = {
  menuItem: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  customizationCategory: {
    findMany: jest.fn()
  }
};

jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => mockPrisma)
  };
});

// Mock jsonwebtoken
jest.mock('jsonwebtoken');
const mockJwt = jwt;

// Create a test app with menu routes
const app = express();
app.use(express.json());

// Mock environment variables
process.env.JWT_SECRET = 'test_jwt_secret';

// Import validation middleware
const { body, validationResult } = require('express-validator');

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  mockJwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Admin middleware
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') return res.sendStatus(403);
  next();
};

// Mock menu routes
app.get('/v1/menu', async (req, res) => {
  try {
    const menuItems = await mockPrisma.menuItem.findMany({
      where: { isAvailable: true },
      orderBy: { category: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        category: true,
        imageUrl: true
      }
    });
    res.json(menuItems);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ error: 'Error fetching menu items' });
  }
});

app.get('/v1/menu/customizations', async (req, res) => {
  try {
    const categoriesWithOptions = await mockPrisma.customizationCategory.findMany({
      include: {
        customizationOptions: {
          where: { isAvailable: true },
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(categoriesWithOptions);
  } catch (error) {
    console.error('Error fetching customization options:', error);
    res.status(500).json({ error: 'Error fetching customization options' });
  }
});

app.get('/v1/menu/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const menuItem = await mockPrisma.menuItem.findUnique({
      where: { id: parseInt(id) },
      include: {
        linkedCustomizationOptions: {
          include: {
            customizationOption: {
              include: {
                category: true
              }
            }
          }
        }
      }
    });

    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json(menuItem);
  } catch (error) {
    console.error('Error fetching menu item:', error);
    res.status(500).json({ error: 'Error fetching menu item' });
  }
});

// Admin routes
app.get('/v1/admin/menu/all', authenticateToken, isAdmin, async (req, res) => {
  try {
    const menuItems = await mockPrisma.menuItem.findMany({
      orderBy: { category: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        category: true,
        imageUrl: true,
        isAvailable: true,
        createdAt: true,
        updatedAt: true
      }
    });
    res.json(menuItems);
  } catch (error) {
    console.error('Error fetching all menu items:', error);
    res.status(500).json({ error: 'Error fetching menu items' });
  }
});

app.post('/v1/admin/menu', authenticateToken, isAdmin, [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters long'),
  body('price').isFloat({ min: 0.01 }).withMessage('Price must be a positive number'),
  body('category').trim().isLength({ min: 2 }).withMessage('Category must be at least 2 characters long'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, description, price, category, imageUrl } = req.body;
    const menuItem = await mockPrisma.menuItem.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        category,
        imageUrl: imageUrl || null,
        isAvailable: true
      }
    });
    res.status(201).json(menuItem);
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ error: 'Error creating menu item' });
  }
});

app.put('/v1/admin/menu/:id', authenticateToken, isAdmin, [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters long'),
  body('price').isFloat({ min: 0.01 }).withMessage('Price must be a positive number'),
  body('category').trim().isLength({ min: 2 }).withMessage('Category must be at least 2 characters long'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { name, description, price, category, imageUrl } = req.body;
    
    const menuItem = await mockPrisma.menuItem.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description,
        price: parseFloat(price),
        category,
        imageUrl: imageUrl || null
      }
    });
    res.json(menuItem);
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ error: 'Error updating menu item' });
  }
});

app.patch('/v1/admin/menu/:id/availability', authenticateToken, isAdmin, [
  body('isAvailable').isBoolean().withMessage('isAvailable must be a boolean'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { isAvailable } = req.body;
    
    const menuItem = await mockPrisma.menuItem.update({
      where: { id: parseInt(id) },
      data: { isAvailable }
    });
    res.json(menuItem);
  } catch (error) {
    console.error('Error updating menu item availability:', error);
    res.status(500).json({ error: 'Error updating menu item availability' });
  }
});

app.delete('/v1/admin/menu/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await mockPrisma.menuItem.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ error: 'Error deleting menu item' });
  }
});

describe('Menu Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /v1/menu', () => {
    it('should return available menu items', async () => {
      const mockMenuItems = [
        {
          id: 1,
          name: 'Burger',
          description: 'Delicious beef burger',
          price: 12.99,
          category: 'Main',
          imageUrl: '/images/burger.jpg'
        },
        {
          id: 2,
          name: 'Pizza',
          description: 'Margherita pizza',
          price: 15.99,
          category: 'Main',
          imageUrl: '/images/pizza.jpg'
        }
      ];

      mockPrisma.menuItem.findMany.mockResolvedValue(mockMenuItems);

      const response = await request(app).get('/v1/menu');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMenuItems);
      expect(mockPrisma.menuItem.findMany).toHaveBeenCalledWith({
        where: { isAvailable: true },
        orderBy: { category: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          category: true,
          imageUrl: true
        }
      });
    });

    it('should handle database errors', async () => {
      mockPrisma.menuItem.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/v1/menu');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Error fetching menu items');
    });
  });

  describe('GET /v1/menu/customizations', () => {
    it('should return customization categories with options', async () => {
      const mockCustomizations = [
        {
          id: 1,
          name: 'Size',
          customizationOptions: [
            { id: 1, name: 'Small', price: 0, isAvailable: true },
            { id: 2, name: 'Large', price: 2.00, isAvailable: true }
          ]
        }
      ];

      mockPrisma.customizationCategory.findMany.mockResolvedValue(mockCustomizations);

      const response = await request(app).get('/v1/menu/customizations');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCustomizations);
    });

    it('should handle database errors', async () => {
      mockPrisma.customizationCategory.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/v1/menu/customizations');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Error fetching customization options');
    });
  });

  describe('GET /v1/menu/:id', () => {
    it('should return specific menu item with customizations', async () => {
      const mockMenuItem = {
        id: 1,
        name: 'Burger',
        description: 'Delicious beef burger',
        price: 12.99,
        category: 'Main',
        imageUrl: '/images/burger.jpg',
        linkedCustomizationOptions: []
      };

      mockPrisma.menuItem.findUnique.mockResolvedValue(mockMenuItem);

      const response = await request(app).get('/v1/menu/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMenuItem);
      expect(mockPrisma.menuItem.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          linkedCustomizationOptions: {
            include: {
              customizationOption: {
                include: {
                  category: true
                }
              }
            }
          }
        }
      });
    });

    it('should return 404 for non-existent menu item', async () => {
      mockPrisma.menuItem.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/v1/menu/999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Menu item not found');
    });

    it('should handle database errors', async () => {
      mockPrisma.menuItem.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/v1/menu/1');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Error fetching menu item');
    });
  });

  describe('Admin Menu Management', () => {
    beforeEach(() => {
      // Mock JWT verification for admin user
      mockJwt.verify.mockImplementation((token, secret, callback) => {
        if (token === 'admin_token') {
          callback(null, { userId: 1, role: 'ADMIN' });
        } else if (token === 'user_token') {
          callback(null, { userId: 2, role: 'USER' });
        } else {
          callback(new Error('Invalid token'), null);
        }
      });
    });

    describe('GET /v1/admin/menu/all', () => {
      it('should return all menu items for admin', async () => {
        const mockMenuItems = [
          {
            id: 1,
            name: 'Burger',
            description: 'Delicious beef burger',
            price: 12.99,
            category: 'Main',
            imageUrl: '/images/burger.jpg',
            isAvailable: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];

        mockPrisma.menuItem.findMany.mockResolvedValue(mockMenuItems);

        const response = await request(app)
          .get('/v1/admin/menu/all')
          .set('Authorization', 'Bearer admin_token');

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(1);
        expect(response.body[0]).toMatchObject({
          id: 1,
          name: 'Burger',
          description: 'Delicious beef burger',
          price: 12.99,
          category: 'Main',
          imageUrl: '/images/burger.jpg',
          isAvailable: true
        });
        expect(response.body[0]).toHaveProperty('createdAt');
        expect(response.body[0]).toHaveProperty('updatedAt');
      });

      it('should return 401 for missing token', async () => {
        const response = await request(app).get('/v1/admin/menu/all');
        expect(response.status).toBe(401);
      });

      it('should return 403 for non-admin user', async () => {
        const response = await request(app)
          .get('/v1/admin/menu/all')
          .set('Authorization', 'Bearer user_token');
        expect(response.status).toBe(403);
      });
    });

    describe('POST /v1/admin/menu', () => {
      const validMenuData = {
        name: 'New Burger',
        description: 'A delicious new burger with special sauce',
        price: 14.99,
        category: 'Main',
        imageUrl: '/images/new-burger.jpg'
      };

      it('should create new menu item', async () => {
        const mockCreatedItem = { id: 1, ...validMenuData, isAvailable: true };
        mockPrisma.menuItem.create.mockResolvedValue(mockCreatedItem);

        const response = await request(app)
          .post('/v1/admin/menu')
          .set('Authorization', 'Bearer admin_token')
          .send(validMenuData);

        expect(response.status).toBe(201);
        expect(response.body).toEqual(mockCreatedItem);
        expect(mockPrisma.menuItem.create).toHaveBeenCalledWith({
          data: {
            name: 'New Burger',
            description: 'A delicious new burger with special sauce',
            price: 14.99,
            category: 'Main',
            imageUrl: '/images/new-burger.jpg',
            isAvailable: true
          }
        });
      });

      it('should return 400 for invalid data', async () => {
        const invalidData = { ...validMenuData, name: 'A' }; // Too short

        const response = await request(app)
          .post('/v1/admin/menu')
          .set('Authorization', 'Bearer admin_token')
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
      });

      it('should return 403 for non-admin user', async () => {
        const response = await request(app)
          .post('/v1/admin/menu')
          .set('Authorization', 'Bearer user_token')
          .send(validMenuData);
        expect(response.status).toBe(403);
      });
    });

    describe('PUT /v1/admin/menu/:id', () => {
      const updateData = {
        name: 'Updated Burger',
        description: 'An updated delicious burger',
        price: 16.99,
        category: 'Main',
        imageUrl: '/images/updated-burger.jpg'
      };

      it('should update menu item', async () => {
        const mockUpdatedItem = { id: 1, ...updateData };
        mockPrisma.menuItem.update.mockResolvedValue(mockUpdatedItem);

        const response = await request(app)
          .put('/v1/admin/menu/1')
          .set('Authorization', 'Bearer admin_token')
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockUpdatedItem);
        expect(mockPrisma.menuItem.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: {
            name: 'Updated Burger',
            description: 'An updated delicious burger',
            price: 16.99,
            category: 'Main',
            imageUrl: '/images/updated-burger.jpg'
          }
        });
      });

      it('should return 400 for invalid data', async () => {
        const invalidData = { ...updateData, price: -1 }; // Negative price

        const response = await request(app)
          .put('/v1/admin/menu/1')
          .set('Authorization', 'Bearer admin_token')
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
      });
    });

    describe('PATCH /v1/admin/menu/:id/availability', () => {
      it('should update menu item availability', async () => {
        const mockUpdatedItem = { id: 1, isAvailable: false };
        mockPrisma.menuItem.update.mockResolvedValue(mockUpdatedItem);

        const response = await request(app)
          .patch('/v1/admin/menu/1/availability')
          .set('Authorization', 'Bearer admin_token')
          .send({ isAvailable: false });

        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockUpdatedItem);
        expect(mockPrisma.menuItem.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: { isAvailable: false }
        });
      });

      it('should return 400 for invalid availability value', async () => {
        const response = await request(app)
          .patch('/v1/admin/menu/1/availability')
          .set('Authorization', 'Bearer admin_token')
          .send({ isAvailable: 'invalid' });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
      });
    });

    describe('DELETE /v1/admin/menu/:id', () => {
      it('should delete menu item', async () => {
        mockPrisma.menuItem.delete.mockResolvedValue({ id: 1 });

        const response = await request(app)
          .delete('/v1/admin/menu/1')
          .set('Authorization', 'Bearer admin_token');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Menu item deleted successfully');
        expect(mockPrisma.menuItem.delete).toHaveBeenCalledWith({
          where: { id: 1 }
        });
      });

      it('should handle database errors', async () => {
        mockPrisma.menuItem.delete.mockRejectedValue(new Error('Database error'));

        const response = await request(app)
          .delete('/v1/admin/menu/1')
          .set('Authorization', 'Bearer admin_token');

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Error deleting menu item');
      });
    });
  });
}); 