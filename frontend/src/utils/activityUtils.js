const STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  completed: 'Completed',
};

export const formatActivityStatus = (status) => STATUS_LABELS[status] || 'Unknown status';

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
