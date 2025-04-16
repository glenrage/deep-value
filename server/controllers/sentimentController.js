// const redisClient = require('../services/redisClient');
const { ChatOpenAI } = require('@langchain/openai');
const { PromptTemplate } = require('@langchain/core/prompts');

const { StructuredOutputParser } = require('langchain/output_parsers');
const { RunnableSequence } = require('@langchain/core/runnables');

const { HumanMessage } = require('@langchain/core/messages');
const sentimentService = require('../services/sentimentService');
const stockService = require('../services/stockService');
const aiService = require('../services/aiService');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const { model } = require('../constants');

const gptModel = new ChatOpenAI({
  model: model,
  temperature: 0.2,
  apiKey: OPENAI_API_KEY,
});

// Function to create a structured output parser for stock analysis
const createStockAnalysisParser = () => {
  return StructuredOutputParser.fromNamesAndDescriptions({
    technicalAnalysis: 'A brief technical analysis of the stock',
    fundamentalAnalysis: "A summary of the stock's fundamental analysis",
    sentimentOverview: 'An overview of the current market sentiment',
    optionsAnalysis:
      'An analysis of the options chain and implied market sentiment',
    comprehensiveRecommendation:
      'A concise investment recommendation, buy or sell short or long term',
  });
};

// Function to create a chain for comprehensive stock analysis
const createComprehensiveStockAnalysisChain = (parser) => {
  const prompt = PromptTemplate.fromTemplate(
    'Provide a comprehensive analysis of {ticker} stock based on the following data:\n' +
      'Technical Data: {technicalData}\n' +
      'Financial Data: {financialData}\n' +
      'Market Sentiment: {sentimentOverview}\n' +
      'Options Chain Analysis: {optionsAnalysis}\n' +
      'Please structure your response as follows:\n' +
      '{format_instructions}'
  );

  return RunnableSequence.from([prompt, gptModel, parser]);
};

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
    let stockData;

    if (process.env.NODE_ENV === 'development') {
      stockData = await stockService.getYahooFinanceData(ticker);
    } else {
      stockData = await stockService.getFMPStockData(ticker);
    }
    const additionalData = await stockService.getAdditionalStockData(ticker);
    const technicalData = await stockService.getTechincalAnalysisData(ticker);
    const insiderSentiment = await stockService.getInsiderSentiment(ticker);
    const optionsChainText = await stockService.getOptionsData(ticker);

    return {
      ...stockData,
      additionalData,
      technicalData,
      insiderSentiment,
      optionsChainText,
    };
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

// Utility function to analyze options chain using AI
const generateAIOptionsChainExplanation = async (optionsChainText) => {
  try {
    return await aiService.getOptionsChainExplanation(optionsChainText);
  } catch (error) {
    console.error('Error generating AI options chain explanation', error);
    throw new Error('Failed to generate AI options chain explanation');
  }
};

// Utility function to analyze sentiment using AI
const generateSentimentAnalysis = async (ticker) => {
  try {
    return await sentimentService.performSentimentAnalysis(ticker);
  } catch (error) {
    console.error('Error generating sentiment analysis', error);
    throw new Error('Failed to generate sentiment analysis');
  }
};

// Utility function to analyze insider sentiment
const analyzeInsiderSentiment = async (ticker, insiderSentiment) => {
  try {
    const formattedPrompt = await prompts.insiderSentiment.format({
      ticker,
      insiderSentiment: JSON.stringify(insiderSentiment),
    });
    const result = await gptModel.call([new HumanMessage(formattedPrompt)]);
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
  res.setHeader('Access-Control-Allow-Origin', '*'); // Add CORS for SSE response
  res.flushHeaders(); // Ensure headers are sent immediately

  try {
    // const cachedData = await redisClient.get(ticker);

    // if (cachedData) {
    //   console.log('Serving from cache');
    //   const parsedData = JSON.parse(cachedData);

    //   for (const [key, value] of Object.entries(parsedData.data)) {
    //     res.write(`data: ${JSON.stringify({ type: key, data: value })}\n\n`);
    //   }

    //   res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
    //   res.end();
    //   return;
    // }

    const stockData = await fetchStockData(ticker);
    res.write(
      `data: ${JSON.stringify({
        type: 'stockData',
        data: stockData.additionalData,
      })}\n\n`
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
      `data: ${JSON.stringify({
        type: 'aiExplanation',
        data: aiExplanation,
      })}\n\n`
    );

    const sentimentResults = await generateSentimentAnalysis(ticker);
    res.write(
      `data: ${JSON.stringify({
        type: 'sentimentOverview',
        data: sentimentResults,
      })}\n\n`
    );

    const aiTAexplanation = await generateAItechnicalExplanation(
      stockData.technicalData.indicators,
      ticker
    );
    res.write(
      `data: ${JSON.stringify({
        type: 'technicalAnalysis',
        data: aiTAexplanation,
      })}\n\n`
    );

    const optionsChainExplanation = await generateAIOptionsChainExplanation(
      stockData.optionsChainText
    );
    res.write(
      `data: ${JSON.stringify({
        type: 'optionsChainAnalysis',
        data: optionsChainExplanation,
      })}\n\n`
    );

    const insiderSentiment = await analyzeInsiderSentiment(
      ticker,
      stockData.insiderSentiment
    );
    res.write(
      `data: ${JSON.stringify({
        type: 'insiderSentiment',
        data: insiderSentiment,
      })}\n\n`
    );

    const parser = createStockAnalysisParser();
    const chain = createComprehensiveStockAnalysisChain(parser);

    const comprehensiveAnalysis = await chain.invoke({
      ticker,
      technicalData: JSON.stringify(stockData.technicalData),
      financialData: JSON.stringify(stockData.additionalData),
      sentimentOverview: JSON.stringify(sentimentResults),
      optionsAnalysis: JSON.stringify(optionsChainExplanation),
      format_instructions: parser.getFormatInstructions(),
    });

    res.write(
      `data: ${JSON.stringify({
        type: 'comprehensiveRecommendation',
        data: comprehensiveAnalysis,
      })}\n\n`
    );

    // const responseData = JSON.stringify({
    //   type: 'complete',
    //   data: {
    //     stockData: stockData.additionalData,
    //     dcfResult,
    //     aiExplanation,
    //     sentimentResults,
    //     aiTAexplanation,
    //     optionsChainExplanation,
    //     insiderSentiment,
    //     comprehensiveAnalysis,
    //   },
    // });

    // await redisClient.set(ticker, responseData, { EX: 43200 });

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
  getRagResponse,
};
