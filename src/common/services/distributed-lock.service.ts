import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class DistributedLockService {
  private readonly redis: Redis;
  private readonly logger = new Logger(DistributedLockService.name);

  constructor(private configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
    });
  }

  async acquireLock(
    key: string,
    ttl: number = 30000, // 30 seconds default
    retryAttempts: number = 3,
    retryDelay: number = 100,
  ): Promise<string | null> {
    const lockValue = `${Date.now()}-${Math.random()}`;
    const lockKey = `lock:${key}`;

    for (let attempt = 0; attempt < retryAttempts; attempt++) {
      const result = await this.redis.set(lockKey, lockValue, 'PX', ttl, 'NX');
      
      if (result === 'OK') {
        this.logger.debug(`Lock acquired: ${lockKey}`);
        return lockValue;
      }

      if (attempt < retryAttempts - 1) {
        await this.sleep(retryDelay * Math.pow(2, attempt)); // Exponential backoff
      }
    }

    this.logger.warn(`Failed to acquire lock: ${lockKey}`);
    return null;
  }

  async releaseLock(key: string, lockValue: string): Promise<boolean> {
    const lockKey = `lock:${key}`;
    
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await this.redis.eval(luaScript, 1, lockKey, lockValue);
    const released = result === 1;
    
    if (released) {
      this.logger.debug(`Lock released: ${lockKey}`);
    }
    
    return released;
  }

  async withLock<T>(
    key: string,
    operation: () => Promise<T>,
    ttl: number = 30000,
  ): Promise<T> {
    const lockValue = await this.acquireLock(key, ttl);
    
    if (!lockValue) {
      throw new Error(`Failed to acquire lock for key: ${key}`);
    }

    try {
      return await operation();
    } finally {
      await this.releaseLock(key, lockValue);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
