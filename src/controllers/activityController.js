const mongoose = require('mongoose');
const Activity = require('../models/Activity');
const { findProjectForCollaborator } = require('../services/projectAccessService');

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const ACTIVITY_FIELDS = '_id project actor actorName type entityType entityId entityName metadata createdAt';

const encodeCursor = (activity) => Buffer.from(JSON.stringify({
  createdAt: activity.createdAt.toISOString(),
  id: activity._id.toString(),
})).toString('base64url');

const parseCursor = (value) => {
  if (!value || typeof value !== 'string') return null;

  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    const createdAt = new Date(parsed.createdAt);

    if (!Number.isFinite(createdAt.getTime()) || !mongoose.isValidObjectId(parsed.id)) {
      return null;
    }

    return { createdAt, id: new mongoose.Types.ObjectId(parsed.id) };
  } catch {
    return null;
  }
};

const getProjectActivities = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const project = await findProjectForCollaborator(projectId, req.user.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const requestedLimit = req.query.limit;
    const limit = requestedLimit === undefined ? DEFAULT_LIMIT : Number(requestedLimit);

    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      return res.status(400).json({ message: `Limit must be an integer between 1 and ${MAX_LIMIT}.` });
    }

    const cursor = req.query.cursor === undefined ? undefined : parseCursor(req.query.cursor);

    if (req.query.cursor !== undefined && !cursor) {
      return res.status(400).json({ message: 'Invalid activity cursor.' });
    }

    const query = { project: project._id };

    if (cursor) {
      query.$or = [
        { createdAt: { $lt: cursor.createdAt } },
        { createdAt: cursor.createdAt, _id: { $lt: cursor.id } },
      ];
    }

    const results = await Activity.find(query)
      .select(ACTIVITY_FIELDS)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean();
    const hasMore = results.length > limit;
    const activities = hasMore ? results.slice(0, limit) : results;
    const nextCursor = hasMore ? encodeCursor(activities[activities.length - 1]) : null;

    return res.status(200).json({ activities, nextCursor });
  } catch (error) {
    console.error('Get project activities error:', error);
    return res.status(500).json({ message: 'Failed to fetch project activities.' });
  }
};

module.exports = { getProjectActivities };
