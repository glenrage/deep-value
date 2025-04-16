// services/pinecone.js
require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'stock'; // Use env var or default
// const PINECONE_HOST = process.env.PINECONE_HOST; // Use HOST if your client version needs it explicitly

if (!PINECONE_API_KEY) {
  throw new Error(
    'Missing required Pinecone environment variable: PINECONE_API_KEY'
  );
}
// Add checks for HOST or ENVIRONMENT if needed based on your Pinecone client version

let pineconeClient = null;
let pineconeIndex = null;
let isPineconeInitialized = false;

/**
 * Initializes the Pinecone client and gets the index object.
 * Ensures initialization only happens once.
 */
const initializePinecone = async () => {
  if (isPineconeInitialized) {
    console.log('Pinecone already initialized.');
    return { pineconeClient, pineconeIndex };
  }

  console.log('Initializing Pinecone...');
  try {
    pineconeClient = new Pinecone({
      apiKey: PINECONE_API_KEY,
      // If using HOST:
      // host: PINECONE_HOST
      // If using ENVIRONMENT (older clients):
      // environment: process.env.PINECONE_ENVIRONMENT
    });

    const indexName = PINECONE_INDEX_NAME;

    // Check if index exists
    const existingIndexes = await pineconeClient.listIndexes();
    const indexExists = existingIndexes.indexes?.some(
      (index) => index.name === indexName
    );

    if (!indexExists) {
      console.log(`Index "${indexName}" does not exist. Creating...`);
      // Define index spec according to your needs (matches sentimentService)
      await pineconeClient.createIndex({
        name: indexName,
        dimension: 1536, // Match your embedding model (ada-002 is 1536)
        metric: 'cosine',
        spec: {
          serverless: {
            // Or pod-based spec if needed
            cloud: 'aws',
            region: 'us-east-1', // Choose your preferred cloud/region
          },
        },
        waitUntilReady: true, // Wait until the index is ready
        suppressConflicts: true, // Don't throw error if it was created concurrently
      });
      console.log(`Index "${indexName}" created successfully.`);
    } else {
      console.log(`Index "${indexName}" already exists.`);
    }

    // Get the index object
    pineconeIndex = pineconeClient.index(indexName);
    isPineconeInitialized = true;
    console.log(`Successfully connected to Pinecone index: ${indexName}`);

    return { pineconeClient, pineconeIndex };
  } catch (error) {
    console.error('Failed to initialize Pinecone:', error);
    // Decide how to handle failure - throw or allow app to continue degraded?
    throw new Error(`Failed to initialize Pinecone: ${error.message}`);
  }
};

/**
 * Returns the initialized Pinecone index object.
 * Throws an error if Pinecone is not initialized.
 */
const getPineconeIndex = () => {
  if (!isPineconeInitialized || !pineconeIndex) {
    // This scenario shouldn't happen if initializePinecone is called on startup,
    // but it's a safeguard.
    throw new Error(
      'Pinecone has not been initialized. Call initializePinecone() first.'
    );
  }
  return pineconeIndex;
};

/**
 * Returns the initialized Pinecone client object.
 * Throws an error if Pinecone is not initialized.
 */
const getPineconeClient = () => {
  if (!isPineconeInitialized || !pineconeClient) {
    throw new Error(
      'Pinecone has not been initialized. Call initializePinecone() first.'
    );
  }
  return pineconeClient;
};

module.exports = {
  initializePinecone, // Export the initializer function
  getPineconeIndex, // Export a getter for the index
  getPineconeClient, // Export a getter for the client (optional, if needed directly)
  PINECONE_INDEX_NAME, // Export the index name constant
};
