import { Queue } from 'bullmq';
import { redisConfig } from 'src/config/redis.config';

export const emailQueue = new Queue('email-queue', {
  connection: redisConfig,
});
