import { config } from 'dotenv';
import { join } from 'path';

/**
 * Load environment variables based on NODE_ENV
 * This ensures we use the right environment file for each context
 */
export function loadEnvironment(): void {
  const env = process.env.NODE_ENV || 'development';
  
  // Load environment-specific file first
  const envFile = `.env.${env}`;
  
  try {
    // Load environment-specific file (e.g., .env.development, .env.test)
    config({ path: join(process.cwd(), envFile) });
    console.log(`✅ Loaded environment config: ${envFile}`);
  } catch (error) {
    console.log(`⚠️  No ${envFile} file found, falling back to .env`);
  }
  
  // Always load base .env as fallback (for production and missing vars)
  // But don't overwrite variables that are already set from environment-specific file
  try {
    config({ path: join(process.cwd(), '.env'), override: false });
    console.log(`✅ Loaded base environment config: .env`);
  } catch (error) {
    console.log(`⚠️  No .env file found`);
  }
  
  // Validate required environment variables
  const requiredVars = ['JWT_SECRET', 'DATABASE_URL'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    console.error(`Please check your .env.${env} or .env file`);
    
    // Don't exit in test environment to allow tests to set their own vars
    if (env !== 'test') {
      process.exit(1);
    }
  } else {
    console.log(`✅ All required environment variables are set`);
    
    // Log which database we're connecting to (mask password for security)
    if (process.env.DATABASE_URL) {
      const dbUrl = process.env.DATABASE_URL;
      const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':****@'); // Mask password
      console.log(`🔗 Database URL: ${maskedUrl}`);
    }
  }
} 