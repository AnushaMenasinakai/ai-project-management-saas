const Notification = require('../models/Notification');
const Project = require('../models/Project');
const User = require('../models/User');
const {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
} = require('../constants/notificationConstants');

const STATUS_VALUES = new Set(['todo', 'in_progress', 'completed']);

const normalizeEmptyMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)
    || Object.keys(metadata).length > 0) {
    throw new Error('Notification metadata must be empty for this type.');
  }
  return {};
};

const normalizeStatusMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)
    || Object.keys(metadata).sort().join(',') !== 'from,to'
    || !STATUS_VALUES.has(metadata.from) || !STATUS_VALUES.has(metadata.to)
    || metadata.from === metadata.to) {
    throw new Error('Invalid task status notification metadata.');
  }
  return { from: metadata.from, to: metadata.to };
};

const metadataNormalizers = {
  [NOTIFICATION_TYPES.TASK_ASSIGNED]: normalizeEmptyMetadata,
  [NOTIFICATION_TYPES.TASK_UNASSIGNED]: normalizeEmptyMetadata,
  [NOTIFICATION_TYPES.PROJECT_MEMBER_ADDED]: normalizeEmptyMetadata,
  [NOTIFICATION_TYPES.ASSIGNED_TASK_STATUS_CHANGED]: normalizeStatusMetadata,
};

const createNotification = async ({
  recipient,
  actor,
  project,
  type,
  entityType,
  entityId,
  entityName,
  metadata = {},
  session,
}) => {
  const normalizeMetadata = metadataNormalizers[type];
  if (!normalizeMetadata) throw new Error(`Unsupported notification type: ${type}.`);
  if (!Object.values(NOTIFICATION_ENTITY_TYPES).includes(entityType)) {
    throw new Error(`Unsupported notification entity type: ${entityType}.`);
  }
  if (!recipient || !actor || !project || !entityId || !entityName?.trim()) {
    throw new Error('Notification requires recipient, actor, project, entityId, and entityName.');
  }
  const normalizedMetadata = normalizeMetadata(metadata);
  if (recipient.toString() === actor.toString()) return null;

  const [recipientUser, actorUser, projectDocument] = await Promise.all([
    User.findById(recipient),
    User.findById(actor),
    Project.findById(project),
  ]);
  if (!recipientUser || !actorUser || !projectDocument) {
    throw new Error('Notification snapshot source not found.');
  }

  const notification = {
    recipient: recipientUser._id,
    actor: actorUser._id,
    actorName: actorUser.name,
    project: projectDocument._id,
    projectName: projectDocument.name,
    type,
    entityType,
    entityId,
    entityName: entityName.trim(),
    metadata: normalizedMetadata,
  };

  if (session) {
    const [created] = await Notification.create([notification], { session });
    return created;
  }
  return Notification.create(notification);
};

module.exports = { createNotification };
