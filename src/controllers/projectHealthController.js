const mongoose = require('mongoose');
const Task = require('../models/Task');
const { findProjectForCollaborator } = require('../services/projectAccessService');
const { calculateProjectHealth } = require('../services/projectHealthService');
const { generateProjectHealthInsight } = require('../services/projectHealthInsightService');
const sendGeminiErrorResponse = require('../utils/geminiErrorResponse');

const findHealthSnapshot = async (projectId, userId) => {
  if (!mongoose.isValidObjectId(projectId)) return null;
  const project = await findProjectForCollaborator(projectId, userId);
  if (!project) return null;
  const tasks = await Task.find({ project: project._id })
    .select('_id title status priority dueDate assignedTo dependencies');
  return calculateProjectHealth({ project, tasks, now: new Date() });
};

const getProjectHealth = async (req, res) => {
  try {
    const { projectId } = req.params;
    const health = await findHealthSnapshot(projectId, req.user.id);
    if (!health) return res.status(404).json({ message: 'Project not found.' });
    return res.status(200).json({
      health,
    });
  } catch (error) {
    console.error('Get project health error:', error);
    return res.status(500).json({ message: 'Failed to calculate project health.' });
  }
};

const generateHealthInsight = async (req, res) => {
  try {
    const health = await findHealthSnapshot(req.params.projectId, req.user.id);
    if (!health) return res.status(404).json({ message: 'Project not found.' });
    const insight = await generateProjectHealthInsight(health);
    return res.status(200).json({ health, insight, generatedAt: new Date().toISOString() });
  } catch (error) {
    if (sendGeminiErrorResponse({ error, feature: 'project_health_insight', res })) {
      return undefined;
    }
    console.error('Generate project health insight error:', error);
    return res.status(500).json({ message: 'Failed to generate project health insight.' });
  }
};

module.exports = { generateHealthInsight, getProjectHealth };
