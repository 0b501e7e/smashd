const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const { body, validationResult } = require('express-validator');
const https = require('https');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('./services/loyaltyCron.js'); // Added to initialize the loyalty points expiration cron job

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors({
  origin: '*',  // Allow requests from any origin
  credentials: true
}));
app.use(express.json());

// Serve static files from public folder
// NEW SETUP FOR STATIC FILE SERVING:
// Serve newly uploaded menu item images from their specific storage path
app.use('/menu-items', express.static(path.join('public', 'images', 'menu-items')));

// Serve other images that might have URLs starting with /images (e.g. older items, general images)
// This handles existing imageUrls like /images/elpollo.jpeg
app.use('/images', express.static(path.join('public', 'images')));

// General static serving from the 'public' directory for other assets (e.g. favicon.ico, etc.)
// This should come AFTER specific image routes.
// If some very old imageUrls are just '/somefile.jpg' and exist in 'public/somefile.jpg', this would handle it.
app.use(express.static('public'));

// Multer setup for image uploads
const menuImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'public/images/menu-items';
    // Create directory if it doesn't exist
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Ensure unique filenames: fieldname-timestamp.extension
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const imageFileFilter = (req, file, cb) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
    req.fileValidationError = 'Only image files (jpg, jpeg, png, gif) are allowed!';
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

const uploadMenuItemImage = multer({ storage: menuImageStorage, fileFilter: imageFileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // Limit file size to 5MB

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('JWT Verification Error:', err);
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};

// Admin middleware
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') return res.sendStatus(403);
  next();
};

// Health check route
app.get('/', (req, res) => {
  res.json({ status: 'Backend is running', timestamp: new Date().toISOString() });
});

app.get('/v1/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString() 
    });
  }
});

// Authentication routes
app.post('/v1/auth/register', [
  body('email').trim().isEmail().normalizeEmail().withMessage('Must be a valid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
  body('dateOfBirth').isISO8601().withMessage('Date of birth must be a valid date'),
  body('address').trim().isLength({ min: 5 }).withMessage('Address must be at least 5 characters long'),
  body('phoneNumber').trim().isMobilePhone().withMessage('Phone number must be valid'),
  body('acceptedTerms').isBoolean().custom(value => {
    if (!value) {
      throw new Error('You must accept the terms and conditions');
    }
    return true;
  }),
], async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, name, dateOfBirth, address, phoneNumber, acceptedTerms } = req.body;
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
        email: email.toLowerCase(), // Store email in lowercase
        password: hashedPassword,
        name,
        dateOfBirth: new Date(dateOfBirth),
        address,
        phoneNumber,
        acceptedTerms
      },
    });

    // Create initial loyalty points record for the user
    await prisma.loyaltyPoints.create({
      data: {
        userId: user.id,
        points: 0
      }
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
      res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
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

// New endpoint to fetch customization options
app.get('/v1/menu/customizations', async (req, res) => {
  console.log('Received request for customization options');
  try {
    const categoriesWithWithOptions = await prisma.customizationCategory.findMany({
      include: {
        options: { // Include the related options for each category
          orderBy: {
             name: 'asc' // Optional: sort options alphabetically
          }
        },
      },
      orderBy: {
        name: 'asc' // Optional: sort categories alphabetically (or define custom order)
      }
    });
    console.log('Sending customization options:', categoriesWithWithOptions);
    res.json(categoriesWithWithOptions);
  } catch (error) {
    console.error('Error fetching customization options:', error);
    res.status(500).json({ error: 'Error fetching customization options' });
  }
});

// New endpoint to fetch customization options for a specific menu item
app.get('/v1/menu-items/:itemId/customizations', async (req, res) => {
  const { itemId } = req.params;
  console.log(`Received request for customizations for menu item ID: ${itemId}`);

  try {
    const menuItemIdInt = parseInt(itemId);
    if (isNaN(menuItemIdInt)) {
      return res.status(400).json({ error: 'Invalid menu item ID' });
    }

    // Find all customization categories linked to this menu item
    const menuItemWithCategories = await prisma.menuItem.findUnique({
      where: { id: menuItemIdInt },
      include: {
        customizationCategories: { // The join table records
          include: {
            category: { // The actual CustomizationCategory
              include: {
                options: true, // And its CustomizationOptions
              },
            },
          },
        },
      },
    });

    if (!menuItemWithCategories) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const formattedCustomizations = {};

    menuItemWithCategories.customizationCategories.forEach(mc => {
      const category = mc.category;
      const categoryKey = category.name.toLowerCase().replace(/\s+/g, '_'); // e.g., "Extras" -> "extras"
      
      formattedCustomizations[categoryKey] = category.options.map(option => ({
        id: option.id.toString(), // Convert ID to string as frontend might expect string IDs
        name: option.name,
        price: option.price,
      }));
    });

    console.log('Sending formatted customizations:', formattedCustomizations);
    res.json(formattedCustomizations);

  } catch (error) {
    console.error(`Error fetching customizations for menu item ${itemId}:`, error);
    res.status(500).json({ error: 'Error fetching customizations' });
  }
});

// New endpoint to fetch a single menu item by ID
app.get('/v1/menu/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`Received request for menu item with ID: ${id}`);
  
  try {
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        category: true,
        imageUrl: true
      }
    });
    
    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    res.json(menuItem);
  } catch (error) {
    console.error(`Error fetching menu item with ID ${id}:`, error);
    res.status(500).json({ error: 'Error fetching menu item' });
  }
});

