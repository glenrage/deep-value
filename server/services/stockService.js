const yahooFinance = require('yahoo-finance2').default;

const {
  fetchAdditionalStockData,
  fetchInsiderSentiment,
  fetchHistoricalData,
  fetchOptionsData,
  fetchFMPStockData,
} = require('../utils/queries');

const { calculateTechnicalIndicators } = require('../utils/calculations');

const {
  calculateTerminalGrowthRate,
  processOptionsData,
  generateLLMInputText,
} = require('../utils/helpers');

const getFMPStockData = async (ticker) => {
  console.log('fetching FPMS data');
  try {
    const response = await fetchFMPStockData(ticker);

    const incomeStatements = response.incomeStatement;
    const cashFlowStatements = response.cashFlowStatement;

    if (
      !incomeStatements ||
      incomeStatements.length < 2 ||
      !cashFlowStatements ||
      cashFlowStatements.length < 2
    ) {
      throw new Error('Insufficient financial data for multiple years');
    }

    // Fetch simpler metrics like shares outstanding, market cap, and beta from Yahoo Finance
    const queryOptions = {
      modules: ['defaultKeyStatistics', 'summaryDetail'],
    };
    const yahooData = await yahooFinance.quoteSummary(ticker, queryOptions);

    if (!yahooData) {
      throw new Error('No data available from Yahoo Finance');
    }

    const keyStatistics = yahooData.defaultKeyStatistics;
    const summaryDetail = yahooData.summaryDetail;

    // Helper function to safely get a number or return a default value
    const safeGetNumber = (value, fieldName, defaultValue = 0) => {
      if (typeof value === 'number' && !isNaN(value) && value !== 0) {
        return value;
      }
      console.warn(
        `Warning: Invalid or missing ${fieldName}, using default value.`
      );
      return defaultValue;
    };

    // Prepare income statement data
    const prepareIncomeStatement = (statement) => ({
      totalRevenue: safeGetNumber(statement.revenue, 'totalRevenue'),
      operatingIncome: safeGetNumber(
        statement.operatingIncome,
        'operatingIncome'
      ),
      incomeBeforeTax: safeGetNumber(
        statement.incomeBeforeTax,
        'incomeBeforeTax'
      ),
      interestExpense: safeGetNumber(
        statement.interestExpense,
        'interestExpense'
      ),
      incomeTaxExpense: safeGetNumber(
        statement.incomeTaxExpense,
        'incomeTaxExpense'
      ),
    });

    // Prepare cash flow statement data
    const prepareCashFlowStatement = (statement) => ({
      operatingCashflow: safeGetNumber(
        statement.operatingCashFlow,
        'operatingCashFlow'
      ),
      capitalExpenditures: safeGetNumber(
        statement.capitalExpenditure,
        'capitalExpenditure'
      ),
    });

    // Format income statement and cash flow statement
    const formattedIncomeStatement = {
      annualReports: [
        prepareIncomeStatement(incomeStatements[0]),
        prepareIncomeStatement(incomeStatements[1]),
      ],
    };

    const formattedCashFlowStatement = {
      annualReports: [
        prepareCashFlowStatement(cashFlowStatements[0]),
        prepareCashFlowStatement(cashFlowStatements[1]),
      ],
    };

    // Extract additional data from Yahoo Finance
    const marketCap = safeGetNumber(summaryDetail.marketCap, 'marketCap');
    const beta = safeGetNumber(keyStatistics.beta, 'beta', 1);
    const sharesOutstanding = safeGetNumber(
      keyStatistics.sharesOutstanding,
      'sharesOutstanding'
    );
    const currentPrice = safeGetNumber(
      summaryDetail.previousClose,
      'currentPrice'
    );

    // Calculate free cash flow (Operating Cash Flow - Capital Expenditures)
    const freeCashFlow =
      formattedCashFlowStatement.annualReports[0].operatingCashflow !== null &&
      formattedCashFlowStatement.annualReports[0].capitalExpenditures !== null
        ? formattedCashFlowStatement.annualReports[0].operatingCashflow -
          formattedCashFlowStatement.annualReports[0].capitalExpenditures
        : null;

    // Calculate revenue growth rate (Current Revenue / Previous Year Revenue - 1)
    const revenueGrowthRate =
      formattedIncomeStatement.annualReports[0].totalRevenue !== null &&
      formattedIncomeStatement.annualReports[1].totalRevenue !== null &&
      formattedIncomeStatement.annualReports[1].totalRevenue !== 0
        ? formattedIncomeStatement.annualReports[0].totalRevenue /
            formattedIncomeStatement.annualReports[1].totalRevenue -
          1
        : 0.05; // Default growth rate if data is missing

    // Calculate discount rate using CAPM (risk-free rate + beta * equity risk premium)
    const riskFreeRate = 0.03; // Assuming a default risk-free rate of 3%
    const equityRiskPremium = 0.05; // Typically 4-6%
    const discountRate = riskFreeRate + beta * equityRiskPremium;

    // Calculate terminal growth rate (typically 2-4%, use half of revenue growth rate if available)
    const terminalGrowthRate =
      revenueGrowthRate !== null ? Math.min(revenueGrowthRate / 2, 0.04) : 0.02;

    return {
      data: {
        incomeStatement: formattedIncomeStatement,
        cashFlow: formattedCashFlowStatement,
      },
      ticker,
      revenue: formattedIncomeStatement.annualReports[0].totalRevenue,
      operatingIncome:
        formattedIncomeStatement.annualReports[0].operatingIncome,
      freeCashFlow,
      additionalData: {
        marketCap,
        beta,
        sharesOutstanding,
        currentPrice,
      },
      dcfInputs: {
        freeCashFlow, // Used for calculating future free cash flows in DCF
        growthRate: revenueGrowthRate, // Estimated revenue growth rate
        discountRate, // Discount rate calculated using CAPM
        terminalGrowthRate, // Terminal growth rate for calculating terminal value
        sharesOutstanding, // Number of shares outstanding for intrinsic value per share calculation
      },
      raw: {
        data: {
          incomeStatements,
          cashFlowStatements,
          keyMetrics: { marketCap, beta, sharesOutstanding },
        },
      },
    };
  } catch (error) {
    console.error(`Error fetching data for ${ticker}:`, error.message);
    throw new Error(`Unable to fetch stock data: ${error.message}`);
  }
};

