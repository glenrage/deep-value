const express = require('express');
const router = express.Router();
const sentimentController = require('../controllers/sentimentController');

router.get('/explain', sentimentController.getFullStockAnalysis);
router.get('/semantic-search', sentimentController.searchSemnaticArticles);
router.get('/sentiment-search', sentimentController.searchArticlesBySentiment);

module.exports = router;