// ADMIN ENDPOINT TO GET ALL MENU ITEMS (INCLUDING UNAVAILABLE ONES)
app.get('/v1/admin/menu/all', authenticateToken, isAdmin, async (req, res) => {
  console.log('Received request for all admin menu items');
  try {
    const menuItems = await prisma.menuItem.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }], // Optional: Sort by category then name
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        category: true,
        imageUrl: true,
        isAvailable: true // Crucially, include the availability status
      }
    });
    res.json(menuItems);
  } catch (error) {
    console.error('Error fetching all admin menu items:', error);
    res.status(500).json({ error: 'Error fetching all admin menu items' });
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

// PATCH /v1/admin/menu/:id/availability - Update only the availability of a menu item
app.patch('/v1/admin/menu/:id/availability', authenticateToken, isAdmin, [
  body('isAvailable').isBoolean().withMessage('isAvailable must be a boolean and is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { isAvailable } = req.body;

  try {
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: parseInt(id) },
    });

    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const updatedMenuItem = await prisma.menuItem.update({
      where: { id: parseInt(id) },
      data: { isAvailable },
    });
    res.json(updatedMenuItem);
  } catch (error) {
    console.error(`Error updating availability for menu item ${id}:`, error);
    // Check for specific Prisma errors if needed, e.g., record not found during update P2025
    if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Menu item not found during update.' });
    }
    res.status(500).json({ error: 'Error updating menu item availability' });
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
app.post('/v1/orders', authenticateToken, [
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
          status: 'AWAITING_PAYMENT', // Set initial status to AWAITING_PAYMENT
          items: {
            create: items.map(item => ({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              price: item.price,
              customizations: item.customizations ? JSON.stringify(item.customizations) : null
            }))
          }
        },
        include: { items: true }
      });

      // Loyalty points are now handled after payment confirmation, so this block is removed.
      // let pointsEarned = 0;
      // if (userId) {
      //   // Calculate loyalty points only for registered users
      //   pointsEarned = Math.floor(total);
      //   await prisma.loyaltyPoints.upsert({
      //     where: { userId },
      //     update: { points: { increment: pointsEarned } },
      //     create: { userId, points: pointsEarned },
      //   });
      // }

      return { order: newOrder }; // Return only the order, pointsEarned is no longer relevant here
    });

    const responseMessage = userId
      ? `Order created successfully. Complete payment to earn loyalty points!`
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

/*
// This endpoint is being removed as payment confirmation is now handled by /verify-payment after SumUp verification.
app.post('/v1/orders/:orderId/confirm-payment', async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  try {
    const order = await prisma.order.findUnique({ where: { id: parseInt(orderId) } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if payment has been completed
    if (status === 'PAID') { // This status is now PAYMENT_CONFIRMED
      const confirmedOrder = await prisma.$transaction(async (tx) => {
        const updatedOrder = await tx.order.update({
          where: { id: parseInt(orderId) },
          data: { status: 'PAYMENT_CONFIRMED' } // Was 'PAID'
        });

        if (updatedOrder.userId) {
          // Logic for loyalty points, which is also present in /verify-payment
        }
        return updatedOrder;
      });

      if (confirmedOrder) {
        console.log(`Placeholder: Notify admin panel for order ${confirmedOrder.id}`);
        console.log(`Placeholder: Notify kitchen for order ${confirmedOrder.id}`);
      }
      res.json({ message: 'Payment confirmed and order updated successfully' });
    } else {
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
*/

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
      email: user.email,
      role: user.role,
      loyaltyPoints: user.loyaltyPoints?.points || 0
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Error fetching user profile' });
  }
});

