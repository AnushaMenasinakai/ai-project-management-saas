const mongoose = require('mongoose');
const Notification = require('../src/models/Notification');
const { NOTIFICATION_ENTITY_TYPES, NOTIFICATION_TYPES } = require('../src/constants/notificationConstants');

const validNotification = () => ({
  recipient: new mongoose.Types.ObjectId(),
  actor: new mongoose.Types.ObjectId(),
  actorName: 'Project Owner',
  project: new mongoose.Types.ObjectId(),
  projectName: 'Orbit PM',
  type: NOTIFICATION_TYPES.TASK_ASSIGNED,
  entityType: NOTIFICATION_ENTITY_TYPES.TASK,
  entityId: new mongoose.Types.ObjectId(),
  entityName: 'Build dashboard',
  metadata: {},
});

describe('Notification model contract', () => {
  test('requires recipient, project, and display snapshots and constrains enums', () => {
    const missing = new Notification({}).validateSync();
    const invalid = new Notification({ ...validNotification(), type: 'forged', entityType: 'secret' }).validateSync();
    for (const field of ['recipient', 'actorName', 'project', 'projectName', 'type', 'entityType', 'entityId', 'entityName']) {
      expect(missing.errors[field].kind).toBe('required');
    }
    expect(invalid.errors.type.kind).toBe('enum');
    expect(invalid.errors.entityType.kind).toBe('enum');
  });

  test('keeps event identity immutable while readAt remains mutable', () => {
    for (const field of ['recipient', 'actor', 'actorName', 'project', 'projectName', 'type', 'entityType', 'entityId', 'entityName', 'metadata']) {
      expect(Notification.schema.path(field).options.immutable).toBe(true);
    }
    expect(Notification.schema.path('readAt').options.immutable).not.toBe(true);
    expect(Notification.schema.path('updatedAt')).toBeUndefined();
  });

  test('defines inbox and unread indexes', () => {
    const indexes = Notification.schema.indexes().map(([fields]) => fields);
    expect(indexes).toContainEqual({ recipient: 1, createdAt: -1, _id: -1 });
    expect(indexes).toContainEqual({ recipient: 1, readAt: 1 });
  });
});
