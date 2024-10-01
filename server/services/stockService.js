const axios = require('axios');
const yahooFinance = require('yahoo-finance2').default;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

const {
  extractFinnhubReports,
  calculateTerminalGrowthRate,
} = require('../utils/helpers');

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
    console.error('Error fetching Yahoo stock data:', error);
    throw new Error('Unable to fetch additional stock data');
  }
};

const getStockData = async (ticker) => {
  try {
    // Fetch financials report (income statement and cash flow) with annual frequency
    const financialsUrl = `https://finnhub.io/api/v1/stock/financials-reported`;
    const financialsResponse = await axios.get(financialsUrl, {
      params: {
        symbol: ticker,
        token: FINNHUB_API_KEY,
        freq: 'annual',
      },
    });

    const financialsData = financialsResponse.data.data;
    if (!financialsData || financialsData.length === 0) {
      throw new Error('No financial data available');
    }

    // Extract annual financial reports
    const annualReports = financialsData.filter(
      (report) => report.form === '10-K'
    );
    if (annualReports.length < 2) {
      throw new Error('Insufficient financial data for multiple years');
    }

    // Extract income statement and cash flow for the two most recent years

    const mostRecentReport = extractFinnhubReports(annualReports[0]);
    const previousReport = extractFinnhubReports(annualReports[1]);

    // Check if any critical data is missing
    if (!mostRecentReport || !previousReport) {
      throw new Error('Critical financial data is missing');
    }

    // Calculate free cash flow (FCF) for both years
    const freeCashFlow =
      mostRecentReport.netCashProvidedByOperatingActivities &&
      mostRecentReport.capitalExpenditures
        ? mostRecentReport.netCashProvidedByOperatingActivities -
          mostRecentReport.capitalExpenditures
        : null;

    if (freeCashFlow === null) {
      console.warn('Free Cash Flow data is missing, using default value of 0');
    }

    const formattedIncomeStatement = {
      annualReports: [
        {
          totalRevenue: mostRecentReport.revenue ?? 0,
          operatingIncome: mostRecentReport.operatingIncome ?? 0,
          incomeBeforeTax: mostRecentReport.incomeBeforeTax ?? 0,
          interestExpense: mostRecentReport.interestExpense ?? 0,
          incomeTaxExpense: mostRecentReport.incomeTaxExpense ?? 0,
        },
        {
          totalRevenue: previousReport.revenue ?? 0,
          operatingIncome: previousReport.operatingIncome ?? 0,
          incomeBeforeTax: previousReport.incomeBeforeTax ?? 0,
          interestExpense: previousReport.interestExpense ?? 0,
          incomeTaxExpense: previousReport.incomeTaxExpense ?? 0,
        },
      ],
    };

    const formattedCashFlowStatement = {
      annualReports: [
        {
          operatingCashflow:
            mostRecentReport.netCashProvidedByOperatingActivities ?? 0,
          capitalExpenditures: mostRecentReport.capitalExpenditures ?? 0,
        },
        {
          operatingCashflow:
            previousReport.netCashProvidedByOperatingActivities ?? 0,
          capitalExpenditures: previousReport.capitalExpenditures ?? 0,
        },
      ],
    };

    return {
      data: {
        incomeStatement: formattedIncomeStatement,
        cashFlow: formattedCashFlowStatement,
      },
      ticker,
      revenue: mostRecentReport.revenue ?? 0,
      operatingIncome: mostRecentReport.operatingIncome ?? 0,
      freeCashFlow: freeCashFlow ?? 0,
    };
  } catch (error) {
    console.error('Error fetching stock data from Finnhub:', error.message);
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
  // Get the most recent annual report (income statement)
  const annualReport = data.data.incomeStatement.annualReports[0]; // Most recent annual report
  console.log('Most Recent Annual Report:', annualReport);

  // Extract necessary values with detailed logs for debugging
  const incomeBeforeTax = parseFloat(annualReport.incomeBeforeTax);
  console.log('Income Before Tax:', incomeBeforeTax);

  const assumedInterestRate = 0.05; // Assume a 5% interest rate
  console.log('Assumed Interest Rate:', assumedInterestRate);

  const interestExpense = parseFloat(annualReport.interestExpense);
  console.log('Interest Expense:', interestExpense);

  const totalDebt = interestExpense / assumedInterestRate;
  console.log('Total Debt:', totalDebt);

  const marketCapitalization = additionalData.marketCap;
  console.log('Market Capitalization:', marketCapitalization);

  // Assume cost of equity (Re) calculated from CAPM
  const riskFreeRate = 0.03; // 3% risk-free rate (e.g., US Treasury yield)
  console.log('Risk-Free Rate:', riskFreeRate);

  const beta = additionalData.beta;
  console.log('Beta:', beta);

  const marketReturn = 0.08; // 8% average market return
  console.log('Market Return:', marketReturn);

  const costOfEquity = riskFreeRate + beta * (marketReturn - riskFreeRate);
  console.log('Cost of Equity (Re):', costOfEquity);

  // Calculate cost of debt: Rd = Interest Expense / Total Debt
  const costOfDebt = interestExpense ? interestExpense / totalDebt : 0; // Avoid division by zero
  console.log('Cost of Debt (Rd):', costOfDebt);

  // Corporate tax rate (income tax / income before tax)
  const incomeTaxExpense = parseFloat(annualReport.incomeTaxExpense);
  console.log('Income Tax Expense:', incomeTaxExpense);

  const taxRate = incomeBeforeTax ? incomeTaxExpense / incomeBeforeTax : 0; // Avoid division by zero
  console.log('Corporate Tax Rate:', taxRate);

  // Calculate WACC = (E/V) * Re + (D/V) * Rd * (1 - Tc)
  const totalValue = marketCapitalization + totalDebt; // E + D
  console.log('Total Value (E + D):', totalValue);

  const equityWeight = marketCapitalization / totalValue;
  console.log('Equity Weight (E/V):', equityWeight);

  const debtWeight = totalDebt / totalValue;
  console.log('Debt Weight (D/V):', debtWeight);

  const wacc =
    equityWeight * costOfEquity + debtWeight * costOfDebt * (1 - taxRate);
  console.log('Weighted Average Cost of Capital (WACC):', wacc);

  return wacc;
}

/**
 * Helper function to calculate the terminal growth rate based on historical revenue growth.
 */

module.exports = {
  calculateDCFAllScenarios,
  prepareDCFInputs,
  getStockData,
  getAdditionalStockData,
  getInsiderSentiment,
};
