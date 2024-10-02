const stockService = require('../services/stockService');

const getMockStockData = (req, res) => {
  const data = stockService.getMockStockData();
  res.json(data);
};

const getStockDataAndCalculateDCF = async (req, res) => {
  const { ticker } = req.query;

  const stockData = await stockService.getStockData(ticker);
  const insiderData = await stockService.getInsiderSentiment(ticker);
  const additionalData = await stockService.getAdditionalStockData(ticker);
  const historicalData = await stockService.getTechincalAnalysisData(ticker);
  const optionsData = await stockService.getOptionsData(ticker);

  const dcfInputs = stockService.prepareDCFInputs(stockData, additionalData);

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
    historicalData,
    insiderData,
    optionsData,
  });
};

module.exports = {
  getMockStockData,
  getStockDataAndCalculateDCF,
};
