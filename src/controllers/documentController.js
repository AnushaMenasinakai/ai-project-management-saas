const mongoose = require('mongoose');
const Document = require('../models/Document');
const DocumentChunk = require('../models/DocumentChunk');
const {
  DocumentEmbeddingLimitError,
  prepareDocumentChunks,
} = require('../services/documentChunkService');
const { ACTIVITY_ENTITY_TYPES, ACTIVITY_TYPES } = require('../constants/activityConstants');
const { recordActivity, resolveActorSnapshot } = require('../services/activityService');
const sendGeminiErrorResponse = require('../utils/geminiErrorResponse');
const { DocumentFileError, extractDocumentFile } = require('../services/fileExtractionService');
const {
  findProjectForCollaborator,
  findProjectForOwner,
} = require('../services/projectAccessService');

const persistPreparedDocument = async ({
  title,
  content,
  project,
  uploadedBy,
  sourceType,
  metadata = {},
  preparedChunks,
  actor,
}) => {
  const session = await mongoose.startSession();
  let document;
  try {
    await session.withTransaction(async () => {
      document = new Document({
        title,
        content,
        project: project._id,
        uploadedBy,
        sourceType,
        ...metadata,
      });
      await document.save({ session });
      await DocumentChunk.insertMany(preparedChunks.map((chunk) => ({
        document: document._id,
        project: document.project,
        ...chunk,
      })), { session });
      await recordActivity({
        project: project._id,
        ...actor,
        type: ACTIVITY_TYPES.DOCUMENT_CREATED,
        entityType: ACTIVITY_ENTITY_TYPES.DOCUMENT,
        entityId: document._id,
        entityName: document.title,
        session,
      });
    });
  } finally {
    await session.endSession();
  }
  return document;
};

exports.uploadDocument = async (req, res) => {
  try {
    const { projectId, title } = req.body;
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ message: 'Document title is required.' });
    }
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ message: 'Valid project ID is required.' });
    }
    if (!req.file) {
      return res.status(400).json({
        code: 'DOCUMENT_FILE_REQUIRED',
        message: 'A document file is required.',
      });
    }

    const project = await findProjectForOwner(projectId, req.user.id);
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    const extracted = await extractDocumentFile(req.file);
    const preparedChunks = await prepareDocumentChunks(extracted.text, {
      segments: extracted.segments,
    });
    const actor = await resolveActorSnapshot(req.user.id);
    const document = await persistPreparedDocument({
      title: title.trim(),
      content: extracted.text,
      project,
      uploadedBy: req.user.id,
      sourceType: 'file',
      metadata: extracted.metadata,
      preparedChunks,
      actor,
    });

    return res.status(201).json({
      message: 'Document uploaded successfully.',
      document,
    });
  } catch (error) {
    if (error instanceof DocumentFileError || error instanceof DocumentEmbeddingLimitError) {
      return res.status(error.httpStatus).json({ code: error.code, message: error.message });
    }
    if (sendGeminiErrorResponse({ error, feature: 'document_embedding', res })) {
      return undefined;
    }
    console.error('Upload document error:', error);
    return res.status(500).json({ message: 'Failed to upload document.' });
  }
};

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

    const existingProject = await findProjectForOwner(project, req.user.id);

    if (!existingProject) {
      return res.status(404).json({
        message: 'Project not found.',
      });
    }

    const preparedChunks = await prepareDocumentChunks(content);
    const actor = await resolveActorSnapshot(req.user.id);

    const session = await mongoose.startSession();
    let document;

    try {
      await session.withTransaction(async () => {
        document = new Document({
          title,
          content,
          project,
          uploadedBy: req.user.id,
          sourceType,
        });

        await document.save({ session });

        const chunkDocuments = preparedChunks.map((chunk) => ({
          document: document._id,
          project: document.project,
          ...chunk,
        }));

        await DocumentChunk.insertMany(chunkDocuments, { session });
        await recordActivity({
          project: existingProject._id, ...actor, type: ACTIVITY_TYPES.DOCUMENT_CREATED,
          entityType: ACTIVITY_ENTITY_TYPES.DOCUMENT, entityId: document._id,
          entityName: document.title, session,
        });
      });
    } finally {
      await session.endSession();
    }

    return res.status(201).json({
      message: 'Document created successfully.',
      document,
    });
  } catch (error) {
    if (error instanceof DocumentEmbeddingLimitError) {
      return res.status(error.httpStatus).json({ code: error.code, message: error.message });
    }
    if (sendGeminiErrorResponse({ error, feature: 'document_embedding', res })) {
      return undefined;
    }
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

    const project = await findProjectForCollaborator(projectId, req.user.id);

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

    const project = await findProjectForCollaborator(document.project, req.user.id);

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

    const project = await findProjectForOwner(document.project, req.user.id);

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

    const comparable = (field, value) => (
      field === 'title' && typeof value === 'string' ? value.trim() : String(value ?? '')
    );
    const changedFields = Object.keys(updates).filter(
      (field) => comparable(field, document[field]) !== comparable(field, updates[field])
    );
    let updatedDocument;

    if (content === undefined && changedFields.length === 0) {
      updatedDocument = await Document.findByIdAndUpdate(
        id,
        updates,
        {
          new: true,
          runValidators: true,
        }
      );
    } else {
      const preparedChunks = content === undefined ? null : await prepareDocumentChunks(content);
      const chunkDocuments = preparedChunks?.map((chunk) => ({
        document: document._id, project: document.project, ...chunk,
      })) || [];
      const actor = changedFields.length > 0 ? await resolveActorSnapshot(req.user.id) : null;

      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          updatedDocument = await Document.findByIdAndUpdate(
            id,
            updates,
            {
              new: true,
              runValidators: true,
              session,
            }
          );

          if (content !== undefined) {
            await DocumentChunk.deleteMany({ document: id }, { session });
            await DocumentChunk.insertMany(chunkDocuments, { session });
          }
          if (changedFields.length > 0) await recordActivity({
            project: project._id, ...actor, type: ACTIVITY_TYPES.DOCUMENT_UPDATED,
            entityType: ACTIVITY_ENTITY_TYPES.DOCUMENT, entityId: document._id,
            entityName: updatedDocument.title,
            metadata: { changedFields }, session,
          });
        });
      } finally {
        await session.endSession();
      }
    }

    return res.status(200).json({
      message: 'Document updated successfully.',
      document: updatedDocument,
    });
  } catch (error) {
    if (error instanceof DocumentEmbeddingLimitError) {
      return res.status(error.httpStatus).json({ code: error.code, message: error.message });
    }
    if (sendGeminiErrorResponse({ error, feature: 'document_embedding', res })) {
      return undefined;
    }
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

    const project = await findProjectForOwner(document.project, req.user.id);

    if (!project) {
      return res.status(404).json({
        message: 'Document not found.',
      });
    }

    const session = await mongoose.startSession();
    const actor = await resolveActorSnapshot(req.user.id);

    try {
      await session.withTransaction(async () => {
        await DocumentChunk.deleteMany(
          { document: id },
          { session }
        );

        await recordActivity({
          project: project._id, ...actor, type: ACTIVITY_TYPES.DOCUMENT_DELETED,
          entityType: ACTIVITY_ENTITY_TYPES.DOCUMENT, entityId: document._id,
          entityName: document.title, session,
        });

        await Document.findByIdAndDelete(id, { session });
      });
    } finally {
      await session.endSession();
    }

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
