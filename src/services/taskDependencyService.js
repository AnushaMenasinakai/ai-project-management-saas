const mongoose = require('mongoose');
const Task = require('../models/Task');

const hasCircularDependency = async (taskId, dependencyIds) => {
  const visited = new Set();

  const checkDependency = async (currentTaskId) => {
    if (currentTaskId.toString() === taskId.toString()) {
      return true;
    }

    if (visited.has(currentTaskId.toString())) {
      return false;
    }

    visited.add(currentTaskId.toString());

    const task = await Task.findById(currentTaskId).select('dependencies');

    if (!task) {
      return false;
    }

    for (const dependencyId of task.dependencies || []) {
      if (await checkDependency(dependencyId)) {
        return true;
      }
    }

    return false;
  };

  for (const dependencyId of dependencyIds) {
    if (await checkDependency(dependencyId)) {
      return true;
    }
  }

  return false;
};

module.exports = {
  hasCircularDependency,
};