// Get user's last order endpoint
app.get('/v1/users/:userId/last-order', authenticateToken, async (req, res) => {
  const { userId } = req.params;

  // Check if the user is authorized to view this order
  if (parseInt(userId) !== req.user.userId && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Not authorized to view this order' });
  }

  try {
    const lastOrder = await prisma.order.findFirst({
      where: {
        userId: parseInt(userId),
        status: { in: ['PAYMENT_CONFIRMED', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'] } // Only consider paid orders for repeat functionality
      },
      include: {
        items: {
          include: { menuItem: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!lastOrder) {
      return res.status(404).json({ error: 'No previous orders found' });
    }

    res.json(lastOrder);
  } catch (error) {
    console.error('Error fetching last order:', error);
    res.status(500).json({ error: 'Error fetching last order' });
  }
});

// Repeat order endpoint
app.post('/v1/orders/repeat', authenticateToken, async (req, res) => {
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  try {
    const originalOrder = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      include: {
        items: {
          include: { menuItem: true }
        }
      }
    });

    if (!originalOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if the user is authorized to repeat this order
    if (originalOrder.userId !== req.user.userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized to repeat this order' });
    }

    // Check if all menu items are still available and return the items for cart addition
    const availableItems = [];
    const unavailableItems = [];

    for (const orderItem of originalOrder.items) {
      if (orderItem.menuItem.isAvailable) {
        availableItems.push({
          id: orderItem.menuItemId,
          name: orderItem.menuItem.name,
          price: orderItem.menuItem.price, // Use current price, not historical price
          quantity: orderItem.quantity,
          customizations: orderItem.customizations ? JSON.parse(orderItem.customizations) : null
        });
      } else {
        unavailableItems.push(orderItem.menuItem.name);
      }
    }

    let message = 'Order items ready to be added to cart';
    if (unavailableItems.length > 0) {
      message = `Some items are no longer available: ${unavailableItems.join(', ')}. Available items ready to be added to cart.`;
    }

    res.json({
      items: availableItems,
      message,
      unavailableItems
    });
  } catch (error) {
    console.error('Error repeating order:', error);
    res.status(500).json({ error: 'Error repeating order' });
  }
});

// Helper for making HTTP requests to SumUp
function makeHttpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const responseData = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(responseData);
          } else {
            reject(new Error(`SumUp API error: ${JSON.stringify(responseData)}`));
          }
        } catch (error) {
          reject(new Error(`Error parsing response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Request error: ${error.message}`));
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function getSumupAccessToken() {
  const postData = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.SUMUP_CLIENT_ID,
    client_secret: process.env.SUMUP_CLIENT_SECRET
  }).toString();

  const options = {
    hostname: 'api.sumup.com',
    path: '/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    }
  };

  try {
    const responseData = await makeHttpRequest(options, postData);
    if (responseData.access_token) {
      return responseData.access_token;
    } else {
      throw new Error(`Failed to get access token: ${JSON.stringify(responseData)}`);
    }
  } catch (error) {
    console.error('Error getting SumUp access token:', error);
    throw error;
  }
}

// Initiate checkout endpoint
app.post('/v1/initiate-checkout', async (req, res) => {
  const { orderId, redirectUrl } = req.body;
  console.log(`Initiating checkout for order: ${orderId}`);

  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  try {
    // Add request locking to prevent duplicate calls
    const lockKey = `checkout:lock:${orderId}`;
    
    // Check if there's an existing ongoing checkout process for this order
    if (global[lockKey]) {
      console.log(`Checkout already in progress for order ${orderId}`);
      return res.status(409).json({ 
        error: 'Checkout already in progress for this order',
        status: 'PENDING'
      });
    }
    
    // Set lock
    global[lockKey] = true;
    
    try {
      const order = await prisma.order.findUnique({
        where: { id: parseInt(orderId) },
        include: { 
          items: {
            include: { menuItem: true }
          }
        }
      });

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Check if this order already has a SumUp checkout ID
      if (order.sumupCheckoutId) {
        console.log(`Order ${orderId} already has checkout ID: ${order.sumupCheckoutId}`);
        
        // Get checkout details to return the checkout URL
        try {
          const accessToken = await getSumupAccessToken();
          const options = {
            hostname: 'api.sumup.com',
            path: `/v0.1/checkouts/${order.sumupCheckoutId}`,
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          };
          
          const checkoutDetails = await makeHttpRequest(options);
          
          return res.json({
            orderId: order.id,
            checkoutId: order.sumupCheckoutId,
            checkoutUrl: checkoutDetails.hosted_checkout_url || `https://checkout.sumup.com/pay/${order.sumupCheckoutId}`
          });
        } catch (checkoutError) {
          console.error('Error fetching existing checkout details:', checkoutError);
          // Continue with creating a new checkout if we couldn't get details for the existing one
        }
      }

      // Check if SumUp credentials are configured
      if (!process.env.SUMUP_CLIENT_ID || 
          !process.env.SUMUP_CLIENT_SECRET || 
          !process.env.SUMUP_MERCHANT_EMAIL) {
        
        console.error('Missing SumUp credentials - these are required for payment processing');
        return res.status(500).json({ error: 'SumUp credentials not configured' });
      }

      // Get the SumUp access token
      const accessToken = await getSumupAccessToken();

      // Create a unique reference by adding a timestamp and a random string
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const uniqueReference = `ORDER-${order.id}-${timestamp}-${randomStr}`;
      console.log(`Creating checkout with reference: ${uniqueReference}`);
      
      // Define the redirect URL
      const frontendBaseUrl = process.env.FRONTEND_URL || 'https://example.com'; // Use dummy URL for mobile
      // Test: Remove query param for now
      const redirectUrl = `${frontendBaseUrl}/order-confirmation`;
      console.log(`Setting redirect URL (test): ${redirectUrl}`);

      // Prepare checkout data
      const checkoutData = JSON.stringify({
        checkout_reference: uniqueReference,
        amount: order.total,
        currency: 'EUR',
        pay_to_email: process.env.SUMUP_MERCHANT_EMAIL,
        description: `Order #${order.id}`,
        // Enable hosted checkout
        hosted_checkout: { enabled: true },
        // Set the simplified redirect URL
        redirect_url: redirectUrl,
        // Add custom fields for order details - ensure we don't exceed SumUp's limit
        custom_fields: {
          order_id: order.id.toString()
        }
      });

      console.log('Checkout request data:', checkoutData);

      const options = {
        hostname: 'api.sumup.com',
        path: '/v0.1/checkouts',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      };

      try {
        const responseData = await makeHttpRequest(options, checkoutData);
        console.log('SumUp API Response:', responseData);

        // Update the order with the SumUp checkout ID
        const updatedOrder = await prisma.order.update({
          where: { id: order.id },
          data: { sumupCheckoutId: responseData.id }
        });

        res.json({
          orderId: updatedOrder.id,
          checkoutId: responseData.id,
          checkoutUrl: responseData.hosted_checkout_url
        });
      } catch (apiError) {
        // Handle the specific case of duplicate checkout
        const errorMessage = apiError.message || '';
        console.log(`API error message: ${errorMessage}`);
        
        if (errorMessage.includes('DUPLICATED_CHECKOUT')) {
          console.log('Handling duplicate checkout error');
          
          // Extract the existing checkout ID if available in the error message
          let existingCheckoutId = null;
          try {
            // Attempt to extract an ID from the error if possible
            const jsonMatch = errorMessage.match(/{.*}/);
            if (jsonMatch) {
              const errorObj = JSON.parse(jsonMatch[0]);
              
              // Try to find any indication of an ID in the error, may vary by API
              existingCheckoutId = errorObj.id || errorObj.checkout_id;
            }
          } catch (parseError) {
            console.error('Error parsing API error for checkout ID:', parseError);
          }
          
          // If we couldn't extract the ID, make a request to find existing checkouts
          if (!existingCheckoutId) {
            try {
              // Try to find the existing checkout by making an API call
              const listOptions = {
                hostname: 'api.sumup.com',
                path: '/v0.1/checkouts?limit=10',
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                }
              };
              
              const listResponse = await makeHttpRequest(listOptions);
              console.log('Available checkouts:', listResponse);
              
              // Look for a checkout with a reference that matches this order
              const matchingCheckout = listResponse.items?.find(checkout => 
                checkout.checkout_reference.includes(`ORDER-${order.id}`)
              );
              
              if (matchingCheckout) {
                existingCheckoutId = matchingCheckout.id;
                console.log(`Found existing checkout: ${existingCheckoutId}`);
              }
            } catch (listError) {
              console.error('Error listing existing checkouts:', listError);
            }
          }
          
          // If we found an existing checkout ID, use it
          if (existingCheckoutId) {
            // Update our order with this checkout ID
            const updatedOrder = await prisma.order.update({
              where: { id: order.id },
              data: { sumupCheckoutId: existingCheckoutId }
            });
            
            return res.json({
              orderId: updatedOrder.id,
              checkoutId: existingCheckoutId,
              checkoutUrl: `https://checkout.sumup.com/pay/${existingCheckoutId}`
            });
          }
          
          // If we couldn't find the existing checkout, try with a more unique reference
          const superUniqueRef = `ORDER-${order.id}-${timestamp}-${randomStr}-retry`;
          console.log(`Retrying with super unique reference: ${superUniqueRef}`);
          
          // Retry with the new super unique reference
          const retryData = JSON.stringify({
            checkout_reference: superUniqueRef,
            amount: order.total,
            currency: 'EUR',
            pay_to_email: process.env.SUMUP_MERCHANT_EMAIL,
            description: `Order #${order.id}`,
            hosted_checkout: { enabled: true },
            redirect_url: redirectUrl,
            custom_fields: {
              order_id: order.id.toString()
            }
          });
          
          console.log('Retry data:', retryData);
          
          const retryResponse = await makeHttpRequest(options, retryData);
          console.log('Retry successful:', retryResponse);
          
          const updatedOrder = await prisma.order.update({
            where: { id: order.id },
            data: { sumupCheckoutId: retryResponse.id }
          });
          
          return res.json({
            orderId: updatedOrder.id,
            checkoutId: retryResponse.id,
            checkoutUrl: retryResponse.hosted_checkout_url
          });
        }
        
        // If it's not a duplicate checkout error or we couldn't recover, rethrow
        throw apiError;
      } 
    } finally {
      // Always release the lock
      global[lockKey] = false;
    }
  } catch (error) {
    console.error('Error initiating checkout:', error);
    res.status(500).json({ error: 'Error initiating checkout', details: error.message });
  }
});

// 2. Order status polling endpoint for mobile app
app.get('/v1/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  
  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        status: true,
        readyAt: true,
        estimatedReadyTime: true,
        sumupCheckoutId: true,
        total: true,
        createdAt: true,
        items: {
          select: {
            id: true,
            menuItemId: true,
            quantity: true,
            price: true,
            customizations: true,
            menuItem: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Transform the items to include the menu item name
    const transformedOrder = {
      ...order,
      items: order.items.map(item => ({
        id: item.id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: item.price,
        name: item.menuItem?.name || `Item #${item.menuItemId}`,
        customizations: item.customizations ? JSON.parse(item.customizations) : {}
      }))
    };
    
    res.json(transformedOrder);
  } catch (error) {
    console.error('Error fetching order status:', error);
    res.status(500).json({ error: 'Error fetching order status' });
  }
});

// 3. Business estimate time endpoint (for manual updates from business if needed)
app.post('/v1/orders/:id/estimate', async (req, res) => {
  const { id } = req.params;
  const { estimatedMinutes } = req.body;
  
  if (!estimatedMinutes || typeof estimatedMinutes !== 'number') {
    return res.status(400).json({ error: 'Valid estimatedMinutes required' });
  }
  
  try {
    const estimatedReadyTime = new Date(Date.now() + (estimatedMinutes * 60000));
    
    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(id) },
      data: { 
        estimatedReadyTime,
        // Only update status if it's still pending
        status: { set: 'CONFIRMED' }
      }
    });
    
    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order estimate:', error);
    res.status(500).json({ error: 'Error updating order estimate' });
  }
});

