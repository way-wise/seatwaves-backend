import { RedisOptions } from 'bullmq';
import { config } from 'dotenv';
import Redis from 'ioredis';

config();

export const redisConfig: RedisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
  // tls: {},
};

export const redisPub = new Redis(redisConfig);
export const redisSub = new Redis(redisConfig);

export const NOTIFICATION_CHANNEL = 'notification:channel';
