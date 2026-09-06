const mongoose = require('mongoose');
const Task = require('../models/Task');
const Comment = require('../models/Comment');
const { ACTIVITY_ENTITY_TYPES, ACTIVITY_TYPES } = require('../constants/activityConstants');
const { recordActivity, resolveActorSnapshot, resolveUserSnapshot } = require('../services/activityService');
const { findProjectForCollaborator } = require('../services/projectAccessService');
const {
  validateTaskAssignee,
  validateTaskDependencies,
} = require('../services/taskValidationService');

const sendValidationError = (res, result) => res.status(result.error.status).json({
  message: result.error.message,
});

// Create a task
exports.createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      project,
      status,
      priority,
      dueDate,
      assignedTo,
      dependencies,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        message: 'Task title is required.',
      });
    }

    if (!project || !mongoose.Types.ObjectId.isValid(project)) {
      return res.status(400).json({
        message: 'Valid project ID is required.',
      });
    }

    const existingProject = await findProjectForCollaborator(project, req.user.id);

    if (!existingProject) {
      return res.status(404).json({
        message: 'Project not found.',
      });
    }
    if (assignedTo !== undefined) {
      const assigneeResult = await validateTaskAssignee(assignedTo, existingProject);
      if (assigneeResult.error) return sendValidationError(res, assigneeResult);
    }

    let validatedDependencies = [];

    if (dependencies !== undefined) {
      const dependencyResult = await validateTaskDependencies(dependencies, project);
      if (dependencyResult.error) return sendValidationError(res, dependencyResult);
      validatedDependencies = dependencyResult.value;
    }

    const actor = await resolveActorSnapshot(req.user.id);
    const session = await mongoose.startSession();
    let task;

    try {
      await session.withTransaction(async () => {
        [task] = await Task.create([{
          title,
          description,
          project,
          status,
          priority,
          dueDate,
          assignedTo,
          dependencies: validatedDependencies,
        }], { session });

        await recordActivity({
          project: existingProject._id,
          ...actor,
          type: ACTIVITY_TYPES.TASK_CREATED,
          entityType: ACTIVITY_ENTITY_TYPES.TASK,
          entityId: task._id,
          entityName: task.title,
          session,
        });
      });
    } finally {
      await session.endSession();
    }

    return res.status(201).json({
      message: 'Task created successfully.',
      task,
    });
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({
      message: 'Failed to create task.',
    });
  }
};

// Get all tasks for a project
exports.getProjectTasks = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(404).json({
        message: 'Project not found.',
      });
    }

    const project = await findProjectForCollaborator(projectId, req.user.id);

    if (!project) {
      return res.status(404).json({
        message: 'Project not found.',
      });
    }

    const tasks = await Task.find({
      project: projectId,
    })
      .populate('dependencies', 'title')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      tasks,
    });
  } catch (error) {
    console.error('Get project tasks error:', error);
    return res.status(500).json({
      message: 'Failed to fetch tasks.',
    });
  }
};

// Get one task
exports.getTask = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        message: 'Task not found.',
      });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        message: 'Task not found.',
      });
    }

    const project = await findProjectForCollaborator(task.project, req.user.id);

    if (!project) {
      return res.status(404).json({
        message: 'Task not found.',
      });
    }

    return res.status(200).json({
      task,
    });
  } catch (error) {
    console.error('Get task error:', error);
    return res.status(500).json({
      message: 'Failed to fetch task.',
    });
  }
};