// New endpoint to verify payment status with SumUp and update order
app.post('/v1/orders/:orderId/verify-payment', authenticateToken, async (req, res) => {
  const { orderId } = req.params;
  const authenticatedUserId = req.user.userId;

  try {
    // 1. Find the order in the database
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Security Check: Ensure the user requesting verification owns the order
    if (order.userId !== authenticatedUserId) {
        return res.status(403).json({ error: 'Not authorized to verify this order' });
    }

    // 2. Check if order requires verification (e.g., is AWAITING_PAYMENT and has a sumupCheckoutId)
    if (!order.sumupCheckoutId || order.status !== 'AWAITING_PAYMENT') {
       console.log(`Order ${orderId} status is ${order.status}, no verification needed or possible.`);
       return res.json(order); // Return current order status
    }

    // 3. Get SumUp Access Token
    const accessToken = await getSumupAccessToken();

    // 4. Query SumUp API for checkout status
    const options = {
      hostname: 'api.sumup.com',
      path: `/v0.1/checkouts/${order.sumupCheckoutId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    console.log(`Verifying SumUp status for checkout ID: ${order.sumupCheckoutId} (Order ID: ${orderId})`);
    const checkoutDetails = await makeHttpRequest(options);
    console.log(`SumUp status for checkout ${order.sumupCheckoutId}: ${checkoutDetails.status}`);

    // 5. Update DB based on SumUp status
    let updatedOrder = order;
    if (checkoutDetails.status === 'PAID') {
      console.log(`Payment confirmed by SumUp for order ${orderId}. Updating DB.`);
      
      // Use transaction to update order and potentially loyalty points
      updatedOrder = await prisma.$transaction(async (tx) => { // Renamed prisma to tx
        const newlyUpdatedOrder = await tx.order.update({
          where: { id: parseInt(orderId) },
          data: { status: 'PAYMENT_CONFIRMED' }
        });

        // Award loyalty points if it's a registered user and points haven't been awarded for this order yet
        if (newlyUpdatedOrder.userId) {
          const existingTransaction = await tx.pointsTransaction.findFirst({
            where: {
              orderId: newlyUpdatedOrder.id,
              reason: "ORDER_EARNED",
            },
          });

          if (!existingTransaction) {
            const pointsEarned = Math.floor(newlyUpdatedOrder.total);

            const loyaltyAccount = await tx.loyaltyPoints.upsert({
              where: { userId: newlyUpdatedOrder.userId },
              update: {
                points: { increment: pointsEarned },
                totalSpentThisYear: { increment: newlyUpdatedOrder.total },
              },
              create: {
                userId: newlyUpdatedOrder.userId,
                points: pointsEarned,
                totalSpentThisYear: newlyUpdatedOrder.total,
              },
            });

            await tx.pointsTransaction.create({
              data: {
                userId: newlyUpdatedOrder.userId,
                loyaltyPointsId: loyaltyAccount.id,
                points: pointsEarned,
                reason: "ORDER_EARNED",
                orderId: newlyUpdatedOrder.id,
                details: `Points earned for order #${newlyUpdatedOrder.id} (verified via SumUp)`,
              },
            });
            console.log(`Awarded ${pointsEarned} loyalty points to user ${newlyUpdatedOrder.userId} for order ${newlyUpdatedOrder.id} after SumUp verification.`);
          } else {
            console.log(`Loyalty points already awarded for order ${newlyUpdatedOrder.id} (checked during SumUp verification). Skipping.`);
          }
        }

        // Fulfillment actions after successful payment and loyalty points update:
        // TODO: Implement notifyAdminPanel(newlyUpdatedOrder) - Send order details to admin panel
        console.log(`Placeholder: Notify admin panel for order ${newlyUpdatedOrder.id}`);
        
        // TODO: Implement notifyKitchen(newlyUpdatedOrder) - Send order to kitchen/fulfillment
        console.log(`Placeholder: Notify kitchen for order ${newlyUpdatedOrder.id}`);

        return newlyUpdatedOrder;
      });
       console.log(`Order ${orderId} status updated to PAYMENT_CONFIRMED in DB.`);
    } else {
       // If SumUp status is ANYTHING other than PAID (e.g., PENDING, FAILED, EXPIRED, etc.)
       // We update our local status to reflect the payment wasn't successful.
       // Check if the current status is AWAITING_PAYMENT before changing it to PAYMENT_FAILED
       if (order.status === 'AWAITING_PAYMENT') {
        console.log(`Payment not confirmed by SumUp (status: ${checkoutDetails.status}) for order ${orderId}. Updating DB to PAYMENT_FAILED.`);
        updatedOrder = await prisma.order.update({
            where: { id: parseInt(orderId) },
            data: { status: 'PAYMENT_FAILED' } // Consistently use PAYMENT_FAILED for non-PAID statuses
        });
        console.log(`Order ${orderId} status updated to PAYMENT_FAILED in DB.`);
       } else {
        console.log(`Payment not confirmed by SumUp (status: ${checkoutDetails.status}) for order ${orderId}, but status is ${order.status} (not AWAITING_PAYMENT). No status change.`);
        updatedOrder = order; // Keep current status if it's not AWAITING_PAYMENT
       }
    }

    // 6. Re-fetch the complete order details to return to the frontend
    const finalOrderDetails = await prisma.order.findUnique({
        where: { id: parseInt(orderId) },
        include: {
            items: { // Include the items and their related menu item name
                include: {
                    menuItem: {
                        select: { name: true }
                    }
                }
            }
        }
    });

    if (!finalOrderDetails) {
        // Should not happen if we found it earlier, but good practice
        console.error(`Could not re-fetch order ${orderId} after update.`);
        return res.status(500).json({ error: 'Failed to retrieve final order details.'});
    }

    // 7. Return the latest FULL order status and details
    res.json(finalOrderDetails);

  } catch (error) {
    console.error(`Error verifying payment for order ${orderId}:`, error);
    // Distinguish between SumUp API errors and other errors
    if (error.message.includes('SumUp API error')) {
        res.status(502).json({ error: 'Failed to check payment status with provider', details: error.message });
    } else {
        res.status(500).json({ error: 'Error verifying payment', details: error.message });
    }
  }
});

