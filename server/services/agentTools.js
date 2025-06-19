const { DynamicTool } = require('@langchain/core/tools');
const {
  getAdditionalStockData,
  getTechincalAnalysisData,
} = require('./stockService');
const { performSentimentAnalysis } = require('./sentimentService');

// agent tools using actual services
async function getCurrentPriceServiceWrapper(ticker) {
  console.log(`[Tool:getCurrentPriceServiceWrapper] Called for ${ticker}`);

  const data = await getAdditionalStockData(ticker.toUpperCase());
  if (data && typeof data.currentPrice === 'number') {
    return data.currentPrice.toFixed(2); // Return as string
  }

  throw new Error(`Current price not found for ${ticker}`);
}

async function getSentimentSummaryServiceWrapper(ticker) {
  console.log(`[Tool:getSentimentSummaryServiceWrapper] Called for ${ticker}`);

  const sentimentData = await performSentimentAnalysis(ticker.toUpperCase());
  if (
    sentimentData &&
    sentimentData.overallSentiment &&
    sentimentData.sentimentBreakdown
  ) {
    return `Overall: ${sentimentData.overallSentiment}, Positive: ${sentimentData.sentimentBreakdown.positive}, Negative: ${sentimentData.sentimentBreakdown.negative}, Neutral: ${sentimentData.sentimentBreakdown.neutral}`;
  }
  throw new Error(`Could not retrieve sentiment summary for ${ticker}`);
}

async function getKeyTechnicalSignalServiceWrapper(ticker) {
  console.log(
    `[Tool:getKeyTechnicalSignalServiceWrapper] Called for ${ticker}`
  );

  const taData = await getTechincalAnalysisData(ticker.toUpperCase());
  if (taData && taData.indicators) {
    // Simple logic to extract a "key" signal
    const rsi = taData.indicators.rsi?.current;
    const macdHist = taData.indicators.macd?.current?.histogram;
    let signal = 'TA signals are neutral or not definitive from basic check.';

    if (typeof rsi === 'number') {
      if (rsi > 70)
        signal = `RSI (${rsi.toFixed(1)}) indicates overbought conditions.`;
      else if (rsi < 30)
        signal = `RSI (${rsi.toFixed(1)}) indicates oversold conditions.`;
      else signal = `RSI is neutral at ${rsi.toFixed(1)}.`;
    }

    // Could add MACD crossover logic here based on taData.indicators.macd.signalCrossovers
    if (typeof macdHist === 'number' && rsi < 70 && rsi > 30) {
      // Only if RSI is not extreme
      if (
        macdHist > 0 &&
        taData.indicators.macd.current.MACD >
          taData.indicators.macd.current.signal
      ) {
        signal = 'MACD histogram is positive, suggesting bullish momentum.';
      } else if (
        macdHist < 0 &&
        taData.indicators.macd.current.MACD <
          taData.indicators.macd.current.signal
      ) {
        signal = 'MACD histogram is negative, suggesting bearish momentum.';
      }
    }
    return signal;
  }
  throw new Error(`Could not retrieve technical analysis data for ${ticker}`);
}

// Define LangChain Tools
const getCurrentPriceTool = new DynamicTool({
  name: 'get_current_stock_price',
  description:
    "Call this to get the current stock price for a given stock ticker. Input should be a single stock ticker symbol as a string (e.g., 'AAPL').",
  func: async (input) => {
    if (
      typeof input !== 'string' ||
      input.length > 6 ||
      !/^[a-zA-Z0-9.-]+$/.test(input.toUpperCase())
    ) {
      return "Invalid ticker symbol format provided to get_current_stock_price tool. Please provide a valid ticker like 'AAPL'.";
    }
    try {
      const price = await getCurrentPriceServiceWrapper(input.toUpperCase());
      return `Current price for ${input.toUpperCase()}: $${price}`;
    } catch (error) {
      console.error(
        `Error in getCurrentPriceTool for ${input}:`,
        error.message
      );
      return `Error fetching price for ${input.toUpperCase()}: ${
        error.message
      }`;
    }
  },
});

const getNewsSentimentTool = new DynamicTool({
  name: 'get_recent_news_sentiment_summary',
  description:
    "Call this to get a summary of recent news sentiment for a given stock ticker. Input should be a single stock ticker symbol as a string (e.g., 'MSFT').",
  func: async (input) => {
    if (
      typeof input !== 'string' ||
      input.length > 6 ||
      !/^[a-zA-Z0-9.-]+$/.test(input.toUpperCase())
    ) {
      return "Invalid ticker symbol format provided to get_recent_news_sentiment_summary tool. Please provide a valid ticker like 'MSFT'.";
    }
    try {
      const sentiment = await getSentimentSummaryServiceWrapper(
        input.toUpperCase()
      );
      return `Recent news sentiment summary for ${input.toUpperCase()}: ${sentiment}`;
    } catch (error) {
      console.error(
        `Error in getNewsSentimentTool for ${input}:`,
        error.message
      );
      return `Error fetching sentiment for ${input.toUpperCase()}: ${
        error.message
      }`;
    }
  },
});

const getKeyTASignalTool = new DynamicTool({
  name: 'get_key_technical_analysis_signal',
  description:
    "Call this to get a key technical analysis signal (like RSI or MACD) for a given stock ticker. Input should be a single stock ticker symbol as a string (e.g., 'GOOG').",
  func: async (input) => {
    if (
      typeof input !== 'string' ||
      input.length > 6 ||
      !/^[a-zA-Z0-9.-]+$/.test(input.toUpperCase())
    ) {
      return "Invalid ticker symbol format provided to get_key_technical_analysis_signal tool. Please provide a valid ticker like 'GOOG'.";
    }
    try {
      const signal = await getKeyTechnicalSignalServiceWrapper(
        input.toUpperCase()
      );
      return `Key technical signal for ${input.toUpperCase()}: ${signal}`;
    } catch (error) {
      console.error(`Error in getKeyTASignalTool for ${input}:`, error.message);
      return `Error fetching TA signal for ${input.toUpperCase()}: ${
        error.message
      }`;
    }
  },
});

const snapshotAgentTools = [
  getCurrentPriceTool,
  getNewsSentimentTool,
  getKeyTASignalTool,
];

module.exports = {
  snapshotAgentTools,
};
