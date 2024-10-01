require('dotenv').config();

const { Worker } = require('bullmq');
const { Pinecone } = require('@pinecone-database/pinecone');
const { reduceEmbeddingToMatchIndex, sanitizeId } = require('./utils/helpers');

const indexName = 'quickstart';
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

const initPinecone = async () => {
  try {
    const existingIndexes = await pc.listIndexes();
    if (!existingIndexes.indexes.some((index) => index.name === indexName)) {
      // If the index does not exist, create it
      await pc.createIndex({
        name: indexName,
        dimension: 768, // Example dimension for BERT embeddings
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1',
          },
        },
      });
    } else {
      console.log(`Index ${indexName} already exists.`);
    }
  } catch (error) {
    console.error('Error initializing Pinecone:', error);
    throw error;
  }
};

// Create a new worker to handle the embedding jobs
const embeddingWorker = new Worker(
  'embeddingQueue',
  async (job) => {
    console.log(`Processing embedding job for: ${job.id}`); // Add this log to verify if the worker receives the job

    const { embedding, metadata } = job.data;
    try {
      await initPinecone();
      const index = pc.Index(indexName);
      const flatEmbedding = reduceEmbeddingToMatchIndex(embedding, 768);
      const sanitizedId = sanitizeId(metadata.title);

      const existingEmbedding = await index.fetch([sanitizedId]);
      if (
        existingEmbedding &&
        Object.keys(existingEmbedding.records).length > 0
      ) {
        console.log(
          `Embedding for ${metadata.title} already exists in Pinecone. Skipping insertion.`
        );
        return;
      }

      await index.upsert([
        {
          id: sanitizedId,
          values: flatEmbedding,
          metadata: {
            title: metadata.title,
            source: metadata.source,
            author: metadata.author,
            sentiment: JSON.stringify(metadata.sentiment),
          },
        },
      ]);

      console.log(`Stored embedding for article: ${metadata.title}`);
    } catch (error) {
      console.error('Error storing embedding in Pinecone:', error);
      throw error;
    }
  },
  {
    connection: {
      host: 'localhost',
      port: 6379,
    },
  }
);

embeddingWorker.on('completed', (job) => {
  console.log(`Embedding job completed for: ${job.id}`);
});

embeddingWorker.on('failed', (job, err) => {
  console.error(`Embedding job failed for: ${job.id}`, err);
});
