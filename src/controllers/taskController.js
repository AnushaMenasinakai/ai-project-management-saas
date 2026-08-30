const mongoose = require('mongoose');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { hasCircularDependency } = require('../services/taskDependencyService');
const User = require('../models/User');

// Create a task
exports.createTask = async (req, res) => {
  try {
    const { title, description, project, status, priority, dueDate, assignedTo,dependencies } = req.body;

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
    if (assignedTo !== undefined) {
  if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
    return res.status(400).json({
      message: 'Invalid assigned user ID.',
    });
  }

  const assignedUser = await User.findById(assignedTo);

  if (!assignedUser) {
    return res.status(404).json({
      message: 'Assigned user not found.',
    });
  }

  const isProjectMember = existingProject.members.some(
    (memberId) => memberId.toString() === assignedTo.toString()
  );

  if (!isProjectMember) {
    return res.status(403).json({
      message: 'Assigned user must be a member of the project.',
    });
  }
}

   let validatedDependencies = [];

if (dependencies !== undefined) {
  if (!Array.isArray(dependencies)) {
    return res.status(400).json({
      message: 'Dependencies must be an array.',
    });
  }

  const invalidDependency = dependencies.find(
    (dependencyId) => !mongoose.Types.ObjectId.isValid(dependencyId)
  );

  if (invalidDependency) {
    return res.status(400).json({
      message: 'All dependency IDs must be valid MongoDB ObjectIds.',
    });
  }

  validatedDependencies = [
    ...new Set(dependencies.map((dependencyId) => dependencyId.toString())),
  ];

  const dependencyTasks = await Task.find({
    _id: { $in: validatedDependencies },
    project,
  }).select('_id');

  if (dependencyTasks.length !== validatedDependencies.length) {
    return res.status(400).json({
      message: 'All dependencies must belong to the same project.',
    });
  }
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

    const project = await Project.findOne({
      _id: projectId,
      $or: [{ owner: req.user.id }, { members: req.user.id }],
    });

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

    const project = await Project.findOne({
      _id: task.project,
      $or: [{ owner: req.user.id }, { members: req.user.id }],
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
    if (assignedTo !== undefined) {
  if (assignedTo === null || assignedTo === '') {
    updates.assignedTo = null;
  } else {
    if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
      return res.status(400).json({
        message: 'Invalid assigned user ID.',
      });
    }

    const assignedUser = await User.findById(assignedTo);

    if (!assignedUser) {
      return res.status(404).json({
        message: 'Assigned user not found.',
      });
    }

    const isProjectMember = project.members.some(
      (memberId) => memberId.toString() === assignedTo.toString()
    );

    if (!isProjectMember) {
      return res.status(403).json({
        message: 'Assigned user must be a member of the project.',
      });
    }

    updates.assignedTo = assignedTo;
  }
}
    if (dependencies !== undefined) {
  if (!Array.isArray(dependencies)) {
    return res.status(400).json({
      message: 'Dependencies must be an array.',
    });
  }

  const invalidDependency = dependencies.find(
    (dependencyId) => !mongoose.Types.ObjectId.isValid(dependencyId)
  );

  if (invalidDependency) {
    return res.status(400).json({
      message: 'All dependency IDs must be valid MongoDB ObjectIds.',
    });
  }

  const uniqueDependencies = [
    ...new Set(dependencies.map((dependencyId) => dependencyId.toString())),
  ];

  if (uniqueDependencies.includes(id.toString())) {
    return res.status(400).json({
      message: 'A task cannot depend on itself.',
    });
  }

  const dependencyTasks = await Task.find({
    _id: { $in: uniqueDependencies },
    project: task.project,
  }).select('_id');

  if (dependencyTasks.length !== uniqueDependencies.length) {
    return res.status(400).json({
      message: 'All dependencies must belong to the same project.',
    });
  }

  const createsCycle = await hasCircularDependency(
    id,
    uniqueDependencies
  );

  if (createsCycle) {
    return res.status(400).json({
      message: 'Dependencies cannot create a circular relationship.',
    });
  }

  updates.dependencies = uniqueDependencies;
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

    const project = await Project.findOne({
      _id: task.project,
      owner: req.user.id,
    });

    if (!project) {
      return res.status(404).json({
        message: 'Task not found.',
      });
    }

    await Task.updateMany(
      { project: task.project, dependencies: task._id },
      { $pull: { dependencies: task._id } }
    );

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
