import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { sendValidationError } from '../utils/response.utils';

/**
 * Middleware to handle validation results
 * Checks for validation errors and returns proper error response
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const validationErrors = errors.array();
    console.warn('Validation errors:', validationErrors);

    // Format errors for better client consumption
    const formattedErrors = validationErrors.map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined
    }));

    sendValidationError(res, formattedErrors, 'Validation failed');
    return;
  }

  next();
};

/**
 * Creates a validation middleware that combines validation chains with error handling
 * @param validations Array of validation chains
 * @returns Array of middleware functions
 */
export const createValidationMiddleware = (
  validations: ValidationChain[]
): Array<ValidationChain | typeof handleValidationErrors> => {
  return [...validations, handleValidationErrors];
};

/**
 * Runs validation chains and returns the result without sending response
 * Useful for custom validation handling
 */
export const runValidation = async (
  req: Request,
  validations: ValidationChain[]
): Promise<{ isValid: boolean; errors: any[] }> => {
  // Run all validations
  await Promise.all(validations.map(validation => validation.run(req)));

  const errors = validationResult(req);
  return {
    isValid: errors.isEmpty(),
    errors: errors.array()
  };
};

/**
 * Middleware factory for optional field validation
 * Only validates if the field is present in the request
 */
export const optionalValidation = (
  validations: ValidationChain[]
): ValidationChain[] => {
  return validations.map(validation => validation.optional());
};

/**
 * Custom validation for checking if value exists in array
 */
export const isInArray = (allowedValues: any[], errorMessage?: string) => {
  return (value: any) => {
    if (!allowedValues.includes(value)) {
      throw new Error(errorMessage || `Value must be one of: ${allowedValues.join(', ')}`);
    }
    return true;
  };
};

/**
 * Custom validation for checking if date is in future
 */
export const isFutureDate = (errorMessage = 'Date must be in the future') => {
  return (value: string) => {
    const date = new Date(value);
    const now = new Date();

    if (date <= now) {
      throw new Error(errorMessage);
    }
    return true;
  };
};

/**
 * Custom validation for checking if date is in past
 */
export const isPastDate = (errorMessage = 'Date must be in the past') => {
  return (value: string) => {
    const date = new Date(value);
    const now = new Date();

    if (date >= now) {
      throw new Error(errorMessage);
    }
    return true;
  };
};

/**
 * Custom validation for checking minimum age
 */
export const isMinimumAge = (minAge: number, errorMessage?: string) => {
  return (value: string) => {
    const birthDate = new Date(value);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ? age - 1
      : age;

    if (actualAge < minAge) {
      throw new Error(errorMessage || `Minimum age required is ${minAge} years`);
    }
    return true;
  };
};

/**
 * Custom validation for strong password
 */
export const isStrongPassword = (errorMessage?: string) => {
  return (value: string) => {
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumbers = /\d/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    const isLongEnough = value.length >= 8;

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar || !isLongEnough) {
      throw new Error(
        errorMessage ||
        'Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters'
      );
    }
    return true;
  };
};

/**
 * Custom validation for checking if array has unique items
 */
export const hasUniqueItems = (errorMessage = 'Array must contain unique items') => {
  return (value: any[]) => {
    const uniqueValues = [...new Set(value)];

    if (uniqueValues.length !== value.length) {
      throw new Error(errorMessage);
    }
    return true;
  };
};

/**
 * Custom validation for checking if price is reasonable
 */
export const isReasonablePrice = (maxPrice = 1000, errorMessage?: string) => {
  return (value: number) => {
    if (value <= 0 || value > maxPrice) {
      throw new Error(errorMessage || `Price must be between $0.01 and $${maxPrice}`);
    }
    return true;
  };
};

// ============================================================================
// SPECIFIC VALIDATION CHAINS FOR APPLICATION ENTITIES
// ============================================================================

/**
 * User Registration Validation
 */
export const validateUserRegistration: ValidationChain[] = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),

  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long'),

  body('dateOfBirth')
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),

  body('address')
    .trim()
    .isLength({ min: 5 })
    .withMessage('Address must be at least 5 characters long'),

  body('phoneNumber')
    .trim()
    .isMobilePhone('es-ES')
    .withMessage('Phone number must be a valid Spanish number'),

  body('acceptedTerms')
    .isBoolean()
    .custom(value => {
      if (!value) {
        throw new Error('You must accept the terms and conditions');
      }
      return true;
    })
    .withMessage('You must accept the terms and conditions')
];

/**
 * User Login Validation
 */
export const validateUserLogin: ValidationChain[] = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address'),

  body('password')
    .not()
    .isEmpty()
    .withMessage('Password is required')
];

/**
 * Menu Item Creation Validation
 */
export const validateMenuItemCreation: ValidationChain[] = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required'),

  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  body('category')
    .isIn(['BURGER', 'SIDE', 'DRINK', 'DESSERT'])
    .withMessage('Invalid category'),

  body('imageUrl')
    .isURL()
    .withMessage('Valid image URL is required')
];

/**
 * Menu Item Update Validation
 */
export const validateMenuItemUpdate: ValidationChain[] = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required'),

  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  body('category')
    .isIn(['BURGER', 'SIDE', 'DRINK', 'DESSERT'])
    .withMessage('Invalid category'),

  body('isAvailable')
    .isBoolean()
    .withMessage('isAvailable must be a boolean'),

  body('imageUrl')
    .isURL()
    .withMessage('Valid image URL is required')
];

/**
 * Menu Item Availability Toggle Validation
 */
export const validateMenuItemAvailability: ValidationChain[] = [
  body('isAvailable')
    .isBoolean()
    .withMessage('isAvailable must be a boolean and is required')
];

/**
 * Order Creation Validation
 */
