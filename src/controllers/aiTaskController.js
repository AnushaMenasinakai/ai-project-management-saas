const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { generateProjectTasks } = require('../services/aiTaskService');

exports.generateTasks = async (req, res) => {
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

    const { tasks } = await generateProjectTasks(
      project.name,
      project.description
    );

    const tasksToCreate = tasks.map((task) => ({
      title: task.title,
      description: task.description,
      project: project._id,
      status: 'todo',
      priority: task.priority,
      dueDate: task.dueDate,
    }));

    const createdTasks = await Task.insertMany(tasksToCreate);

    return res.status(201).json({
      message: 'AI tasks generated successfully.',
      tasks: createdTasks,
    });
  } catch (error) {
    console.error('Generate AI tasks error:', error);
    return res.status(500).json({
      message: 'Failed to generate AI tasks.',
    });
  }
};