// Endpoint to get checkout status directly from SumUp API
// This can likely be removed or kept for admin/debugging purposes
app.get('/v1/checkouts/:checkoutId/status', async (req, res) => {
  const { checkoutId } = req.params;
  
  try {
    // Get SumUp access token
    const accessToken = await getSumupAccessToken();
    
    // Set up request options for SumUp API
    const options = {
      hostname: 'api.sumup.com',
      path: `/v0.1/checkouts/${checkoutId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };
    
    console.log(`Checking status for SumUp checkout ID: ${checkoutId}`);
    
    // Make request to SumUp API
    const checkoutDetails = await makeHttpRequest(options);
    
    // Return checkout details with focus on payment status
    res.json({
      checkoutId: checkoutDetails.id,
      status: checkoutDetails.status,
      transaction_id: checkoutDetails.transaction_id,
      payment_type: checkoutDetails.payment_type,
      amount: checkoutDetails.amount
    });
  } catch (error) {
    console.error(`Error checking status for checkout ${checkoutId}:`, error);
    res.status(500).json({ error: 'Failed to check checkout status' });
  }
});

app.post('/v1/admin/sync-menu-to-sumup', authenticateToken, isAdmin, async (req, res) => {
  try {
    // Get SumUp access token
    const accessToken = await getSumupAccessToken();
    
    // Fetch all available menu items
    const menuItems = await prisma.menuItem.findMany({
      where: { isAvailable: true }
    });
    
    const results = [];
    
    // Process each menu item
    for (const item of menuItems) {
      const productData = {
        name: item.name,
        description: item.description,
        price: item.price.toString(), // SumUp expects string
        category: item.category
      };
      
      // If we already have a SumUp product ID, update it
      if (item.sumupProductId) {
        await makeHttpRequest({
          hostname: 'api.sumup.com',
          path: `/v0.1/me/products/${item.sumupProductId}`,
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }, JSON.stringify(productData));
        
        results.push({ id: item.id, action: 'updated' });
      } 
      // Otherwise create a new product
      else {
        const response = await makeHttpRequest({
          hostname: 'api.sumup.com',
          path: '/v0.1/me/products',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }, JSON.stringify(productData));
        
        // Store SumUp product ID in our database
        await prisma.menuItem.update({
          where: { id: item.id },
          data: { sumupProductId: response.id }
        });
        
        results.push({ id: item.id, action: 'created' });
      }
    }
    
    res.json({ success: true, results });
  } catch (error) {
    console.error('Error syncing menu to SumUp:', error);
    res.status(500).json({ error: 'Error syncing menu to SumUp' });
  }
});

// Add a test endpoint to manually update order status
app.post('/v1/test/update-order-status', async (req, res) => {
  try {
    const { orderId, status = 'PAID' } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Missing order ID' });
    }
    
    console.log(`Manually updating order ${orderId} to status: ${status}`);
    
    // Find the order first
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    console.log(`Current order status before manual update: ${order.status}`);
    
    // Update the order status
    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(orderId) },
      data: { status }
    });
    
    console.log(`Manually updated order ${orderId} status to ${status}`);
    
    res.json({
      success: true,
      message: `Order ${orderId} updated with status ${status}`,
      order: updatedOrder
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Error updating order status', details: error.message });
  }
});

// Add a test endpoint to check SumUp connection
app.get('/v1/test/sumup-connection', async (req, res) => {
  try {
    const accessToken = await getSumupAccessToken();
    res.json({ 
      success: true, 
      message: 'SumUp connection successful',
      token_prefix: accessToken.substring(0, 5) + '...'
    });
  } catch (error) {
    console.error('Error testing SumUp connection:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error connecting to SumUp',
      details: error.message
    });
  }
});

// Add a test endpoint to retrieve merchant profile
app.get('/v1/test/merchant-profile', async (req, res) => {
  try {
    // First get an access token
    const accessToken = await getSumupAccessToken();
    
    // Use the token to make a request to the merchant profile endpoint
    const options = {
      hostname: 'api.sumup.com',
      path: '/v0.1/me',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };

    const profileData = await makeHttpRequest(options);
    console.log('SumUp Merchant Profile:', profileData);
    
    // Extract the merchant code and email
    const merchantCode = profileData.merchant_profile?.merchant_code;
    const merchantEmail = profileData.personal_profile?.email;
    
    res.json({ 
      success: true,
      profile: profileData,
      merchant_code: merchantCode,
      merchant_email: merchantEmail,
      message: 'You should set these values in your environment variables'
    });
  } catch (error) {
    console.error('Error getting merchant profile:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error retrieving merchant profile',
      details: error.message
    });
  }
});

// Add a new endpoint to get the checkout URL for a SumUp checkout ID
app.get('/v1/checkout-url/:checkoutId', async (req, res) => {
  const { checkoutId } = req.params;
  
  if (!checkoutId) {
    return res.status(400).json({ error: 'Missing checkout ID' });
  }
  
  try {
    // Get the access token
    const accessToken = await getSumupAccessToken();
    
    // First, check if we've enabled hosted checkout when creating this checkout
    // If not, we'll need to update the checkout to enable it
    const options = {
      hostname: 'api.sumup.com',
      path: `/v0.1/checkouts/${checkoutId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };
    
    let checkoutData = await makeHttpRequest(options);
    console.log('Original checkout data:', checkoutData);
    
    // If hosted_checkout is not enabled, update it to enable hosted checkout
    if (!checkoutData.hosted_checkout || !checkoutData.hosted_checkout.enabled) {
      const updateOptions = {
        hostname: 'api.sumup.com',
        path: `/v0.1/checkouts/${checkoutId}`,
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      };
      
      const updateData = JSON.stringify({
        hosted_checkout: { enabled: true }
      });
      
      checkoutData = await makeHttpRequest(updateOptions, updateData);
      console.log('Updated checkout data:', checkoutData);
    }
    
    // Get the hosted checkout URL
    let checkoutUrl;
    
    if (checkoutData.hosted_checkout_url) {
      // If the response directly includes the URL, use it
      checkoutUrl = checkoutData.hosted_checkout_url;
    } else {
      // Otherwise, construct the standard hosted checkout URL
      checkoutUrl = `https://checkout.sumup.com/pay/${checkoutId}`;
    }
    
    console.log('Checkout URL:', checkoutUrl);
    
    res.json({
      checkoutId,
      checkoutUrl,
      checkoutData
    });
  } catch (error) {
    console.error('Error getting checkout URL:', error);
    res.status(500).json({ error: 'Failed to get checkout URL', details: error.message });
  }
});

// Add a test endpoint to check order status
app.get('/v1/test/check-order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    console.log(`Checking detailed status for order ${orderId}`);
    
    // Find the order with full details
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      include: { 
        items: {
          include: { menuItem: true }
        }
      }
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // If order has a checkout ID, check with SumUp for payment status
    if (order.sumupCheckoutId) {
      try {
        const accessToken = await getSumupAccessToken();
        const options = {
          hostname: 'api.sumup.com',
          path: `/v0.1/checkouts/${order.sumupCheckoutId}`,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        };

        const sumupStatus = await makeHttpRequest(options);
        
        res.json({
          order,
          sumup_status: sumupStatus
        });
      } catch (error) {
        console.error('Error checking SumUp status:', error);
        res.json({
          order,
          sumup_error: error.message
        });
      }
    } else {
      res.json({ order });
    }
  } catch (error) {
    console.error('Error checking order:', error);
    res.status(500).json({ error: 'Error checking order status', details: error.message });
  }
});