export const validateOrderCreation: ValidationChain[] = [
  body('items')
    .isArray()
    .withMessage('Items must be an array'),

  body('items.*.menuItemId')
    .isInt()
    .withMessage('Invalid menu item ID'),

  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),

  body('total')
    .isFloat({ min: 0 })
    .withMessage('Total must be a positive number')
];

/**
 * Order Status Update Validation
 */
export const validateOrderStatusUpdate: ValidationChain[] = [
  body('estimatedMinutes')
    .isInt({ min: 1 })
    .withMessage('Valid estimatedMinutes (number) is required')
];

/**
 * Customization Category Creation Validation
 */
export const validateCustomizationCategoryCreation: ValidationChain[] = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required'),

  body('options')
    .isArray()
    .withMessage('Options must be an array'),

  body('options.*.name')
    .isString()
    .withMessage('Option name must be a string'),

  body('options.*.price')
    .isFloat({ min: 0 })
    .withMessage('Option price must be a positive number')
];

/**
 * Menu Item Customization Link Validation
 */
export const validateMenuItemCustomizationLink: ValidationChain[] = [
  body('optionIds')
    .isArray()
    .withMessage('optionIds must be an array'),

  body('optionIds.*')
    .isInt()
    .withMessage('Each optionId must be an integer')
];

/**
 * ID Parameter Validation
 */
export const validateIdParam: ValidationChain[] = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer')
];

/**
 * Email Query Parameter Validation
 */
export const validateEmailQuery: ValidationChain[] = [
  query('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Must be a valid email address')
];

/**
 * Pagination Query Parameters Validation
 */
export const validatePaginationQuery: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

/**
 * File Upload Validation (for images)
 */
export const validateImageUpload = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.file) {
    sendValidationError(res, [{ field: 'file', message: 'Image file is required' }], 'File validation failed');
    return;
  }

  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    sendValidationError(res, [{ field: 'file', message: 'Only image files (jpg, jpeg, png, gif) are allowed' }], 'File validation failed');
    return;
  }

  if (req.file.size > maxSize) {
    sendValidationError(res, [{ field: 'file', message: 'File size must not exceed 5MB' }], 'File validation failed');
    return;
  }

  next();
};

/**
 * Validation for creating menu items
 */
export const validateCreateMenuItem = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('originalPrice').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Original Price must be a positive number'),
  body('promotionTitle').optional({ nullable: true }).trim().isString(),
  body('vatRate').optional().isFloat({ min: 0, max: 1 }).withMessage('VAT Rate must be between 0 and 1'),
  body('category').isIn(['BURGER', 'SIDE', 'DRINK', 'DESSERT']).withMessage('Invalid category'),
  body('isAvailable').optional().isBoolean().withMessage('isAvailable must be a boolean'),
  body('imageUrl').trim().notEmpty().withMessage('Image URL is required'),
  handleValidationErrors
];

/**
 * Validation for updating menu items
 */
export const validateUpdateMenuItem = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('originalPrice').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Original Price must be a positive number'),
  body('promotionTitle').optional({ nullable: true }).trim().isString(),
  body('vatRate').optional().isFloat({ min: 0, max: 1 }).withMessage('VAT Rate must be between 0 and 1'),
  body('category').optional().isIn(['BURGER', 'SIDE', 'DRINK', 'DESSERT']).withMessage('Invalid category'),
  body('isAvailable').optional().isBoolean().withMessage('isAvailable must be a boolean'),
  body('imageUrl').optional().trim().notEmpty().withMessage('Image URL cannot be empty'),
  handleValidationErrors
];

/**
 * Validation for order ID parameter
 */
export const validateOrderId = [
  param('id').isInt({ min: 1 }).withMessage('Order ID must be a positive integer'),
  handleValidationErrors
];

/**
 * Validation for creating orders
 */
export const validateCreateOrder = [
  body('items').isArray().withMessage('Items must be an array'),
  body('items.*.menuItemId').isInt().withMessage('Invalid menu item ID'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('total').isFloat({ min: 0 }).withMessage('Total must be a positive number'),
  body('fulfillmentMethod').optional().isIn(['PICKUP', 'DELIVERY']).withMessage('Invalid fulfillment method'),
  body('deliveryAddress').if(body('fulfillmentMethod').equals('DELIVERY')).isString().isLength({ min: 5 }).withMessage('Delivery address is required for delivery orders'),
  handleValidationErrors
];

/**
 * Validation for creating customization categories
 */
export const validateCreateCustomizationCategory = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('description').optional().trim(),
  handleValidationErrors
];

/**
 * Validation for menu item ID parameter
 */
export const validateMenuItemId = [
  param('menuItemId').isInt({ min: 1 }).withMessage('Menu item ID must be a positive integer'),
  handleValidationErrors
];

// ============================================================================
// VALIDATION MIDDLEWARE COMBINATIONS
// ============================================================================

/**
 * Complete validation middleware for user registration
 */
export const userRegistrationValidation = createValidationMiddleware(validateUserRegistration);

/**
 * Complete validation middleware for user login
 */
export const userLoginValidation = createValidationMiddleware(validateUserLogin);

/**
 * Complete validation middleware for menu item creation
 */
export const menuItemCreationValidation = createValidationMiddleware(validateMenuItemCreation);

/**
 * Complete validation middleware for menu item update
 */
export const menuItemUpdateValidation = createValidationMiddleware(validateMenuItemUpdate);

/**
 * Complete validation middleware for order creation
 */
export const orderCreationValidation = createValidationMiddleware(validateOrderCreation);

/**
 * Complete validation middleware for customization category creation
 */
export const customizationCategoryCreationValidation = createValidationMiddleware(validateCustomizationCategoryCreation); 