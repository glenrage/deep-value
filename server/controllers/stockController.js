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

exports.calculateDCF = (req, res) => {
  // console.log({ NVDA_MOCK });

  const dcfInputs = stockService.prepareDCFInputs(NVDA_MOCK);

  const {
    freeCashFlow,
    growthRate,
    discountRate,
    terminalGrowthRate,
    sharesOutstanding,
  } = dcfInputs;

  const dcfResult = stockService.calculateDCF(
    freeCashFlow,
    growthRate,
    discountRate,
    terminalGrowthRate,
    sharesOutstanding
  );

  console.log({ dcfInputs, dcfResult });
  res.json({
    value: dcfResult,
  });
};

exports.calculateReverseDCF = (req, res) => {};
