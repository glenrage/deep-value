const redis = require('redis');

const isDevelopment = process.env.NODE_ENV === 'development';

const redisOptions = {
  url: isDevelopment ? 'redis://localhost:6379' : process.env.REDIS_URL,
};

const client = redis.createClient(redisOptions);

client.on('error', (err) => {
  console.error('Redis error:', err);
});

(async () => {
  try {
    await client.connect();
    console.log(`Connected to Redis: ${isDevelopment ? 'Local' : 'Upstash'}`);
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
})();

module.exports = client;
