const express = require('express');

const authMiddleware = require('../middleware/authMiddleware');
const {
  addMember,
  getMembers,
  removeMember,
} = require('../controllers/projectMemberController');

const router = express.Router();

router.use(authMiddleware);

// Add a member
router.post('/:id/members', addMember);

// Get project members
router.get('/:id/members', getMembers);

// Remove a member
router.delete('/:id/members/:userId', removeMember);

module.exports = router;