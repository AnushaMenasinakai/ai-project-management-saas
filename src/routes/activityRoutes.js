const express = require('express');
const authenticateToken = require('../middleware/authMiddleware');
const { getProjectActivities } = require('../controllers/activityController');

const router = express.Router();

router.use(authenticateToken);
router.get('/:projectId/activities', getProjectActivities);

module.exports = router;
