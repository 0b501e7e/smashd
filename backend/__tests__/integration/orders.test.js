const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Mock the PrismaClient
const mockPrisma = {
  order: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn()
  },
  orderItem: {
    createMany: jest.fn()
  },
  menuItem: {
    findUnique: jest.fn()
  },
  user: {
    findUnique: jest.fn()
  },
  loyaltyPoints: {
    findUnique: jest.fn(),
    update: jest.fn()
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

// Create a test app with order routes
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

// Mock order routes
app.post('/v1/orders', authenticateToken, [
  body('orderItems').isArray({ min: 1 }).withMessage('Order must contain at least one item'),
  body('orderItems.*.menuItemId').isInt({ min: 1 }).withMessage('Menu item ID must be a positive integer'),
  body('orderItems.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
  body('totalAmount').isFloat({ min: 0.01 }).withMessage('Total amount must be positive'),
  body('deliveryAddress').trim().isLength({ min: 5 }).withMessage('Delivery address is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { orderItems, totalAmount, deliveryAddress, specialInstructions } = req.body;
    const userId = req.user.userId;

    // Generate order reference
    const orderReference = `ORD-${Date.now()}`;

    // Create order
    const order = await mockPrisma.order.create({
      data: {
        userId,
        totalAmount: parseFloat(totalAmount),
        status: 'PENDING',
        deliveryAddress,
        specialInstructions: specialInstructions || null,
        reference: orderReference
      }
    });

    // Create order items
    const orderItemsData = orderItems.map(item => ({
      orderId: order.id,
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      price: item.price || 0,
      customizations: item.customizations || null
    }));

    await mockPrisma.orderItem.createMany({
      data: orderItemsData
    });

    res.status(201).json({
      id: order.id,
      reference: order.reference,
      status: order.status,
      totalAmount: order.totalAmount,
      message: 'Order created successfully'
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Error creating order' });
  }
});

app.get('/v1/users/:userId/orders', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user is accessing their own orders or is admin
    if (req.user.userId !== parseInt(userId) && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const orders = await mockPrisma.order.findMany({
      where: { userId: parseInt(userId) },
      include: {
        orderItems: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                price: true,
                imageUrl: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ error: 'Error fetching orders' });
  }
});

app.get('/v1/users/:userId/last-order', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user is accessing their own order or is admin
    if (req.user.userId !== parseInt(userId) && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const lastOrder = await mockPrisma.order.findMany({
      where: { 
        userId: parseInt(userId),
        status: { in: ['DELIVERED', 'COMPLETED'] }
      },
      include: {
        orderItems: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                price: true,
                imageUrl: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 1
    });

    if (lastOrder.length === 0) {
      return res.status(404).json({ error: 'No completed orders found' });
    }

    res.json(lastOrder[0]);
  } catch (error) {
    console.error('Error fetching last order:', error);
    res.status(500).json({ error: 'Error fetching last order' });
  }
});

app.post('/v1/orders/repeat', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user.userId;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    // Find the original order
    const originalOrder = await mockPrisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            menuItem: true
          }
        }
      }
    });

    if (!originalOrder) {
      return res.status(404).json({ error: 'Original order not found' });
    }

    if (originalOrder.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create new order
    const newOrderReference = `ORD-${Date.now()}`;
    const newOrder = await mockPrisma.order.create({
      data: {
        userId,
        totalAmount: originalOrder.totalAmount,
        status: 'PENDING',
        deliveryAddress: originalOrder.deliveryAddress,
        specialInstructions: originalOrder.specialInstructions,
        reference: newOrderReference
      }
    });

    // Create new order items
    const newOrderItemsData = originalOrder.orderItems.map(item => ({
      orderId: newOrder.id,
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      price: item.price,
      customizations: item.customizations
    }));

    await mockPrisma.orderItem.createMany({
      data: newOrderItemsData
    });

    res.status(201).json({
      id: newOrder.id,
      reference: newOrder.reference,
      status: newOrder.status,
      totalAmount: newOrder.totalAmount,
      message: 'Order repeated successfully'
    });
  } catch (error) {
    console.error('Error repeating order:', error);
    res.status(500).json({ error: 'Error repeating order' });
  }
});

app.get('/v1/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await mockPrisma.order.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        reference: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        estimatedDeliveryTime: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order status:', error);
    res.status(500).json({ error: 'Error fetching order status' });
  }
});

// Admin routes
app.get('/v1/admin/orders', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    
    const whereClause = status ? { status } : {};
    
    const orders = await mockPrisma.order.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        orderItems: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                price: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching admin orders:', error);
    res.status(500).json({ error: 'Error fetching orders' });
  }
});

app.post('/v1/admin/orders/:orderId/accept', authenticateToken, isAdmin, [
  body('estimatedDeliveryTime').isISO8601().withMessage('Estimated delivery time must be a valid date'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { orderId } = req.params;
    const { estimatedDeliveryTime } = req.body;

    const order = await mockPrisma.order.update({
      where: { id: parseInt(orderId) },
      data: {
        status: 'ACCEPTED',
        estimatedDeliveryTime: new Date(estimatedDeliveryTime)
      }
    });

    res.json({
      id: order.id,
      status: order.status,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      message: 'Order accepted successfully'
    });
  } catch (error) {
    console.error('Error accepting order:', error);
    res.status(500).json({ error: 'Error accepting order' });
  }
});

