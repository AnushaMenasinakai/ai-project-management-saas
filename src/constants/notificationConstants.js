const NOTIFICATION_TYPES = Object.freeze({
  TASK_ASSIGNED: 'task_assigned',
  TASK_UNASSIGNED: 'task_unassigned',
  ASSIGNED_TASK_STATUS_CHANGED: 'assigned_task_status_changed',
  PROJECT_MEMBER_ADDED: 'project_member_added',
});

const NOTIFICATION_ENTITY_TYPES = Object.freeze({
  TASK: 'task',
  PROJECT: 'project',
});

module.exports = {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
};
