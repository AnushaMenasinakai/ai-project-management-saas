const STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  completed: 'Completed',
};

export const formatActivityStatus = (status) => STATUS_LABELS[status] || 'Unknown status';

const FIELD_LABELS = {
  name: 'name', title: 'title', description: 'description', status: 'status',
  startDate: 'start date', dueDate: 'due date', priority: 'priority',
  dependencies: 'dependencies', content: 'content', sourceType: 'source type',
};

const formatChangedFields = (fields = []) => {
  const labels = fields.map((field) => FIELD_LABELS[field]).filter(Boolean);
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}`;
};

export const formatActivityMessage = (activity) => {
  const actorName = activity.actorName?.trim() || 'Someone';
  const entityName = activity.entityName?.trim() || 'an item';

  switch (activity.type) {
    case 'project_created':
      return `${actorName} created the project ${entityName}.`;
    case 'task_created':
      return `${actorName} created task ${entityName}.`;
    case 'task_status_changed':
      return `${actorName} moved ${entityName} from ${formatActivityStatus(activity.metadata?.from)} to ${formatActivityStatus(activity.metadata?.to)}.`;
    case 'project_updated':
      return `${actorName} updated ${formatChangedFields(activity.metadata?.changedFields) || 'details'} on project ${entityName}.`;
    case 'task_updated':
      return `${actorName} updated ${formatChangedFields(activity.metadata?.changedFields) || 'details'} on ${entityName}.`;
    case 'task_assigned':
      return `${actorName} assigned ${entityName} to ${activity.metadata?.assigneeName || 'a project member'}.`;
    case 'task_unassigned':
      return `${actorName} unassigned ${activity.metadata?.previousAssigneeName || 'a project member'} from ${entityName}.`;
    case 'task_deleted':
      return `${actorName} deleted task ${entityName}.`;
    case 'member_added':
      return `${actorName} added ${entityName} to the project.`;
    case 'member_removed':
      return `${actorName} removed ${entityName} from the project.`;
    case 'document_created':
      return `${actorName} added document ${entityName}.`;
    case 'document_updated':
      return `${actorName} updated ${formatChangedFields(activity.metadata?.changedFields) || 'details'} on document ${entityName}.`;
    case 'document_deleted':
      return `${actorName} deleted document ${entityName}.`;
    case 'ai_tasks_generated': {
      const count = Number.isInteger(activity.metadata?.count) ? activity.metadata.count : 0;
      return `${actorName} generated ${count} ${count === 1 ? 'task' : 'tasks'} with AI.`;
    }
    default:
      return `${actorName} updated ${entityName}.`;
  }
};

export const formatActivityTimestamp = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};
