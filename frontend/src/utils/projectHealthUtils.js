const labels = {
  healthStatus: {
    healthy: 'Healthy',
    at_risk: 'At Risk',
    critical: 'Critical',
    insufficient_data: 'Insufficient Data',
  },
  dueStatus: {
    completed: 'Completed',
    no_due_date: 'No due date',
    overdue: 'Overdue',
    due_soon: 'Due soon',
    on_track: 'On track',
  },
  taskStatus: {
    todo: 'To Do',
    in_progress: 'In Progress',
    completed: 'Completed',
  },
  priority: { low: 'Low', medium: 'Medium', high: 'High' },
  issue: {
    overdue: 'Overdue',
    due_soon: 'Due soon',
    high_priority: 'High priority',
    unassigned: 'Unassigned',
    blocked: 'Blocked',
  },
};

export const healthReasonMessages = {
  no_tasks: 'Add tasks to begin evaluating project health.',
  project_overdue: 'The project due date has passed while work remains incomplete.',
  high_priority_overdue_tasks: 'At least one high-priority task is overdue.',
  overdue_tasks: 'One or more incomplete tasks are overdue.',
  blocked_tasks: 'One or more tasks are waiting on incomplete dependencies.',
  high_priority_due_soon_tasks: 'High-priority work is due within seven days.',
  high_priority_unassigned_tasks: 'High-priority work still needs an assignee.',
  project_due_soon: 'The project is due within seven days while work remains incomplete.',
};

const fromMap = (map, value, fallback = 'Unknown') => map[value] || fallback;

export const formatHealthStatus = (value) => fromMap(labels.healthStatus, value);
export const formatProjectDueStatus = (value) => fromMap(labels.dueStatus, value);
export const formatHealthTaskStatus = (value) => fromMap(labels.taskStatus, value);
export const formatHealthPriority = (value) => fromMap(labels.priority, value);
export const formatHealthIssue = (value) => fromMap(labels.issue, value, 'Needs attention');
export const formatHealthReason = (value) => (
  healthReasonMessages[value] || 'Current project data indicates an item needs attention.'
);

export const formatUtcDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC',
  }).format(date);
};

export const healthStatusVariant = (status) => ({
  healthy: 'success',
  at_risk: 'warning',
  critical: 'danger',
  insufficient_data: 'neutral',
}[status] || 'neutral');
