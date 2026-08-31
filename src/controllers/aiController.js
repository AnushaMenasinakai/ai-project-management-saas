const mongoose = require('mongoose');
const Project = require('../models/Project');
const { generateRagAnswer } = require('../services/ragService');

// Ask a question about a project
exports.askProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { question } = req.body;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(404).json({
        message: 'Project not found.',
      });
    }

    if (typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({
        message: 'Question is required.',
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

    const result = await generateRagAnswer(question, projectId);

    return res.status(200).json({
      question,
      answer: result.answer,
      sources: result.sources,
    });
  } catch (error) {
    console.error('Ask project error:', error);

    return res.status(500).json({
      message: 'Failed to generate answer.',
    });
  }
};
