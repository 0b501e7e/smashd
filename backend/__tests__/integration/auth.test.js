const request = require('supertest');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Mock the PrismaClient
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

jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => mockPrisma)
  };
});

// Mock bcrypt
jest.mock('bcrypt');
const mockBcrypt = bcrypt;

// Mock jsonwebtoken
jest.mock('jsonwebtoken');
const mockJwt = jwt;

// Create a test app with the auth routes
const app = express();
app.use(express.json());

// Mock environment variables
process.env.JWT_SECRET = 'test_jwt_secret';

// Import validation middleware
const { body, validationResult } = require('express-validator');

// Mock auth routes (simplified versions of the actual routes)
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
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, name, dateOfBirth, address, phoneNumber, acceptedTerms } = req.body;
  
  try {
    // Check if email already exists
    const existingUser = await mockPrisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const hashedPassword = await mockBcrypt.hash(password, 10);
    const user = await mockPrisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        dateOfBirth: new Date(dateOfBirth),
        address,
        phoneNumber,
        acceptedTerms
      },
    });

    // Create initial loyalty points record
    await mockPrisma.loyaltyPoints.create({
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
    const user = await mockPrisma.user.findUnique({ 
      where: { email: email.toLowerCase() } 
    });
    
    if (user && await mockBcrypt.compare(password, user.password)) {
      const token = mockJwt.sign(
        { userId: user.id, role: user.role }, 
        process.env.JWT_SECRET, 
        { expiresIn: '1h' }
      );
      res.json({ 
        token, 
        user: { id: user.id, email: user.email, role: user.role } 
      });
    } else {
      res.status(400).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Error logging in' });
  }
});

// Test protected route
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  mockJwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('JWT Verification Error:', err);
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};

app.get('/v1/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Access granted', userId: req.user.userId });
});

describe('Authentication Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /v1/auth/register', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      dateOfBirth: '1990-01-01',
      address: '123 Test Street, Test City',
      phoneNumber: '+12345678901',
      acceptedTerms: true
    };

    it('should register a new user successfully', async () => {
      // Setup mocks
      mockPrisma.user.findFirst.mockResolvedValue(null); // No existing user
      mockBcrypt.hash.mockResolvedValue('hashed_password');
      mockPrisma.user.create.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        name: 'Test User'
      });
      mockPrisma.loyaltyPoints.create.mockResolvedValue({
        userId: 1,
        points: 0
      });

      const response = await request(app)
        .post('/v1/auth/register')
        .send(validRegistrationData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id', 1);
      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          password: 'hashed_password',
          name: 'Test User',
          dateOfBirth: new Date('1990-01-01'),
          address: '123 Test Street, Test City',
          phoneNumber: '+12345678901',
          acceptedTerms: true
        }
      });
      expect(mockPrisma.loyaltyPoints.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          points: 0
        }
      });
    });

    it('should return 400 if email already exists', async () => {
      // Setup mocks
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 1,
        email: 'test@example.com'
      });

      const response = await request(app)
        .post('/v1/auth/register')
        .send(validRegistrationData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Email already in use');
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid email', async () => {
      const invalidData = { ...validRegistrationData, email: 'invalid-email' };

      const response = await request(app)
        .post('/v1/auth/register')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'Must be a valid email address'
          })
        ])
      );
    });

    it('should return 400 for short password', async () => {
      const invalidData = { ...validRegistrationData, password: '123' };

      const response = await request(app)
        .post('/v1/auth/register')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'Password must be at least 6 characters long'
          })
        ])
      );
    });

    it('should return 400 if terms not accepted', async () => {
      const invalidData = { ...validRegistrationData, acceptedTerms: false };

      const response = await request(app)
        .post('/v1/auth/register')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'You must accept the terms and conditions'
          })
        ])
      );
    });

    it('should handle database errors', async () => {
      // Setup mocks
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue('hashed_password');
      mockPrisma.user.create.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/v1/auth/register')
        .send(validRegistrationData);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Error registering user');
    });
  });

  describe('POST /v1/auth/login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'password123'
    };

    it('should login successfully with valid credentials', async () => {
      // Setup mocks
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed_password',
        role: 'USER'
      };
      
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockJwt.sign.mockReturnValue('mock_jwt_token');

      const response = await request(app)
        .post('/v1/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token', 'mock_jwt_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toEqual({
        id: 1,
        email: 'test@example.com',
        role: 'USER'
      });
      expect(mockJwt.sign).toHaveBeenCalledWith(
        { userId: 1, role: 'USER' },
        'test_jwt_secret',
        { expiresIn: '1h' }
      );
    });

    it('should return 400 for invalid credentials', async () => {
      // Setup mocks
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/v1/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should return 400 for wrong password', async () => {
      // Setup mocks
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed_password',
        role: 'USER'
      };
      
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .post('/v1/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should return 400 for invalid email format', async () => {
      const invalidData = { ...validLoginData, email: 'invalid-email' };

      const response = await request(app)
        .post('/v1/auth/login')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'Must be a valid email address'
          })
        ])
      );
    });

    it('should return 400 for missing password', async () => {
      const invalidData = { email: 'test@example.com' };

      const response = await request(app)
        .post('/v1/auth/login')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'Password is required'
          })
        ])
      );
    });

    it('should handle database errors', async () => {
      // Setup mocks
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/v1/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Error logging in');
    });
  });

  describe('JWT Authentication Middleware', () => {
    it('should allow access with valid token', async () => {
      // Setup mocks
      mockJwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, { userId: 1, role: 'USER' });
      });

      const response = await request(app)
        .get('/v1/protected')
        .set('Authorization', 'Bearer valid_token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Access granted');
      expect(response.body).toHaveProperty('userId', 1);
    });

    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .get('/v1/protected');

      expect(response.status).toBe(401);
    });

    it('should return 403 for invalid token', async () => {
      // Setup mocks
      mockJwt.verify.mockImplementation((token, secret, callback) => {
        callback(new Error('Invalid token'), null);
      });

      const response = await request(app)
        .get('/v1/protected')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(403);
    });

    it('should return 401 for malformed authorization header', async () => {
      const response = await request(app)
        .get('/v1/protected')
        .set('Authorization', 'InvalidFormat');

      expect(response.status).toBe(401);
    });
  });
}); 