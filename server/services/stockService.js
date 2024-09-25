const axios = require('axios');
const { NVDA_MOCK } = require('../mocks');

const alphaVantageApiKey = process.env.ALPHAVANTAGE_API_KEY;

const getMockStockData = () => {
  return NVDA_MOCK;
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
const calculateDCF = (
  freeCashFlow,
  growthRate,
  discountRate,
  terminalGrowthRate,
  sharesOutstanding
) => {
  const projectedFCF = [];
  let currentFCF = freeCashFlow;

  // Ensure growth rate and terminal growth rate are within reasonable bounds
  growthRate = Math.min(growthRate, 0.15); // Cap growth rate at 15% for sanity
  terminalGrowthRate = Math.min(terminalGrowthRate, 0.03); // Cap terminal growth rate at 3%

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
  const discountedTerminalValue = terminalValue / Math.pow(1 + discountRate, 5);

  // Sum of discounted cash flows
  const totalPV =
    projectedFCF.reduce((acc, val) => acc + val, 0) + discountedTerminalValue;

  // Calculate intrinsic value per share
  const intrinsicValue = totalPV / sharesOutstanding;

  return intrinsicValue;
};

// Helper function to extract inputs from the mock data
const prepareDCFInputs = (data) => {
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
  const growthRate = (currentRevenue - previousRevenue) / previousRevenue; // Revenue growth rate

  // Use WACC (Weighted Average Cost of Capital) from the mock data or calculate from financial reports
  const discountRate = calculateWACC(data); // Call a helper function to calculate WACC from mock data

  // Estimate terminal growth rate (can be based on past performance or industry standard)
  const terminalGrowthRate = calculateTerminalGrowthRate(data); // Call a helper function for terminal growth rate

  // Extract shares outstanding (if provided)
  const sharesOutstanding =
    parseFloat(data.data.incomeStatement.annualReports[0].sharesOutstanding) ||
    2500000000; // If sharesOutstanding is not provided, use a default value

  return {
    freeCashFlow,
    growthRate,
    discountRate,
    terminalGrowthRate,
    sharesOutstanding,
  };
};

const calculateReverseDCF = ({
  wacc,
  years,
  revenueGrowthRate,
  terminalGrowthRate,
  initialNopat,
  roic,
}) => {
  //Calculate the discount factor using the Weighted Average Cost of Capital (WACC)
  // This factor is used to bring future cash flows to their present value.
  const discountRate = 1 / (1 + wacc);

  // Initialize the total discounted cash flows (DCF)
  let totalDCF = 0;
  let currentNopat = initialNopat;

  // Calculate the discounted cash flow for each year in the forecast period.
  // Each year's NOPAT grows according to the expected revenue growth rate.
  // Then, discount the future NOPAT and add it to the totalDCF.
  for (let i = 1; i <= years; i++) {
    // Adjust NOPAT growth by both the revenue growth rate and ROIC
    currentNopat *= 1 + revenueGrowthRate * roic; // Growth is influenced by revenue growth and efficiency (ROIC)

    // Discount NOPAT to present value and add to totalDCF
    totalDCF += currentNopat * Math.pow(discountRate, i);
  }

  // Calculate the terminal value.
  // This is the value of the company after the forecast period, assuming it continues to grow
  // at the terminal growth rate forever.
  // Formula: Terminal Value = NOPAT (t+1) / (WACC - terminal growth rate)
  const terminalValue =
    (currentNopat * (1 + terminalGrowthRate)) / (wacc - terminalGrowthRate);

  // Discount the terminal value to its present value and add it to the total DCF.

  const discountedTerminalValue = terminalValue * Math.pow(discountRate, years);

  // Calculate the total present value (DCF + discounted terminal value)
  const presentValue = totalDCF + discountedTerminalValue;

  // Return the present value of all cash flows, which can be compared
  // to the current stock price to determine if the stock is fairly valued.
  return presentValue;
};

// Mock Data
const mockData = {
  stockPrice: 450, // Example stock price for NVDA
  wacc: 0.1, // 10% Weighted Average Cost of Capital
  years: 10, // Forecast over 10 years
  revenueGrowthRate: 0.15, // 15% revenue growth rate
  roic: 0.2, // 20% Return on Invested Capital
  terminalGrowthRate: 0.03, // 3% long-term growth rate
  initialNopat: 5e9, // Initial NOPAT of $5 billion
};

/**
 * Helper function to calculate WACC based on the company's debt, equity, and cost of capital.
 * We use CAPM for cost of equity and calculate cost of debt from the interest expense.
 */
function calculateWACC(mockData) {
  const annualReport = mockData.data.incomeStatement.annualReports[0]; // Most recent annual report
  const cashFlowReport = mockData.data.cashFlow.annualReports[0]; // Most recent cash flow report

  // Get total debt and equity (Assume equity is total assets - total liabilities if equity not provided)
  const interestExpense = parseFloat(annualReport.interestExpense); // Interest on debt
  const incomeBeforeTax = parseFloat(annualReport.incomeBeforeTax);
  const totalDebt = interestExpense / 0.05; // Estimate total debt assuming a 5% interest rate on debt
  const marketCapitalization = 700e9; // Assume $700 billion market cap for Nvidia (replace with actual value if known)

  // Assume cost of equity (Re) calculated from CAPM: Re = Risk-free rate + Beta * (Market return - Risk-free rate)
  const riskFreeRate = 0.03; // 3% risk-free rate (e.g., US Treasury yield)
  const beta = 1.7; // Beta for Nvidia, assume 1.7 (based on actual data)
  const marketReturn = 0.08; // 8% average market return
  const costOfEquity = riskFreeRate + beta * (marketReturn - riskFreeRate); // CAPM

  // Calculate cost of debt: Rd = Interest Expense / Total Debt
  const costOfDebt = interestExpense / totalDebt;

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
function calculateTerminalGrowthRate(mockData) {
  const annualReports = mockData.data.incomeStatement.annualReports;
  const currentRevenue = parseFloat(annualReports[0].totalRevenue);
  const previousRevenue = parseFloat(annualReports[1].totalRevenue);

  // Calculate the revenue growth rate between two most recent years
  const revenueGrowthRate =
    (currentRevenue - previousRevenue) / previousRevenue;

  // Estimate terminal growth rate as a conservative fraction of historical growth
  const terminalGrowthRate = revenueGrowthRate * 0.5; // Assume the long-term growth is half of the short-term growth
  return terminalGrowthRate;
}

/**
 * Main function to calculate inputs for reverse DCF
 */
function calculateReverseDCFInputs(mockData) {
  const annualReport = mockData.data.incomeStatement.annualReports[0]; // Get the most recent annual report

  // Calculate initial NOPAT (Net Operating Profit After Tax)
  const operatingIncome = parseFloat(annualReport.operatingIncome); // Operating income
  const incomeTaxExpense = parseFloat(annualReport.incomeTaxExpense); // Income tax expense

  // Assume tax rate is income tax / income before tax
  const taxRate =
    parseFloat(annualReport.incomeTaxExpense) /
    parseFloat(annualReport.incomeBeforeTax);

  // NOPAT = Operating Income * (1 - Tax Rate)
  const initialNopat = operatingIncome * (1 - taxRate);

  // Revenue growth rate - comparing total revenue to the previous year (assuming there's a previous year data)
  const previousReport = mockData.data.incomeStatement.annualReports[1];
  const totalRevenue = parseFloat(annualReport.totalRevenue);
  const previousRevenue = parseFloat(previousReport.totalRevenue);
  const revenueGrowthRate = (totalRevenue - previousRevenue) / previousRevenue;

  // Calculate WACC and terminal growth rate using the helper functions
  const wacc = calculateWACC(mockData);
  const terminalGrowthRate = calculateTerminalGrowthRate(mockData);

  return {
    wacc,
    years: 10, // Assuming 10-year forecast period
    revenueGrowthRate,
    terminalGrowthRate,
    initialNopat,
  };
}

module.exports = {
  calculateReverseDCFInputs,
  calculateTerminalGrowthRate,
  calculateWACC,
  calculateReverseDCF,
  calculateDCF,
  prepareDCFInputs,
  getMockStockData,
  getStockData,
  mockData,
};
