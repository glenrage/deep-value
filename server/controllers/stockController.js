const stockService = require('../services/stockService');

exports.getMockStockData = (req, res) => {
  const data = stockService.getMockStockData();
  res.json(data);
};

exports.calculateDCF = (req, res) => {
  const { revenue, expenses, growthRate } = req.body;
  const dcfResult = stockService.calculateDCF(revenue, expenses, growthRate);
  res.json(dcfResult);
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
