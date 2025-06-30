const { authController } = require('../../src/controllers/auth.controller');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Mock dependencies
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('express-validator');
jest.mock('@prisma/client');

// Mock Prisma
const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn()
  },
  loyaltyPoints: {
    create: jest.fn()
  }
};

// Mock the PrismaClient constructor
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}));

describe('Auth Controller Unit Tests', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      body: {}
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Mock validation to pass by default
    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => []
    });
  });

  describe('register', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      dateOfBirth: '1990-01-01',
      address: '123 Test Street',
      phoneNumber: '+1234567890',
      acceptedTerms: true
    };

    test('should register user successfully', async () => {
      mockReq.body = validUserData;
      
      // Mock dependencies
      mockPrisma.user.findFirst.mockResolvedValue(null); // No existing user
      bcrypt.hash.mockResolvedValue('hashedPassword');
      mockPrisma.user.create.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        name: 'Test User'
      });
      mockPrisma.loyaltyPoints.create.mockResolvedValue({});

      await authController.register(mockReq, mockRes);

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: { equals: 'test@example.com', mode: 'insensitive' }
        }
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          password: 'hashedPassword',
          name: 'Test User',
          dateOfBirth: new Date('1990-01-01'),
          address: '123 Test Street',
          phoneNumber: '+1234567890',
          acceptedTerms: true
        }
      });
      expect(mockPrisma.loyaltyPoints.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          points: 0
        }
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        id: 1,
        message: 'User registered successfully'
      });
    });

    test('should return 400 if email already exists', async () => {
      mockReq.body = validUserData;
      
      mockPrisma.user.findFirst.mockResolvedValue({ id: 1 }); // Existing user

      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Email already in use'
      });
    });

    test('should return 400 for validation errors', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'Email is required' }]
      });

      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        errors: [{ msg: 'Email is required' }]
      });
    });

    test('should handle database errors', async () => {
      mockReq.body = validUserData;
      
      mockPrisma.user.findFirst.mockRejectedValue(new Error('Database error'));

      await authController.register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Error registering user'
      });
    });
  });

  describe('login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'password123'
    };

    test('should login user successfully', async () => {
      mockReq.body = validLoginData;
      
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashedPassword',
        role: 'USER'
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mockJwtToken');

      await authController.login(mockReq, mockRes);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: 1, role: 'USER' },
        expect.any(String), // JWT_SECRET
        { expiresIn: '1h' }
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        token: 'mockJwtToken',
        user: {
          id: 1,
          email: 'test@example.com',
          role: 'USER'
        }
      });
    });

    test('should return 400 for invalid credentials - user not found', async () => {
      mockReq.body = validLoginData;
      
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid credentials'
      });
    });

    test('should return 400 for invalid credentials - wrong password', async () => {
      mockReq.body = validLoginData;
      
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        password: 'hashedPassword'
      });
      bcrypt.compare.mockResolvedValue(false);

      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid credentials'  
      });
    });

    test('should return 400 for validation errors', async () => {
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'Email is required' }]
      });

      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        errors: [{ msg: 'Email is required' }]
      });
    });

    test('should handle database errors', async () => {
      mockReq.body = validLoginData;
      
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      await authController.login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Error logging in'
      });
    });
  });
}); 