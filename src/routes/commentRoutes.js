const express = require('express');
const authenticateToken = require('../middleware/authMiddleware');
const {
  createComment,
  deleteComment,
  getTaskComments,
  updateComment,
} = require('../controllers/commentController');

const router = express.Router();

router.use(authenticateToken);

router.get('/tasks/:taskId/comments', getTaskComments);
router.post('/tasks/:taskId/comments', createComment);
router.patch('/comments/:commentId', updateComment);
router.delete('/comments/:commentId', deleteComment);

module.exports = router;
