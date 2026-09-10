import { formatActivityMessage } from './activityUtils';

const asCount = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
};

const timestamp = (value) => {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

export const buildDashboardSummary = (projects = []) => {
  const totals = projects.reduce((summary, project) => ({
    totalProjects: summary.totalProjects + 1,
    totalTasks: summary.totalTasks + asCount(project.totalTasks),
    completedTasks: summary.completedTasks + asCount(project.completedTasks),
  }), { totalProjects: 0, totalTasks: 0, completedTasks: 0 });

  return {
    ...totals,
    overallProgressPercentage: totals.totalTasks === 0
      ? null
      : Math.round((totals.completedTasks / totals.totalTasks) * 100),
  };
};

export const selectRecentProjects = (projects = [], limit = 3) => projects
  .map((project, index) => ({ project, index }))
  .sort((left, right) => (
    timestamp(right.project.updatedAt || right.project.createdAt)
      - timestamp(left.project.updatedAt || left.project.createdAt)
    || String(right.project._id || '').localeCompare(String(left.project._id || ''))
    || left.index - right.index
  ))
  .slice(0, limit)
  .map(({ project }) => {
    const totalTasks = asCount(project.totalTasks);
    const completedTasks = asCount(project.completedTasks);

    return {
      _id: project._id,
      name: project.name,
      status: project.status,
      description: project.description,
      totalTasks,
      completedTasks,
      progressPercentage: totalTasks === 0
        ? null
        : Math.round((completedTasks / totalTasks) * 100),
      memberCount: Array.isArray(project.members) ? project.members.length : null,
      dueDate: project.dueDate || null,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  });

export const mergeRecentActivities = (activityGroups = [], limit = 5) => activityGroups
  .flatMap(({ project, activities }) => (activities || []).map((activity) => ({
    _id: activity._id,
    type: activity.type,
    actorName: activity.actorName,
    entityName: activity.entityName,
    createdAt: activity.createdAt,
    projectId: project._id,
    projectName: project.name,
    message: formatActivityMessage(activity),
  })))
  .sort((left, right) => (
    timestamp(right.createdAt) - timestamp(left.createdAt)
      || String(right._id || '').localeCompare(String(left._id || ''))
  ))
  .slice(0, limit);

export const buildHealthSummary = (healthByProject = []) => healthByProject.reduce(
  (summary, entry) => {
    const status = entry.health?.status;
    if (status === 'healthy') summary.healthy += 1;
    else if (status === 'at_risk') summary.atRisk += 1;
    else if (status === 'critical') summary.critical += 1;
    else if (status === 'insufficient_data') summary.insufficientData += 1;
    return summary;
  },
  { evaluatedProjects: healthByProject.length, healthy: 0, atRisk: 0, critical: 0, insufficientData: 0 },
);