// Admin Order Management Routes

// GET /v1/admin/orders - Fetch orders for admin panel
app.get('/v1/admin/orders', authenticateToken, isAdmin, async (req, res) => {
  try {
    // Fetch orders that need admin attention, e.g., PAID status
    // You might want to add pagination here in the future
    const orders = await prisma.order.findMany({
      where: {
        // Fetch orders that are paid and awaiting admin action, or are already being processed.
        status: { in: ['PAYMENT_CONFIRMED', 'CONFIRMED', 'PREPARING', 'READY'] } 
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }, // Show newest orders first
    });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders for admin:', error);
    res.status(500).json({ error: 'Error fetching orders' });
  }
});

// POST /v1/admin/orders/:orderId/accept - Accept an order and set prep time
app.post('/v1/admin/orders/:orderId/accept', authenticateToken, isAdmin, [
  body('estimatedMinutes').isInt({ min: 1 }).withMessage('Valid estimatedMinutes (number) is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { orderId } = req.params;
  const { estimatedMinutes } = req.body;

  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Optional: Check if order is in a state that can be accepted (e.g., PAYMENT_CONFIRMED)
    if (order.status !== 'PAYMENT_CONFIRMED') {
        return res.status(400).json({ error: `Order in status ${order.status} cannot be accepted.` });
    }

    const estimatedReadyTime = new Date(Date.now() + (estimatedMinutes * 60000));

    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(orderId) },
      data: {
        estimatedReadyTime,
        status: 'CONFIRMED',
      },
    });
    res.json(updatedOrder);
  } catch (error) {
    console.error(`Error accepting order ${orderId}:`, error);
    res.status(500).json({ error: 'Error accepting order' });
  }
});

