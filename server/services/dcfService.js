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

// Helper function to calculate ROIC
const calculateROIC = (data, additionalData) => {
  const annualReport = data.data.incomeStatement.annualReports[0];
  const operatingIncome = parseFloat(annualReport.operatingIncome);
  const incomeTaxExpense = parseFloat(annualReport.incomeTaxExpense);

  // Assume tax rate is income tax / income before tax
  const taxRate =
    parseFloat(annualReport.incomeTaxExpense) /
    parseFloat(annualReport.incomeBeforeTax);
  const nopat = operatingIncome * (1 - taxRate);

  // Estimate invested capital (use total debt + market cap as a proxy)
  const totalDebt = parseFloat(annualReport.interestExpense) / 0.05; // Assuming 5% interest rate
  const marketCap = additionalData.marketCap;
  const investedCapital = totalDebt + marketCap;

  // Calculate ROIC
  const roic = nopat / investedCapital;
  return roic;
};

// Helper function to calculate long-term growth rate
function calculateLongTermGrowthRate(data) {
  const annualReports = data.data.incomeStatement.annualReports;
  const currentRevenue = parseFloat(annualReports[0].totalRevenue);
  const previousRevenue = parseFloat(annualReports[1].totalRevenue);

  // Calculate the revenue growth rate between two most recent years
  const revenueGrowthRate =
    (currentRevenue - previousRevenue) / previousRevenue;

  // Cap long-term growth rate to a reasonable value (e.g., 4%)
  const longTermGrowthRate = Math.min(revenueGrowthRate * 0.5, 0.04);
  return longTermGrowthRate;
}

/**
 * Main function to calculate inputs for reverse DCF
 */
function calculateReverseDCFInputs(data, additionalData) {
  const annualReport = data.data.incomeStatement.annualReports[0]; // Get the most recent annual report

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
  const previousReport = data.data.incomeStatement.annualReports[1];
  const totalRevenue = parseFloat(annualReport.totalRevenue);
  const previousRevenue = parseFloat(previousReport.totalRevenue);
  const revenueGrowthRate = (totalRevenue - previousRevenue) / previousRevenue;

  // Calculate WACC and terminal growth rate using the helper functions
  const wacc = calculateWACC(data, additionalData);
  const terminalGrowthRate = calculateTerminalGrowthRate(data);

  return {
    wacc,
    years: 10, // Assuming 10-year forecast period
    revenueGrowthRate,
    terminalGrowthRate,
    initialNopat,
  };
}

// Main function to calculate inputs for Enhanced Reverse DCF
const calculateEnhancedReverseDCFInputs = (data, additionalData) => {
  const currentStockPrice = additionalData.currentPrice;
  // Get shares outstanding
  const sharesOutstanding = parseFloat(additionalData.sharesOutstanding);

  // Calculate WACC using available data
  const wacc = calculateWACC(data, additionalData);

  // Calculate ROIC
  const roic = calculateROIC(data, additionalData);

  // Calculate long-term growth rate
  const longTermGrowthRate = calculateLongTermGrowthRate(data);

  // Get the initial NOPAT from the data (we assume it is already calculated in previous steps)
  const annualReport = data.data.incomeStatement.annualReports[0];
  const operatingIncome = parseFloat(annualReport.operatingIncome);
  const taxRate =
    parseFloat(annualReport.incomeTaxExpense) /
    parseFloat(annualReport.incomeBeforeTax);
  const initialNopat = operatingIncome * (1 - taxRate);

  return {
    currentStockPrice,
    sharesOutstanding,
    wacc,
    years: 10, // Assuming a 10-year forecast period
    initialNopat,
    roic,
    longTermGrowthRate,
  };
};

const calculateEnhancedReverseDCF = ({
  currentStockPrice,
  sharesOutstanding,
  wacc,
  years,
  initialNopat,
  roic,
  longTermGrowthRate,
}) => {
  const marketCap = currentStockPrice * sharesOutstanding;

  let impliedGrowthRate = 0;
  let low = 0;
  let high = 1; // 100% growth rate as upper bound

  while (high - low > 0.0001) {
    impliedGrowthRate = (high + low) / 2;

    const calculatedValue = calculateReverseDCF({
      wacc,
      years,
      revenueGrowthRate: impliedGrowthRate,
      terminalGrowthRate: longTermGrowthRate,
      initialNopat,
      roic,
    });

    if (calculatedValue > marketCap) {
      high = impliedGrowthRate;
    } else {
      low = impliedGrowthRate;
    }
  }

  return {
    impliedGrowthRate,
    sustainableGrowthRate: roic * (1 - 1 / impliedGrowthRate),
    valueGap:
      (calculateReverseDCF({
        wacc,
        years,
        revenueGrowthRate: impliedGrowthRate,
        terminalGrowthRate: longTermGrowthRate,
        initialNopat,
        roic,
      }) -
        marketCap) /
      marketCap,
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

module.exports = {
  calculateReverseDCFInputs,
  calculateEnhancedReverseDCF,
  calculateReverseDCF,
  calculateEnhancedReverseDCFInputs,
};
