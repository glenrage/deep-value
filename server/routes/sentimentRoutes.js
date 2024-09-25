const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');

router.get('/mock-data', stockController.getMockStockData);
router.get('/:ticker', stockController.getStockData);
router.post('/calculate-dcf', stockController.calculateDCF);
router.post('/calculate-rdcf', stockController.calculateReverseDCF);

module.exports = router;
