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
import { Role, OrderStatus, FulfillmentMethod } from '@prisma/client';

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
  loyaltyPoints: null
};

const mockDriverUser = {
  id: 3,
  email: 'driver@test.com',
  name: 'Test Driver',
  password: '$2b$10$hashedPassword',
  role: Role.DRIVER,
  dateOfBirth: new Date('1990-01-01'),
  address: '789 Driver Street',
  phoneNumber: '+34600000003',
  acceptedTerms: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  loyaltyPoints: null
};

const mockMenuItem = {
  id: 1,
  name: 'Test Burger',
  description: 'A test burger',
  price: 10.00,
  category: 'BURGER',
  imageUrl: 'https://example.com/burger.jpg',
  isAvailable: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('Driver Delivery Flow E2E Tests', () => {
  let adminToken: string;
  let driverToken: string;
  let deliveryOrderId: number;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock bcrypt compare to always return true for login
    mockedBcrypt.compare.mockResolvedValue(true as never);
    mockedBcrypt.hash.mockResolvedValue('$2b$10$hashedPassword' as never);

    // Setup user mocks
    mockedPrisma.user.findFirst.mockImplementation((args: any) => {
      if (args?.where?.email === 'admin@smashd.com') {
        return Promise.resolve(mockAdminUser);
      }
      if (args?.where?.email === 'customer@example.com') {
        return Promise.resolve(mockCustomerUser);
      }
      if (args?.where?.email === 'driver@test.com') {
        return Promise.resolve(mockDriverUser);
      }
      return Promise.resolve(null);
    });

    mockedPrisma.user.findUnique.mockImplementation((args: any) => {
      if (args?.where?.id === mockAdminUser.id) {
        return Promise.resolve(mockAdminUser);
      }
      if (args?.where?.id === mockCustomerUser.id) {
        return Promise.resolve(mockCustomerUser);
      }
      if (args?.where?.id === mockDriverUser.id) {
        return Promise.resolve(mockDriverUser);
      }
      return Promise.resolve(null);
    });

    // Setup menu item mock
    mockedPrisma.menuItem.findMany.mockResolvedValue([mockMenuItem]);
    mockedPrisma.menuItem.findUnique.mockResolvedValue(mockMenuItem);
  });

  describe('Complete Driver Delivery Flow', () => {
    test('E2E: Customer creates delivery order → Admin accepts → Driver sees it → Driver accepts → Driver marks delivered', async () => {
      // Step 1: Login as customer
      const customerLoginResponse = await request(app)
        .post('/v1/auth/login')
        .send({
          email: 'customer@example.com',
          password: 'password123'
        });

      expect(customerLoginResponse.status).toBe(200);
      // Customer token not needed for this test, but login verifies customer exists

      // Step 2: Create a delivery order
      const deliveryOrder = {
        id: 100,
        userId: mockCustomerUser.id,
        total: 10.00,
        status: OrderStatus.PAYMENT_CONFIRMED,
        fulfillmentMethod: FulfillmentMethod.DELIVERY,
        deliveryAddress: '123 Test Street, Test City',
        orderCode: 'TEST123',
        sumupCheckoutId: 'test-checkout-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        estimatedReadyTime: null,
        readyAt: null,
        sumupOrderId: null
      };

      mockedPrisma.order.create.mockResolvedValue(deliveryOrder);
      mockedPrisma.order.findUnique.mockImplementation((args: any) => {
        if (args?.where?.id === deliveryOrder.id) {
          return Promise.resolve(deliveryOrder);
        }
        return Promise.resolve(null);
      });

      deliveryOrderId = deliveryOrder.id;

      // Step 3: Login as admin
      const adminLoginResponse = await request(app)
        .post('/v1/auth/login')
        .send({
          email: 'admin@smashd.com',
          password: 'password123'
        });

      expect(adminLoginResponse.status).toBe(200);
      adminToken = adminLoginResponse.body.token;

      // Step 4: Admin fetches orders (should see the delivery order)
      mockedPrisma.order.findMany.mockResolvedValue([
        {
          ...deliveryOrder,
          items: [],
          user: mockCustomerUser
        }
      ]);

      const adminOrdersResponse = await request(app)
        .get('/v1/admin/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminOrdersResponse.status).toBe(200);
      expect(adminOrdersResponse.body).toHaveLength(1);
      expect(adminOrdersResponse.body[0].fulfillmentMethod).toBe('DELIVERY');
      expect(adminOrdersResponse.body[0].deliveryAddress).toBe('123 Test Street, Test City');

      // Step 5: Admin accepts the order (should set status to READY for delivery orders)
      const readyOrder = {
        ...deliveryOrder,
        status: OrderStatus.READY,
        readyAt: new Date(),
        estimatedReadyTime: new Date(Date.now() + 30 * 60000)
      };

      mockedPrisma.order.findUnique.mockImplementation((args: any) => {
        if (args?.where?.id === deliveryOrderId) {
          // Return current state before update
          return Promise.resolve(deliveryOrder);
        }
        return Promise.resolve(null);
      });

      mockedPrisma.order.update.mockImplementation((args: any) => {
        if (args?.where?.id === deliveryOrderId) {
          return Promise.resolve(readyOrder);
        }
        return Promise.resolve(deliveryOrder);
      });

      const acceptResponse = await request(app)
        .post(`/v1/admin/orders/${deliveryOrderId}/accept`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estimatedMinutes: 30 });

      expect(acceptResponse.status).toBe(200);
      expect(acceptResponse.body.status).toBe('READY');
      expect(acceptResponse.body.readyAt).toBeTruthy();

      // Verify the order was updated with READY status
      expect(mockedPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: deliveryOrderId },
          data: expect.objectContaining({
            status: 'READY',
            readyAt: expect.any(Date)
          })
        })
      );

      // Step 6: Login as driver
      const driverLoginResponse = await request(app)
        .post('/v1/auth/login')
        .send({
          email: 'driver@test.com',
          password: 'password123'
        });

      expect(driverLoginResponse.status).toBe(200);
      driverToken = driverLoginResponse.body.token;

      // Step 7: Driver fetches ready delivery orders (should see the order)
      mockedPrisma.order.findMany.mockImplementation((args: any) => {
        if (args?.where?.status === 'READY' && 
            args?.where?.fulfillmentMethod === 'DELIVERY' &&
            args?.where?.deliveryAddress?.not !== null) {
          return Promise.resolve([
            {
              ...readyOrder,
              items: [
                {
                  id: 1,
                  orderId: deliveryOrderId,
                  menuItemId: mockMenuItem.id,
                  quantity: 1,
                  price: 10.00,
                  customizations: null,
                  menuItem: mockMenuItem
                }
              ],
              user: {
                id: mockCustomerUser.id,
                name: mockCustomerUser.name,
                phoneNumber: mockCustomerUser.phoneNumber
              }
            }
          ]);
        }
        return Promise.resolve([]);
      });

      const driverOrdersResponse = await request(app)
        .get('/v1/driver/orders')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(driverOrdersResponse.status).toBe(200);
      expect(driverOrdersResponse.body.success).toBe(true);
      expect(driverOrdersResponse.body.data).toHaveLength(1);
      expect(driverOrdersResponse.body.data[0].id).toBe(deliveryOrderId);
      expect(driverOrdersResponse.body.data[0].status).toBe('READY');
      expect(driverOrdersResponse.body.data[0].deliveryAddress).toBe('123 Test Street, Test City');

      // Step 8: Driver gets order details
      mockedPrisma.order.findUnique.mockImplementation((args: any) => {
        if (args?.where?.id === deliveryOrderId) {
          return Promise.resolve({
            ...readyOrder,
            items: [
              {
                id: 1,
                orderId: deliveryOrderId,
                menuItemId: mockMenuItem.id,
                quantity: 1,
                price: 10.00,
                customizations: null,
                menuItem: mockMenuItem
              }
            ],
            user: {
              id: mockCustomerUser.id,
              name: mockCustomerUser.name,
              phoneNumber: mockCustomerUser.phoneNumber
            }
          });
        }
        return Promise.resolve(null);
      });

      const orderDetailsResponse = await request(app)
        .get(`/v1/driver/orders/${deliveryOrderId}`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(orderDetailsResponse.status).toBe(200);
      expect(orderDetailsResponse.body.success).toBe(true);
      expect(orderDetailsResponse.body.data.deliveryAddress).toBe('123 Test Street, Test City');
      expect(orderDetailsResponse.body.data.user.name).toBe('Customer User');

      // Step 9: Driver accepts the order (should set status to OUT_FOR_DELIVERY)
      const outForDeliveryOrder = {
        ...readyOrder,
        status: OrderStatus.OUT_FOR_DELIVERY
      };

      mockedPrisma.order.findUnique.mockImplementation((args: any) => {
        if (args?.where?.id === deliveryOrderId) {
          // Return READY order before update
          return Promise.resolve(readyOrder);
        }
        return Promise.resolve(null);
      });

      mockedPrisma.order.update.mockImplementation((args: any) => {
        if (args?.where?.id === deliveryOrderId) {
          return Promise.resolve(outForDeliveryOrder);
        }
        return Promise.resolve(readyOrder);
      });

      const acceptOrderResponse = await request(app)
        .post(`/v1/driver/orders/${deliveryOrderId}/accept`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(acceptOrderResponse.status).toBe(200);
      expect(acceptOrderResponse.body.success).toBe(true);
      expect(acceptOrderResponse.body.data.status).toBe('OUT_FOR_DELIVERY');

      // Verify the order was updated to OUT_FOR_DELIVERY
      expect(mockedPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: deliveryOrderId },
          data: { status: 'OUT_FOR_DELIVERY' }
        })
      );

      // Step 10: Driver marks order as delivered (should set status to DELIVERED)
      const deliveredOrder = {
        ...outForDeliveryOrder,
        status: OrderStatus.DELIVERED
      };

      mockedPrisma.order.findUnique.mockImplementation((args: any) => {
        if (args?.where?.id === deliveryOrderId) {
          // Return OUT_FOR_DELIVERY order before update
          return Promise.resolve(outForDeliveryOrder);
        }
        return Promise.resolve(null);
      });

      mockedPrisma.order.update.mockImplementation((args: any) => {
        if (args?.where?.id === deliveryOrderId) {
          return Promise.resolve(deliveredOrder);
        }
        return Promise.resolve(outForDeliveryOrder);
      });

      const markDeliveredResponse = await request(app)
        .post(`/v1/driver/orders/${deliveryOrderId}/delivered`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(markDeliveredResponse.status).toBe(200);
      expect(markDeliveredResponse.body.success).toBe(true);
      expect(markDeliveredResponse.body.data.status).toBe('DELIVERED');

      // Verify the order was updated to DELIVERED
      expect(mockedPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: deliveryOrderId },
          data: { status: 'DELIVERED' }
        })
      );
    });

    test('Driver should only see READY delivery orders', async () => {
      // Setup: Login as driver
      mockedBcrypt.compare.mockResolvedValue(true as never);
      
      const driverLoginResponse = await request(app)
        .post('/v1/auth/login')
        .send({
          email: 'driver@test.com',
          password: 'password123'
        });

      expect(driverLoginResponse.status).toBe(200);
      const driverToken = driverLoginResponse.body.token;

      // Mock: Only READY delivery orders should be returned
      mockedPrisma.order.findMany.mockImplementation((args: any) => {
        if (args?.where?.status === 'READY' && 
            args?.where?.fulfillmentMethod === 'DELIVERY' &&
            args?.where?.deliveryAddress?.not !== null) {
          return Promise.resolve([
            {
              id: 100,
              status: OrderStatus.READY,
              fulfillmentMethod: FulfillmentMethod.DELIVERY,
              deliveryAddress: '123 Test Street',
              orderCode: 'TEST123',
              total: 10.00,
              createdAt: new Date(),
              items: [],
              user: mockCustomerUser
            }
          ]);
        }
        // Return empty for any other query
        return Promise.resolve([]);
      });

      const response = await request(app)
        .get('/v1/driver/orders')
        .set('Authorization', `Bearer ${driverToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('READY');
      expect(response.body.data[0].fulfillmentMethod).toBe('DELIVERY');
      expect(response.body.data[0].deliveryAddress).toBeTruthy();
    });

    test('Admin accepting delivery order should set status to READY', async () => {
      // Setup: Login as admin
      mockedBcrypt.compare.mockResolvedValue(true as never);
      
      const adminLoginResponse = await request(app)
        .post('/v1/auth/login')
        .send({
          email: 'admin@smashd.com',
          password: 'password123'
        });

      expect(adminLoginResponse.status).toBe(200);
      const adminToken = adminLoginResponse.body.token;

      // Mock delivery order in PAYMENT_CONFIRMED status
      const paymentConfirmedOrder = {
        id: 200,
        userId: mockCustomerUser.id,
        total: 15.00,
        status: OrderStatus.PAYMENT_CONFIRMED,
        fulfillmentMethod: FulfillmentMethod.DELIVERY,
        deliveryAddress: '456 Delivery Street',
        orderCode: 'DELIVERY456',
        sumupCheckoutId: 'checkout-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        estimatedReadyTime: null,
        readyAt: null,
        sumupOrderId: null
      };

      mockedPrisma.order.findUnique.mockResolvedValue(paymentConfirmedOrder);

      // Mock the update to READY status
      const readyOrder = {
        ...paymentConfirmedOrder,
        status: OrderStatus.READY,
        readyAt: new Date(),
        estimatedReadyTime: new Date(Date.now() + 30 * 60000)
      };

      mockedPrisma.order.update.mockResolvedValue(readyOrder);

      // Admin accepts the order
      const response = await request(app)
        .post(`/v1/admin/orders/${paymentConfirmedOrder.id}/accept`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estimatedMinutes: 30 });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('READY');
      expect(response.body.readyAt).toBeTruthy();

      // Verify the update was called with READY status
      expect(mockedPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: paymentConfirmedOrder.id },
          data: expect.objectContaining({
            status: 'READY',
            readyAt: expect.any(Date)
          })
        })
      );
    });

    test('Admin accepting pickup order should set status to CONFIRMED (not READY)', async () => {
      // Setup: Login as admin
      mockedBcrypt.compare.mockResolvedValue(true as never);
      
      const adminLoginResponse = await request(app)
        .post('/v1/auth/login')
        .send({
          email: 'admin@smashd.com',
          password: 'password123'
        });

      expect(adminLoginResponse.status).toBe(200);
      const adminToken = adminLoginResponse.body.token;

      // Mock pickup order in PAYMENT_CONFIRMED status
      const paymentConfirmedOrder = {
        id: 300,
        userId: mockCustomerUser.id,
        total: 12.00,
        status: OrderStatus.PAYMENT_CONFIRMED,
        fulfillmentMethod: FulfillmentMethod.PICKUP,
        deliveryAddress: null,
        orderCode: null,
        sumupCheckoutId: 'checkout-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        estimatedReadyTime: null,
        readyAt: null,
        sumupOrderId: null
      };

      mockedPrisma.order.findUnique.mockResolvedValue(paymentConfirmedOrder);

      // Mock the update to CONFIRMED status (not READY for pickup)
      const confirmedOrder = {
        ...paymentConfirmedOrder,
        status: OrderStatus.CONFIRMED,
        readyAt: null, // Pickup orders don't get readyAt
        estimatedReadyTime: new Date(Date.now() + 30 * 60000)
      };

      mockedPrisma.order.update.mockResolvedValue(confirmedOrder);

      // Admin accepts the order
      const response = await request(app)
        .post(`/v1/admin/orders/${paymentConfirmedOrder.id}/accept`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ estimatedMinutes: 30 });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('CONFIRMED');
      expect(response.body.readyAt).toBeNull();

      // Verify the update was called with CONFIRMED status
      expect(mockedPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: paymentConfirmedOrder.id },
          data: expect.objectContaining({
            status: 'CONFIRMED',
            readyAt: null
          })
        })
      );
    });
  });
});

