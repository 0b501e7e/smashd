declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT?: string;
      NODE_ENV?: 'development' | 'production' | 'test';
      DATABASE_URL: string;
      JWT_SECRET: string;
      SUMUP_CLIENT_ID: string;
      SUMUP_CLIENT_SECRET: string;
      SUMUP_MERCHANT_CODE: string;
      ALLOWED_ORIGINS?: string;
    }
  }
}

export {}; 