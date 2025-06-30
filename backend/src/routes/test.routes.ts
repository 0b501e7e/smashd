import { Router, Request, Response } from 'express';
import { authenticateToken, isAdmin, optionalAuth, isOwnerOrAdmin } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../types/auth.types';
import { 
  userRegistrationValidation,
  userLoginValidation,
  menuItemCreationValidation,
  menuItemUpdateValidation,
  orderCreationValidation,
  customizationCategoryCreationValidation,
  validateIdParam,
  validateEmailQuery,
  validatePaginationQuery,
  createValidationMiddleware,
  runValidation,
  validateUserRegistration
} from '../middleware/validation.middleware';
import { sendSuccess, sendError } from '../utils/response.utils';
import { HTTP_STATUS } from '../config/constants';
import { adminController, paymentController } from '../controllers';

const router = Router();

// ============================================================================
// AUTHENTICATION MIDDLEWARE TESTS
// ============================================================================

// Test public endpoint (no auth required)
router.get('/public', (_req: Request, res: Response) => {
  sendSuccess(res, { message: 'This is a public endpoint' });
});

// Test protected endpoint (requires authentication)
router.get('/protected', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  sendSuccess(res, { 
    message: 'This is a protected endpoint',
    user: req.user
  });
});

// Test admin endpoint (requires admin role)
router.get('/admin', authenticateToken, isAdmin, (req: AuthenticatedRequest, res: Response) => {
  sendSuccess(res, { 
    message: 'This is an admin endpoint',
    user: req.user
  });
});

// Test optional auth endpoint
router.get('/optional-auth', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  sendSuccess(res, { 
    message: 'This endpoint supports optional authentication',
    user: req.user || null,
    isAuthenticated: !!req.user
  });
});

// Test owner or admin endpoint
router.get('/resource/:userId', authenticateToken, isOwnerOrAdmin, (req: AuthenticatedRequest, res: Response) => {
  sendSuccess(res, { 
    message: 'This resource requires ownership or admin privileges',
    user: req.user,
    resourceUserId: req.params['userId']
  });
});

// ============================================================================
// VALIDATION MIDDLEWARE TESTS
// ============================================================================

// Test user registration validation
router.post('/validate/user/register', userRegistrationValidation, (req: Request, res: Response) => {
  sendSuccess(res, { 
    message: 'User registration validation passed',
    data: req.body
  });
});

// Test user login validation
router.post('/validate/user/login', userLoginValidation, (req: Request, res: Response) => {
  sendSuccess(res, { 
    message: 'User login validation passed',
    data: req.body
  });
});

// Test menu item creation validation
router.post('/validate/menu-item/create', menuItemCreationValidation, (req: Request, res: Response) => {
  sendSuccess(res, { 
    message: 'Menu item creation validation passed',
    data: req.body
  });
});

// Test menu item update validation
router.put('/validate/menu-item/update', menuItemUpdateValidation, (req: Request, res: Response) => {
  sendSuccess(res, { 
    message: 'Menu item update validation passed',
    data: req.body
  });
});

// Test order creation validation
router.post('/validate/order/create', orderCreationValidation, (req: Request, res: Response) => {
  sendSuccess(res, { 
    message: 'Order creation validation passed',
    data: req.body
  });
});

// Test customization category creation validation
router.post('/validate/customization/create', customizationCategoryCreationValidation, (req: Request, res: Response) => {
  sendSuccess(res, { 
    message: 'Customization category creation validation passed',
    data: req.body
  });
});

// Test parameter validation
router.get('/validate/param/:id', createValidationMiddleware(validateIdParam), (req: Request, res: Response) => {
  sendSuccess(res, { 
    message: 'Parameter validation passed',
    id: req.params['id']
  });
});

// Test query parameter validation
router.get('/validate/query', createValidationMiddleware(validateEmailQuery), (req: Request, res: Response) => {
  sendSuccess(res, { 
    message: 'Query parameter validation passed',
    email: req.query['email']
  });
});

// Test pagination query validation
router.get('/validate/pagination', createValidationMiddleware(validatePaginationQuery), (req: Request, res: Response) => {
  sendSuccess(res, { 
    message: 'Pagination validation passed',
    page: req.query['page'],
    limit: req.query['limit']
  });
});

// ============================================================================
// CUSTOM VALIDATION TESTS
// ============================================================================

