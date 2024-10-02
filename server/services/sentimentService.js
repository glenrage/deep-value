const { Pinecone } = require('@pinecone-database/pinecone');
const { Queue } = require('bullmq');
const { OpenAIEmbeddings, ChatOpenAI } = require('@langchain/openai');
const { HumanMessagePromptTemplate } = require('@langchain/core/prompts');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');

const { fetchStockNewsArticles } = require('../utils/queries');
const {
  truncateText,
  formatNewsDataForSentiment,
} = require('../utils/helpers');

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const indexName = 'stock';

const model = new ChatOpenAI({ model: 'gpt-3.5-turbo-0125', temperature: 0.7 });

// Use OpenAIEmbeddings with the correct model and dimensions
const embeddingsModel = new OpenAIEmbeddings({
  modelName: 'text-embedding-ada-002',
});

// Create a queue for embedding creation
const embeddingQueue = new Queue('embeddingQueue', {
  connection: {
    host: 'localhost',
    port: 6379,
  },
});

const initPinecone = async () => {
  const indexName = 'stock';

  try {
    const existingIndexes = await pc.listIndexes();
    if (!existingIndexes.indexes.some((index) => index.name === indexName)) {
      // If the index does not exist, create it
      await pc.createIndex({
        name: indexName,
        dimension: 1536,
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

// Simplify the sentiment before storing
const simplifiedSentiment = (sentimentResult) => {
  if (sentimentResult.includes('positive')) {
    return 'positive';
  } else if (sentimentResult.includes('negative')) {
    return 'negative';
  } else {
    return 'neutral';
  }
};

const performSentimentAnalysis = async (ticker) => {
  try {
    const news = await fetchStockNewsArticles(ticker);
    const formattedNews = formatNewsDataForSentiment(
      news.data.articles,
      ticker
    );

    const sentimentResults = await Promise.all(
      formattedNews.slice(0, 5).map(async (article) => {
        if (article.content) {
          const truncatedContent = truncateText(article.content, 500);
          const sentimentResult = await analyzeSentiment(truncatedContent);
          const sentimentScore = getSentimentScore(sentimentResult);

          // Store embeddings in Pinecone and offload embeddings storage to message queue
          storeSentimentAnalysisEmbedding(
            embeddingsModel,
            article,
            sentimentResult
          );

          return {
            ...article,
            sentiment: sentimentResult,
            sentimentScore,
          };
        }
        return article;
      })
    );

    const sentimentSummary = calculateSentimentSummary(sentimentResults);

    return {
      ...sentimentSummary,
      articles: sentimentResults,
    };
  } catch (error) {
    console.error(
      `Error performing sentiment analysis for ticker: ${ticker}`,
      error
    );
    throw new Error('Failed to perform sentiment analysis');
  }
};

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

// New function to handle embedding storage for sentiment analysis
const storeSentimentAnalysisEmbedding = async (
  embeddingsModel,
  article,
  sentimentResult
) => {
  try {
    // Create a more informative embedding input by including title and author
    const enrichedContent = `${article.title} by ${
      article.author
    }. ${truncateText(article.content, 1000)}`;
    const embedding = await embeddingsModel.embedQuery(enrichedContent);
    const sentimentCategory = simplifiedSentiment(sentimentResult);

    await storeEmbeddingTask(embedding, {
      title: article.title,
      source: article.source,
      author: article.author,
      sentiment: sentimentResult,
      ticker: article.ticker,
      sentimentCategory,
    });
  } catch (err) {
    console.error('Error generating/storing embedding:', err);
  }
};

const analyzeSentiment = async (text) => {
  try {
    const sentimentPrompt = HumanMessagePromptTemplate.fromTemplate(
      "Analyze the sentiment of the following text: {text}. Provide a summary of whether it's positive, negative, or neutral."
    );
    const formattedMessage = await sentimentPrompt.format({ text });
    const sentimentResult = await model.call([
      new SystemMessage('You are a sentiment analysis model.'),
      new HumanMessage(formattedMessage),
    ]);
    return sentimentResult.content;
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    throw new Error('Failed to analyze sentiment');
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

    // Create a dummy query embedding (could use a more representative vector)
    const queryEmbedding = await embeddingsModel.embedQuery(
      `Find articles about ${ticker} with a ${sentiment} sentiment`
    );

    // Perform a similarity query, including metadata filtering for sentiment and ticker
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: 10,
      includeMetadata: true,
      filter: {
        ticker: ticker,
        sentiment: sentiment,
      },
    });

    if (queryResponse && queryResponse.matches) {
      return queryResponse.matches.map((match) => ({
        id: match.id,
        title: match.metadata.title,
        source: match.metadata.source,
        author: match.metadata.author,
        sentiment: match.metadata.sentiment,
        ticker: match.metadata.ticker,
        sentimentCategory: match.metadata.sentimentCategory,
      }));
    }

    return [];
  } catch (error) {
    console.error('Error querying Pinecone for articles by sentiment:', error);
    throw error;
  }
};

const querySimliarArticles = async (queryText) => {
  console.log('Querying for similar articles:', queryText);
  try {
    await initPinecone();
    const index = pc.Index(indexName);

    const enrichedQueryText = `Find articles related to "${queryText}" in the financial news domain.`;
    const queryEmbedding = await embeddingsModel.embedQuery(enrichedQueryText);

    // Perform a semantic similarity search with the query embedding
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: 10,
      includeMetadata: true,
    });

    console.log('Query response:', queryResponse);
    console.log('Matches:', queryResponse.matches);

    if (queryResponse && queryResponse.matches) {
      return queryResponse.matches.map((match) => ({
        id: match.id,
        title: match.metadata.title,
        source: match.metadata.source,
        author: match.metadata.author,
        sentiment: match.metadata.sentimentCategory,
        ticker: match.metadata.ticker,
      }));
    }

    return [];
  } catch (error) {
    console.error('Error performing semantic search:', error);
    throw error;
  }
};

module.exports = {
  performSentimentAnalysis,
  initPinecone,
  storeSentimentAnalysisEmbedding,
  storeEmbeddingTask,
  getSentimentScore,
  calculateSentimentSummary,
  queryArticlesBySentiment,
  querySimliarArticles,
};
