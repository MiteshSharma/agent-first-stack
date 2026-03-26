import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from './env';
import { User } from '../entities/User';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  synchronize: process.env.TYPEORM_SYNCHRONIZE === 'true' || env.isDevelopment,
  logging: env.isDevelopment ? ['error', 'warn'] : ['error'],
  entities: [User],
  migrations: [__dirname + '/../migrations/*.{ts,js}'],
  subscribers: [],
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
  extra: {
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000,
  },
});
