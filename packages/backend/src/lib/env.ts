import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';

// In Docker/production, env vars are injected by the runtime — dotenv is only for local dev
const envPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  HOST: process.env.HOST || '0.0.0.0',

  // Database
  DATABASE_URL:
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/prod_data',

  // Redis (optional)
  REDIS_URL: process.env.REDIS_URL || '',

  // JWT — no fallback in production
  JWT_SECRET:
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV === 'production'
      ? (() => {
          throw new Error('JWT_SECRET must be set in production');
        })()
      : 'dev-secret-change-in-production'),

  // Database SSL (disable for Docker-internal postgres, enable for cloud-hosted)
  DATABASE_SSL: process.env.DATABASE_SSL === 'true',

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',

  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',
} as const;
