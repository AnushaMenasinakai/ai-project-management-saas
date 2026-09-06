const mongoose = require('mongoose');
const {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
} = require('../constants/notificationConstants');

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, immutable: true },
    actorName: { type: String, required: true, trim: true, immutable: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, immutable: true },
    projectName: { type: String, required: true, trim: true, immutable: true },
    type: { type: String, enum: Object.values(NOTIFICATION_TYPES), required: true, immutable: true },
    entityType: { type: String, enum: Object.values(NOTIFICATION_ENTITY_TYPES), required: true, immutable: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
    entityName: { type: String, required: true, trim: true, immutable: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}), immutable: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ recipient: 1, createdAt: -1, _id: -1 });
notificationSchema.index({ recipient: 1, readAt: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
