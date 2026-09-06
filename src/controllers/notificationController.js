const mongoose = require('mongoose');
const Notification = require('../models/Notification');

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const SAFE_FIELDS = '_id recipient actor actorName project projectName type entityType entityId entityName metadata readAt createdAt';

const encodeCursor = (notification) => Buffer.from(JSON.stringify({
  createdAt: notification.createdAt.toISOString(),
  id: notification._id.toString(),
})).toString('base64url');

const parseCursor = (value) => {
  if (!value || typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    const createdAt = new Date(parsed.createdAt);
    if (!Number.isFinite(createdAt.getTime()) || !mongoose.isValidObjectId(parsed.id)) return null;
    return { createdAt, id: new mongoose.Types.ObjectId(parsed.id) };
  } catch {
    return null;
  }
};

const getNotifications = async (req, res) => {
  try {
    const requestedLimit = req.query.limit;
    const limit = requestedLimit === undefined ? DEFAULT_LIMIT : Number(requestedLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      return res.status(400).json({ message: `Limit must be an integer between 1 and ${MAX_LIMIT}.` });
    }
    const cursor = req.query.cursor === undefined ? undefined : parseCursor(req.query.cursor);
    if (req.query.cursor !== undefined && !cursor) {
      return res.status(400).json({ message: 'Invalid notification cursor.' });
    }

    const query = { recipient: req.user.id };
    if (cursor) {
      query.$or = [
        { createdAt: { $lt: cursor.createdAt } },
        { createdAt: cursor.createdAt, _id: { $lt: cursor.id } },
      ];
    }
    const results = await Notification.find(query)
      .select(SAFE_FIELDS)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean();
    const hasMore = results.length > limit;
    const notifications = hasMore ? results.slice(0, limit) : results;
    const nextCursor = hasMore ? encodeCursor(notifications[notifications.length - 1]) : null;
    return res.status(200).json({ notifications, nextCursor });
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ message: 'Failed to fetch notifications.' });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({ recipient: req.user.id, readAt: null });
    return res.status(200).json({ unreadCount });
  } catch (error) {
    console.error('Get unread notification count error:', error);
    return res.status(500).json({ message: 'Failed to fetch unread notification count.' });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    if (!mongoose.isValidObjectId(notificationId)) {
      return res.status(400).json({ message: 'Invalid notification ID.' });
    }
    let notification = await Notification.findOne({ _id: notificationId, recipient: req.user.id })
      .select(SAFE_FIELDS);
    if (!notification) return res.status(404).json({ message: 'Notification not found.' });

    if (!notification.readAt) {
      const updatedNotification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: req.user.id, readAt: null },
        { readAt: new Date() },
        { new: true, runValidators: true }
      ).select(SAFE_FIELDS);
      notification = updatedNotification || await Notification.findOne({
        _id: notificationId,
        recipient: req.user.id,
      }).select(SAFE_FIELDS);
    }
    return res.status(200).json({ notification });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return res.status(500).json({ message: 'Failed to mark notification as read.' });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user.id, readAt: null },
      { readAt: new Date() }
    );
    return res.status(200).json({
      message: 'Notifications marked as read.',
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return res.status(500).json({ message: 'Failed to mark notifications as read.' });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
};
