const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const { body, validationResult } = require('express-validator');
const https = require('https');

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
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

// Authentication routes
app.post('/v1/auth/register', [
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters long'),
  body('email').trim().isEmail().normalizeEmail().withMessage('Must be a valid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
], async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password } = req.body;
  try {
    // Check if email already exists (case-insensitive)
    const existingUser = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' }
      }
    });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        email: email.toLowerCase(), // Store email in lowercase
        password: hashedPassword
      },
    });
    res.status(201).json({ id: user.id, message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Error registering user' });
  }
});

app.post('/v1/auth/login', [
  body('email').trim().isEmail().normalizeEmail().withMessage('Must be a valid email address'),
  body('password').not().isEmpty().withMessage('Password is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
    } else {
      res.status(400).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error logging in' });
  }
});

// Menu routes
app.get('/v1/menu', async (req, res) => {
  console.log('Received request for menu items');
  try {
    const menuItems = await prisma.menuItem.findMany({
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
    console.log('Sending menu items:', menuItems);
    res.json(menuItems);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ error: 'Error fetching menu items' });
  }
});

app.post('/v1/admin/menu', authenticateToken, isAdmin, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').isIn(['BURGER', 'SIDE', 'DRINK', 'DESSERT']).withMessage('Invalid category'),
  body('imageUrl').isURL().withMessage('Valid image URL is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, description, price, category, imageUrl } = req.body;
  try {
    const menuItem = await prisma.menuItem.create({
      data: { name, description, price, category, imageUrl, isAvailable: true },
    });
    res.status(201).json(menuItem);
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ error: 'Error creating menu item' });
  }
});

app.put('/v1/admin/menu/:id', authenticateToken, isAdmin, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').isIn(['BURGER', 'SIDE', 'DRINK', 'DESSERT']).withMessage('Invalid category'),
  body('isAvailable').isBoolean().withMessage('isAvailable must be a boolean'),
  body('imageUrl').isURL().withMessage('Valid image URL is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { name, description, price, category, isAvailable, imageUrl } = req.body;
  try {
    const updatedMenuItem = await prisma.menuItem.update({
      where: { id: parseInt(id) },
      data: { name, description, price, category, isAvailable, imageUrl },
    });
    res.json(updatedMenuItem);
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ error: 'Error updating menu item' });
  }
});

// New DELETE route for menu items
app.delete('/v1/admin/menu/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const deletedMenuItem = await prisma.menuItem.delete({
      where: { id: parseInt(id) },
    });
    res.json({ message: 'Menu item deleted successfully', deletedMenuItem });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    if (error.code === 'P2025') {
      // This error code indicates that the record was not found
      res.status(404).json({ error: 'Menu item not found' });
    } else {
      res.status(500).json({ error: 'Error deleting menu item' });
    }
  }
});

// Order routes
app.post('/v1/orders', [
  body('items').isArray().withMessage('Items must be an array'),
  body('items.*.menuItemId').isInt().withMessage('Invalid menu item ID'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('total').isFloat({ min: 0 }).withMessage('Total must be a positive number'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { items, total } = req.body;
  const userId = req.user?.userId; // This will be undefined for unregistered users
  console.log("STARTING ORDER CREATION");

  try {
    // Start a transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Create the order
      const newOrder = await prisma.order.create({
        data: {
          userId, // This will be null for unregistered users
          total,
          status: 'PENDING', // Add a status field to your Order model if not already present
          items: {
            create: items.map(item => ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              price: item.price
            }))
          }
        },
        include: { items: true }
      });

      let pointsEarned = 0;
      if (userId) {
        // Calculate loyalty points only for registered users
        pointsEarned = Math.floor(total);
        await prisma.loyaltyPoints.upsert({
          where: { userId },
          update: { points: { increment: pointsEarned } },
          create: { userId, points: pointsEarned },
        });
      }

      return { order: newOrder, pointsEarned };
    });

    const responseMessage = userId
      ? `Order created successfully. You will earn ${result.pointsEarned} loyalty points after payment!`
      : 'Order created successfully. Complete the payment to confirm your order.';

    console.log('Order creation completed. Response:', JSON.stringify({
      order: result.order,
      message: responseMessage
    }, null, 2));

    res.status(201).json({
      order: result.order,
      message: responseMessage
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Error creating order' });
  }
});

