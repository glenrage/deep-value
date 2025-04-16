const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { PineconeStore } = require('@langchain/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { getPineconeIndex } = require('./pineCone');

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

const embeddingsModel = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  modelName: 'text-embedding-ada-002',
});

const splitTextToDocs = async (text) => {
  return splitter.createDocuments([text]);
};

const storeEmbeddingsInPinecone = async (docs, namespace) => {
  try {
    const pineconeIndex = getPineconeIndex();

    // Check if docs is an array and not empty
    if (!Array.isArray(docs) || docs.length === 0) {
      console.warn('No documents provided to storeEmbeddingsInPinecone.');
      return null; // Or handle as appropriate
    }

    console.log(
      `Storing ${docs.length} documents in Pinecone namespace: ${namespace}`
    );

    // Use the imported pineconeIndex object with PineconeStore
    // fromDocuments handles embedding creation and upserting
    const vectorStore = await PineconeStore.fromDocuments(
      docs,
      embeddingsModel,
      {
        pineconeIndex: pineconeIndex,
        namespace: namespace,
        // textKey: 'pageContent' // Default for LangChain Documents, usually no need to set
      }
    );

    console.log(`Successfully stored embeddings in namespace: ${namespace}`);
    return vectorStore;
  } catch (error) {
    console.error(
      `Error storing embeddings in Pinecone namespace ${namespace}:`,
      error
    );
    throw new Error(`Failed to store embeddings in Pinecone: ${error.message}`);
  }
};

const processAndStoreTranscript = async (transcriptText, ticker) => {
  console.log(`Processing transcript for ${ticker}...`);
  // Add ticker as metadata during splitting
  const docs = await splitTextToDocs(transcriptText, {
    source: 'earnings-transcript',
    ticker: ticker,
  });
  const namespace = `earnings-${ticker.toUpperCase()}`;
  await storeEmbeddingsInPinecone(docs, namespace);
  console.log(`Stored embeddings for ${ticker} in namespace ${namespace}.`);
  return namespace;
};

module.exports = {
  splitTextToDocs,
  storeEmbeddingsInPinecone,
  embeddingsModel,
  processAndStoreTranscript,
};
