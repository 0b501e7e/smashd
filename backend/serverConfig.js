/**
 * Server Configuration
 * Exports Express app and other modules for testing
 */

const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const http = require('http');
const https = require('https');

// Create Express app
const app = express();
const prisma = new PrismaClient();

// CORS and JSON middleware
app.use(cors());
app.use(express.json());

/**
 * Helper function to make HTTP requests with proper error handling
 * @param {Object} options - HTTP request options
 * @param {String} postData - Optional data to send in POST request
 * @returns {Promise<Object>} - Response data
 */
const makeHttpRequest = (options, postData) => {
  return new Promise((resolve, reject) => {
    const protocol = options.port === 443 ? https : http;
    
    const req = protocol.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const responseData = JSON.parse(data);
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(responseData);
          } else {
            reject(new Error(`Request failed with status code ${res.statusCode}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
};

/**
 * Get SumUp access token for API requests
 * @returns {Promise<string>} - Access token
 */
const getSumupAccessToken = async () => {
  try {
    const options = {
      hostname: 'api.sumup.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };
    
    const postData = `client_id=${process.env.SUMUP_CLIENT_ID}&client_secret=${process.env.SUMUP_CLIENT_SECRET}&grant_type=client_credentials`;
    
    const response = await makeHttpRequest(options, postData);
    
    if (!response.access_token) {
      throw new Error('No access token in response');
    }
    
    return response.access_token;
  } catch (error) {
    console.error('Error getting SumUp access token:', error);
    throw new Error(`Failed to get SumUp access token: ${error.message}`);
  }
};

/**
 * Verify webhook signature from SumUp
 * @param {string} signature - Webhook signature
 * @param {object} payload - Webhook payload
 * @param {string} secret - Webhook secret
 * @returns {boolean} - Whether signature is valid
 */
const verifyWebhookSignature = (signature, payload, secret) => {
  try {
    const hmac = crypto.createHmac('sha256', secret);
    const computedSignature = hmac.update(JSON.stringify(payload)).digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(computedSignature, 'hex')
    );
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
};

// API Routes for testing

// Initiate checkout endpoint
app.post('/v1/initiate-checkout', async (req, res) => {
  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }
    
    // Get order details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            menuItem: true
          }
        }
      }
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Get SumUp access token
    const accessToken = await getSumupAccessToken();
    
    // Prepare custom fields for items
    const items = order.orderItems.map(item => ({
      name: item.menuItem.name,
      price: item.menuItem.price.toFixed(2),
      quantity: item.quantity
    }));
    
    // Prepare checkout data
    const checkoutData = JSON.stringify({
      checkout_reference: order.reference,
      amount: order.totalAmount.toFixed(2),
      currency: 'USD',
      merchant_code: process.env.SUMUP_MERCHANT_CODE,
      description: `Order #${order.reference}`,
      custom_fields: {
        items: JSON.stringify(items)
      }
    });
    
    // Set request options
    const options = {
      hostname: 'api.sumup.com',
      port: 443,
      path: '/v0.1/checkouts',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    };
    
    // Make checkout request
    const checkoutResponse = await makeHttpRequest(options, checkoutData);
    
    // Return checkout ID and payment link
    return res.status(200).json({
      checkout_id: checkoutResponse.id,
      payment_link: checkoutResponse.payment_link,
      status: checkoutResponse.status
    });
  } catch (error) {
    console.error('Error initiating checkout:', error);
    return res.status(500).json({ error: `Failed to initiate checkout: ${error.message}` });
  }
});

// Webhook endpoint
app.post('/v1/sumup-webhook', async (req, res) => {
  try {
    const signature = req.headers['x-payload-signature'];
    const payload = req.body;
    
    // Verify webhook signature
    const isValid = verifyWebhookSignature(
      signature,
      payload,
      process.env.SUMUP_WEBHOOK_SECRET
    );
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
    
    // Get checkout reference and event type
    const { checkout_reference, event_type } = payload;
    
    // Find order by reference
    const order = await prisma.order.findFirst({
      where: { reference: checkout_reference }
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Set order status based on event type
    let newStatus;
    
    switch (event_type) {
      case 'checkout.paid':
        newStatus = 'PAID';
        break;
      case 'checkout.failed':
        newStatus = 'FAILED';
        break;
      case 'checkout.expired':
        newStatus = 'EXPIRED';
        break;
      default:
        newStatus = order.status;
    }
    
    // Update order status
    if (newStatus !== order.status) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: newStatus }
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      order_id: order.id,
      new_status: newStatus
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: `Failed to process webhook: ${error.message}` });
  }
});

// Test connection endpoint
app.get('/v1/test/sumup-connection', async (req, res) => {
  try {
    // Get access token to verify connection
    await getSumupAccessToken();
    
    return res.status(200).json({
      connected: true,
      message: 'Successfully connected to SumUp API'
    });
  } catch (error) {
    console.error('Error connecting to SumUp:', error);
    return res.status(500).json({
      connected: false,
      error: error.message
    });
  }
});

// Test webhook endpoint
app.post('/v1/test/sumup-webhook', (req, res) => {
  const { event_type, checkout_reference } = req.body;
  
  if (!event_type || !checkout_reference) {
    return res.status(400).json({
      error: 'Missing required fields: event_type, checkout_reference'
    });
  }
  
  // Log test webhook
  console.log(`Test webhook received: ${event_type} for ${checkout_reference}`);
  
  return res.status(200).json({
    success: true,
    message: 'Test webhook received',
    event_type,
    checkout_reference
  });
});

// Export for testing
module.exports = {
  app,
  prisma,
  makeHttpRequest,
  getSumupAccessToken,
  verifyWebhookSignature
}; 