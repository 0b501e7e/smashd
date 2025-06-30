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
const validRegistrationData = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User',
  dateOfBirth: '1990-01-01',
  address: '123 Test Street, Test City',
  phoneNumber: '+34600000000', // Spanish phone number format
  acceptedTerms: true
};

const validLoginData = {
  email: 'test@example.com',
  password: 'password123'
};

describe('Authentication Integration Tests - TypeScript Backend', () => {
  // Mock data setup
  const mockUser = {
    id: 1,
    email: validRegistrationData.email,
    name: validRegistrationData.name,
    password: '$2b$10$hashedPassword', // Mock hashed password
    role: Role.CUSTOMER,
    dateOfBirth: new Date(validRegistrationData.dateOfBirth),
    address: validRegistrationData.address,
    phoneNumber: validRegistrationData.phoneNumber,
    acceptedTerms: validRegistrationData.acceptedTerms,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockLoyaltyPoints = {
    id: 1,
    userId: 1,
    points: 0,
    tier: 'BRONZE',
    registrationDate: new Date(),
    lastPointsReset: null,
    totalSpentThisYear: 0,
    birthdayRewardSent: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Set up mocks before each test
  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up bcrypt mocks
    mockedBcrypt.hash.mockResolvedValue('$2b$10$hashedPassword' as never);
    mockedBcrypt.compare.mockImplementation((password: any, _hash: string): Promise<boolean> => {
      // Return true for the correct password, false otherwise
      return Promise.resolve(password === validLoginData.password);
    });
  });

  afterAll(async () => {
    // Close database connection
    await services.shutdown();
  });

  describe('POST /v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      // Mock: Check if email exists (should return null for new user)
      mockedPrisma.user.findFirst.mockResolvedValue(null);
      
      // Mock: Create new user
      mockedPrisma.user.create.mockResolvedValue(mockUser);
      
      // Mock: Create loyalty points
      mockedPrisma.loyaltyPoints.create.mockResolvedValue(mockLoyaltyPoints);
      
      // Mock: Transaction wrapper
      mockedPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockedPrisma);
      });

      const response = await request(app)
        .post('/v1/auth/register')
        .send(validRegistrationData)
        .expect(201);

      // Verify response structure matches new backend
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('message');
      expect(response.body).toHaveProperty('message');

      // Verify the correct database calls were made
      expect(mockedPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: { equals: validRegistrationData.email, mode: 'insensitive' } },
        select: { id: true }
      });
      expect(mockedPrisma.user.create).toHaveBeenCalled();
      expect(mockedPrisma.loyaltyPoints.create).toHaveBeenCalled();
    });

    it('should return 400 if email already exists', async () => {
      // Mock: Email already exists
      mockedPrisma.user.findFirst.mockResolvedValue({ id: 1 } as any);

      const response = await request(app)
        .post('/v1/auth/register')
        .send(validRegistrationData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Email already in use');
    });

    it('should return 400 for invalid email', async () => {
      const invalidData = {
        ...validRegistrationData,
        email: 'invalid-email'
      };

      const response = await request(app)
        .post('/v1/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 400 for short password', async () => {
      const invalidData = {
        ...validRegistrationData,
        password: '123'
      };

      const response = await request(app)
        .post('/v1/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('data');
    });

    it('should return 400 if terms not accepted', async () => {
      const invalidData = {
        ...validRegistrationData,
        acceptedTerms: false
      };

      const response = await request(app)
        .post('/v1/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('POST /v1/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      // Mock: Find user for authentication (includes password)
      mockedPrisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/v1/auth/login')
        .send(validLoginData)
        .expect(200);

      // Verify response structure matches new backend
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user).toHaveProperty('email', validLoginData.email);
      expect(response.body.data.user).toHaveProperty('role');
      expect(response.body).toHaveProperty('message', 'Login successful');

      // Verify JWT token is valid
      expect(typeof response.body.data.token).toBe('string');
      expect(response.body.data.token.length).toBeGreaterThan(10);

      // Verify the correct database call was made
      expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: validLoginData.email.toLowerCase() },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          dateOfBirth: true,
          address: true,
          phoneNumber: true,
          acceptedTerms: true,
          password: true
        }
      });
    });

    it('should return 400 for invalid credentials', async () => {
      // Mock: User not found
      mockedPrisma.user.findUnique.mockResolvedValue(null);

      const invalidLogin = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/v1/auth/login')
        .send(invalidLogin)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should return 400 for wrong password', async () => {
      // Mock: User found but password verification will fail
      mockedPrisma.user.findUnique.mockResolvedValue(mockUser);

      const wrongPassword = {
        email: validLoginData.email,
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/v1/auth/login')
        .send(wrongPassword)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should return 400 for invalid email format', async () => {
      const invalidEmail = {
        email: 'invalid-email',
        password: 'password123'
      };

      const response = await request(app)
        .post('/v1/auth/login')
        .send(invalidEmail)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('data');
    });

    it('should return 400 for missing password', async () => {
      const missingPassword = {
        email: validLoginData.email
      };

      const response = await request(app)
        .post('/v1/auth/login')
        .send(missingPassword)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('JWT Authentication Middleware', () => {
    let authToken: string;

    beforeEach(async () => {
      // Mock: Find user for authentication
      mockedPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Get token from login
      const loginResponse = await request(app)
        .post('/v1/auth/login')
        .send(validLoginData)
        .expect(200);

      authToken = loginResponse.body.data.token;
    });

    it('should allow access with valid token', async () => {
      const response = await request(app)
        .get('/v1/test/protected')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
    });

    it('should return 401 for missing token', async () => {
      await request(app)
        .get('/v1/test/protected')
        .expect(401);
    });

    it('should return 403 for invalid token', async () => {
      await request(app)
        .get('/v1/test/protected')
        .set('Authorization', 'Bearer invalid_token')
        .expect(403);
    });

    it('should return 401 for malformed authorization header', async () => {
      await request(app)
        .get('/v1/test/protected')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });
  });
}); 