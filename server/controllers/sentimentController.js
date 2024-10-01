const { ChatOpenAI, OpenAIEmbeddings } = require('@langchain/openai');
const {
  PromptTemplate,
  PipelinePromptTemplate,
  HumanMessagePromptTemplate,
} = require('@langchain/core/prompts');
const { SystemMessage, HumanMessage } = require('@langchain/core/messages');
const pineconeService = require('../services/pineconeService');
const stockService = require('../services/stockService');
const aiService = require('../services/aiService');
const axios = require('axios');
const {
  formatNewsDataForSentiment,
  truncateText,
} = require('../utils/helpers');

const model = new ChatOpenAI({ model: 'gpt-3.5-turbo-0125', temperature: 0.7 });
const embeddingsModel = new OpenAIEmbeddings();

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

// Compose prompts
const composedPrompt = new PipelinePromptTemplate({
  pipelinePrompts: [
    { name: 'stockData', prompt: prompts.stockData },
    { name: 'dcfCalculation', prompt: prompts.dcfCalculation },
    { name: 'technicalAnalysis', prompt: prompts.technicalAnalysis },
    { name: 'aiExplanation', prompt: prompts.aiExplanation },
    { name: 'sentimentAnalysis', prompt: prompts.sentimentAnalysis },
  ],
  finalPrompt: PromptTemplate.fromTemplate(
    `{stockData} {dcfCalculation} {aiExplanation} {sentimentAnalysis} {technicalAnalysis}`
  ),
});

// Main pipeline chain for stock analysis
const stockAnalysisPipeline = async (ticker) => {
  try {
    const stockData = await fetchStockData(ticker);
    const dcfResult = await performDCFCalculation(ticker, stockData);
    const aiTAexplanation = await generateAItechnicalExplanation(
      stockData.technicalData.indicators,
      ticker
    );
    const aiExplanation = await generateAIExplanation(
      dcfResult,
      stockData.additionalData
    );
    const sentimentResults = await performSentimentAnalysis(ticker);
    const insiderSentiment = await analyzeInsiderSentiment(
      ticker,
      stockData.insiderSentiment
    );

    return {
      dcfAnalysis: dcfResult,
      aiExplanation,
      sentimentAnalysis: sentimentResults,
      aiTAexplanation,
      insiderSentiment,
      formattedPrompt: await composeFinalPrompt(ticker, {
        stockData: JSON.stringify(stockData),
        aiTAexplanation,
        dcfCalculation: JSON.stringify(dcfResult),
        additionalData: JSON.stringify(stockData.additionalData),
        formattedNews: JSON.stringify(sentimentResults),
        aiExplanation,
        insiderSentiment,
      }),
    };
  } catch (error) {
    console.error('Error running stock analysis pipeline:', error.message);
    throw new Error('Failed to complete stock analysis');
  }
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
    const news = await axios.get(
      `https://newsapi.org/v2/everything?q=${ticker}&apiKey=${process.env.NEWSAPI_KEY}`
    );
    const formattedNews = formatNewsDataForSentiment(news.data.articles);

    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    let overallScore = 0;

    const sentimentResults = await Promise.all(
      formattedNews.slice(0, 5).map(async (article) => {
        if (article.content) {
          const truncatedContent = truncateText(article.content, 500);
          const sentimentResult = await analyzeSentiment(truncatedContent);

          // Add embedding task to the queue (do not await here)
          embeddingsModel
            .embedQuery(truncatedContent)
            .then((embedding) => {
              pineconeService.storeEmbeddingTask(embedding, {
                title: article.title,
                source: article.source,
                author: article.author,
                sentiment: sentimentResult,
              });
            })
            .catch((err) => {
              console.error('Error generating/storing embedding:', err);
            });

          // Determine sentiment score
          let sentimentScore = 0;
          if (sentimentResult.includes('positive')) {
            positiveCount++;
            sentimentScore = 1;
          } else if (sentimentResult.includes('negative')) {
            negativeCount++;
            sentimentScore = -1;
          } else {
            neutralCount++;
            sentimentScore = 0;
          }

          overallScore += sentimentScore;

          return {
            ...article,
            sentiment: sentimentResult,
            sentimentScore,
          };
        }
        return article;
      })
    );

    const overallSentiment =
      overallScore > 0 ? 'positive' : overallScore < 0 ? 'negative' : 'neutral';

    return {
      overallSentiment,
      sentimentBreakdown: {
        positive: positiveCount,
        negative: negativeCount,
        neutral: neutralCount,
      },
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

// Utility function to compose final prompt
const composeFinalPrompt = async (ticker, promptData) => {
  try {
    return await composedPrompt.format(promptData);
  } catch (error) {
    console.error(`Error composing final prompt for ticker: ${ticker}`, error);
    throw new Error('Failed to compose final prompt');
  }
};

// Controller function to get full stock & sentiment analysis
const getFullStockAnalysis = async (req, res) => {
  const { ticker } = req.query;

  try {
    const analysisResult = await stockAnalysisPipeline(ticker);

    res.json(analysisResult);
  } catch (error) {
    console.error('Error running stock analysis pipeline:', error.message);
    res.status(500).json({ error: 'Failed to complete stock analysis' });
  }
};

module.exports = {
  getFullStockAnalysis,
};
