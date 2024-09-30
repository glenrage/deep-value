const axios = require('axios');
const { NVDA_MOCK } = require('../mocks');
const yahooFinance = require('yahoo-finance2').default;

const alphaVantageApiKey = process.env.ALPHAVANTAGE_API_KEY;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

const getInsiderSentiment = async (ticker) => {
  try {
    const url = `https://finnhub.io/api/v1/stock/insider-sentiment`;

    const response = await axios.get(url, {
      params: {
        symbol: ticker,
        token: FINNHUB_API_KEY,
      },
    });

    return response.data;
  } catch (error) {
    console.error(`Error fetching insider trades for ticker: ${ticker}`, error);
    throw new Error('Failed to fetch recent insider trades data');
  }
};

const getMockStockData = () => {
  return NVDA_MOCK;
};

// Fetch additional data
const getAdditionalStockData = async (ticker) => {
  try {
    // Fetch market capitalization, beta, shares outstanding, etc.
    const quoteSummary = await yahooFinance.quoteSummary(ticker, {
      modules: ['summaryDetail', 'defaultKeyStatistics'],
    });

    const marketCap = quoteSummary.summaryDetail.marketCap;
    const beta = quoteSummary.defaultKeyStatistics.beta;
    const sharesOutstanding =
      quoteSummary.defaultKeyStatistics.sharesOutstanding;
    const currentPrice = quoteSummary.summaryDetail.previousClose;

    return {
      currentPrice,
      marketCap,
      beta,
      sharesOutstanding,
      keyStats: quoteSummary,
    };
  } catch (error) {
    console.error('Error fetching additional stock data:', error);
    throw new Error('Unable to fetch additional stock data');
  }
};

const getStockData = async (ticker) => {
  try {
    // Fetch income statement
    const incomeStatementUrl = `https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol=${ticker}&apikey=${alphaVantageApiKey}`;
    const cashFlowUrl = `https://www.alphavantage.co/query?function=CASH_FLOW&symbol=${ticker}&apikey=${alphaVantageApiKey}`;

    const incomeStatementResponse = await axios.get(incomeStatementUrl);
    const cashFlowResponse = await axios.get(cashFlowUrl);

    const incomeStatement = incomeStatementResponse.data;
    const cashFlow = cashFlowResponse.data;

    console.log({ incomeStatement, cashFlow });

    // Extract necessary data (assuming annual reports)
    const annualIncome = incomeStatement.annualReports[0];
    const annualCashFlow = cashFlow.annualReports[0];

    const revenue = parseFloat(annualIncome.totalRevenue); // Revenue
    const operatingIncome = parseFloat(annualIncome.operatingIncome); // Operating Income
    const freeCashFlow =
      parseFloat(annualCashFlow.operatingCashflow) -
      parseFloat(annualCashFlow.capitalExpenditures); // FCF

    return {
      data: {
        incomeStatement,
        cashFlow,
      },
      ticker,
      revenue,
      operatingIncome,
      freeCashFlow,
    };
  } catch (error) {
    console.error(
      'Error fetching stock data from Alpha Vantage:',
      error.message
    );
    throw new Error('Unable to fetch stock data');
  }
};

const calculateDCFAllScenarios = (
  freeCashFlow,
  growthRate,
  discountRate,
  terminalGrowthRate,
  sharesOutstanding
) => {
  const calculateDCFWithParams = (
    freeCashFlow,
    growthRate,
    discountRate,
    terminalGrowthRate,
    sharesOutstanding
  ) => {
    const projectedFCF = [];
    let currentFCF = freeCashFlow;

    // Project free cash flows for 5 years
    for (let i = 1; i <= 5; i++) {
      currentFCF *= 1 + growthRate; // Projected FCF for the year
      const discountedFCF = currentFCF / Math.pow(1 + discountRate, i); // Discount to present value
      projectedFCF.push(discountedFCF);
    }

    // Calculate terminal value, ensuring discount rate > terminal growth rate
    let terminalValue = 0;
    if (discountRate > terminalGrowthRate) {
      const finalYearFCF = projectedFCF[projectedFCF.length - 1];
      terminalValue =
        (finalYearFCF * (1 + terminalGrowthRate)) /
        (discountRate - terminalGrowthRate);
    } else {
      console.warn('Discount rate must be greater than terminal growth rate');
    }

    // Discount terminal value to present value
    const discountedTerminalValue =
      terminalValue / Math.pow(1 + discountRate, 5);

    // Sum of discounted cash flows
    const totalPV =
      projectedFCF.reduce((acc, val) => acc + val, 0) + discountedTerminalValue;

    // Calculate intrinsic value per share
    const intrinsicValue = totalPV / sharesOutstanding;

    return intrinsicValue;
  };

  // Calculate Best-Case Scenario
  const bestGrowthRate = growthRate * 1.2; // Increase growth rate by 20%
  const bestDiscountRate = discountRate - 0.01; // Decrease discount rate by 1%
  const bestTerminalGrowthRate = terminalGrowthRate + 0.005; // Increase terminal growth rate by 0.5%
  const bestCase = calculateDCFWithParams(
    freeCashFlow,
    bestGrowthRate,
    bestDiscountRate,
    bestTerminalGrowthRate,
    sharesOutstanding
  );

  // Calculate Average-Case Scenario
  const averageCase = calculateDCFWithParams(
    freeCashFlow,
    growthRate,
    discountRate,
    terminalGrowthRate,
    sharesOutstanding
  );

  // Calculate Worst-Case Scenario
  const worstGrowthRate = growthRate * 0.8; // Decrease growth rate by 20%
  const worstDiscountRate = discountRate + 0.01; // Increase discount rate by 1%
  const worstTerminalGrowthRate = terminalGrowthRate - 0.005; // Decrease terminal growth rate by 0.5%
  const worstCase = calculateDCFWithParams(
    freeCashFlow,
    worstGrowthRate,
    worstDiscountRate,
    worstTerminalGrowthRate,
    sharesOutstanding
  );

  return {
    bestCase,
    averageCase,
    worstCase,
  };
};

