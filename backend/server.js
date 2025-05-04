const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const { body, validationResult } = require('express-validator');
const https = require('https');
const axios = require('axios');

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors({
  origin: '*',  // Allow requests from any origin
  credentials: true
}));
app.use(express.json());

// Serve static files from public folder
// Serve public/images directory at the root path to match database URLs
app.use(express.static('public'));
// Also serve at /images path for backward compatibility
app.use('/images', express.static('public/images'));

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
          status: 'PENDING', // Add a status field to your Order model if not already present
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

    // Check if payment has been completed
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
      const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'; // Use env var or default
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
            redirect_url: `smashd://order-confirmation?orderId=${order.id}`,
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

    // 2. Check if order requires verification (e.g., is PENDING and has a sumupCheckoutId)
    if (!order.sumupCheckoutId || order.status !== 'PENDING') {
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
      updatedOrder = await prisma.$transaction(async (prisma) => {
        const newlyUpdatedOrder = await prisma.order.update({
          where: { id: parseInt(orderId) },
          data: { status: 'PAID' }
        });

        // Award loyalty points only if the user exists and points haven't been awarded yet
        // Note: Loyalty points are currently awarded on creation, this logic might need adjustment
        // if points should only be confirmed *after* payment.
        // For now, let's assume they are awarded on creation and this just confirms payment.
        // If loyalty points logic needs change, we adjust the POST /v1/orders endpoint.

        return newlyUpdatedOrder;
      });
       console.log(`Order ${orderId} status updated to PAID in DB.`);
    } else {
       // If SumUp status is ANYTHING other than PAID (e.g., PENDING, FAILED, EXPIRED, etc.)
       // We update our local status to reflect the payment wasn't successful.
       console.log(`Payment not confirmed by SumUp (status: ${checkoutDetails.status}) for order ${orderId}. Updating DB to PAYMENT_FAILED.`);
       updatedOrder = await prisma.order.update({
           where: { id: parseInt(orderId) },
           data: { status: 'PAYMENT_FAILED' } // Consistently use PAYMENT_FAILED for non-PAID statuses
       });
       console.log(`Order ${orderId} status updated to PAYMENT_FAILED in DB.`);
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

// Server initialization
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
