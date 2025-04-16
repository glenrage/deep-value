const redisClient = require('../services/redisClient');
const { ChatOpenAI } = require('@langchain/openai');
const { PromptTemplate } = require('@langchain/core/prompts');

const { StructuredOutputParser } = require('langchain/output_parsers');
const { RunnableSequence } = require('@langchain/core/runnables');

const { HumanMessage } = require('@langchain/core/messages');
const sentimentService = require('../services/sentimentService');
const stockService = require('../services/stockService');
const aiService = require('../services/aiService');
const transcriptService = require('../services/transcriptService');
const embeddingService = require('../services/embeddingService');
const { PineconeStore } = require('@langchain/pinecone');
const { getPineconeIndex } = require('../services/pineCone');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CACHE_TTL_SECONDS = 12 * 60 * 60; // 43200

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
// const getFullStockAnalysis = async (req, res) => {
//   const { ticker } = req.query;

//   // Set up headers for Server-Sent Events (SSE)
//   res.setHeader('Content-Type', 'text/event-stream');
//   res.setHeader('Cache-Control', 'no-cache');
//   res.setHeader('Connection', 'keep-alive');
//   res.setHeader('Access-Control-Allow-Origin', '*'); // Add CORS for SSE response
//   res.flushHeaders(); // Ensure headers are sent immediately

//   if (!ticker) {
//     return res.status(400).send('Ticker query parameter is required.');
//   }

//   const upperCaseTicker = ticker.toUpperCase();
//   const cacheKey = `analysis:${upperCaseTicker}`;

//   const sendSseMessage = (data) => {
//     if (!res.writableEnded) {
//       // Check if the connection is still open
//       res.write(`data: ${JSON.stringify(data)}\n\n`);
//     } else {
//       console.warn(
//         `[SSE ${upperCaseTicker}] Attempted to write to closed connection.`
//       );
//     }
//   };

//   const endSseResponse = () => {
//     if (!res.writableEnded) {
//       res.end();
//     }
//   };

//   try {
//     const cachedData = await redisClient.get(cacheKey);

//     if (cachedData) {
//       console.log('Serving from cache');
//       const parsedData = JSON.parse(cachedData);

//       const streamOrder = [
//         'stockData',
//         'dcfAnalysis',
//         'aiExplanation',
//         'sentimentOverview',
//         'technicalAnalysis',
//         'optionsChainAnalysis',
//         'insiderSentiment',
//         'comprehensiveRecommendation',
//       ];

//       for (const key of streamOrder) {
//         if (parsedData[key] !== undefined) {
//           sendSseMessage({ type: key, data: parsedData[key] });
//         }
//       }

//       sendSseMessage({ type: 'complete' });
//       endSseResponse();
//       return;
//     }

//     const stockData = await fetchStockData(ticker);
//     res.write(
//       `data: ${JSON.stringify({
//         type: 'stockData',
//         data: stockData.additionalData,
//       })}\n\n`
//     );

//     const dcfResult = await performDCFCalculation(ticker, stockData);
//     res.write(
//       `data: ${JSON.stringify({ type: 'dcfAnalysis', data: dcfResult })}\n\n`
//     );

//     const aiExplanation = await generateAIExplanation(
//       dcfResult,
//       stockData.additionalData
//     );
//     res.write(
//       `data: ${JSON.stringify({
//         type: 'aiExplanation',
//         data: aiExplanation,
//       })}\n\n`
//     );

//     const sentimentResults = await generateSentimentAnalysis(ticker);
//     res.write(
//       `data: ${JSON.stringify({
//         type: 'sentimentOverview',
//         data: sentimentResults,
//       })}\n\n`
//     );

//     const aiTAexplanation = await generateAItechnicalExplanation(
//       stockData.technicalData.indicators,
//       ticker
//     );
//     res.write(
//       `data: ${JSON.stringify({
//         type: 'technicalAnalysis',
//         data: aiTAexplanation,
//       })}\n\n`
//     );

//     const optionsChainExplanation = await generateAIOptionsChainExplanation(
//       stockData.optionsChainText
//     );
//     res.write(
//       `data: ${JSON.stringify({
//         type: 'optionsChainAnalysis',
//         data: optionsChainExplanation,
//       })}\n\n`
//     );