// Helper function to extract inputs from the mock data
const prepareDCFInputs = (data, additionalData) => {
  const annualReport = data.data.incomeStatement.annualReports[0]; // Get the most recent annual report
  const cashFlowReport = data.data.cashFlow.annualReports[0]; // Get the most recent cash flow report

  // Extract the necessary inputs for DCF
  const freeCashFlow =
    parseFloat(cashFlowReport.operatingCashflow) -
    parseFloat(cashFlowReport.capitalExpenditures); // Calculate FCF

  // Estimate growth rate (revenue growth) from most recent annual report and previous year's data
  const previousAnnualReport = data.data.incomeStatement.annualReports[1]; // Previous year's report
  const currentRevenue = parseFloat(annualReport.totalRevenue);
  const previousRevenue = parseFloat(previousAnnualReport.totalRevenue);
  const growthRate =
    previousRevenue > 0
      ? (currentRevenue - previousRevenue) / previousRevenue
      : 0.05; // Default growth rate if previousRevenue is 0

  // Use WACC (Weighted Average Cost of Capital) from the mock data or calculate from financial reports
  const wacc = calculateWACC(data, additionalData);

  // Estimate terminal growth rate (can be based on past performance or industry standard)
  const terminalGrowthRate = calculateTerminalGrowthRate(data); // Call a helper function for terminal growth rate

  // Extract shares outstanding
  const sharesOutstanding = parseFloat(additionalData.sharesOutstanding);

  return {
    freeCashFlow,
    growthRate,
    discountRate: wacc,
    terminalGrowthRate,
    sharesOutstanding,
  };
};

/**
 * Helper function to calculate WACC based on the company's debt, equity, and cost of capital.
 * We use CAPM for cost of equity and calculate cost of debt from the interest expense.
 */
function calculateWACC(data, additionalData) {
  // Get the most recent annual report (income statement
  const annualReport = data.data.incomeStatement.annualReports[0]; // Most recent annual report

  // Get total debt and equity (Assume equity is total assets - total liabilities if equity not provided)
  const incomeBeforeTax = parseFloat(annualReport.incomeBeforeTax);
  const assumedInterestRate = 0.05; // Assume a 5% interest rate
  const totalDebt =
    parseFloat(annualReport.interestExpense) / assumedInterestRate;
  const marketCapitalization = additionalData.marketCap;

  // Assume cost of equity (Re) calculated from CAPM: Re = Risk-free rate + Beta * (Market return - Risk-free rate)
  const riskFreeRate = 0.03; // 3% risk-free rate (e.g., US Treasury yield)
  const beta = additionalData.beta;
  const marketReturn = 0.08; // 8% average market return
  const costOfEquity = riskFreeRate + beta * (marketReturn - riskFreeRate); // CAPM

  // Calculate cost of debt: Rd = Interest Expense / Total Debt
  const costOfDebt = annualReport.interestExpense
    ? parseFloat(annualReport.interestExpense) / totalDebt
    : 0; // Avoid division by zero

  // Corporate tax rate (income tax / income before tax)
  const taxRate = parseFloat(annualReport.incomeTaxExpense) / incomeBeforeTax;

  // Calculate WACC = (E/V) * Re + (D/V) * Rd * (1 - Tc)
  const totalValue = marketCapitalization + totalDebt; // E + D
  const equityWeight = marketCapitalization / totalValue;
  const debtWeight = totalDebt / totalValue;

  const wacc =
    equityWeight * costOfEquity + debtWeight * costOfDebt * (1 - taxRate);

  return wacc;
}

/**
 * Helper function to calculate the terminal growth rate based on historical revenue growth.
 */
function calculateTerminalGrowthRate(data) {
  const annualReports = data.data.incomeStatement.annualReports;
  const currentRevenue = parseFloat(annualReports[0].totalRevenue);
  const previousRevenue = parseFloat(annualReports[1].totalRevenue);

  // Calculate the revenue growth rate between two most recent years
  const revenueGrowthRate =
    (currentRevenue - previousRevenue) / previousRevenue;

  // Estimate terminal growth rate as a conservative fraction of historical growth
  const terminalGrowthRate = revenueGrowthRate * 0.5; // Assume the long-term growth is half of the short-term growth
  return terminalGrowthRate;
}

module.exports = {
  calculateDCFAllScenarios,
  prepareDCFInputs,
  getMockStockData,
  getStockData,
  getAdditionalStockData,
  getInsiderSentiment,
};
