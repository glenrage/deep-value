const express = require('express');
const router = express.Router();
const sentimentController = require('../controllers/sentimentController');

router.get('/explain', sentimentController.getFullStockAnalysis);

module.exports = router;
