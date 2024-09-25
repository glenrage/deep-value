const { pipeline } = require('@huggingface/transformers');
const pinecone = require('pinecone-client'); // Assuming you have Pinecone client installed and set up

// Initialize Pinecone client
const pineconeClient = new pinecone.PineconeClient();

const initPinecone = async () => {
  await pineconeClient.init({
    environment: 'your-pinecone-environment', // e.g., 'us-west1-gcp'
    apiKey: process.env.PINECONE_API_KEY, // Use your Pinecone API key
  });
};

const createEmbedding = async (text) => {
  try {
    // Load Hugging Face pipeline to create embeddings
    const embedder = pipeline('feature-extraction', 'your-model-name'); // Replace with your specific model
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

    const index = pineconeClient.Index('your-index-name'); // Name of your Pinecone index

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
