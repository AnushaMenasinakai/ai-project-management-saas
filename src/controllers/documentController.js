const mongoose = require('mongoose');
const Document = require('../models/Document');
const Project = require('../models/Project');

// Create a document
exports.createDocument = async (req, res) => {
  try {
    const { title, content, project, sourceType } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        message: 'Document title is required.',
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        message: 'Document content is required.',
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

    const document = await Document.create({
      title,
      content,
      project,
      uploadedBy: req.user.id,
      sourceType,
    });

    return res.status(201).json({
      message: 'Document created successfully.',
      document,
    });
  } catch (error) {
    console.error('Create document error:', error);

    return res.status(500).json({
      message: 'Failed to create document.',
    });
  }
};

// Get all documents for a project
exports.getProjectDocuments = async (req, res) => {
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

    const documents = await Document.find({
      project: projectId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      documents,
    });
  } catch (error) {
    console.error('Get project documents error:', error);

    return res.status(500).json({
      message: 'Failed to fetch documents.',
    });
  }
};

// Get one document
exports.getDocument = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        message: 'Document not found.',
      });
    }

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({
        message: 'Document not found.',
      });
    }

    const project = await Project.findOne({
      _id: document.project,
      owner: req.user.id,
    });

    if (!project) {
      return res.status(404).json({
        message: 'Document not found.',
      });
    }

    return res.status(200).json({
      document,
    });
  } catch (error) {
    console.error('Get document error:', error);

    return res.status(500).json({
      message: 'Failed to fetch document.',
    });
  }
};

// Update a document
exports.updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, sourceType } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        message: 'Document not found.',
      });
    }

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({
        message: 'Document not found.',
      });
    }

    const project = await Project.findOne({
      _id: document.project,
      owner: req.user.id,
    });

    if (!project) {
      return res.status(404).json({
        message: 'Document not found.',
      });
    }

    const updates = {};

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({
          message: 'Document title cannot be empty.',
        });
      }

      updates.title = title;
    }

    if (content !== undefined) {
      if (!content.trim()) {
        return res.status(400).json({
          message: 'Document content cannot be empty.',
        });
      }

      updates.content = content;
    }

    if (sourceType !== undefined) {
      updates.sourceType = sourceType;
    }

    const updatedDocument = await Document.findByIdAndUpdate(
      id,
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      message: 'Document updated successfully.',
      document: updatedDocument,
    });
  } catch (error) {
    console.error('Update document error:', error);

    return res.status(500).json({
      message: 'Failed to update document.',
    });
  }
};

// Delete a document
exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        message: 'Document not found.',
      });
    }

    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({
        message: 'Document not found.',
      });
    }

    const project = await Project.findOne({
      _id: document.project,
      owner: req.user.id,
    });

    if (!project) {
      return res.status(404).json({
        message: 'Document not found.',
      });
    }

    await Document.findByIdAndDelete(id);

    return res.status(200).json({
      message: 'Document deleted successfully.',
    });
  } catch (error) {
    console.error('Delete document error:', error);

    return res.status(500).json({
      message: 'Failed to delete document.',
    });
  }
};