// Fetch Yahoo Finance data
const getYahooFinanceData = async (ticker) => {
  console.log('YAHHOOOO');
  try {
    const queryOptions = {
      modules: [
        'incomeStatementHistory',
        'cashflowStatementHistory',
        'defaultKeyStatistics',
        'summaryDetail',
        'financialData',
      ],
    };
    const data = await yahooFinance.quoteSummary(ticker, queryOptions);

    if (!data) {
      throw new Error('No data available from Yahoo Finance');
    }

    // Extract income and cash flow statements
    const incomeStatements =
      data.incomeStatementHistory?.incomeStatementHistory;
    const cashFlowStatements =
      data.cashflowStatementHistory?.cashflowStatements;

    if (
      !incomeStatements ||
      incomeStatements.length < 2 ||
      !cashFlowStatements ||
      cashFlowStatements.length < 2
    ) {
      throw new Error('Insufficient financial data for multiple years');
    }

    // Helper function to safely get a number or return a default value
    const safeGetNumber = (value, fieldName, defaultValue = 0) => {
      if (typeof value === 'number' && !isNaN(value) && value !== 0) {
        return value;
      }
      console.warn(
        `Warning: Invalid or missing ${fieldName}, using default value.`
      );
      return defaultValue;
    };

    // Prepare income statement data
    const prepareIncomeStatement = (statement) => ({
      totalRevenue: safeGetNumber(statement.totalRevenue, 'totalRevenue'),
      operatingIncome:
        safeGetNumber(statement.operatingIncome, 'operatingIncome') ||
        safeGetNumber(statement.totalRevenue, 'totalRevenue') -
          safeGetNumber(statement.costOfRevenue, 'costOfRevenue', 0) -
          safeGetNumber(
            statement.totalOperatingExpenses,
            'totalOperatingExpenses'
          ), // Fallback calculation for operating income
      incomeBeforeTax: safeGetNumber(
        statement.incomeBeforeTax,
        'incomeBeforeTax'
      ),
      interestExpense: safeGetNumber(
        statement.interestExpense,
        'interestExpense'
      ),
      incomeTaxExpense: safeGetNumber(
        statement.incomeTaxExpense,
        'incomeTaxExpense'
      ),
    });

    // Prepare cash flow statement data with approximation if missing
    const prepareCashFlowStatement = (statement) => {
      const operatingCashflow = safeGetNumber(
        statement.totalCashFromOperatingActivities,
        'totalCashFromOperatingActivities'
      );
      const capitalExpenditures = safeGetNumber(
        statement.capitalExpenditures,
        'capitalExpenditures'
      );

      // If operating cashflow is missing, approximate it using net income (assumption-based approximation)
      if (operatingCashflow === 0) {
        const netIncome = safeGetNumber(statement.netIncome, 'netIncome');
        return {
          operatingCashflow: netIncome * 1.2, // Assuming operating cashflow is roughly 20% higher than net income
          capitalExpenditures,
        };
      }

      return {
        operatingCashflow,
        capitalExpenditures,
      };
    };

    // Format income statement and cash flow statement
    const formattedIncomeStatement = {
      annualReports: [
        prepareIncomeStatement(incomeStatements[0]),
        prepareIncomeStatement(incomeStatements[1]),
      ],
    };

    const formattedCashFlowStatement = {
      annualReports: [
        prepareCashFlowStatement(cashFlowStatements[0]),
        prepareCashFlowStatement(cashFlowStatements[1]),
      ],
    };

    // Extract additional data
    const marketCap = safeGetNumber(data.summaryDetail?.marketCap, 'marketCap');
    const beta = safeGetNumber(data.defaultKeyStatistics?.beta, 'beta', 1);
    const sharesOutstanding = safeGetNumber(
      data.defaultKeyStatistics?.sharesOutstanding,
      'sharesOutstanding'
    );

    // Calculate free cash flow (Operating Cash Flow - Capital Expenditures)
    const freeCashFlow =
      formattedCashFlowStatement.annualReports[0].operatingCashflow !== null &&
      formattedCashFlowStatement.annualReports[0].capitalExpenditures !== null
        ? formattedCashFlowStatement.annualReports[0].operatingCashflow -
          formattedCashFlowStatement.annualReports[0].capitalExpenditures
        : null;

    // Calculate revenue growth rate (Current Revenue / Previous Year Revenue - 1)
    const revenueGrowthRate =
      formattedIncomeStatement.annualReports[0].totalRevenue !== null &&
      formattedIncomeStatement.annualReports[1].totalRevenue !== null &&
      formattedIncomeStatement.annualReports[1].totalRevenue !== 0
        ? formattedIncomeStatement.annualReports[0].totalRevenue /
            formattedIncomeStatement.annualReports[1].totalRevenue -
          1
        : 0.05; // Default growth rate if data is missing

    // Calculate discount rate using CAPM (risk-free rate + beta * equity risk premium)
    const riskFreeRate = safeGetNumber(
      data.financialData?.riskFreeRate,
      'riskFreeRate',
      0.03
    );
    const equityRiskPremium = 0.05; // Typically 4-6%
    const discountRate = riskFreeRate + beta * equityRiskPremium;

    // Calculate terminal growth rate (typically 2-4%, use half of revenue growth rate if available)
    const terminalGrowthRate =
      revenueGrowthRate !== null ? Math.min(revenueGrowthRate / 2, 0.04) : 0.02;

    return {
      data: {
        incomeStatement: formattedIncomeStatement,
        cashFlow: formattedCashFlowStatement,
      },
      ticker,
      revenue: formattedIncomeStatement.annualReports[0].totalRevenue,
      operatingIncome:
        formattedIncomeStatement.annualReports[0].operatingIncome,
      freeCashFlow,
      additionalData: {
        marketCap,
        beta,
        sharesOutstanding,
      },
      dcfInputs: {
        freeCashFlow, // Used for calculating future free cash flows in DCF
        growthRate: revenueGrowthRate, // Estimated revenue growth rate
        discountRate, // Discount rate calculated using CAPM
        terminalGrowthRate, // Terminal growth rate for calculating terminal value
        sharesOutstanding, // Number of shares outstanding for intrinsic value per share calculation
      },
    };
  } catch (error) {
    console.error(
      `Error fetching Yahoo Finance data for ${ticker}:`,
      error.message
    );
    throw new Error(
      `Unable to fetch stock data from Yahoo Finance: ${error.message}`
    );
  }
};

