declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT?: string;
      NODE_ENV?: 'development' | 'production' | 'test';
      DATABASE_URL: string;
      JWT_SECRET: string;
      SUMUP_API_KEY: string;
      SUMUP_MERCHANT_CODE?: string;
      SUMUP_MERCHANT_EMAIL?: string;
      PAYMENT_REDIRECT_BASE_URL?: string;
      FRONTEND_URL?: string;
      ALLOWED_ORIGINS?: string;
    }
  }
}

export {}; 