app.post('/v1/admin/orders/:orderId/decline', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await mockPrisma.order.update({
      where: { id: parseInt(orderId) },
      data: {
        status: 'DECLINED',
        declineReason: reason || null
      }
    });

    res.json({
      id: order.id,
      status: order.status,
      message: 'Order declined successfully'
    });
  } catch (error) {
    console.error('Error declining order:', error);
    res.status(500).json({ error: 'Error declining order' });
  }
});

describe('Order Management Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock JWT verification
    mockJwt.verify.mockImplementation((token, secret, callback) => {
      if (token === 'user_token') {
        callback(null, { userId: 1, role: 'USER' });
      } else if (token === 'admin_token') {
        callback(null, { userId: 2, role: 'ADMIN' });
      } else if (token === 'user2_token') {
        callback(null, { userId: 3, role: 'USER' });
      } else {
        callback(new Error('Invalid token'), null);
      }
    });
  });

  describe('POST /v1/orders', () => {
    const validOrderData = {
      orderItems: [
        {
          menuItemId: 1,
          quantity: 2,
          price: 12.99,
          customizations: JSON.stringify([{ option: 'Large', price: 2.00 }])
        }
      ],
      totalAmount: 27.98,
      deliveryAddress: '123 Test Street, Test City',
      specialInstructions: 'Ring doorbell twice'
    };

    it('should create order successfully', async () => {
      const mockOrder = {
        id: 1,
        reference: 'ORD-1234567890',
        status: 'PENDING',
        totalAmount: 27.98
      };

      mockPrisma.order.create.mockResolvedValue(mockOrder);
      mockPrisma.orderItem.createMany.mockResolvedValue({ count: 1 });

      const response = await request(app)
        .post('/v1/orders')
        .set('Authorization', 'Bearer user_token')
        .send(validOrderData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id', 1);
      expect(response.body).toHaveProperty('reference', 'ORD-1234567890');
      expect(response.body).toHaveProperty('status', 'PENDING');
      expect(response.body).toHaveProperty('message', 'Order created successfully');

      expect(mockPrisma.order.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          totalAmount: 27.98,
          status: 'PENDING',
          deliveryAddress: '123 Test Street, Test City',
          specialInstructions: 'Ring doorbell twice',
          reference: expect.stringMatching(/^ORD-\d+$/)
        }
      });
    });

    it('should return 400 for empty order items', async () => {
      const invalidData = { ...validOrderData, orderItems: [] };

      const response = await request(app)
        .post('/v1/orders')
        .set('Authorization', 'Bearer user_token')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should return 400 for invalid total amount', async () => {
      const invalidData = { ...validOrderData, totalAmount: -1 };

      const response = await request(app)
        .post('/v1/orders')
        .set('Authorization', 'Bearer user_token')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .post('/v1/orders')
        .send(validOrderData);

      expect(response.status).toBe(401);
    });

    it('should handle database errors', async () => {
      mockPrisma.order.create.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/v1/orders')
        .set('Authorization', 'Bearer user_token')
        .send(validOrderData);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Error creating order');
    });
  });

  describe('GET /v1/users/:userId/orders', () => {
    it('should return user orders', async () => {
      const mockOrders = [
        {
          id: 1,
          reference: 'ORD-1234567890',
          status: 'DELIVERED',
          totalAmount: 27.98,
          orderItems: [
            {
              id: 1,
              quantity: 2,
              price: 12.99,
              menuItem: {
                id: 1,
                name: 'Burger',
                price: 12.99,
                imageUrl: '/images/burger.jpg'
              }
            }
          ]
        }
      ];

      mockPrisma.order.findMany.mockResolvedValue(mockOrders);

      const response = await request(app)
        .get('/v1/users/1/orders')
        .set('Authorization', 'Bearer user_token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockOrders);
      expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        include: {
          orderItems: {
            include: {
              menuItem: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  imageUrl: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should return 403 for accessing other user orders', async () => {
      const response = await request(app)
        .get('/v1/users/3/orders')
        .set('Authorization', 'Bearer user_token');

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'Access denied');
    });

    it('should allow admin to access any user orders', async () => {
      const mockOrders = [];
      mockPrisma.order.findMany.mockResolvedValue(mockOrders);

      const response = await request(app)
        .get('/v1/users/1/orders')
        .set('Authorization', 'Bearer admin_token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockOrders);
    });
  });

  describe('GET /v1/users/:userId/last-order', () => {
    it('should return last completed order', async () => {
      const mockLastOrder = [
        {
          id: 1,
          reference: 'ORD-1234567890',
          status: 'DELIVERED',
          totalAmount: 27.98,
          orderItems: []
        }
      ];

      mockPrisma.order.findMany.mockResolvedValue(mockLastOrder);

      const response = await request(app)
        .get('/v1/users/1/last-order')
        .set('Authorization', 'Bearer user_token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockLastOrder[0]);
    });

    it('should return 404 if no completed orders found', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/v1/users/1/last-order')
        .set('Authorization', 'Bearer user_token');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'No completed orders found');
    });
  });

  describe('POST /v1/orders/repeat', () => {
    it('should repeat order successfully', async () => {
      const mockOriginalOrder = {
        id: 1,
        userId: 1,
        totalAmount: 27.98,
        deliveryAddress: '123 Test Street',
        specialInstructions: 'Ring doorbell',
        orderItems: [
          {
            menuItemId: 1,
            quantity: 2,
            price: 12.99,
            customizations: null,
            menuItem: { id: 1, name: 'Burger' }
          }
        ]
      };

      const mockNewOrder = {
        id: 2,
        reference: 'ORD-9876543210',
        status: 'PENDING',
        totalAmount: 27.98
      };

      mockPrisma.order.findUnique.mockResolvedValue(mockOriginalOrder);
      mockPrisma.order.create.mockResolvedValue(mockNewOrder);
      mockPrisma.orderItem.createMany.mockResolvedValue({ count: 1 });

      const response = await request(app)
        .post('/v1/orders/repeat')
        .set('Authorization', 'Bearer user_token')
        .send({ orderId: 1 });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id', 2);
      expect(response.body).toHaveProperty('message', 'Order repeated successfully');
    });

    it('should return 400 for missing order ID', async () => {
      const response = await request(app)
        .post('/v1/orders/repeat')
        .set('Authorization', 'Bearer user_token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Order ID is required');
    });

    it('should return 404 for non-existent order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/v1/orders/repeat')
        .set('Authorization', 'Bearer user_token')
        .send({ orderId: 999 });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Original order not found');
    });
  });

  describe('GET /v1/orders/:id/status', () => {
    it('should return order status', async () => {
      const mockOrder = {
        id: 1,
        reference: 'ORD-1234567890',
        status: 'PREPARING',
        totalAmount: 27.98,
        createdAt: new Date(),
        estimatedDeliveryTime: new Date()
      };

      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);

      const response = await request(app).get('/v1/orders/1/status');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: 1,
        reference: 'ORD-1234567890',
        status: 'PREPARING',
        totalAmount: 27.98
      });
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('estimatedDeliveryTime');
    });

    it('should return 404 for non-existent order', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      const response = await request(app).get('/v1/orders/999/status');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Order not found');
    });
  });

  describe('Admin Order Management', () => {
    describe('GET /v1/admin/orders', () => {
      it('should return all orders for admin', async () => {
        const mockOrders = [
          {
            id: 1,
            reference: 'ORD-1234567890',
            status: 'PENDING',
            user: { id: 1, name: 'Test User', email: 'test@example.com' },
            orderItems: []
          }
        ];

        mockPrisma.order.findMany.mockResolvedValue(mockOrders);

        const response = await request(app)
          .get('/v1/admin/orders')
          .set('Authorization', 'Bearer admin_token');

        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockOrders);
      });

      it('should filter orders by status', async () => {
        mockPrisma.order.findMany.mockResolvedValue([]);

        const response = await request(app)
          .get('/v1/admin/orders?status=PENDING')
          .set('Authorization', 'Bearer admin_token');

        expect(response.status).toBe(200);
        expect(mockPrisma.order.findMany).toHaveBeenCalledWith({
          where: { status: 'PENDING' },
          include: expect.any(Object),
          orderBy: { createdAt: 'desc' },
          take: 50
        });
      });

      it('should return 403 for non-admin user', async () => {
        const response = await request(app)
          .get('/v1/admin/orders')
          .set('Authorization', 'Bearer user_token');

        expect(response.status).toBe(403);
      });
    });

    describe('POST /v1/admin/orders/:orderId/accept', () => {
      it('should accept order successfully', async () => {
        const mockOrder = {
          id: 1,
          status: 'ACCEPTED',
          estimatedDeliveryTime: new Date('2024-01-01T12:00:00Z')
        };

        mockPrisma.order.update.mockResolvedValue(mockOrder);

        const response = await request(app)
          .post('/v1/admin/orders/1/accept')
          .set('Authorization', 'Bearer admin_token')
          .send({ estimatedDeliveryTime: '2024-01-01T12:00:00Z' });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'ACCEPTED');
        expect(response.body).toHaveProperty('message', 'Order accepted successfully');
      });

      it('should return 400 for invalid delivery time', async () => {
        const response = await request(app)
          .post('/v1/admin/orders/1/accept')
          .set('Authorization', 'Bearer admin_token')
          .send({ estimatedDeliveryTime: 'invalid-date' });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
      });
    });

    describe('POST /v1/admin/orders/:orderId/decline', () => {
      it('should decline order successfully', async () => {
        const mockOrder = {
          id: 1,
          status: 'DECLINED'
        };

        mockPrisma.order.update.mockResolvedValue(mockOrder);

        const response = await request(app)
          .post('/v1/admin/orders/1/decline')
          .set('Authorization', 'Bearer admin_token')
          .send({ reason: 'Out of ingredients' });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'DECLINED');
        expect(response.body).toHaveProperty('message', 'Order declined successfully');
      });
    });
  });
}); 