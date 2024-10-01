const { Pinecone } = require('@pinecone-database/pinecone');
const { Queue } = require('bullmq');

const indexName = 'quickstart';

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

// Create a queue for embedding creation
const embeddingQueue = new Queue('embeddingQueue', {
  connection: {
    host: 'localhost',
    port: 6379,
  },
});

const storeEmbeddingTask = async (embedding, metadata) => {
  try {
    await embeddingQueue.add('createEmbedding', { embedding, metadata });
    console.log(
      `Task added for storing embedding for article: ${metadata.title}`
    );
  } catch (error) {
    console.error('Error adding embedding task to queue:', error);
    throw error;
  }
};

const storeEmbedding = async (embedding, metadata) => {
  try {
    await initPinecone();

    const index = pc.Index(indexName);

    const flatEmbedding = Array.isArray(embedding)
      ? reduceEmbeddingToMatchIndex(embedding, 768)
      : reduceEmbeddingToMatchIndex(Array.from(embedding.data), 768);

    const sentimentString = JSON.stringify(metadata.sentiment);
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
        id: sanitizedId, // Use the article title or generate a unique ID
        values: flatEmbedding,
        metadata: {
          title: metadata.title,
          source: metadata.source,
          author: metadata.author,
          sentiment: sentimentString, // Convert sentiment array to a JSON string
        },
      },
    ]);

    console.log(`Stored embedding for article: ${metadata.title}`);
  } catch (error) {
    console.error('Error storing embedding in Pinecone:', error);
    throw error;
  }
};

module.exports = {
  storeEmbedding,
  storeEmbeddingTask,
};