//     const insiderSentiment = await analyzeInsiderSentiment(
//       ticker,
//       stockData.insiderSentiment
//     );
//     res.write(
//       `data: ${JSON.stringify({
//         type: 'insiderSentiment',
//         data: insiderSentiment,
//       })}\n\n`
//     );

//     const parser = createStockAnalysisParser();
//     const chain = createComprehensiveStockAnalysisChain(parser);

//     const comprehensiveAnalysis = await chain.invoke({
//       ticker,
//       technicalData: JSON.stringify(stockData.technicalData),
//       financialData: JSON.stringify(stockData.additionalData),
//       sentimentOverview: JSON.stringify(sentimentResults),
//       optionsAnalysis: JSON.stringify(optionsChainExplanation),
//       format_instructions: parser.getFormatInstructions(),
//     });

//     res.write(
//       `data: ${JSON.stringify({
//         type: 'comprehensiveRecommendation',
//         data: comprehensiveAnalysis,
//       })}\n\n`
//     );

//     // const responseData = JSON.stringify({
//     //   type: 'complete',
//     //   data: {
//     //     stockData: stockData.additionalData,
//     //     dcfResult,
//     //     aiExplanation,
//     //     sentimentResults,
//     //     aiTAexplanation,
//     //     optionsChainExplanation,
//     //     insiderSentiment,
//     //     comprehensiveAnalysis,
//     //   },
//     // });

//     // await redisClient.set(ticker, responseData, { EX: 43200 });

//     // Finalize the response
//     res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
//     res.end();
//   } catch (error) {
//     console.error('Error running stock analysis pipeline:', error.message);
//     res.write(
//       `data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`
//     );
//     res.end();
//   }
// };