// Update a task
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      status,
      priority,
      dueDate,
      assignedTo,
      dependencies,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        message: 'Task not found.',
      });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        message: 'Task not found.',
      });
    }

    const project = await findProjectForCollaborator(task.project, req.user.id);

    if (!project) {
      return res.status(404).json({
        message: 'Task not found.',
      });
    }

    const updates = {};

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (assignedTo !== undefined) {
      const assigneeResult = await validateTaskAssignee(
        assignedTo,
        project,
        { allowUnassigned: true }
      );
      if (assigneeResult.error) return sendValidationError(res, assigneeResult);
      updates.assignedTo = assigneeResult.value;
    }
    if (dependencies !== undefined) {
      const dependencyResult = await validateTaskDependencies(
        dependencies,
        task.project,
        { taskId: id }
      );
      if (dependencyResult.error) return sendValidationError(res, dependencyResult);
      updates.dependencies = dependencyResult.value;
    }

    const previous = {
      title: task.title, description: task.description, status: task.status,
      priority: task.priority, dueDate: task.dueDate,
      assignedTo: task.assignedTo, dependencies: task.dependencies || [],
    };
    const idValue = (value) => value?._id?.toString?.() || value?.toString?.() || '';
    const dateValue = (value) => value ? new Date(value).toISOString() : '';
    const dependencyValue = (value = []) => value.map(idValue).sort().join(',');
    const statusChanged = status !== undefined && status !== previous.status;
    const assignmentChanged = assignedTo !== undefined
      && idValue(updates.assignedTo) !== idValue(previous.assignedTo);
    const otherChangedFields = [
      ['title', (value) => typeof value === 'string' ? value.trim() : String(value ?? '')],
      ['description', (value) => typeof value === 'string' ? value.trim() : String(value ?? '')],
      ['priority', (value) => String(value ?? '')],
      ['dueDate', dateValue],
      ['dependencies', dependencyValue],
    ].filter(([field, normalize]) => Object.hasOwn(updates, field)
      && normalize(updates[field]) !== normalize(previous[field]))
      .map(([field]) => field);
    const hasActivity = statusChanged || assignmentChanged || otherChangedFields.length > 0;
    let updatedTask;

    if (hasActivity) {
      const actor = await resolveActorSnapshot(req.user.id);
      const previousAssignee = assignmentChanged && previous.assignedTo
        ? await resolveUserSnapshot(idValue(previous.assignedTo)) : null;
      const nextAssignee = assignmentChanged && updates.assignedTo
        ? await resolveUserSnapshot(idValue(updates.assignedTo)) : null;
      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          updatedTask = await Task.findByIdAndUpdate(
            id,
            updates,
            { new: true, runValidators: true, session }
          );

          if (statusChanged) await recordActivity({
            project: project._id, ...actor, type: ACTIVITY_TYPES.TASK_STATUS_CHANGED,
            entityType: ACTIVITY_ENTITY_TYPES.TASK, entityId: task._id,
            entityName: updatedTask.title,
            metadata: { from: previous.status, to: updatedTask.status }, session,
          });
          if (assignmentChanged && nextAssignee) await recordActivity({
            project: project._id, ...actor, type: ACTIVITY_TYPES.TASK_ASSIGNED,
            entityType: ACTIVITY_ENTITY_TYPES.TASK, entityId: task._id,
            entityName: updatedTask.title,
            metadata: {
              ...(previousAssignee ? {
                previousAssigneeId: previousAssignee.id,
                previousAssigneeName: previousAssignee.name,
              } : {}),
              assigneeId: nextAssignee.id, assigneeName: nextAssignee.name,
            }, session,
          });
          if (assignmentChanged && !nextAssignee && previousAssignee) await recordActivity({
            project: project._id, ...actor, type: ACTIVITY_TYPES.TASK_UNASSIGNED,
            entityType: ACTIVITY_ENTITY_TYPES.TASK, entityId: task._id,
            entityName: updatedTask.title,
            metadata: {
              previousAssigneeId: previousAssignee.id,
              previousAssigneeName: previousAssignee.name,
            }, session,
          });
          if (otherChangedFields.length > 0) await recordActivity({
            project: project._id, ...actor, type: ACTIVITY_TYPES.TASK_UPDATED,
            entityType: ACTIVITY_ENTITY_TYPES.TASK, entityId: task._id,
            entityName: updatedTask.title,
            metadata: { changedFields: otherChangedFields }, session,
          });
        });
      } finally {
        await session.endSession();
      }
    } else {
      updatedTask = await Task.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
      );
    }

    return res.status(200).json({
      message: 'Task updated successfully.',
      task: updatedTask,
    });
  } catch (error) {
    console.error('Update task error:', error);
    return res.status(500).json({
      message: 'Failed to update task.',
    });
  }
};

// Delete a task
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        message: 'Task not found.',
      });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        message: 'Task not found.',
      });
    }

    const project = await findProjectForCollaborator(task.project, req.user.id);

    if (!project) {
      return res.status(404).json({
        message: 'Task not found.',
      });
    }

    if (project.owner.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        message: 'Only the project owner can delete tasks.',
      });
    }

    const session = await mongoose.startSession();
    const actor = await resolveActorSnapshot(req.user.id);

    try {
      await session.withTransaction(async () => {
        await Task.updateMany(
          { project: task.project, dependencies: task._id },
          { $pull: { dependencies: task._id } },
          { session }
        );
        await Comment.deleteMany(
          { task: task._id, project: project._id },
          { session }
        );
        await recordActivity({
          project: project._id, ...actor, type: ACTIVITY_TYPES.TASK_DELETED,
          entityType: ACTIVITY_ENTITY_TYPES.TASK, entityId: task._id,
          entityName: task.title, session,
        });
        await Task.findByIdAndDelete(id, { session });
      });
    } finally {
      await session.endSession();
    }

    return res.status(200).json({
      message: 'Task deleted successfully.',
    });
  } catch (error) {
    console.error('Delete task error:', error);
    return res.status(500).json({
      message: 'Failed to delete task.',
    });
  }
};