// Test manual validation (using runValidation)
router.post('/validate/manual/user-registration', async (req: Request, res: Response) => {
  try {
    const validationResult = await runValidation(req, validateUserRegistration);
    
    if (!validationResult.isValid) {
      return sendError(res, 'Manual validation failed', HTTP_STATUS.BAD_REQUEST);
    }
    
    sendSuccess(res, { 
      message: 'Manual validation passed',
      data: req.body,
      validationResult
    });
  } catch (error) {
    sendError(res, 'Manual validation error', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
});

// Test combined auth and validation
router.post('/validate/auth-and-validation/menu-item', 
  authenticateToken, 
  isAdmin, 
  menuItemCreationValidation, 
  (req: AuthenticatedRequest, res: Response) => {
    sendSuccess(res, { 
      message: 'Authentication and validation passed',
      user: req.user,
      data: req.body
    });
  }
);

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

// Test validation error handling
router.post('/validate/error/user-registration', (req: Request, res: Response) => {
  // This will intentionally fail validation to test error handling
  const invalidData = {
    email: 'invalid-email',
    password: '123', // too short
    name: 'A', // too short
    dateOfBirth: 'invalid-date',
    address: 'ABC', // too short
    phoneNumber: 'invalid-phone',
    acceptedTerms: false
  };
  
  req.body = invalidData;
  
  // Manually run validation to see errors
  userRegistrationValidation.forEach(middleware => {
    if (typeof middleware === 'function') {
      middleware(req, res, () => {});
    }
  });
});

// Test authentication error
router.get('/test/auth-error', (req: Request, res: Response) => {
  // Set invalid token
  req.headers.authorization = 'Bearer invalid-token';
  authenticateToken(req, res, () => {
    sendSuccess(res, { message: 'This should not be reached' });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

// Test complete user registration flow
router.post('/integration/user-registration', userRegistrationValidation, (req: Request, res: Response) => {
  // Simulate successful registration
  sendSuccess(res, { 
    message: 'User registration integration test passed',
    user: {
      id: 1,
      email: req.body.email,
      name: req.body.name,
      dateOfBirth: req.body.dateOfBirth,
      address: req.body.address,
      phoneNumber: req.body.phoneNumber,
      acceptedTerms: req.body.acceptedTerms
    }
  }, 'User registered successfully', HTTP_STATUS.CREATED);
});

// Test complete order creation flow
router.post('/integration/order-creation', 
  authenticateToken, 
  orderCreationValidation, 
  (req: AuthenticatedRequest, res: Response) => {
    // Simulate successful order creation
    sendSuccess(res, { 
      message: 'Order creation integration test passed',
      orderId: Math.floor(Math.random() * 1000),
      user: req.user,
      order: req.body
    }, 'Order created successfully', HTTP_STATUS.CREATED);
  }
);

// ============================================================================
// SUMUP AND ORDER TESTING
// ============================================================================

// Test SumUp connection
router.get('/sumup-connection', paymentController.testSumUpConnectionController);

// Test SumUp merchant profile
router.get('/merchant-profile', paymentController.getMerchantProfile);

// Test detailed order check with SumUp
router.get('/check-order/:orderId', paymentController.checkOrderWithSumUp);

// Test manual order status update
router.post('/update-order-status', adminController.updateOrderStatusTest);

// ============================================================================
// HEALTH CHECK AND STATUS
// ============================================================================

// Test endpoint status
router.get('/status', (_req: Request, res: Response) => {
  sendSuccess(res, {
    message: 'Test routes are working',
    timestamp: new Date().toISOString(),
    endpoints: {
      authentication: [
        'GET /test/public',
        'GET /test/protected',
        'GET /test/admin',
        'GET /test/optional-auth',
        'GET /test/resource/:userId'
      ],
      validation: [
        'POST /test/validate/user/register',
        'POST /test/validate/user/login',
        'POST /test/validate/menu-item/create',
        'PUT /test/validate/menu-item/update',
        'POST /test/validate/order/create',
        'POST /test/validate/customization/create',
        'GET /test/validate/param/:id',
        'GET /test/validate/query',
        'GET /test/validate/pagination'
      ],
      integration: [
        'POST /test/integration/user-registration',
        'POST /test/integration/order-creation'
      ],
      sumup: [
        'GET /test/sumup-connection',
        'GET /test/merchant-profile',
        'GET /test/check-order/:orderId',
        'POST /test/update-order-status'
      ]
    }
  });
});

export default router; 