const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/explain-dcf', aiController.requestAIExplanation);
router.post('/explain-ta', aiController.requestTAExplanation);

module.exports = router;
