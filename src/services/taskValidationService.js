const mongoose = require('mongoose');
const Task = require('../models/Task');
const User = require('../models/User');
const { hasCircularDependency } = require('./taskDependencyService');

const failure = (status, message) => ({ error: { status, message } });

const validateTaskAssignee = async (assignedTo, project, { allowUnassigned = false } = {}) => {
  if (allowUnassigned && (assignedTo === null || assignedTo === '')) {
    return { value: null };
  }

  if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
    return failure(400, 'Invalid assigned user ID.');
  }

  const assignedUser = await User.findById(assignedTo);

  if (!assignedUser) {
    return failure(404, 'Assigned user not found.');
  }

  const isProjectMember = project.members.some(
    (memberId) => memberId.toString() === assignedTo.toString()
  );

  if (!isProjectMember) {
    return failure(403, 'Assigned user must be a member of the project.');
  }

  return { value: assignedTo };
};

const validateTaskDependencies = async (dependencies, projectId, { taskId } = {}) => {
  if (!Array.isArray(dependencies)) {
    return failure(400, 'Dependencies must be an array.');
  }

  const invalidDependency = dependencies.find(
    (dependencyId) => !mongoose.Types.ObjectId.isValid(dependencyId)
  );

  if (invalidDependency) {
    return failure(400, 'All dependency IDs must be valid MongoDB ObjectIds.');
  }

  const uniqueDependencies = [
    ...new Set(dependencies.map((dependencyId) => dependencyId.toString())),
  ];

  if (taskId && uniqueDependencies.includes(taskId.toString())) {
    return failure(400, 'A task cannot depend on itself.');
  }

  const dependencyTasks = await Task.find({
    _id: { $in: uniqueDependencies },
    project: projectId,
  }).select('_id');

  if (dependencyTasks.length !== uniqueDependencies.length) {
    return failure(400, 'All dependencies must belong to the same project.');
  }

  if (taskId && await hasCircularDependency(taskId, uniqueDependencies)) {
    return failure(400, 'Dependencies cannot create a circular relationship.');
  }

  return { value: uniqueDependencies };
};

module.exports = {
  validateTaskAssignee,
  validateTaskDependencies,
};
