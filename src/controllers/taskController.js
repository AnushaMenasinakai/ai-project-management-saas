const mongoose = require('mongoose');
const Task = require('../models/Task');
const Project = require('../models/Project');

// Create a task
exports.createTask = async (req, res) => {
  try {
    const { title, description, project, status, priority, dueDate, assignedTo } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        message: 'Task title is required.',
      });
    }

    if (!project || !mongoose.Types.ObjectId.isValid(project)) {
      return res.status(400).json({
        message: 'Valid project ID is required.',
      });
    }

    const existingProject = await Project.findOne({
      _id: project,
      owner: req.user.id,
    });

    if (!existingProject) {
      return res.status(404).json({
        message: 'Project not found.',
      });
    }

    const task = await Task.create({
      title,
      description,
      project,
      status,
      priority,
      dueDate,
      assignedTo,
    });

    return res.status(201).json({
      message: 'Task created successfully.',
      task,
    });
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({
      message: 'Failed to create task.',
    });
  }
};

// Get all tasks for a project
exports.getProjectTasks = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(404).json({
        message: 'Project not found.',
      });
    }

    const project = await Project.findOne({
      _id: projectId,
      owner: req.user.id,
    });

    if (!project) {
      return res.status(404).json({
        message: 'Project not found.',
      });
    }

    const tasks = await Task.find({
      project: projectId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      tasks,
    });
  } catch (error) {
    console.error('Get project tasks error:', error);
    return res.status(500).json({
      message: 'Failed to fetch tasks.',
    });
  }
};

// Get one task
exports.getTask = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        message: 'Task not found.',
      });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        message: 'Task not found.',
      });
    }

    const project = await Project.findOne({
      _id: task.project,
      owner: req.user.id,
    });

    if (!project) {
      return res.status(404).json({
        message: 'Task not found.',
      });
    }

    return res.status(200).json({
      task,
    });
  } catch (error) {
    console.error('Get task error:', error);
    return res.status(500).json({
      message: 'Failed to fetch task.',
    });
  }
};

// Update a task
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, dueDate, assignedTo } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        message: 'Task not found.',
      });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        message: 'Task not found.',
      });
    }

    const project = await Project.findOne({
      _id: task.project,
      owner: req.user.id,
    });

    if (!project) {
      return res.status(404).json({
        message: 'Task not found.',
      });
    }

    const updates = {};

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (assignedTo !== undefined) updates.assignedTo = assignedTo;

    const updatedTask = await Task.findByIdAndUpdate(
      id,
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      message: 'Task updated successfully.',
      task: updatedTask,
    });
  } catch (error) {
    console.error('Update task error:', error);
    return res.status(500).json({
      message: 'Failed to update task.',
    });
  }
};

// Delete a task
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        message: 'Task not found.',
      });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        message: 'Task not found.',
      });
    }

    const project = await Project.findOne({
      _id: task.project,
      owner: req.user.id,
    });

    if (!project) {
      return res.status(404).json({
        message: 'Task not found.',
      });
    }

    await Task.findByIdAndDelete(id);

    return res.status(200).json({
      message: 'Task deleted successfully.',
    });
  } catch (error) {
    console.error('Delete task error:', error);
    return res.status(500).json({
      message: 'Failed to delete task.',
    });
  }
};