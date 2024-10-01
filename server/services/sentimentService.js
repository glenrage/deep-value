const { Pinecone } = require('@pinecone-database/pinecone');
const { Queue } = require('bullmq');
const { truncateText, sanitizeId } = require('../utils/helpers');
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

// New function to handle embedding storage for sentiment analysis
const storeSentimentAnalysisEmbedding = async (
  embeddingsModel,
  article,
  sentimentResult
) => {
  try {
    const truncatedContent = truncateText(article.content, 500);
    const embedding = await embeddingsModel.embedQuery(truncatedContent);

    await storeEmbeddingTask(embedding, {
      title: article.title,
      source: article.source,
      author: article.author,
      sentiment: sentimentResult,
    });
  } catch (err) {
    console.error('Error generating/storing embedding:', err);
  }
};

const calculateSentimentSummary = (sentimentResults) => {
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;
  let overallScore = 0;

  sentimentResults.forEach((result) => {
    if (result.sentiment.includes('positive')) {
      positiveCount++;
      overallScore += 1;
    } else if (result.sentiment.includes('negative')) {
      negativeCount++;
      overallScore -= 1;
    } else {
      neutralCount++;
    }
  });

  const overallSentiment =
    overallScore > 0 ? 'positive' : overallScore < 0 ? 'negative' : 'neutral';

  return {
    overallSentiment,
    sentimentBreakdown: {
      positive: positiveCount,
      negative: negativeCount,
      neutral: neutralCount,
    },
  };
};

const getSentimentScore = (sentimentResult) => {
  if (sentimentResult.includes('positive')) return 1;
  if (sentimentResult.includes('negative')) return -1;
  return 0;
};

// New function to query Pinecone for articles based on sentiment
const queryArticlesBySentiment = async (ticker, sentiment) => {
  try {
    await initPinecone();
    const index = pc.Index(indexName);

    // Formulating the query to find articles based on the given ticker and sentiment
    const queryResponse = await index.query({
      topK: 10,
      includeMetadata: true,
      filter: {
        AND: [{ ticker: ticker }, { sentiment: sentiment }],
      },
    });

    if (queryResponse && queryResponse.matches) {
      return queryResponse.matches.map((match) => ({
        id: match.id,
        title: match.metadata.title,
        source: match.metadata.source,
        author: match.metadata.author,
        sentiment: match.metadata.sentiment,
      }));
    }

    return [];
  } catch (error) {
    console.error('Error querying Pinecone for articles by sentiment:', error);
    throw error;
  }
};

module.exports = {
  storeSentimentAnalysisEmbedding,
  storeEmbedding,
  storeEmbeddingTask,
  getSentimentScore,
  calculateSentimentSummary,
  queryArticlesBySentiment,
};
