const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const taskController = require('../controllers/taskController');

const router = express.Router();

// Create a task
router.post('/', authMiddleware, taskController.createTask);

// Get all tasks for a project
router.get('/project/:projectId', authMiddleware, taskController.getProjectTasks);

// Get one task
router.get('/:id', authMiddleware, taskController.getTask);

// Update a task
router.patch('/:id', authMiddleware, taskController.updateTask);

// Delete a task
router.delete('/:id', authMiddleware, taskController.deleteTask);

module.exports = router;