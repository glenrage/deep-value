require('dotenv').config();

const { Worker } = require('bullmq');
const { sanitizeId } = require('./utils/helpers');
const { initializePinecone, getPineconeIndex } = require('./services/pineCone');

const Redis = require('ioredis');

console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REDIS_URL:', process.env.REDIS_URL);

let redisConnectionOptions;

if (process.env.NODE_ENV === 'production') {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL is not set in production environment');
  }
  // Use the Upstash Redis URL in production
  redisConnectionOptions = {
    connection: new Redis(process.env.REDIS_URL),
  };
  console.log('Using production Redis URL:', process.env.REDIS_URL);
} else {
  // Use local Redis in development
  redisConnectionOptions = {
    host: '127.0.0.1',
    port: 6379,
  };
  console.log('Using development Redis options:', redisConnectionOptions);
}
async function startWorker() {
  try {
    console.log('Worker: Initializing Pinecone...');
    await initializePinecone();
    console.log('Worker: Pinecone initialized successfully.');

    const embeddingWorker = new Worker(
      'embeddingQueue',
      async (job) => {
        console.log(`Worker: Processing embedding job for: ${job.id}`);
        const { embedding, metadata } = job.data;
        const sanitizedId = sanitizeId(metadata.title);

        try {
          const pineconeIndex = getPineconeIndex();

          const existing = await pineconeIndex.fetch([sanitizedId]);
          if (existing && Object.keys(existing.records).length > 0) {
            console.log(
              `Worker: Embedding for ${sanitizedId} already exists. Skipping.`
            );
            return;
          }

          console.log(`Worker: Upserting embedding for ${sanitizedId}`);
          await pineconeIndex.upsert([
            {
              id: sanitizedId,
              values: embedding,
              metadata: {
                title: metadata.title,
                source: metadata.source,
                author: metadata.author,
                sentiment: JSON.stringify(metadata.sentiment),
                ticker: metadata.ticker,
                sentimentCategory: metadata.sentimentCategory,
              },
            },
          ]);

          console.log(
            `Worker: Stored embedding for article: ${metadata.title} (ID: ${sanitizedId})`
          );
        } catch (error) {
          console.error(
            `Worker: Error storing embedding for job ${job.id} (ID: ${sanitizedId}) in Pinecone:`,
            error
          );
          // Re-throw the error so BullMQ marks the job as failed
          throw error;
        }
      },
      {
        connection: redisConnectionOptions.connection,
        // concurrency: 5 // You can adjust concurrency later
      }
    );

    embeddingWorker.on('completed', (job, result) => {
      console.log(`Worker: Embedding job completed for: ${job.id}`);
    });

    embeddingWorker.on('failed', (job, err) => {
      // Log the specific job ID that failed and the error
      console.error(
        `Worker: Embedding job ${job?.id || 'unknown'} failed:`,
        err.message
      );
      // console.error(err); // Log full error stack if needed for debugging
    });

    embeddingWorker.on('error', (err) => {
      // Log errors originating from the worker itself (e.g., connection issues)
      console.error('Worker encountered an error:', err);
    });

    console.log('Worker: Embedding worker started and listening for jobs.');
  } catch (initError) {
    console.error(
      'Worker: FATAL - Failed to initialize dependencies (Pinecone/Redis):',
      initError
    );
    process.exit(1); // Exit if essential services can't start
  }
}

startWorker();
