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

const fetchStockNewsArticles = async (ticker) => {
  const news = await axios.get(
    `https://newsapi.org/v2/everything?q=${ticker}&apiKey=${process.env.NEWSAPI_KEY}`
  );

  return news;
};

const fetchOptionsData = async (symbol, date) => {
  const optionsData = await yahooFinance.options(symbol);
  const nearestExpirationDate = optionsData.expirationDates[0]; // Use the nearest expiration date

  const queryOptions = {
    lang: 'en-US',
    formatted: false,
    region: 'US',
    date: nearestExpirationDate,
  };

  const optionsDataWithDate = await yahooFinance.options(symbol, queryOptions);

  return optionsDataWithDate;
};

const fetchFMPStockData = async (ticker) => {
  const apiKey = process.env.FMP_API_KEY;
  const baseUrl = 'https://financialmodelingprep.com/api/v3';

  // Fetch income statement and cash flow statement from FMP
  const incomeStatementUrl = `${baseUrl}/income-statement/${ticker}?limit=2&apikey=${apiKey}`;
  const cashFlowStatementUrl = `${baseUrl}/cash-flow-statement/${ticker}?limit=2&apikey=${apiKey}`;

  const [incomeStatementRes, cashFlowStatementRes] = await Promise.all([
    axios.get(incomeStatementUrl),
    axios.get(cashFlowStatementUrl),
  ]);

  return {
    incomeStatement: incomeStatementRes.data,
    cashFlowStatement: cashFlowStatementRes.data,
  };
};

module.exports = {
  fetchStockData,
  fetchAdditionalStockData,
  fetchInsiderSentiment,
  fetchHistoricalData,
  fetchStockNewsArticles,
  fetchOptionsData,
  fetchFMPStockData,
};