// POST /v1/admin/orders/:orderId/decline - Decline an order
app.post('/v1/admin/orders/:orderId/decline', authenticateToken, isAdmin, async (req, res) => {
  const { orderId } = req.params;

  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(orderId) }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Optional: Check if order is in a state that can be declined (e.g., PAYMENT_CONFIRMED)
    // Allow declining of CONFIRMED orders as well, in case of issues after acceptance.
    if (!['PAYMENT_CONFIRMED', 'CONFIRMED'].includes(order.status)) {
        return res.status(400).json({ error: `Order in status ${order.status} cannot be declined.` });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: parseInt(orderId) },
      data: { status: 'CANCELLED' }, // Or a new status like 'DECLINED_BY_RESTAURANT'
    });
    res.json(updatedOrder);
  } catch (error) {
    console.error(`Error declining order ${orderId}:`, error);
    res.status(500).json({ error: 'Error declining order' });
  }
});

// New Admin endpoint for uploading menu item images
app.post('/v1/admin/menu-items/upload-image', authenticateToken, isAdmin, uploadMenuItemImage.single('menuItemImage'), (req, res) => {
  if (req.fileValidationError) {
    return res.status(400).json({ error: req.fileValidationError });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded.' });
  }
  // The path in the database should be relative to the /images route served by the backend
  // Example: /menu-items/menuItemImage-162930283827.jpg
  const imageUrl = `/menu-items/${req.file.filename}`;
  res.json({ imageUrl: imageUrl });
});

