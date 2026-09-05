const Activity = require('../models/Activity');
const User = require('../models/User');
const {
  ACTIVITY_ENTITY_TYPES,
  ACTIVITY_TYPES,
} = require('../constants/activityConstants');

const TASK_STATUSES = new Set(['todo', 'in_progress', 'completed']);

const metadataNormalizers = {
  [ACTIVITY_TYPES.PROJECT_CREATED]: () => ({}),
  [ACTIVITY_TYPES.TASK_CREATED]: () => ({}),
  [ACTIVITY_TYPES.TASK_STATUS_CHANGED]: (metadata = {}) => {
    if (
      !TASK_STATUSES.has(metadata.from)
      || !TASK_STATUSES.has(metadata.to)
      || metadata.from === metadata.to
    ) {
      throw new Error('Invalid task status activity metadata.');
    }

    return { from: metadata.from, to: metadata.to };
  },
};

const resolveActorSnapshot = async (actorId) => {
  const actor = await User.findById(actorId).select('_id name');

  if (!actor) {
    throw new Error('Activity actor not found.');
  }

  return { actor: actor._id, actorName: actor.name };
};

const recordActivity = async ({
  project,
  actor,
  actorName,
  type,
  entityType,
  entityId,
  entityName,
  metadata = {},
  session,
}) => {
  const normalizeMetadata = metadataNormalizers[type];

  if (!normalizeMetadata) {
    throw new Error(`Unsupported activity type: ${type}.`);
  }

  if (!Object.values(ACTIVITY_ENTITY_TYPES).includes(entityType)) {
    throw new Error(`Unsupported activity entity type: ${entityType}.`);
  }

  if (!project || !actor || !actorName?.trim() || !entityId || !entityName?.trim()) {
    throw new Error('Activity requires project, actor, actorName, entityId, and entityName.');
  }

  const activity = {
    project,
    actor,
    actorName: actorName.trim(),
    type,
    entityType,
    entityId,
    entityName: entityName.trim(),
    metadata: normalizeMetadata(metadata),
  };

  if (session) {
    const [createdActivity] = await Activity.create([activity], { session });
    return createdActivity;
  }

  return Activity.create(activity);
};

module.exports = {
  recordActivity,
  resolveActorSnapshot,
};