const getFullStockAnalysis = async (req, res) => {
  const { ticker } = req.query;
  if (!ticker) {
    return res.status(400).send('Ticker query parameter is required.');
  }
  const upperCaseTicker = ticker.toUpperCase();
  const cacheKey = `analysis:${upperCaseTicker}`;

  // Set up headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const sendSseMessage = (data) => {
    if (!res.writableEnded) {
      // Check if the connection is still open
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } else {
      console.warn(
        `[SSE ${upperCaseTicker}] Attempted to write to closed connection.`
      );
    }
  };

  const endSseResponse = () => {
    if (!res.writableEnded) {
      res.end();
    }
  };

  try {
    // check cache first
    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      console.log(`[Cache ${upperCaseTicker}] Serving from cache`);
      try {
        const parsedData = JSON.parse(cachedData);

        // Stream cached data back to the client piece by piece
        // Order matters for frontend display logic
        const streamOrder = [
          'stockData',
          'dcfAnalysis',
          'aiExplanation',
          'sentimentOverview',
          'technicalAnalysis',
          'optionsChainAnalysis',
          'insiderSentiment',
          'comprehensiveRecommendation',
        ];

        for (const key of streamOrder) {
          if (parsedData[key] !== undefined) {
            sendSseMessage({ type: key, data: parsedData[key] });
          }
        }

        sendSseMessage({ type: 'complete' });
        endSseResponse();
        return; // Exit after sending cached data
      } catch (parseError) {
        console.error(
          `[Cache ${upperCaseTicker}] Error parsing cached data:`,
          parseError
        );
        // Optional: Delete invalid cache data
        // await redisClient.del(cacheKey);
        // Proceed to fetch fresh data if cache is corrupt
      }
    }

    console.log(
      `[Cache ${upperCaseTicker}] Cache miss. Fetching fresh data...`
    );
    const resultsToCache = {};

    // Fetch and stream data, storing results
    const stockData = await fetchStockData(upperCaseTicker);
    resultsToCache.stockData = stockData.additionalData; // Cache only needed data
    sendSseMessage({ type: 'stockData', data: resultsToCache.stockData });

    resultsToCache.dcfAnalysis = await performDCFCalculation(
      upperCaseTicker,
      stockData
    );
    sendSseMessage({ type: 'dcfAnalysis', data: resultsToCache.dcfAnalysis });

    resultsToCache.aiExplanation = await generateAIExplanation(
      resultsToCache.dcfAnalysis,
      stockData.additionalData
    );
    sendSseMessage({
      type: 'aiExplanation',
      data: resultsToCache.aiExplanation,
    });

    resultsToCache.sentimentOverview = await generateSentimentAnalysis(
      upperCaseTicker
    );
    sendSseMessage({
      type: 'sentimentOverview',
      data: resultsToCache.sentimentOverview,
    });

    resultsToCache.technicalAnalysis = await generateAItechnicalExplanation(
      stockData.technicalData.indicators,
      upperCaseTicker
    );
    sendSseMessage({
      type: 'technicalAnalysis',
      data: resultsToCache.technicalAnalysis,
    });

    resultsToCache.optionsChainAnalysis =
      await generateAIOptionsChainExplanation(stockData.optionsChainText);
    sendSseMessage({
      type: 'optionsChainAnalysis',
      data: resultsToCache.optionsChainAnalysis,
    });

    resultsToCache.insiderSentiment = await analyzeInsiderSentiment(
      upperCaseTicker,
      stockData.insiderSentiment
    );
    sendSseMessage({
      type: 'insiderSentiment',
      data: resultsToCache.insiderSentiment,
    });

    // Perform comprehensive analysis
    const parser = createStockAnalysisParser();
    const chain = createComprehensiveStockAnalysisChain(parser);
    resultsToCache.comprehensiveRecommendation = await chain.invoke({
      ticker: upperCaseTicker,
      technicalData: JSON.stringify(stockData.technicalData),
      financialData: JSON.stringify(stockData.additionalData),
      sentimentOverview: JSON.stringify(resultsToCache.sentimentOverview),
      optionsAnalysis: JSON.stringify(resultsToCache.optionsChainAnalysis),
      format_instructions: parser.getFormatInstructions(),
    });
    sendSseMessage({
      type: 'comprehensiveRecommendation',
      data: resultsToCache.comprehensiveRecommendation,
    });

    // --- Store results in Cache *before* sending complete ---
    try {
      await redisClient.set(
        cacheKey,
        JSON.stringify(resultsToCache),
        'EX',
        CACHE_TTL_SECONDS
      );
      console.log(`[Cache ${upperCaseTicker}] Data stored in cache.`);
    } catch (cacheError) {
      console.error(
        `[Cache ${upperCaseTicker}] Failed to store data in cache:`,
        cacheError
      );
    }

    sendSseMessage({ type: 'complete' });
    endSseResponse();
  } catch (error) {
    console.error(
      `[Error ${upperCaseTicker}] Error running stock analysis pipeline:`,
      error.message
    );
    // Send error message *only if connection is still open*
    sendSseMessage({
      type: 'error',
      message: error.message || 'An unexpected error occurred',
    });
    endSseResponse(); // Ensure response is closed on error
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

const getRagResponse = async (req, res) => {
  const { ticker, query } = req.query;

  try {
    const pineconeIndex = getPineconeIndex();
    const transcript = await transcriptService.fetchEarningsTranscript(ticker);

    // store the transcript in Pinecone
    const namespace = await embeddingService.processAndStoreTranscript(
      transcript,
      ticker
    );

    const vectorStore = await PineconeStore.fromExistingIndex(
      embeddingService.embeddingsModel,
      { pineconeIndex, namespace }
    );

    const results = await vectorStore.similaritySearch(query, 5);

    console.log('results', results);
    const context = results.map((r) => r.pageContent).join('\n\n');

    const prompt = `
You are a financial analyst. Use the following excerpts from ${ticker}'s latest earnings call to answer the user's question.

Context:
${context}

User Question:
${query}
    `;

    const response = await gptModel.call([new HumanMessage(prompt)]);

    res.json({
      response: response.content,
      contextUsed: results,
    });
  } catch (err) {
    console.error('RAG error:', err);
    res.status(500).json({ error: 'Failed to generate RAG response' });
  }
};

module.exports = {
  getFullStockAnalysis,
  searchArticlesBySentiment,
  searchSemnaticArticles,
  getRagResponse,
};
