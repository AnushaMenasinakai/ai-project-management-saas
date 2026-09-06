const Notification = require('../models/Notification');
const Project = require('../models/Project');
const User = require('../models/User');
const {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
} = require('../constants/notificationConstants');

const metadataNormalizers = {
  [NOTIFICATION_TYPES.TASK_ASSIGNED]: () => ({}),
  [NOTIFICATION_TYPES.PROJECT_MEMBER_ADDED]: () => ({}),
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
  if (!recipient || !actor || recipient.toString() === actor.toString()) return null;

  const normalizeMetadata = metadataNormalizers[type];
  if (!normalizeMetadata) throw new Error(`Unsupported notification type: ${type}.`);
  if (!Object.values(NOTIFICATION_ENTITY_TYPES).includes(entityType)) {
    throw new Error(`Unsupported notification entity type: ${entityType}.`);
  }
  if (!project || !entityId || !entityName?.trim()) {
    throw new Error('Notification requires project, entityId, and entityName.');
  }

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
    metadata: normalizeMetadata(metadata),
  };

  if (session) {
    const [created] = await Notification.create([notification], { session });
    return created;
  }
  return Notification.create(notification);
};

module.exports = { createNotification };
