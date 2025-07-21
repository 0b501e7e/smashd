import express, { Express } from 'express';
import path from 'path';
import fs from 'fs';

/**
 * Static file serving configuration
 */
export interface StaticConfig {
  route: string;
  directory: string;
  options?: any;
}

/**
 * Default static file configurations
 */
export const STATIC_CONFIGS: StaticConfig[] = [
  {
    route: '/menu-items',
    directory: path.join('public', 'images', 'menu-items'),
    options: {
      maxAge: '1d', // Cache for 1 day
      etag: true
    }
  },
  {
    route: '/images',
    directory: path.join('public', 'images'),
    options: {
      maxAge: '1d',
      etag: true
    }
  },
  {
    route: '/',
    directory: 'public',
    options: {
      maxAge: '1h', // Cache for 1 hour for general assets
      etag: true,
      index: false // Don't serve index.html automatically
    }
  }
];

/**
 * Configure static file serving for the Express app
 */
export const configureStaticFiles = (app: Express, configs: StaticConfig[] = STATIC_CONFIGS): void => {
  configs.forEach(config => {
    // Ensure directory exists
    const fullPath = path.resolve(config.directory);
    if (!fs.existsSync(fullPath)) {
      console.warn(`Static directory does not exist, creating: ${fullPath}`);
      fs.mkdirSync(fullPath, { recursive: true });
    }
    
    console.log(`📁 Static files: ${config.route} -> ${config.directory}`);
    app.use(config.route, express.static(config.directory, config.options));
  });
};

/**
 * Middleware to handle static file 404s gracefully
 */
export const handleStaticNotFound = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  // Only handle requests for static assets (images, css, js, etc.)
  const staticExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.css', '.js', '.ico', '.svg', '.woff', '.woff2', '.ttf'];
  const fileExtension = path.extname(req.path).toLowerCase();
  
  if (staticExtensions.includes(fileExtension)) {
    res.status(404).json({
      success: false,
      error: 'File not found',
      path: req.path
    });
    return;
  }
  
  // Let other routes handle non-static requests
  next();
};

/**
 * Get public URL for a file path
 */
export const getPublicUrl = (filePath: string, baseUrl?: string): string => {
  // Remove 'public/' prefix if present
  const publicPath = filePath.startsWith('public/') ? filePath.substring(7) : filePath;
  
  // Ensure path starts with /
  const urlPath = publicPath.startsWith('/') ? publicPath : `/${publicPath}`;
  
  return baseUrl ? `${baseUrl}${urlPath}` : urlPath;
};

/**
 * Check if a file exists in the public directory
 */
export const fileExists = (relativePath: string): boolean => {
  const fullPath = path.join('public', relativePath);
  return fs.existsSync(fullPath);
};

/**
 * Get file stats for a public file
 */
export const getFileStats = (relativePath: string): fs.Stats | null => {
  try {
    const fullPath = path.join('public', relativePath);
    return fs.statSync(fullPath);
  } catch (error) {
    return null;
  }
};

/**
 * List files in a public directory
 */
export const listPublicFiles = (relativePath: string): string[] => {
  try {
    const fullPath = path.join('public', relativePath);
    if (!fs.existsSync(fullPath)) {
      return [];
    }
    
    const files = fs.readdirSync(fullPath);
    return files.filter(file => {
      const filePath = path.join(fullPath, file);
      return fs.statSync(filePath).isFile();
    });
  } catch (error) {
    console.error('Error listing files:', error);
    return [];
  }
}; 