const getInsiderSentiment = async (ticker) => {
  try {
    return await fetchInsiderSentiment(ticker);
  } catch (error) {
    console.error(
      `Error fetching insider sentiment for ${ticker}:`,
      error.message
    );
    throw new Error('Failed to fetch insider sentiment data');
  }
};

// Fetch additional data
const getAdditionalStockData = async (ticker) => {
  try {
    const response = await fetchAdditionalStockData(ticker);

    const marketCap = response.summaryDetail.marketCap;
    const beta = response.defaultKeyStatistics.beta;
    const sharesOutstanding = response.defaultKeyStatistics.sharesOutstanding;
    const currentPrice = response.summaryDetail.previousClose;
    const earningsQuarterlyGrowth =
      response.defaultKeyStatistics.earningsQuarterlyGrowth;
    const forwardPE = response.defaultKeyStatistics.forwardPE;
    const priceToSalesRatio =
      response.summaryDetail.priceToSalesTrailing12Months;
    const PEGRatio = response.defaultKeyStatistics.pegRatio;

    return {
      currentPrice,
      marketCap,
      beta,
      sharesOutstanding,
      earningsQuarterlyGrowth,
      forwardPE,
      priceToSalesRatio,
      PEGRatio,
    };
  } catch (error) {
    console.error(
      `Error fetching additional stock data for ${ticker}:`,
      error.message
    );
    throw new Error('Failed to fetch additional stock data');
  }
};

