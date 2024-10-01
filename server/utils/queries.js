const axios = require('axios');
const yahooFinance = require('yahoo-finance2').default;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

const fetchInsiderSentiment = async (ticker) => {
  const url = `https://finnhub.io/api/v1/stock/insider-sentiment`;
  const response = await axios.get(url, {
    params: {
      symbol: ticker,
      token: FINNHUB_API_KEY,
    },
  });

  return response.data;
};

const fetchAdditionalStockData = async (ticker) => {
  // Fetch market capitalization, beta, shares outstanding, etc.
  const quoteSummary = await yahooFinance.quoteSummary(ticker, {
    modules: ['summaryDetail', 'defaultKeyStatistics'],
  });

  const marketCap = quoteSummary.summaryDetail.marketCap;
  const beta = quoteSummary.defaultKeyStatistics.beta;
  const sharesOutstanding = quoteSummary.defaultKeyStatistics.sharesOutstanding;
  const currentPrice = quoteSummary.summaryDetail.previousClose;

  return {
    currentPrice,
    marketCap,
    beta,
    sharesOutstanding,
    keyStats: quoteSummary,
  };
};

const fetchStockData = async (ticker) => {
  // Fetch financials report (income statement and cash flow) with annual frequency
  const financialsUrl = `https://finnhub.io/api/v1/stock/financials-reported`;
  const financialsResponse = await axios.get(financialsUrl, {
    params: {
      symbol: ticker,
      token: FINNHUB_API_KEY,
      freq: 'annual',
    },
  });

  return financialsResponse.data.data;
};

const fetchHistoricalData = async (ticker) => {
  const today = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(today.getMonth() - 6);

  const period1 = Math.floor(sixMonthsAgo.getTime() / 1000);
  const period2 = Math.floor(today.getTime() / 1000);

  const historicalData = await yahooFinance.chart(ticker, {
    period1: period1,
    period2: period2,
    interval: '1d',
  });

  return historicalData;
};

module.exports = {
  fetchStockData,
  fetchAdditionalStockData,
  fetchInsiderSentiment,
  fetchHistoricalData,
};
