const Activity = require('../models/Activity');
const User = require('../models/User');
const {
  ACTIVITY_ENTITY_TYPES,
  ACTIVITY_TYPES,
} = require('../constants/activityConstants');

const TASK_STATUSES = new Set(['todo', 'in_progress', 'completed']);
const CHANGED_FIELD_ALLOWLISTS = {
  [ACTIVITY_TYPES.PROJECT_UPDATED]: new Set(['name', 'description', 'status', 'startDate', 'dueDate']),
  [ACTIVITY_TYPES.TASK_UPDATED]: new Set(['title', 'description', 'priority', 'dueDate', 'dependencies']),
  [ACTIVITY_TYPES.DOCUMENT_UPDATED]: new Set(['title', 'content', 'sourceType']),
};

const normalizeChangedFields = (type, metadata = {}) => {
  const allowed = CHANGED_FIELD_ALLOWLISTS[type];
  const changedFields = [...new Set(metadata.changedFields || [])]
    .filter((field) => allowed.has(field));

  if (changedFields.length === 0) {
    throw new Error('Activity requires at least one supported changed field.');
  }

  return { changedFields };
};

const normalizeUserSnapshot = (id, name, label) => {
  if (!id || !name?.trim()) throw new Error(`Invalid ${label} activity metadata.`);
  return { id: id.toString(), name: name.trim() };
};

const metadataNormalizers = {
  [ACTIVITY_TYPES.PROJECT_CREATED]: () => ({}),
  [ACTIVITY_TYPES.PROJECT_UPDATED]: (metadata) => normalizeChangedFields(ACTIVITY_TYPES.PROJECT_UPDATED, metadata),
  [ACTIVITY_TYPES.TASK_CREATED]: () => ({}),
  [ACTIVITY_TYPES.TASK_UPDATED]: (metadata) => normalizeChangedFields(ACTIVITY_TYPES.TASK_UPDATED, metadata),
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
  [ACTIVITY_TYPES.TASK_ASSIGNED]: (metadata = {}) => {
    const assignee = normalizeUserSnapshot(metadata.assigneeId, metadata.assigneeName, 'assignee');
    return {
      ...(metadata.previousAssigneeId && metadata.previousAssigneeName?.trim()
        ? {
          previousAssigneeId: metadata.previousAssigneeId.toString(),
          previousAssigneeName: metadata.previousAssigneeName.trim(),
        }
        : {}),
      assigneeId: assignee.id,
      assigneeName: assignee.name,
    };
  },
  [ACTIVITY_TYPES.TASK_UNASSIGNED]: (metadata = {}) => {
    const previous = normalizeUserSnapshot(
      metadata.previousAssigneeId,
      metadata.previousAssigneeName,
      'previous assignee'
    );
    return { previousAssigneeId: previous.id, previousAssigneeName: previous.name };
  },
  [ACTIVITY_TYPES.TASK_DELETED]: () => ({}),
  [ACTIVITY_TYPES.MEMBER_ADDED]: () => ({}),
  [ACTIVITY_TYPES.MEMBER_REMOVED]: () => ({}),
  [ACTIVITY_TYPES.DOCUMENT_CREATED]: () => ({}),
  [ACTIVITY_TYPES.DOCUMENT_UPDATED]: (metadata) => normalizeChangedFields(ACTIVITY_TYPES.DOCUMENT_UPDATED, metadata),
  [ACTIVITY_TYPES.DOCUMENT_DELETED]: () => ({}),
  [ACTIVITY_TYPES.AI_TASKS_GENERATED]: (metadata = {}) => {
    if (!Number.isInteger(metadata.count) || metadata.count < 1) {
      throw new Error('Invalid AI task generation activity metadata.');
    }
    return { count: metadata.count };
  },
};

const resolveActorSnapshot = async (actorId) => {
  const actor = await User.findById(actorId).select('_id name');

  if (!actor) {
    throw new Error('Activity actor not found.');
  }

  return { actor: actor._id, actorName: actor.name };
};

const resolveUserSnapshot = async (userId) => {
  const user = await User.findById(userId).select('_id name');
  if (!user) return null;
  return { id: user._id, name: user.name };
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
  resolveUserSnapshot,
};
