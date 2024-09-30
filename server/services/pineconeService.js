const { Pinecone } = require('@pinecone-database/pinecone');

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

const createEmbedding = async (text) => {
  const { pipeline } = await import('@xenova/transformers');

  try {
    const embedder = await pipeline(
      'feature-extraction',
      'Xenova/bert-base-uncased'
    );
    const embedding = await embedder(text);

    // Return the first embedding vector (which is usually used)
    return embedding[0];
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
};

const reduceEmbeddingToMatchIndex = (embedding, targetSize = 768) => {
  if (embedding.length > targetSize) {
    return embedding.slice(0, targetSize); // Truncate to match the index dimension
  } else if (embedding.length < targetSize) {
    throw new Error(
      `Embedding size (${embedding.length}) is smaller than expected dimension (${targetSize}).`
    );
  }
  return embedding; // If the size matches exactly, return as is
};

const sanitizeId = (id) => {
  // Replace non-ASCII characters with an underscore or remove them
  return id.replace(/[^\x00-\x7F]/g, '_');
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
  createEmbedding,
  storeEmbedding,
};
