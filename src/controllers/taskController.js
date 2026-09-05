const mongoose = require('mongoose');
const Task = require('../models/Task');
const Comment = require('../models/Comment');
const { findProjectForCollaborator } = require('../services/projectAccessService');
const {
  validateTaskAssignee,
  validateTaskDependencies,
} = require('../services/taskValidationService');

const sendValidationError = (res, result) => res.status(result.error.status).json({
  message: result.error.message,
});

// Create a task
exports.createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      project,
      status,
      priority,
      dueDate,
      assignedTo,
      dependencies,
    } = req.body;

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

    const existingProject = await findProjectForCollaborator(project, req.user.id);

    if (!existingProject) {
      return res.status(404).json({
        message: 'Project not found.',
      });
    }
    if (assignedTo !== undefined) {
      const assigneeResult = await validateTaskAssignee(assignedTo, existingProject);
      if (assigneeResult.error) return sendValidationError(res, assigneeResult);
    }

    let validatedDependencies = [];

    if (dependencies !== undefined) {
      const dependencyResult = await validateTaskDependencies(dependencies, project);
      if (dependencyResult.error) return sendValidationError(res, dependencyResult);
      validatedDependencies = dependencyResult.value;
    }

    const task = await Task.create({
      title,
      description,
      project,
      status,
      priority,
      dueDate,
      assignedTo,
      dependencies: validatedDependencies,
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

    const project = await findProjectForCollaborator(projectId, req.user.id);

    if (!project) {
      return res.status(404).json({
        message: 'Project not found.',
      });
    }

    const tasks = await Task.find({
      project: projectId,
    })
      .populate('dependencies', 'title')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

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

    const project = await findProjectForCollaborator(task.project, req.user.id);

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
    const {
      title,
      description,
      status,
      priority,
      dueDate,
      assignedTo,
      dependencies,
    } = req.body;

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

    const project = await findProjectForCollaborator(task.project, req.user.id);

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
    if (assignedTo !== undefined) {
      const assigneeResult = await validateTaskAssignee(
        assignedTo,
        project,
        { allowUnassigned: true }
      );
      if (assigneeResult.error) return sendValidationError(res, assigneeResult);
      updates.assignedTo = assigneeResult.value;
    }
    if (dependencies !== undefined) {
      const dependencyResult = await validateTaskDependencies(
        dependencies,
        task.project,
        { taskId: id }
      );
      if (dependencyResult.error) return sendValidationError(res, dependencyResult);
      updates.dependencies = dependencyResult.value;
    }

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

    const project = await findProjectForCollaborator(task.project, req.user.id);

    if (!project) {
      return res.status(404).json({
        message: 'Task not found.',
      });
    }

    if (project.owner.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        message: 'Only the project owner can delete tasks.',
      });
    }

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        await Task.updateMany(
          { project: task.project, dependencies: task._id },
          { $pull: { dependencies: task._id } },
          { session }
        );
        await Comment.deleteMany(
          { task: task._id, project: project._id },
          { session }
        );
        await Task.findByIdAndDelete(id, { session });
      });
    } finally {
      await session.endSession();
    }

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
