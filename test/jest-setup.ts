/**
 * Jest Global Setup
 * Mocks external services like Redis to prevent connection attempts during tests
 */

// Mock ioredis globally - MUST be before any imports
jest.mock('ioredis', () => {
  const mockRedisInstance = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    setex: jest.fn(),
    expire: jest.fn(),
    exists: jest.fn(),
    keys: jest.fn(),
    ttl: jest.fn(),
    flushall: jest.fn(),
    quit: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    status: 'ready',
    duplicate: jest.fn().mockReturnThis(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    publish: jest.fn(),
  };

  // Return a constructor function
  const MockRedis = jest.fn(() => mockRedisInstance);
  MockRedis.prototype = mockRedisInstance;
  
  return {
    __esModule: true,
    default: MockRedis,
    Redis: MockRedis,
  };
});

// Mock the redis.config.ts exports to prevent actual Redis instantiation
jest.mock('../src/config/redis.config', () => ({
  redisPub: {
    publish: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    quit: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
  },
  redisSub: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    on: jest.fn(),
    quit: jest.fn(),
    disconnect: jest.fn(),
  },
  redisConfig: {
    host: 'localhost',
    port: 6379,
  },
  NOTIFICATION_CHANNEL: 'notification:channel',
}));

// Mock redis.pubsub.ts if it exists
jest.mock('../src/config/redis.pubsub', () => ({
  redisPub: {
    publish: jest.fn(),
    quit: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
  },
  redisSub: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    on: jest.fn(),
    quit: jest.fn(),
    disconnect: jest.fn(),
  },
}), { virtual: true });

// Mock BullMQ Queue
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    process: jest.fn(),
    on: jest.fn(),
    close: jest.fn(),
    obliterate: jest.fn(),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn(),
  })),
  QueueEvents: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn(),
  })),
}));

// Suppress Redis connection errors in console
const originalError = console.error;
console.error = (...args: any[]) => {
  const errorString = args.join(' ');
  // Suppress Redis and ioredis connection errors
  if (
    errorString.includes('ioredis') ||
    errorString.includes('ETIMEDOUT') ||
    errorString.includes('connect ECONNREFUSED') ||
    errorString.includes('Redis')
  ) {
    return; // Suppress Redis errors
  }
  originalError.apply(console, args); // Show other errors
};

// Set test environment variable
process.env.NODE_ENV = 'test';
