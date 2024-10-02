const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');

router.get('/mock-data', stockController.getMockStockData);
router.get('/calculate-dcf', stockController.getStockDataAndCalculateDCF);

module.exports = router;
