const { PineconeClient } = require('@pinecone-database/pinecone');
const { pipeline } = require('@huggingface/transformers');

process.env.HF_HOME = '../.cache/huggingface';

// Initialize Pinecone client
const initPinecone = async () => {
  const pinecone = new PineconeClient();
  await pinecone.init({
    environment: 'us-east-1',
    apiKey: process.env.PINECONE_API_KEY, // Your Pinecone API key
  });

  const index = pinecone.index('multilingual-e5-large');

  return pinecone;
};

const createEmbedding = async (text) => {
  try {
    // Load Hugging Face pipeline to create embeddings
    const embedder = await pipeline('feature-extraction', 'bert-base-uncased', {
      use_auth_token: process.env.HUGGINGFACE_API_KEY, // Provide Hugging Face API key for authentication
    });
    const embedding = await embedder(text);

    // Return the first embedding vector (which is usually used)
    return embedding[0];
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
};

const storeEmbedding = async (embedding, metadata) => {
  try {
    // Initialize Pinecone
    await initPinecone();

    const index = pineconeClient.Index('multilingual-e5-large'); // Name of your Pinecone index

    // Define the embedding vector and metadata
    const upsertRequest = {
      vectors: [
        {
          id: metadata.title, // Use article title as unique ID, or generate a unique ID
          values: embedding, // The embedding vector
          metadata: {
            title: metadata.title,
            source: metadata.source,
            author: metadata.author,
            sentiment: metadata.sentiment, // You can store sentiment analysis results as metadata
          },
        },
      ],
    };

    // Store embedding and metadata in Pinecone
    await index.upsert({ upsertRequest });
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
