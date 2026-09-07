const DAY_MS = 24 * 60 * 60 * 1000;

const HEALTH_STATUSES = Object.freeze({
  INSUFFICIENT_DATA: 'insufficient_data',
  HEALTHY: 'healthy',
  AT_RISK: 'at_risk',
  CRITICAL: 'critical',
});

const HEALTH_REASONS = Object.freeze({
  NO_TASKS: 'no_tasks',
  PROJECT_OVERDUE: 'project_overdue',
  HIGH_PRIORITY_OVERDUE_TASKS: 'high_priority_overdue_tasks',
  OVERDUE_TASKS: 'overdue_tasks',
  BLOCKED_TASKS: 'blocked_tasks',
  HIGH_PRIORITY_DUE_SOON_TASKS: 'high_priority_due_soon_tasks',
  HIGH_PRIORITY_UNASSIGNED_TASKS: 'high_priority_unassigned_tasks',
  PROJECT_DUE_SOON: 'project_due_soon',
});

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};

const utcDay = (value) => {
  const date = toDate(value);
  return date
    ? new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    : null;
};

const idValue = (value) => value?._id?.toString?.() || value?.toString?.() || '';
const safeDate = (value) => toDate(value)?.toISOString() || null;

const getDueState = (value, today, dueSoonEnd) => {
  const dueDay = utcDay(value);
  if (!dueDay) return null;
  if (dueDay < today) return 'overdue';
  if (dueDay <= dueSoonEnd) return 'due_soon';
  return 'on_track';
};

const getProjectDueDateStatus = (project, today, dueSoonEnd) => {
  if (project.status === 'completed') return 'completed';
  return getDueState(project.dueDate, today, dueSoonEnd) || 'no_due_date';
};

const calculateProjectHealth = ({ project, tasks = [], now = new Date() }) => {
  const evaluatedAt = toDate(now);
  if (!evaluatedAt) throw new Error('A valid evaluation time is required.');

  const today = utcDay(evaluatedAt);
  const dueSoonEnd = new Date(today.getTime() + (7 * DAY_MS));
  const taskById = new Map(tasks.map((task) => [idValue(task._id), task]));
  const completedTasks = tasks.filter((task) => task.status === 'completed');
  const incompleteTasks = tasks.filter((task) => task.status !== 'completed');
  let highPriorityOverdueTasks = 0;
  let highPriorityDueSoonTasks = 0;
  let highPriorityUnassignedTasks = 0;

  const attentionTasks = incompleteTasks.map((task) => {
    const issues = [];
    const dueState = getDueState(task.dueDate, today, dueSoonEnd);
    if (dueState === 'overdue') issues.push('overdue');
    if (dueState === 'due_soon') issues.push('due_soon');
    if (task.priority === 'high') issues.push('high_priority');
    if (!task.assignedTo) issues.push('unassigned');

    const blockingDependencies = (task.dependencies || [])
      .map((dependency) => taskById.get(idValue(dependency)))
      .filter((dependency) => dependency && dependency.status !== 'completed')
      .map((dependency) => ({
        _id: dependency._id,
        title: dependency.title,
        status: dependency.status,
      }));
    if (blockingDependencies.length > 0) issues.push('blocked');

    if (task.priority === 'high' && dueState === 'overdue') highPriorityOverdueTasks += 1;
    if (task.priority === 'high' && dueState === 'due_soon') highPriorityDueSoonTasks += 1;
    if (task.priority === 'high' && !task.assignedTo) highPriorityUnassignedTasks += 1;

    return {
      _id: task._id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: safeDate(task.dueDate),
      issues,
      blockingDependencies,
    };
  }).filter((task) => task.issues.length > 0);

  attentionTasks.sort((left, right) => {
    for (const issue of ['overdue', 'blocked', 'high_priority']) {
      const difference = Number(right.issues.includes(issue)) - Number(left.issues.includes(issue));
      if (difference) return difference;
    }
    const leftDue = left.dueDate ? new Date(left.dueDate).getTime() : Infinity;
    const rightDue = right.dueDate ? new Date(right.dueDate).getTime() : Infinity;
    return leftDue - rightDue || idValue(left._id).localeCompare(idValue(right._id));
  });

  const metrics = {
    totalTasks: tasks.length,
    completedTasks: completedTasks.length,
    inProgressTasks: tasks.filter((task) => task.status === 'in_progress').length,
    todoTasks: tasks.filter((task) => task.status === 'todo').length,
    incompleteTasks: incompleteTasks.length,
    completionPercentage: tasks.length
      ? Math.round((completedTasks.length / tasks.length) * 100)
      : null,
    overdueTasks: attentionTasks.filter((task) => task.issues.includes('overdue')).length,
    dueSoonTasks: attentionTasks.filter((task) => task.issues.includes('due_soon')).length,
    highPriorityIncompleteTasks: incompleteTasks.filter((task) => task.priority === 'high').length,
    unassignedIncompleteTasks: incompleteTasks.filter((task) => !task.assignedTo).length,
    blockedTasks: attentionTasks.filter((task) => task.issues.includes('blocked')).length,
  };
  const dueDateStatus = getProjectDueDateStatus(project, today, dueSoonEnd);
  const reasons = [];

  if (metrics.totalTasks === 0) reasons.push(HEALTH_REASONS.NO_TASKS);
  if (metrics.incompleteTasks > 0 && dueDateStatus === 'overdue') reasons.push(HEALTH_REASONS.PROJECT_OVERDUE);
  if (highPriorityOverdueTasks > 0) reasons.push(HEALTH_REASONS.HIGH_PRIORITY_OVERDUE_TASKS);
  if (metrics.overdueTasks > 0) reasons.push(HEALTH_REASONS.OVERDUE_TASKS);
  if (metrics.blockedTasks > 0) reasons.push(HEALTH_REASONS.BLOCKED_TASKS);
  if (highPriorityDueSoonTasks > 0) reasons.push(HEALTH_REASONS.HIGH_PRIORITY_DUE_SOON_TASKS);
  if (highPriorityUnassignedTasks > 0) reasons.push(HEALTH_REASONS.HIGH_PRIORITY_UNASSIGNED_TASKS);
  if (metrics.incompleteTasks > 0 && dueDateStatus === 'due_soon') reasons.push(HEALTH_REASONS.PROJECT_DUE_SOON);

  let status = HEALTH_STATUSES.HEALTHY;
  if (metrics.totalTasks === 0) status = HEALTH_STATUSES.INSUFFICIENT_DATA;
  else if (metrics.completedTasks === metrics.totalTasks) status = HEALTH_STATUSES.HEALTHY;
  else if (reasons.includes(HEALTH_REASONS.PROJECT_OVERDUE)
    || reasons.includes(HEALTH_REASONS.HIGH_PRIORITY_OVERDUE_TASKS)) status = HEALTH_STATUSES.CRITICAL;
  else if (reasons.length > 0) status = HEALTH_STATUSES.AT_RISK;

  return {
    asOf: evaluatedAt.toISOString(),
    status,
    reasons: status === HEALTH_STATUSES.HEALTHY ? [] : reasons,
    project: {
      _id: project._id,
      name: project.name,
      status: project.status,
      startDate: safeDate(project.startDate),
      dueDate: safeDate(project.dueDate),
      dueDateStatus,
    },
    metrics,
    attentionTasks,
  };
};

module.exports = {
  HEALTH_REASONS,
  HEALTH_STATUSES,
  calculateProjectHealth,
};
