const axios = require('axios');
const { NVDA_MOCK } = require('../mocks');

const alphaVantageApiKey = process.env.ALPHAVANTAGE_API_KEY;

exports.getMockStockData = () => {
  return NVDA_MOCK;
};

exports.getStockData = async (ticker) => {
  try {
    // Fetch income statement
    const incomeStatementUrl = `https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol=${ticker}&apikey=${alphaVantageApiKey}`;
    const cashFlowUrl = `https://www.alphavantage.co/query?function=CASH_FLOW&symbol=${ticker}&apikey=${alphaVantageApiKey}`;

    const incomeStatementResponse = await axios.get(incomeStatementUrl);
    const cashFlowResponse = await axios.get(cashFlowUrl);

    const incomeStatement = incomeStatementResponse.data;
    const cashFlow = cashFlowResponse.data;

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
    console.error('Error fetching stock data from Alpha Vantage:', error);
    throw new Error('Unable to fetch stock data');
  }
};

// Basic DCF Calculation using the data from Alpha Vantage
exports.calculateDCF = (
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

  // Calculate terminal value
  const finalYearFCF = projectedFCF[projectedFCF.length - 1];
  const terminalValue =
    (finalYearFCF * (1 + terminalGrowthRate)) /
    (discountRate - terminalGrowthRate);

  // Discount terminal value to present value
  const discountedTerminalValue = terminalValue / Math.pow(1 + discountRate, 5);

  // Sum of discounted cash flows
  const totalPV =
    projectedFCF.reduce((acc, val) => acc + val, 0) + discountedTerminalValue;

  // Calculate intrinsic value per share
  const intrinsicValue = totalPV / sharesOutstanding;
  return intrinsicValue;
};
