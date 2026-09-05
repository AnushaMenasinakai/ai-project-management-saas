const mongoose = require('mongoose');
const Task = require('../src/models/Task');

describe('task status validation', () => {
  test.each(['todo', 'in_progress', 'completed'])(
    'accepts the supported %s status',
    (status) => {
      const task = new Task({
        title: 'Kanban status validation',
        project: new mongoose.Types.ObjectId(),
        status,
      });

      expect(task.validateSync()).toBeUndefined();
    },
  );

  test('rejects an unsupported status', () => {
    const task = new Task({
      title: 'Invalid Kanban status',
      project: new mongoose.Types.ObjectId(),
      status: 'blocked',
    });

    const validationError = task.validateSync();

    expect(validationError.errors.status.kind).toBe('enum');
  });
});
