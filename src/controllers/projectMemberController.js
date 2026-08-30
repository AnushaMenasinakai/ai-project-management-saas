const mongoose = require('mongoose');
const Project = require('../models/Project');
const User = require('../models/User');

// Add a member to a project
exports.addMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        message: 'Project not found.',
      });
    }

    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        message: 'Member email is required.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const project = await Project.findOne({
      _id: id,
      owner: req.user.id,
    });

    if (!project) {
      return res.status(404).json({
        message: 'Project not found.',
      });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    if (project.owner.toString() === user._id.toString()) {
      return res.status(400).json({
        message: 'Project owner cannot be added as a member.',
      });
    }

    if (project.members.some((memberId) => memberId.toString() === user._id.toString())) {
      return res.status(400).json({
        message: 'User is already a project member.',
      });
    }

    project.members.push(user._id);

    await project.save();

    return res.status(200).json({
      message: 'Member added successfully.',
      project,
    });
  } catch (error) {
    console.error('Add project member error:', error);

    return res.status(500).json({
      message: 'Failed to add project member.',
    });
  }
};

// Get project members
exports.getMembers = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        message: 'Project not found.',
      });
    }

    const project = await Project.findOne({
      _id: id,
      $or: [{ owner: req.user.id }, { members: req.user.id }],
    }).populate('members', 'name email');

    if (!project) {
      return res.status(404).json({
        message: 'Project not found.',
      });
    }

    return res.status(200).json({
      members: project.members,
    });
  } catch (error) {
    console.error('Get project members error:', error);

    return res.status(500).json({
      message: 'Failed to fetch project members.',
    });
  }
};

// Remove a member from a project
exports.removeMember = async (req, res) => {
  try {
    const { id, userId } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({
        message: 'Project not found.',
      });
    }

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        message: 'Valid user ID is required.',
      });
    }

    const project = await Project.findOne({
      _id: id,
      owner: req.user.id,
    });

    if (!project) {
      return res.status(404).json({
        message: 'Project not found.',
      });
    }

    const memberExists = project.members.some(
      (memberId) => memberId.toString() === userId
    );

    if (!memberExists) {
      return res.status(404).json({
        message: 'User is not a member of this project.',
      });
    }

    project.members = project.members.filter(
      (memberId) => memberId.toString() !== userId
    );

    await project.save();

    return res.status(200).json({
      message: 'Member removed successfully.',
      project,
    });
  } catch (error) {
    console.error('Remove project member error:', error);

    return res.status(500).json({
      message: 'Failed to remove project member.',
    });
  }
};
