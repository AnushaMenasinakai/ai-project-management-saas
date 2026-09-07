const express = require('express');
const authenticateToken = require('../middleware/authMiddleware');
const { getProjectHealth } = require('../controllers/projectHealthController');

const router = express.Router();
router.use(authenticateToken);
router.get('/:projectId/health', getProjectHealth);

module.exports = router;
