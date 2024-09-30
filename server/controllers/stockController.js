const stockService = require('../services/stockService');
const { NVDA_MOCK } = require('../mocks');

exports.getMockStockData = (req, res) => {
  const data = stockService.getMockStockData();
  res.json(data);
};

exports.getStockData = async (req, res) => {
  const { ticker } = req.params;
  try {
    const data = await stockService.getStockData(ticker);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.calculateDCF = async (req, res) => {
  const { ticker } = req.query;

  // const stockData = await stockService.getStockData(ticker);
  const additionalData = await stockService.getAdditionalStockData(ticker);

  const dcfInputs = stockService.prepareDCFInputs(NVDA_MOCK, additionalData);

  const {
    freeCashFlow,
    growthRate,
    discountRate,
    terminalGrowthRate,
    sharesOutstanding,
  } = dcfInputs;

  const dcfResult = stockService.calculateDCFAllScenarios(
    freeCashFlow,
    growthRate,
    discountRate,
    terminalGrowthRate,
    sharesOutstanding
  );

  res.json({
    value: dcfResult,
    dcfInputs,
    dcfResult,
  });
};

exports.calculateReverseDCF = (req, res) => {};
