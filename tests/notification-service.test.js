const mongoose = require('mongoose');

jest.mock('../src/models/Notification', () => ({ create: jest.fn() }));
jest.mock('../src/models/Project', () => ({ findById: jest.fn() }));
jest.mock('../src/models/User', () => ({ findById: jest.fn() }));

const Notification = require('../src/models/Notification');
const Project = require('../src/models/Project');
const User = require('../src/models/User');
const { NOTIFICATION_ENTITY_TYPES, NOTIFICATION_TYPES } = require('../src/constants/notificationConstants');
const { createNotification } = require('../src/services/notificationService');

describe('notification service metadata contracts', () => {
  const recipient = new mongoose.Types.ObjectId();
  const actor = new mongoose.Types.ObjectId();
  const project = new mongoose.Types.ObjectId();
  const entityId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockImplementation(async (id) => ({
      _id: id, name: id.toString() === actor.toString() ? 'Actor' : 'Recipient',
    }));
    Project.findById.mockResolvedValue({ _id: project, name: 'Orbit' });
    Notification.create.mockImplementation(async (value) => value);
  });

  const create = (type, metadata = {}) => createNotification({
    recipient, actor, project, type,
    entityType: NOTIFICATION_ENTITY_TYPES.TASK,
    entityId, entityName: 'Build Dashboard', metadata,
  });

  test('normalizes the exact trusted status transition vocabulary', async () => {
    await create(NOTIFICATION_TYPES.ASSIGNED_TASK_STATUS_CHANGED, {
      from: 'todo', to: 'in_progress',
    });
    expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({
      metadata: { from: 'todo', to: 'in_progress' },
    }));
  });

  test('rejects arbitrary, malformed, and no-op metadata', async () => {
    await expect(create(NOTIFICATION_TYPES.TASK_UNASSIGNED, { email: 'hidden@example.com' }))
      .rejects.toThrow('Notification metadata must be empty');
    await expect(create(NOTIFICATION_TYPES.ASSIGNED_TASK_STATUS_CHANGED, {
      from: 'todo', to: 'completed', rawBody: true,
    })).rejects.toThrow('Invalid task status notification metadata');
    await expect(create(NOTIFICATION_TYPES.ASSIGNED_TASK_STATUS_CHANGED, {
      from: 'todo', to: 'todo',
    })).rejects.toThrow('Invalid task status notification metadata');
  });
});
