// Export authentication middleware
export {
  authenticateToken,
  isAdmin,
  optionalAuth,
  isOwnerOrAdmin
} from './auth.middleware';

// Export validation middleware
export {
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
  handleValidationErrors
} from './validation.middleware';

// Export upload middleware
export {
  uploadMenuItemImage,
  handleUploadErrors,
  requireFile,
  optionalFile,
  getFileUrl,
  deleteFile,
  createUploader,
  MENU_IMAGE_CONFIG
} from './upload.middleware';

// Export static file middleware
export {
  configureStaticFiles,
  handleStaticNotFound,
  getPublicUrl,
  fileExists,
  getFileStats,
  listPublicFiles,
  STATIC_CONFIGS
} from './static.middleware';

// Export error handling middleware
export {
  AppError,
  globalErrorHandler,
  catchAsync,
  handleNotFound,
  setupProcessErrorHandlers
} from './error.middleware';

// Export CORS middleware
export {
  corsMiddleware,
  createCustomCors,
  uploadCorsMiddleware,
  healthCheckCorsMiddleware,
  logCorsConfiguration,
  handlePreflight
} from './cors.middleware'; 