const { ChatOpenAI, OpenAIEmbeddings } = require('@langchain/openai');
const {
  PromptTemplate,
  HumanMessagePromptTemplate,
} = require('@langchain/core/prompts');
const { SystemMessage, HumanMessage } = require('@langchain/core/messages');
const sentimentService = require('../services/sentimentService');
const stockService = require('../services/stockService');
const aiService = require('../services/aiService');
const {
  formatNewsDataForSentiment,
  truncateText,
} = require('../utils/helpers');

const { fetchStockNewsArticles } = require('../utils/queries');

const embeddingsModel = new OpenAIEmbeddings();
const model = new ChatOpenAI({ model: 'gpt-3.5-turbo-0125', temperature: 0.7 });

const prompts = {
  stockData: PromptTemplate.fromTemplate(
    `Retrieve stock data for ticker: {ticker}.`
  ),
  dcfCalculation: PromptTemplate.fromTemplate(
    `Calculate the DCF value using the provided stock data: {stockData} and additional data: {additionalData}.`
  ),
  technicalAnalysis: PromptTemplate.fromTemplate(
    `Perform technical analysis on the stock data: {aiTAexplanation}.`
  ),
  insiderSentiment: PromptTemplate.fromTemplate(
    `The insider sentiment for the stock ticker {ticker} is given below: {insiderSentiment}. Based on this data, analyze whether the insider sentiment is positive or negative, and discuss how it might affect the stock's future performance.`
  ),
  aiExplanation: PromptTemplate.fromTemplate(
    `Provide an AI explanation of the DCF result: {dcfResult} with additional stock information: {additionalData}.`
  ),
  sentimentAnalysis: PromptTemplate.fromTemplate(
    `Analyze the sentiment of the following news articles: {formattedNews}. Provide a summary of whether they are positive, negative, or neutral.`
  ),
};

// Utility function to fetch stock data
const fetchStockData = async (ticker) => {
  try {
    const stockData = await stockService.getStockData(ticker);
    const additionalData = await stockService.getAdditionalStockData(ticker);
    const technicalData = await stockService.getTechincalAnalysisData(ticker);
    const insiderSentiment = await stockService.getInsiderSentiment(ticker);

    return { ...stockData, additionalData, technicalData, insiderSentiment };
  } catch (error) {
    console.error(`Error fetching stock data for ticker: ${ticker}`, error);
    throw new Error('Failed to fetch stock data');
  }
};

// Utility function to perform DCF calculation
const performDCFCalculation = async (ticker, stockData) => {
  try {
    const dcfInputs = stockService.prepareDCFInputs(
      stockData,
      stockData.additionalData
    );
    return stockService.calculateDCFAllScenarios(
      dcfInputs.freeCashFlow,
      dcfInputs.growthRate,
      dcfInputs.discountRate,
      dcfInputs.terminalGrowthRate,
      dcfInputs.sharesOutstanding
    );
  } catch (error) {
    console.error(`Error calculating DCF for ticker: ${ticker}`, error);
    throw new Error('Failed to calculate DCF');
  }
};

// Utility function to generate AI stock explanation
const generateAIExplanation = async (dcfResult, additionalData) => {
  try {
    return await aiService.getStockExplanation(dcfResult, additionalData);
  } catch (error) {
    console.error('Error generating AI explanation', error);
    throw new Error('Failed to generate AI explanation');
  }
};

// Utility function to generate AI technical analysis explanation
const generateAItechnicalExplanation = async (data, ticker) => {
  try {
    return await aiService.getTAExplanation(data, ticker);
  } catch (error) {
    console.error('Error generating technical AI explanation', error);
    throw new Error('Failed to generate technical AI explanation');
  }
};

// Utility function to perform sentiment analysis
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
          const sentimentScore =
            sentimentService.getSentimentScore(sentimentResult);

          // Store embeddings in Pinecone and offload embeddings storage to message queue
          sentimentService.storeSentimentAnalysisEmbedding(
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

    const sentimentSummary =
      sentimentService.calculateSentimentSummary(sentimentResults);

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

// Utility function to analyze sentiment using AI
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

// Utility function to analyze insider sentiment
const analyzeInsiderSentiment = async (ticker, insiderSentiment) => {
  try {
    const formattedPrompt = await prompts.insiderSentiment.format({
      ticker,
      insiderSentiment: JSON.stringify(insiderSentiment),
    });
    const result = await model.call([new HumanMessage(formattedPrompt)]);
    return result.content;
  } catch (error) {
    console.error(
      `Error analyzing insider sentiment for ticker: ${ticker}`,
      error
    );
    throw new Error('Failed to analyze insider sentiment');
  }
};

// Controller function to get full stock & sentiment analysis using SSE
const getFullStockAnalysis = async (req, res) => {
  const { ticker } = req.query;

  // Set up headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stockData = await fetchStockData(ticker);
    res.write(
      `data: ${JSON.stringify({ type: 'stockData', data: stockData })}\n\n`
    );

    const dcfResult = await performDCFCalculation(ticker, stockData);
    res.write(
      `data: ${JSON.stringify({ type: 'dcfAnalysis', data: dcfResult })}\n\n`
    );

    const aiExplanation = await generateAIExplanation(
      dcfResult,
      stockData.additionalData
    );
    res.write(
      `data: ${JSON.stringify({ type: 'aiExplanation', data: aiExplanation })}\n\n`
    );

    const sentimentResults = await performSentimentAnalysis(ticker);
    res.write(
      `data: ${JSON.stringify({ type: 'sentimentAnalysis', data: sentimentResults })}\n\n`
    );

    const aiTAexplanation = await generateAItechnicalExplanation(
      stockData.technicalData.indicators,
      ticker
    );
    res.write(
      `data: ${JSON.stringify({ type: 'technicalAnalysis', data: aiTAexplanation })}\n\n`
    );

    const insiderSentiment = await analyzeInsiderSentiment(
      ticker,
      stockData.insiderSentiment
    );
    res.write(
      `data: ${JSON.stringify({ type: 'insiderSentiment', data: insiderSentiment })}\n\n`
    );

    // Finalize the response
    res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
    res.end();
  } catch (error) {
    console.error('Error running stock analysis pipeline:', error.message);
    res.write(
      `data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`
    );
    res.end();
  }
};

const searchArticlesBySentiment = async (req, res) => {
  const { sentiment, ticker } = req.query;

  try {
    const searchResults = await sentimentService.queryArticlesBySentiment(
      ticker,
      sentiment
    );
    res.json(searchResults);
  } catch (error) {
    console.error('Error searching stock sentiment:', error);
    res.status(500).json({ error: 'Failed to search stock sentiment' });
  }
};

const searchSemnaticArticles = async (req, res) => {
  const query = req.query;

  try {
    const searchResults = await sentimentService.querySimliarArticles(
      query.query
    );
    res.json(searchResults);
  } catch (error) {
    console.error('Error searching stock sentiment:', error);
    res.status(500).json({ error: 'Failed to search stock sentiment' });
  }
};

module.exports = {
  getFullStockAnalysis,
  searchArticlesBySentiment,
  searchSemnaticArticles,
};
