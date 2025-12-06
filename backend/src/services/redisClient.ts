import { createClient, type RedisClientType } from 'redis';

let client: RedisClientType | null = null;

export const getRedisClient = async (): Promise<RedisClientType | null> => {
  const url = process.env.REDIS_URL;
  if (!url) {
    return null;
  }

  if (client) {
    return client;
  }

  client = createClient({ url });

  client.on('error', (error) => {
    console.error('Redis error:', error);
  });

  try {
    await client.connect();
    console.info('Redis connected');
    return client;
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    client = null;
    return null;
  }
};
