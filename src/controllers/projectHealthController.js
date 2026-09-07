const mongoose = require('mongoose');
const Task = require('../models/Task');
const { findProjectForCollaborator } = require('../services/projectAccessService');
const { calculateProjectHealth } = require('../services/projectHealthService');

const getProjectHealth = async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const project = await findProjectForCollaborator(projectId, req.user.id);
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    const tasks = await Task.find({ project: project._id })
      .select('_id title status priority dueDate assignedTo dependencies');
    return res.status(200).json({
      health: calculateProjectHealth({ project, tasks, now: new Date() }),
    });
  } catch (error) {
    console.error('Get project health error:', error);
    return res.status(500).json({ message: 'Failed to calculate project health.' });
  }
};

module.exports = { getProjectHealth };
