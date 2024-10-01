// Formatting news data for sentiment analysis
const formatNewsDataForSentiment = (articles, ticker) => {
  return articles.map((article) => ({
    source: article.source?.name || 'Unknown',
    author: article.author || 'Unknown',
    title: article.title,
    description: article.description,
    content: article.content,
    ticker: ticker,
  }));
};

// Truncate text to a maximum length
const truncateText = (text, maxLength) => {
  if (text.length > maxLength) {
    return text.slice(0, maxLength) + '...';
  }
  return text;
};

const getValueByLabel = (array, labels) => {
  if (typeof labels === 'string') {
    labels = [labels];
  }

  for (let label of labels) {
    const cleanedLabel = label
      .replace(/[^a-zA-Z\s]/g, '')
      .toLowerCase()
      .trim();
    const item = array.find((entry) => {
      const cleanedEntryLabel = entry.label
        .replace(/[^a-zA-Z\s]/g, '')
        .toLowerCase()
        .trim();
      return cleanedEntryLabel.includes(cleanedLabel);
    });
    if (item) {
      return parseFloat(item.value);
    }
  }

  return null;
};

const getValueByConcept = (array, concepts) => {
  if (typeof concepts === 'string') {
    concepts = [concepts];
  }

  for (let concept of concepts) {
    const item = array.find((entry) => entry.concept === concept);
    if (item) {
      return parseFloat(item.value);
    }
  }

  return null;
};

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

const extractFinnhubReports = (report) => {
  const incomeStatementArray = report.report.ic;
  const cashFlowStatementArray = report.report.cf;

  if (!incomeStatementArray || !cashFlowStatementArray) {
    throw new Error(
      'Missing income statement or cash flow statement in the report'
    );
  }

  return {
    revenue:
      getValueByConcept(incomeStatementArray, ['us-gaap_Revenues']) ||
      getValueByLabel(incomeStatementArray, [
        'revenue',
        'total revenue',
        'net sales',
      ]),
    operatingIncome: getValueByConcept(incomeStatementArray, [
      'us-gaap_OperatingIncomeLoss',
      'us-gaap_IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest',
      'us-gaap_IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments',
      'us-gaap_IncomeLossFromContinuingOperationsIncludingPortionAttributableToNoncontrollingInterest',
    ]),
    incomeBeforeTax: getValueByConcept(incomeStatementArray, [
      'us-gaap_IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest',
    ]), // Income Before Tax
    interestExpense: getValueByConcept(incomeStatementArray, [
      'us-gaap_InterestExpense',
      'us-gaap_InterestAndDebtExpense',
    ]), // Interest Expense
    incomeTaxExpense: getValueByLabel(incomeStatementArray, [
      'income tax expense',
      'tax expense',
      'provision for income taxes',
      'income tax',
    ]), // Income Tax Expense
    netCashProvidedByOperatingActivities: getValueByConcept(
      cashFlowStatementArray,
      ['us-gaap_NetCashProvidedByUsedInOperatingActivities']
    ), // Operating cash flow
    capitalExpenditures: getValueByLabel(cashFlowStatementArray, [
      'property and equipment',
      'payments to acquire property',
      'capex',
    ]),
  };
};

const reduceEmbeddingToMatchIndex = (embedding, targetSize = 768) => {
  if (embedding.length > targetSize) {
    return embedding.slice(0, targetSize); // Truncate to match the index dimension
  } else if (embedding.length < targetSize) {
    throw new Error(
      `Embedding size (${embedding.length}) is smaller than expected dimension (${targetSize}).`
    );
  }
  return embedding; // If the size matches exactly, return as is
};

const sanitizeId = (id) => {
  // Replace non-ASCII characters with an underscore or remove them
  return id.replace(/[^\x00-\x7F]/g, '_');
};

module.exports = {
  calculateTerminalGrowthRate,
  formatNewsDataForSentiment,
  truncateText,
  getValueByLabel,
  getValueByConcept,
  extractFinnhubReports,
  reduceEmbeddingToMatchIndex,
  sanitizeId,
};
