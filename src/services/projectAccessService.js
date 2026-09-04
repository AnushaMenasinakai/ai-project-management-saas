const Project = require('../models/Project');

const findProjectForCollaborator = (projectId, userId) => Project.findOne({
  _id: projectId,
  $or: [{ owner: userId }, { members: userId }],
});

const findProjectForOwner = (projectId, userId) => Project.findOne({
  _id: projectId,
  owner: userId,
});

module.exports = {
  findProjectForCollaborator,
  findProjectForOwner,
};
