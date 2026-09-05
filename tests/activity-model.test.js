const mongoose = require('mongoose');
const Activity = require('../src/models/Activity');
const {
  ACTIVITY_ENTITY_TYPES,
  ACTIVITY_TYPES,
} = require('../src/constants/activityConstants');

const validActivity = () => ({
  project: new mongoose.Types.ObjectId(),
  actor: new mongoose.Types.ObjectId(),
  actorName: 'Test Owner',
  type: ACTIVITY_TYPES.TASK_CREATED,
  entityType: ACTIVITY_ENTITY_TYPES.TASK,
  entityId: new mongoose.Types.ObjectId(),
  entityName: 'Build dashboard',
  metadata: {},
});

describe('Activity model contract', () => {
  test('requires snapshots and constrains activity and entity types', () => {
    const missing = new Activity({}).validateSync();
    const invalid = new Activity({
      ...validActivity(),
      type: 'forged_event',
      entityType: 'secret',
    }).validateSync();

    expect(missing.errors.project.kind).toBe('required');
    expect(missing.errors.actorName.kind).toBe('required');
    expect(missing.errors.type.kind).toBe('required');
    expect(missing.errors.entityType.kind).toBe('required');
    expect(missing.errors.entityId.kind).toBe('required');
    expect(missing.errors.entityName.kind).toBe('required');
    expect(invalid.errors.type.kind).toBe('enum');
    expect(invalid.errors.entityType.kind).toBe('enum');
  });

  test('keeps identity, snapshots, type, and metadata immutable', () => {
    ['project', 'actor', 'actorName', 'type', 'entityType', 'entityId', 'entityName', 'metadata']
      .forEach((field) => expect(Activity.schema.path(field).options.immutable).toBe(true));
    expect(Activity.schema.path('updatedAt')).toBeUndefined();
  });

  test('defines deterministic newest-first project history index', () => {
    const indexes = Activity.schema.indexes().map(([fields]) => fields);
    expect(indexes).toContainEqual({ project: 1, createdAt: -1, _id: -1 });
  });
});