app.post('/v1/orders/:orderId/confirm-payment', async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  try {
    const order = await prisma.order.findUnique({ where: { id: parseInt(orderId) } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (status === 'PAID') {
      await prisma.$transaction(async (prisma) => {
        // Update order status
        await prisma.order.update({
          where: { id: parseInt(orderId) },
          data: { status: 'PAID' }
        });

        // Confirm loyalty points if it's a registered user
        if (order.userId) {
          const pointsEarned = Math.floor(order.total);
          await prisma.loyaltyPoints.upsert({
            where: { userId: order.userId },
            update: { points: { increment: pointsEarned } },
            create: { userId: order.userId, points: pointsEarned },
          });
        }
      });

      res.json({ message: 'Payment confirmed and order updated successfully' });
    } else {
      // Handle failed payment
      await prisma.order.update({
        where: { id: parseInt(orderId) },
        data: { status: 'PAYMENT_FAILED' }
      });
      res.status(400).json({ error: 'Payment failed' });
    }
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: 'Error confirming payment' });
  }
});

app.get('/v1/users/:userId/orders', authenticateToken, async (req, res) => {
  const { userId } = req.params;

  // Check if the user is authorized to view these orders
  if (parseInt(userId) !== req.user.userId && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Not authorized to view these orders' });
  }

  try {
    const orders = await prisma.order.findMany({
      where: { userId: parseInt(userId) },
      include: {
        items: {
          include: { menuItem: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(orders);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ error: 'Error fetching user orders' });
  }
});

app.get('/v1/users/profile', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { loyaltyPoints: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      loyaltyPoints: user.loyaltyPoints?.points || 0
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Error fetching user profile' });
  }
});

async function getSumupAccessToken() {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.SUMUP_CLIENT_ID,
      client_secret: process.env.SUMUP_CLIENT_SECRET
    }).toString();

    const options = {
      hostname: 'api.sumup.com',
      port: 443,
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const responseData = JSON.parse(data);
          if (res.statusCode === 200 && responseData.access_token) {
            resolve(responseData.access_token);
            console.log('SumUp access token:', responseData);
          } else {
            reject(new Error(`Failed to get access token: ${data}`));
          }
        } catch (error) {
          reject(new Error(`Error parsing SumUp response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Error making request to SumUp: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
}

app.post('/v1/initiate-checkout', async (req, res) => {
  const { orderId } = req.body;

  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      include: { items: true }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get the SumUp access token
    const accessToken = await getSumupAccessToken();

    const checkoutData = JSON.stringify({
      checkout_reference: `ORDER-${order.id}`,
      amount: order.total,
      currency: 'EUR',
      pay_to_email: process.env.SUMUP_MERCHANT_EMAIL,
      description: `Order #${order.id}`,
      merchant_code: process.env.SUMUP_MERCHANT_CODE
    });

    const options = {
      hostname: 'api.sumup.com',
      path: '/v0.1/checkouts',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(checkoutData)
      }
    };

    const sumupRequest = https.request(options, (sumupResponse) => {
      let data = '';
      sumupResponse.on('data', (chunk) => {
        data += chunk;
      });
      sumupResponse.on('end', async () => {
        try {
          const responseData = JSON.parse(data);
          console.log('SumUp API Response:', responseData);

          if (responseData.id) {
            // Update the order with the SumUp checkout ID
            const updatedOrder = await prisma.order.update({
              where: { id: order.id },
              data: { sumupCheckoutId: responseData.id }
            });

            res.json({
              orderId: updatedOrder.id,
              checkoutId: responseData.id
            });
          } else {
            throw new Error(`SumUp API error: ${JSON.stringify(responseData)}`);
          }
        } catch (error) {
          console.error('Error processing SumUp response:', error);
          res.status(500).json({ error: 'Error processing payment provider response', details: error.message });
        }
      });
    });

    sumupRequest.on('error', (error) => {
      console.error('Error initiating checkout:', error);
      res.status(500).json({ error: 'Error initiating checkout', details: error.message });
    });

    sumupRequest.write(checkoutData);
    sumupRequest.end();

  } catch (error) {
    console.error('Error initiating checkout:', error);
    res.status(500).json({ error: 'Error initiating checkout', details: error.message });
  }
});


// Server initialization
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
