const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Document = require('../models/Document');
const DocumentChunk = require('../models/DocumentChunk');
const {
  findProjectForCollaborator,
  findProjectForOwner,
} = require('../services/projectAccessService');

const allowedUpdateFields = ['name', 'description', 'status', 'startDate', 'dueDate'];

const isValidProjectId = (projectId) => mongoose.isValidObjectId(projectId);

const createProject = async (req, res) => {
  try {
    const { name, description, status, startDate, dueDate } = req.body;

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Project name is required.' });
    }

    const project = await Project.create({
      name: name.trim(),
      description,
      status,
      startDate,
      dueDate,
      owner: req.user.id,
    });

    return res.status(201).json({ project });
  } catch (error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid project data.' });
    }

    console.error(`Unable to create project: ${error.message}`);
    return res.status(500).json({ message: 'Unable to create project.' });
  }
};

const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ owner: req.user.id }, { members: req.user.id }],
    });

    const projectsWithProgress = await Promise.all(
      projects.map(async (project) => {
        const totalTasks = await Task.countDocuments({
          project: project._id,
        });

        const completedTasks = await Task.countDocuments({
          project: project._id,
          status: 'completed',
        });

        const progress =
          totalTasks === 0
            ? 0
            : Math.round((completedTasks / totalTasks) * 100);

        return {
          ...project.toObject(),
          totalTasks,
          completedTasks,
          progress,
        };
      })
    );

    return res.status(200).json({
      projects: projectsWithProgress,
    });
  } catch (error) {
    console.error(`Unable to get projects: ${error.message}`);
    return res.status(500).json({
      message: 'Unable to retrieve projects.',
    });
  }
};
   

const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidProjectId(id)) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const project = await findProjectForCollaborator(id, req.user.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    return res.status(200).json({ project });
  } catch (error) {
    console.error(`Unable to get project: ${error.message}`);
    return res.status(500).json({ message: 'Unable to retrieve project.' });
  }
};

const updateProject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidProjectId(id)) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const updates = {};

    allowedUpdateFields.forEach((field) => {
      if (Object.hasOwn(req.body, field)) {
        updates[field] = field === 'name' && typeof req.body.name === 'string'
          ? req.body.name.trim()
          : req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Provide at least one valid project field to update.' });
    }

    if (Object.hasOwn(updates, 'name') && (!updates.name || typeof updates.name !== 'string')) {
      return res.status(400).json({ message: 'Project name cannot be empty.' });
    }

    const project = await Project.findOneAndUpdate(
      { _id: id, owner: req.user.id },
      updates,
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    return res.status(200).json({ project });
  } catch (error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid project data.' });
    }

    console.error(`Unable to update project: ${error.message}`);
    return res.status(500).json({ message: 'Unable to update project.' });
  }
};

const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidProjectId(id)) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const project = await findProjectForOwner(id, req.user.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        await DocumentChunk.deleteMany({ project: project._id }, { session });
        await Document.deleteMany({ project: project._id }, { session });
        await Task.deleteMany({ project: project._id }, { session });
        await Project.deleteOne(
          { _id: project._id, owner: req.user.id },
          { session }
        );
      });
    } finally {
      await session.endSession();
    }

    return res.status(200).json({ message: 'Project deleted successfully.' });
  } catch (error) {
    console.error(`Unable to delete project: ${error.message}`);
    return res.status(500).json({ message: 'Unable to delete project.' });
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
};
