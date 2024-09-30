const stockService = require('../services/stockService');
const { NVDA_MOCK } = require('../mocks');

const getMockStockData = (req, res) => {
  const data = stockService.getMockStockData();
  res.json(data);
};

const getStockDataAndCalculateDCF = async (req, res) => {
  const { ticker } = req.query;

  // const stockData = await stockService.getStockData(ticker);
  const insiderData = await stockService.getRecentInsiderTrades(ticker);
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
    insiderData,
  });
};

module.exports = {
  getMockStockData,
  getStockDataAndCalculateDCF,
};
