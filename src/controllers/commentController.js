const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Task = require('../models/Task');
const { findProjectForCollaborator } = require('../services/projectAccessService');

const MAX_COMMENT_LENGTH = 5000;

const validateContent = (content) => {
  if (typeof content !== 'string' || !content.trim()) {
    return { error: 'Comment content is required.' };
  }

  const value = content.trim();

  if (value.length > MAX_COMMENT_LENGTH) {
    return { error: `Comment content cannot exceed ${MAX_COMMENT_LENGTH} characters.` };
  }

  return { value };
};

const populateAuthor = (comment) => comment.populate('author', '_id name');

const findAccessibleTask = async (taskId, userId) => {
  if (!mongoose.isValidObjectId(taskId)) return null;

  const task = await Task.findById(taskId);
  if (!task) return null;

  const project = await findProjectForCollaborator(task.project, userId);
  if (!project) return null;

  return { task, project };
};

const getTaskComments = async (req, res) => {
  try {
    const accessible = await findAccessibleTask(req.params.taskId, req.user.id);

    if (!accessible) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const comments = await Comment.find({
      task: accessible.task._id,
      project: accessible.project._id,
    })
      .sort({ createdAt: 1, _id: 1 })
      .populate('author', '_id name');

    return res.status(200).json({ comments });
  } catch (error) {
    console.error('Get task comments error:', error);
    return res.status(500).json({ message: 'Failed to fetch comments.' });
  }
};

const createComment = async (req, res) => {
  try {
    const contentResult = validateContent(req.body.content);

    if (contentResult.error) {
      return res.status(400).json({ message: contentResult.error });
    }

    const accessible = await findAccessibleTask(req.params.taskId, req.user.id);

    if (!accessible) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const comment = await Comment.create({
      task: accessible.task._id,
      project: accessible.project._id,
      author: req.user.id,
      content: contentResult.value,
    });

    await populateAuthor(comment);

    return res.status(201).json({
      message: 'Comment created successfully.',
      comment,
    });
  } catch (error) {
    console.error('Create comment error:', error);
    return res.status(500).json({ message: 'Failed to create comment.' });
  }
};

const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    if (!mongoose.isValidObjectId(commentId)) {
      return res.status(404).json({ message: 'Comment not found.' });
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found.' });
    }

    const project = await findProjectForCollaborator(comment.project, req.user.id);

    if (!project) {
      return res.status(404).json({ message: 'Comment not found.' });
    }

    if (comment.author.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        message: 'You can only edit your own comments.',
      });
    }

    const contentResult = validateContent(req.body.content);

    if (contentResult.error) {
      return res.status(400).json({ message: contentResult.error });
    }

    comment.content = contentResult.value;
    await comment.save();
    await populateAuthor(comment);

    return res.status(200).json({
      message: 'Comment updated successfully.',
      comment,
    });
  } catch (error) {
    console.error('Update comment error:', error);
    return res.status(500).json({ message: 'Failed to update comment.' });
  }
};

const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    if (!mongoose.isValidObjectId(commentId)) {
      return res.status(404).json({ message: 'Comment not found.' });
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found.' });
    }

    const project = await findProjectForCollaborator(comment.project, req.user.id);

    if (!project) {
      return res.status(404).json({ message: 'Comment not found.' });
    }

    const isAuthor = comment.author.toString() === req.user.id.toString();
    const isProjectOwner = project.owner.toString() === req.user.id.toString();

    if (!isAuthor && !isProjectOwner) {
      return res.status(403).json({
        message: 'Only the comment author or project owner can delete comments.',
      });
    }

    await Comment.deleteOne({ _id: comment._id });

    return res.status(200).json({ message: 'Comment deleted successfully.' });
  } catch (error) {
    console.error('Delete comment error:', error);
    return res.status(500).json({ message: 'Failed to delete comment.' });
  }
};

module.exports = {
  createComment,
  deleteComment,
  getTaskComments,
  updateComment,
};