const getTechincalAnalysisData = async (ticker) => {
  try {
    const data = await fetchHistoricalData(ticker);

    const calculatedTAIndicators = calculateTechnicalIndicators(data);

    return {
      indicators: calculatedTAIndicators,
      historicalData: data,
    };
  } catch (error) {
    console.error(
      `Error fetching historical data for ${ticker}:`,
      error.message
    );
    throw new Error('Failed to fetch historical stock data');
  }
};

const getOptionsData = async (ticker, date) => {
  try {
    const optionsData = await fetchOptionsData(ticker, date);
    const formattedData = processOptionsData(optionsData);

    const llmInputText = generateLLMInputText(formattedData);

    return llmInputText;
  } catch (error) {
    console.error(
      `Error fetching options data for ${ticker} on ${date}:`,
      error.message
    );
    throw new Error('Failed to fetch options data');
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
  const growthRate =
    previousRevenue > 0
      ? (currentRevenue - previousRevenue) / previousRevenue
      : 0.05; // Default growth rate if previousRevenue is 0

  // Use WACC (Weighted Average Cost of Capital) from the mock data or calculate from financial reports
  const wacc = calculateWACC(data, data.additionalData);

  // Estimate terminal growth rate (can be based on past performance or industry standard)
  const terminalGrowthRate = calculateTerminalGrowthRate(data); // Call a helper function for terminal growth rate

  // Extract shares outstanding
  const sharesOutstanding = parseFloat(data.additionalData.sharesOutstanding);

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
function calculateWACC(data) {
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

  const marketCapitalization = data.additionalData.marketCap;
  console.log('Market Capitalization:', marketCapitalization);

  // Assume cost of equity (Re) calculated from CAPM
  const riskFreeRate = 0.03; // 3% risk-free rate (e.g., US Treasury yield)
  console.log('Risk-Free Rate:', riskFreeRate);

  const beta = data.additionalData.beta;
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

module.exports = {
  getYahooFinanceData,
  calculateDCFAllScenarios,
  prepareDCFInputs,
  getAdditionalStockData,
  getInsiderSentiment,
  getTechincalAnalysisData,
  getOptionsData,
  getFMPStockData,
};
