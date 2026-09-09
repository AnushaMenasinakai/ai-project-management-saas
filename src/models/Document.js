const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    content: {
      type: String,
      required: true,
    },

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    sourceType: {
      type: String,
      enum: ['text', 'file', 'url'],
      default: 'text',
    },

    originalFilename: {
      type: String,
      trim: true,
      maxlength: 255,
    },

    mimeType: {
      type: String,
      trim: true,
      maxlength: 150,
    },

    fileSize: {
      type: Number,
      min: 0,
      max: 5 * 1024 * 1024,
    },

    pageCount: {
      type: Number,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
