export const formatNotificationMessage = (notification) => {
  const actorName = notification.actorName?.trim() || 'Someone';
  const entityName = notification.entityName?.trim() || 'a task';
  const projectName = notification.projectName?.trim() || 'a project';

  if (notification.type === 'task_assigned') return `${actorName} assigned ${entityName} to you.`;
  if (notification.type === 'task_unassigned') return `${actorName} unassigned you from ${entityName}.`;
  if (notification.type === 'assigned_task_status_changed') {
    const from = formatNotificationStatus(notification.metadata?.from);
    const to = formatNotificationStatus(notification.metadata?.to);
    return `${actorName} moved ${entityName} from ${from} to ${to}.`;
  }
  if (notification.type === 'project_member_added') return `${actorName} added you to ${projectName}.`;
  return `${actorName} updated something in ${projectName}.`;
};

const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', completed: 'Completed' };

export const formatNotificationStatus = (status) => STATUS_LABELS[status] || 'an unknown status';

export const formatNotificationTimestamp = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
};

export const getNotificationTarget = (notification) => {
  const projectId = String(notification.project || '');
  if (!/^[a-f\d]{24}$/i.test(projectId)) return null;
  if (['task_assigned', 'task_unassigned', 'assigned_task_status_changed'].includes(notification.type)) {
    return `/projects/${projectId}#project-tasks`;
  }
  if (notification.type === 'project_member_added') return `/projects/${projectId}`;
  return null;
};
