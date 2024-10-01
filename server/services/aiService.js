const { OpenAI } = require('openai');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = new OpenAI(OPENAI_API_KEY);

const getStockExplanation = async (dcfResult, stockData) => {
  const messageContent = `
  You are a financial expert providing insights on stock valuation. Please provide an analysis of the following data in simple terms:
  
  1. Discounted Cash Flow (DCF) Analysis:
     - Best Case Intrinsic Value: ${dcfResult.bestCase}
     - Average Case Intrinsic Value: ${dcfResult.averageCase}
     - Worst Case Intrinsic Value: ${dcfResult.worstCase}
     - Current Market Price: ${stockData.currentPrice}
  
  2. Key Financial Metrics:
     - Market Capitalization: ${stockData.marketCap}
     - Beta: ${stockData.beta}
     - Shares Outstanding: ${stockData.sharesOutstanding}
     - Forward PE: ${stockData.keyStats.defaultKeyStatistics.forwardPE}
     - P/S Ratio: ${stockData.keyStats.summaryDetail.priceToSalesTrailing12Months}
     - Quarterly Revenue Growth: ${stockData.keyStats.defaultKeyStatistics.earningsQuarterlyGrowth}
     - PEG Ratio: ${stockData.keyStats.defaultKeyStatistics.pegRatio}
  
  3. Scenario Assumptions:
     - Best Case: Growth rate was increased by 20%, discount rate was reduced by 1%, terminal growth rate was increased by 0.5%.
     - Worst Case: Growth rate was decreased by 20%, discount rate was increased by 1%, terminal growth rate was decreased by 0.5%.
  
  Please explain what these values suggest about the stock's current valuation, and if the stock appears undervalued or overvalued given the provided scenarios and market conditions.
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are a financial expert providing insights on stock valuation.',
        },
        {
          role: 'user',
          content: messageContent,
        },
      ],
    });

    const explanation = response.choices[0].message.content;

    return explanation;
  } catch (error) {
    console.error('Error getting AI explanation:', error);
    throw new Error('Failed to get AI explanation');
  }
};

const getTAExplanation = async (technicalData, ticker) => {
  const messageContent = `
  You are a financial analyst with expertise in technical analysis. Please provide an analysis of the technical indicators for the stock ticker: ${ticker}.
  
  
  The following data represents the most recent values for the stock:
  
  
  1. Simple Moving Average (SMA):
      - 14-Day SMA: ${technicalData.sma.current}
      - SMA Mean: ${technicalData.sma.mean}
      - SMA Max: ${technicalData.sma.max}
      - SMA Min: ${technicalData.sma.min}
  
  
  2. Exponential Moving Average (EMA):
      - 14-Day EMA: ${technicalData.ema.current}
      - EMA Mean: ${technicalData.ema.mean}
      - EMA Max: ${technicalData.ema.max}
      - EMA Min: ${technicalData.ema.min}
  
  
  3. Relative Strength Index (RSI):
      - 14-Day RSI: ${technicalData.rsi.current}
      - RSI Mean: ${technicalData.rsi.mean}
      - RSI Max: ${technicalData.rsi.max}
      - RSI Min: ${technicalData.rsi.min}
  
  
  4. Moving Average Convergence Divergence (MACD):
      - MACD Line: ${technicalData.macd.current.MACD}
      - Signal Line: ${technicalData.macd.current.signal}
      - Histogram: ${technicalData.macd.current.histogram}
      - Signal Crossovers: ${technicalData.macd.signalCrossovers}
  
  
  5. Stochastic Oscillator:
      - Current %K: ${technicalData.stochastic.currentK}
      - Current %D (Signal): ${technicalData.stochastic.currentD}
  
  
  6. On-Balance Volume (OBV):
      - OBV: ${technicalData.obv.current}
      - Trend: ${technicalData.obv.trend}
  
  
  Based on these technical indicators, analyze the current trend of the stock. Discuss whether the stock is experiencing upward or downward momentum and whether it is potentially overbought or oversold. Provide your overall outlook on the stock's short-term movement based on these indicators.
  
  
  Additionally, consider the following questions in your analysis:
  
  - Are the short-term and long-term trends aligned?
  - Are there any potential buy or sell signals based on the indicators?
  - How do the RSI and Stochastic Oscillator indicate the stock's current position?
  - What is the significance of the MACD signal crossovers?
  - How does the OBV trend relate to the stock's price movement?
  
  
  Please provide a comprehensive analysis and clear conclusions.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are a financial analyst with expertise in technical analysis.',
        },
        {
          role: 'user',
          content: messageContent,
        },
      ],
    });

    const technicalAnalysisExplanation = response.choices[0].message.content;

    return technicalAnalysisExplanation;
  } catch (error) {
    console.error('Error analyzing technical indicators:', error);
    throw new Error('Failed to analyze technical indicators');
  }
};

module.exports = {
  getStockExplanation,
  getTAExplanation,
};
