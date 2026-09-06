const express = require('express');
const authenticateToken = require('../middleware/authMiddleware');
const {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} = require('../controllers/notificationController');

const router = express.Router();
router.use(authenticateToken);
router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:notificationId/read', markNotificationRead);

module.exports = router;
