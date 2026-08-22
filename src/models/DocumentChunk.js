const mongoose = require('mongoose');

const documentChunkSchema = new mongoose.Schema(
  {
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },

    content: {
      type: String,
      required: true,
    },

    chunkIndex: {
      type: Number,
      required: true,
      min: 0,
    },

    embedding: {
  type: [Number],
  required: true,
},
  },
  {
    timestamps: true,
  }
);

const DocumentChunk = mongoose.model(
  'DocumentChunk',
  documentChunkSchema
);

module.exports = DocumentChunk;