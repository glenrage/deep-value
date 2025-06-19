const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');

router.post('/quick-snapshot', agentController.requestAIQuickSnapshot);

module.exports = router;
