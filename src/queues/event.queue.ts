import { Queue } from 'bullmq';
import { redisConfig } from 'src/config/redis.config';

export const eventQueue = new Queue('event-queue', {
  connection: redisConfig,
});