// GET all customization categories (for admin to manage them)
app.get('/v1/admin/customization-categories', authenticateToken, isAdmin, async (req, res) => {
  try {
    const categories = await prisma.customizationCategory.findMany({
      include: {
        options: {
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching customization categories for admin:', error);
    res.status(500).json({ error: 'Failed to fetch customization categories' });
  }
});

// POST to create a new customization category
app.post('/v1/admin/customization-categories', authenticateToken, isAdmin, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('options').isArray().withMessage('Options must be an array'),
  body('options.*.name').isString().withMessage('Option name must be a string'),
  body('options.*.price').isFloat({ min: 0 }).withMessage('Option price must be a positive number'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, options } = req.body;
  try {
    const category = await prisma.customizationCategory.create({
      data: {
        name,
        options: {
          create: options.map(option => ({
            name: option.name,
            price: option.price
          }))
        }
      }
    });
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating customization category:', error);
    res.status(500).json({ error: 'Error creating customization category' });
  }
});

// New Endpoints for Direct Menu Item to Customization Option Linking (Admin)

// GET all customization options (for admin to select from)
app.get('/v1/admin/customization-options', authenticateToken, isAdmin, async (req, res) => {
  try {
    const options = await prisma.customizationOption.findMany({
      include: {
        category: { // Include category for context (e.g., display grouping)
          select: { name: true, id: true }
        }
      },
      orderBy: [
        { category: { name: 'asc' } }, // Order by category name first
        { name: 'asc' }                 // Then by option name
      ]
    });
    res.json(options);
  } catch (error) {
    console.error('Error fetching all customization options for admin:', error);
    res.status(500).json({ error: 'Failed to fetch all customization options' });
  }
});

// GET linked customization option IDs for a specific menu item
app.get('/v1/admin/menu-items/:menuItemId/linked-customization-options', authenticateToken, isAdmin, async (req, res) => {
  const { menuItemId } = req.params;
  try {
    const itemId = parseInt(menuItemId);
    if (isNaN(itemId)) {
      return res.status(400).json({ error: 'Invalid menu item ID' });
    }

    console.log('Attempting to access prisma.menuItemCustomizationOption');
    console.log('Is prisma.menuItemCustomizationOption defined?', !!prisma.menuItemCustomizationOption);
    if (!prisma.menuItemCustomizationOption) {
      console.log('Available keys on prisma:', Object.keys(prisma));
      // Log a few levels deep for properties that might be objects themselves
      for (const key of Object.keys(prisma)) {
        if (typeof prisma[key] === 'object' && prisma[key] !== null) {
          // console.log(`Keys under prisma.${key}:`, Object.keys(prisma[key]));
        }
      }
    }

    // This is the critical line. 'prisma.menuItemCustomizationOption' must be valid.
    const links = await prisma.menuItemCustomizationOption.findMany({
      where: { menuItemId: itemId },
      select: { customizationOptionId: true }
    });
    res.json(links.map(link => link.customizationOptionId));
  } catch (error) {
    console.error(`Error fetching linked customization options for menu item ${menuItemId}:`, error);
    // Log the full error for more details if it's not the 'findMany' issue
    console.error(error); 
    res.status(500).json({ error: 'Failed to fetch linked customization options', details: error.message });
  }
});

// POST to set/update linked customization options for a menu item
app.post('/v1/admin/menu-items/:menuItemId/linked-customization-options', authenticateToken, isAdmin, [
  body('optionIds').isArray().withMessage('optionIds must be an array'),
  body('optionIds.*').isInt().withMessage('Each optionId must be an integer'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { menuItemId } = req.params;
  const { optionIds } = req.body; // This is the full list of desired linked option IDs

  try {
    const itemId = parseInt(menuItemId);
    if (isNaN(itemId)) {
      return res.status(400).json({ error: 'Invalid menu item ID' });
    }

    // Use a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // 1. Delete all existing direct links for this menu item
      await tx.menuItemCustomizationOption.deleteMany({
        where: { menuItemId: itemId }
      });

      // 2. Create new links if optionIds is not empty
      if (optionIds && optionIds.length > 0) {
        await tx.menuItemCustomizationOption.createMany({
          data: optionIds.map(optId => ({
            menuItemId: itemId,
            customizationOptionId: optId
          })),
          skipDuplicates: true // Good practice, though deleteMany should prevent duplicates
        });
      }
    });
    res.status(200).json({ message: 'Customization options updated successfully for menu item.' });
  } catch (error) {
    console.error(`Error updating linked customization options for menu item ${menuItemId}:`, error);
    // Check for foreign key constraint errors if an optionId doesn't exist
    if (error.code === 'P2003') { // Prisma foreign key constraint failed
        return res.status(400).json({ error: 'One or more customization option IDs are invalid.'});
    }
    res.status(500).json({ error: 'Failed to update linked customization options' });
  }
});

// Server initialization
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

