const express = require('express');
const authenticateToken = require('../middleware/authMiddleware');
const { generateHealthInsight, getProjectHealth } = require('../controllers/projectHealthController');
const { aiLimiter } = require('../middleware/rateLimiters');

const router = express.Router();
router.use(authenticateToken);
router.get('/:projectId/health', getProjectHealth);
router.post('/:projectId/health/insight', aiLimiter, generateHealthInsight);

module.exports = router;
