import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { sendValidationError } from '../utils/response.utils';

// Upload configuration interface
export interface UploadConfig {
  destination: string;
  allowedMimeTypes: string[];
  maxFileSize: number; // in bytes
  fieldName: string;
}

// Default configuration for menu item images
export const MENU_IMAGE_CONFIG: UploadConfig = {
  destination: 'public/images/menu-items',
  allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
  maxFileSize: 5 * 1024 * 1024, // 5MB
  fieldName: 'image'
};

/**
 * Creates Multer disk storage configuration
 */
export const createDiskStorage = (destination: string): multer.StorageEngine => {
  return multer.diskStorage({
    destination: (_req: Request, _file: Express.Multer.File, cb) => {
      // Create directory if it doesn't exist
      fs.mkdirSync(destination, { recursive: true });
      cb(null, destination);
    },
    filename: (_req: Request, file: Express.Multer.File, cb) => {
      // Generate unique filename: fieldname-timestamp.extension
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const fileExtension = path.extname(file.originalname);
      cb(null, `${file.fieldname}-${uniqueSuffix}${fileExtension}`);
    }
  });
};

/**
 * Creates file filter for image validation
 */
export const createImageFileFilter = (allowedMimeTypes: string[]) => {
  return (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Check file extension
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
    
    // Check MIME type
    if (!allowedMimeTypes.includes(file.mimetype) || !allowedExtensions.includes(fileExtension)) {
      const error = new Error('Only image files (jpg, jpeg, png, gif) are allowed!') as any;
      error.code = 'INVALID_FILE_TYPE';
      return cb(error, false);
    }
    
    cb(null, true);
  };
};

/**
 * Creates a configured Multer instance
 */
export const createUploader = (config: UploadConfig): multer.Multer => {
  const storage = createDiskStorage(config.destination);
  const fileFilter = createImageFileFilter(config.allowedMimeTypes);
  
  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: config.maxFileSize
    }
  });
};

/**
 * Menu item image uploader (preconfigured)
 */
export const uploadMenuItemImage = createUploader(MENU_IMAGE_CONFIG);

/**
 * Middleware to handle file upload errors
 */
export const handleUploadErrors = (
  error: any, 
  _req: Request, 
  res: Response, 
  next: NextFunction
): void => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        sendValidationError(res, [{ 
          field: 'file', 
          message: `File size too large. Maximum size is ${MENU_IMAGE_CONFIG.maxFileSize / (1024 * 1024)}MB` 
        }], 'File upload failed');
        return;
      
      case 'LIMIT_FILE_COUNT':
        sendValidationError(res, [{ 
          field: 'file', 
          message: 'Too many files uploaded' 
        }], 'File upload failed');
        return;
      
      case 'LIMIT_UNEXPECTED_FILE':
        sendValidationError(res, [{ 
          field: 'file', 
          message: 'Unexpected file field' 
        }], 'File upload failed');
        return;
      
      default:
        sendValidationError(res, [{ 
          field: 'file', 
          message: 'File upload error' 
        }], 'File upload failed');
        return;
    }
  }
  
  if (error && error.code === 'INVALID_FILE_TYPE') {
    sendValidationError(res, [{ 
      field: 'file', 
      message: error.message 
    }], 'File validation failed');
    return;
  }
  
  // Pass other errors to the global error handler
  next(error);
};

/**
 * Middleware to validate uploaded file presence
 */
export const requireFile = (fieldName: string = 'image') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.file && fieldName === 'image') {
      sendValidationError(res, [{ 
        field: fieldName, 
        message: 'File is required' 
      }], 'File validation failed');
      return;
    }
    
    if (!req.files || !(req.files as { [fieldname: string]: Express.Multer.File[] })[fieldName]) {
      sendValidationError(res, [{ 
        field: fieldName, 
        message: 'File is required' 
      }], 'File validation failed');
      return;
    }
    
    next();
  };
};

/**
 * Middleware to make file upload optional
 */
export const optionalFile = (_req: Request, _res: Response, next: NextFunction): void => {
  // Always continue, regardless of file presence
  next();
};

/**
 * Get file URL from uploaded file
 */
export const getFileUrl = (file: Express.Multer.File, baseUrl?: string): string => {
  if (!file) {
    throw new Error('No file provided');
  }
  
  // Convert backslashes to forward slashes for URLs
  const filePath = file.path.replace(/\\/g, '/');
  
  // Remove 'public/' prefix if present (since static files are served from public)
  const publicPath = filePath.startsWith('public/') ? filePath.substring(7) : filePath;
  
  // Return full URL if baseUrl provided, otherwise return path
  return baseUrl ? `${baseUrl}/${publicPath}` : `/${publicPath}`;
};

/**
 * Clean up uploaded file (delete from filesystem)
 */
export const deleteFile = (filePath: string): boolean => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Export multer for external use
export { multer }; 