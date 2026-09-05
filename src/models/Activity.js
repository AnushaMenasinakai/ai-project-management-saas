const mongoose = require('mongoose');
const {
  ACTIVITY_ENTITY_TYPES,
  ACTIVITY_TYPES,
} = require('../constants/activityConstants');

const activitySchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      immutable: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      immutable: true,
    },
    actorName: {
      type: String,
      required: true,
      trim: true,
      immutable: true,
    },
    type: {
      type: String,
      enum: Object.values(ACTIVITY_TYPES),
      required: true,
      immutable: true,
    },
    entityType: {
      type: String,
      enum: Object.values(ACTIVITY_ENTITY_TYPES),
      required: true,
      immutable: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      immutable: true,
    },
    entityName: {
      type: String,
      required: true,
      trim: true,
      immutable: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
      immutable: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

activitySchema.index({ project: 1, createdAt: -1, _id: -1 });

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;
