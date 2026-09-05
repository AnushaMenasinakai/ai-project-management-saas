const mongoose = require('mongoose');
const Comment = require('../src/models/Comment');

const references = () => ({
  task: new mongoose.Types.ObjectId(),
  project: new mongoose.Types.ObjectId(),
  author: new mongoose.Types.ObjectId(),
});

describe('Comment model contract', () => {
  test('requires trimmed plain-text content with a 5000-character maximum', () => {
    const missing = new Comment(references()).validateSync();
    const oversized = new Comment({ ...references(), content: 'x'.repeat(5001) }).validateSync();
    const valid = new Comment({ ...references(), content: 'x'.repeat(5000) }).validateSync();

    expect(missing.errors.content.kind).toBe('required');
    expect(oversized.errors.content.kind).toBe('maxlength');
    expect(valid).toBeUndefined();
  });

  test('keeps task, project, and author references immutable', () => {
    expect(Comment.schema.path('task').options.immutable).toBe(true);
    expect(Comment.schema.path('project').options.immutable).toBe(true);
    expect(Comment.schema.path('author').options.immutable).toBe(true);
  });

  test('defines conversation-order and project-cleanup indexes', () => {
    const indexes = Comment.schema.indexes().map(([fields]) => fields);

    expect(indexes).toContainEqual({ task: 1, createdAt: 1, _id: 1 });
    expect(indexes).toContainEqual({ project: 1 });
  });
});
