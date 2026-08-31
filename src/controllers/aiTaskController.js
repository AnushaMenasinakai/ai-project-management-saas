const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { generateProjectTasks } = require('../services/aiTaskService');

exports.generateTasks = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(404).json({
        message: 'Project not found.',
      });
    }

    const project = await Project.findOne({
      _id: projectId,
      owner: req.user.id,
    });

    if (!project) {
      return res.status(404).json({
        message: 'Project not found.',
      });
    }

    const { tasks } = await generateProjectTasks(
      project.name,
      project.description
    );

    const taskDocuments = tasks.map((task) => ({
      title: task.title,
      description: task.description,
      project: project._id,
      status: 'todo',
      priority: task.priority,
      dueDate: task.dueDate,
    }));

    const session = await mongoose.startSession();
    let finalTasks;

    try {
      await session.withTransaction(async () => {
        const createdTasks = await Task.insertMany(taskDocuments, { session });
        const taskIdMap = new Map();

        tasks.forEach((task, index) => {
          taskIdMap.set(task.id, createdTasks[index]._id);
        });

        const updates = createdTasks.map((createdTask, index) => ({
          _id: createdTask._id,
          dependencies: tasks[index].dependsOn.map((dependencyId) => {
            const dependencyObjectId = taskIdMap.get(dependencyId);

            if (!dependencyObjectId) {
              throw new Error(
                `Could not resolve dependency ${dependencyId}.`
              );
            }

            return dependencyObjectId;
          }),
        }));

        for (const { _id, dependencies } of updates) {
          await Task.findByIdAndUpdate(
            _id,
            { dependencies },
            { new: true, runValidators: true, session }
          );
        }

        finalTasks = await Task.find({
          _id: { $in: createdTasks.map((task) => task._id) },
        })
          .sort({ createdAt: 1 })
          .session(session);
      });
    } finally {
      await session.endSession();
    }

    return res.status(201).json({
      message: 'AI tasks generated successfully.',
      tasks: finalTasks,
    });
  } catch (error) {
    console.error('Generate AI tasks error:', error);
    return res.status(500).json({
      message: 'Failed to generate AI tasks.',
    });
  }
};
