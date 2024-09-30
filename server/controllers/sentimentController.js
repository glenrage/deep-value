const { ChatOpenAI } = require('@langchain/openai');
const { OpenAIEmbeddings } = require('@langchain/openai');
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
const { NVDA_MOCK } = require('../mocks');

const {
  formatNewsDataForSentiment,
  truncateText,
} = require('../utils/helpers');

const model = new ChatOpenAI({ model: 'gpt-3.5-turbo-0125', temperature: 0.7 });
const embeddingsModel = new OpenAIEmbeddings();

// Define prompts for stock analysis
const stockDataPrompt = PromptTemplate.fromTemplate(
  `Retrieve stock data for ticker: {ticker}.`
);
const dcfCalculationPrompt = PromptTemplate.fromTemplate(
  `Calculate the DCF value using the provided stock data: {stockData} and additional data: {additionalData}.`
);
const insiderSentimentPrompt = PromptTemplate.fromTemplate(
  `The insider sentiment for the stock ticker {ticker} is given below: {insiderSentiment}. 
  Based on this data, analyze whether the insider sentiment is positive or negative, and discuss how it might affect the stock's future performance.`
);
const aiExplanationPrompt = PromptTemplate.fromTemplate(
  `Provide an AI explanation of the DCF result: {dcfResult} with additional stock information: {additionalData}.`
);
const sentimentAnalysisPrompt = PromptTemplate.fromTemplate(
  `Analyze the sentiment of the following news articles: {formattedNews}. Provide a summary of whether they are positive, negative, or neutral.`
);

// Compose prompts together using PipelinePromptTemplate
const composedPrompt = new PipelinePromptTemplate({
  pipelinePrompts: [
    {
      name: 'stockData',
      prompt: stockDataPrompt,
    },
    {
      name: 'dcfCalculation',
      prompt: dcfCalculationPrompt,
    },
    {
      name: 'aiExplanation',
      prompt: aiExplanationPrompt,
    },
    {
      name: 'sentimentAnalysis',
      prompt: sentimentAnalysisPrompt,
    },
  ],
  finalPrompt: PromptTemplate.fromTemplate(
    `{stockData} {dcfCalculation} {aiExplanation} {sentimentAnalysis}`
  ),
});

// main pipeline chain for stock analysis
const stockAnalysisPipeline = async (ticker) => {
  let additionalData;
  let dcfResult;
  let aiExplanation;
  let sentimentResults;
  let insiderSentiment;
  try {
    // Step 1: Get Stock Data
    try {
      additionalData = await stockService.getAdditionalStockData(ticker);
      insiderSentiment = await stockService.getInsiderSentiment(ticker);
    } catch (error) {
      console.error(
        `Error fetching additional stock data for ticker: ${ticker}`,
        error
      );
      throw new Error('Failed to fetch additional stock data');
    }

    // Step 2: Perform DCF Calculation
    try {
      const dcfInputs = stockService.prepareDCFInputs(
        NVDA_MOCK,
        additionalData
      );
      const {
        freeCashFlow,
        growthRate,
        discountRate,
        terminalGrowthRate,
        sharesOutstanding,
      } = dcfInputs;

      dcfResult = stockService.calculateDCFAllScenarios(
        freeCashFlow,
        growthRate,
        discountRate,
        terminalGrowthRate,
        sharesOutstanding
      );
    } catch (error) {
      console.error(`Error calculating DCF for ticker: ${ticker}`, error);
      throw new Error('Failed to calculate DCF');
    }

    // Step 3: AI Explanation of DCF & stock financial metrics
    try {
      aiExplanation = await aiService.getAIExplanation(
        dcfResult,
        additionalData
      );
    } catch (error) {
      console.error(
        `Error generating AI explanation for ticker: ${ticker}`,
        error
      );
      throw new Error('Failed to generate AI explanation');
    }

    // Step 4: Perform Sentiment Analysis on News Articles
    try {
      const news = await axios.get(
        `https://newsapi.org/v2/everything?q=${ticker}&apiKey=${process.env.NEWSAPI_KEY}`
      );

      const formattedNews = formatNewsDataForSentiment(news.data.articles);

      sentimentResults = await Promise.all(
        formattedNews.slice(0, 5).map(async (article) => {
          if (article.content) {
            const truncatedContent = truncateText(article.content, 500);

            const sentimentPrompt = HumanMessagePromptTemplate.fromTemplate(
              "Analyze the sentiment of the following text: {text}. Provide a summary of whether it's positive, negative, or neutral."
            );

            const formattedMessage = await sentimentPrompt.format({
              text: truncatedContent,
            });

            const sentimentResult = await model.call([
              new SystemMessage('You are a sentiment analysis model.'),
              new HumanMessage(formattedMessage),
            ]);

            const embedding =
              await embeddingsModel.embedQuery(truncatedContent);

            await pineconeService.storeEmbedding(embedding, {
              title: article.title,
              source: article.source,
              author: article.author,
              sentiment: sentimentResult.content,
            });

            return { ...article, sentiment: sentimentResult.content };
          }
          return article;
        })
      );
    } catch (error) {
      console.error(
        `Error performing sentiment analysis for ticker: ${ticker}`,
        error
      );
      throw new Error('Failed to perform sentiment analysis');
    }

    // Step 5: Analyze Insider Sentiment
    try {
      const formattedInsiderSentiment = JSON.stringify(insiderSentiment);
      const formattedPrompt = await insiderSentimentPrompt.format({
        ticker,
        insiderSentiment: formattedInsiderSentiment,
      });

      const insiderSentimentResult = await model.call([
        new HumanMessage(formattedPrompt),
      ]);
      insiderSentiment = insiderSentimentResult.content;
    } catch (error) {
      console.error(
        `Error analyzing insider sentiment for ticker: ${ticker}`,
        error
      );
      throw new Error('Failed to analyze insider sentiment');
    }

    // Execute composed prompt with formatted data
    try {
      const formattedPrompt = await composedPrompt.format({
        ticker,
        stockData: JSON.stringify(NVDA_MOCK),
        dcfCalculation: JSON.stringify(dcfResult),
        additionalData: JSON.stringify(additionalData),
        formattedNews: JSON.stringify(sentimentResults),
        aiExplanation,
        insiderSentiment,
      });

      return {
        dcfAnalysis: dcfResult,
        aiExplanation,
        sentimentAnalysis: sentimentResults,
        insiderSentiment,
        formattedPrompt,
      };
    } catch (error) {
      console.error(
        `Error composing final prompt for ticker: ${ticker}`,
        error
      );
      throw new Error('Failed to compose final prompt');
    }
  } catch (error) {
    console.error('Error running stock analysis pipeline:', error.message);
    throw new Error('Failed to complete stock analysis');
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
