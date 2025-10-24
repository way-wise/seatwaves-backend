import Redis from 'ioredis';

async function clearCache() {
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  });

  try {
    console.log('Clearing all user permission caches...');
    
    // Get all keys matching user:perms:*
    const keys = await redis.keys('user:perms:*');
    
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`✅ Cleared ${keys.length} cached permission entries`);
    } else {
      console.log('ℹ️  No cached permissions found');
    }
    
    console.log('✅ Cache cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
  } finally {
    await redis.quit();
  }
}

clearCache();
