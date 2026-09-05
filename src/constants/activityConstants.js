const ACTIVITY_TYPES = Object.freeze({
  PROJECT_CREATED: 'project_created',
  PROJECT_UPDATED: 'project_updated',
  TASK_CREATED: 'task_created',
  TASK_UPDATED: 'task_updated',
  TASK_STATUS_CHANGED: 'task_status_changed',
  TASK_ASSIGNED: 'task_assigned',
  TASK_UNASSIGNED: 'task_unassigned',
  TASK_DELETED: 'task_deleted',
  MEMBER_ADDED: 'member_added',
  MEMBER_REMOVED: 'member_removed',
  DOCUMENT_CREATED: 'document_created',
  DOCUMENT_UPDATED: 'document_updated',
  DOCUMENT_DELETED: 'document_deleted',
  AI_TASKS_GENERATED: 'ai_tasks_generated',
});

const ACTIVITY_ENTITY_TYPES = Object.freeze({
  PROJECT: 'project',
  TASK: 'task',
  MEMBER: 'member',
  DOCUMENT: 'document',
  AI: 'ai',
});

module.exports = {
  ACTIVITY_ENTITY_TYPES,
  ACTIVITY_TYPES,
};
