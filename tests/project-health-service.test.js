const { calculateProjectHealth } = require('../src/services/projectHealthService');

const NOW = new Date('2026-09-07T18:30:00.000Z');
const project = (overrides = {}) => ({
  _id: 'project-1', name: 'Orbit', status: 'active',
  startDate: '2026-09-01', dueDate: '2026-09-30', ...overrides,
});
const task = (id, overrides = {}) => ({
  _id: id, title: `Task ${id}`, status: 'todo', priority: 'medium',
  assignedTo: 'member-1', dependencies: [], ...overrides,
});
const health = (tasks, projectOverrides = {}, now = NOW) => calculateProjectHealth({
  project: project(projectOverrides), tasks, now,
});

describe('deterministic project health calculations', () => {
  test('returns explicit insufficient data for an empty project using the injected clock', () => {
    const result = health([]);
    expect(result).toMatchObject({
      asOf: NOW.toISOString(), status: 'insufficient_data', reasons: ['no_tasks'],
      metrics: {
        totalTasks: 0, completedTasks: 0, inProgressTasks: 0, todoTasks: 0,
        incompleteTasks: 0, completionPercentage: null, overdueTasks: 0,
        dueSoonTasks: 0, highPriorityIncompleteTasks: 0,
        unassignedIncompleteTasks: 0, blockedTasks: 0,
      },
      attentionTasks: [],
    });
  });

  test('counts mixed statuses, rounds completion, and excludes completed tasks from attention', () => {
    const result = health([
      task('1', { status: 'completed', priority: 'high', assignedTo: null, dueDate: '2026-09-01' }),
      task('2', { status: 'in_progress' }),
      task('3'),
    ]);
    expect(result.metrics).toMatchObject({
      totalTasks: 3, completedTasks: 1, inProgressTasks: 1, todoTasks: 1,
      incompleteTasks: 2, completionPercentage: 33,
      overdueTasks: 0, highPriorityIncompleteTasks: 0, unassignedIncompleteTasks: 0,
    });
    expect(result.attentionTasks).toEqual([]);
  });

  test('uses inclusive UTC due-soon boundaries and excludes missing or invalid dates', () => {
    const result = health([
      task('yesterday', { dueDate: '2026-09-06' }),
      task('today', { dueDate: '2026-09-07' }),
      task('seven', { dueDate: '2026-09-14' }),
      task('eight', { dueDate: '2026-09-15' }),
      task('missing'),
      task('invalid', { dueDate: 'not-a-date' }),
    ]);
    expect(result.metrics).toMatchObject({ overdueTasks: 1, dueSoonTasks: 2 });
    expect(result.attentionTasks.find((item) => item._id === 'today').issues).toContain('due_soon');
    expect(result.attentionTasks.find((item) => item._id === 'seven').issues).toContain('due_soon');
    expect(result.attentionTasks.some((item) => item._id === 'eight')).toBe(false);
    expect(result.attentionTasks.some((item) => item._id === 'invalid')).toBe(false);
  });

  test('counts only existing incomplete dependencies and never blocks completed tasks', () => {
    const result = health([
      task('dependency-incomplete', { status: 'in_progress' }),
      task('dependency-complete', { status: 'completed' }),
      task('blocked', { dependencies: ['dependency-complete', 'dependency-incomplete', 'missing'] }),
      task('clear', { dependencies: ['dependency-complete'] }),
      task('completed-child', { status: 'completed', dependencies: ['dependency-incomplete'] }),
    ]);
    expect(result.metrics.blockedTasks).toBe(1);
    expect(result.attentionTasks.find((item) => item._id === 'blocked').blockingDependencies)
      .toEqual([{ _id: 'dependency-incomplete', title: 'Task dependency-incomplete', status: 'in_progress' }]);
    expect(result.attentionTasks.some((item) => item._id === 'completed-child')).toBe(false);
  });

  test('classifies critical and at-risk states with stable reason codes', () => {
    const critical = health([
      task('urgent', { priority: 'high', dueDate: '2026-09-06' }),
    ]);
    expect(critical.status).toBe('critical');
    expect(critical.reasons).toEqual(expect.arrayContaining([
      'high_priority_overdue_tasks', 'overdue_tasks',
    ]));

    const atRisk = health([
      task('dependency', { status: 'in_progress' }),
      task('blocked', { dependencies: ['dependency'] }),
    ]);
    expect(atRisk.status).toBe('at_risk');
    expect(atRisk.reasons).toContain('blocked_tasks');

    const projectOverdue = health([task('open')], { dueDate: '2026-09-06' });
    expect(projectOverdue.status).toBe('critical');
    expect(projectOverdue.reasons).toContain('project_overdue');
  });

  test('counts high-priority and unassigned incomplete tasks', () => {
    const result = health([
      task('attention', { priority: 'high', assignedTo: null, dueDate: '2026-09-07' }),
      task('done', { status: 'completed', priority: 'high', assignedTo: null }),
    ]);
    expect(result.metrics).toMatchObject({
      highPriorityIncompleteTasks: 1,
      unassignedIncompleteTasks: 1,
      dueSoonTasks: 1,
    });
    expect(result.status).toBe('at_risk');
    expect(result.reasons).toEqual(expect.arrayContaining([
      'high_priority_due_soon_tasks', 'high_priority_unassigned_tasks',
    ]));
  });

  test('handles project due status and all-completed precedence transparently', () => {
    expect(health([task('1')], { dueDate: null }).project.dueDateStatus).toBe('no_due_date');
    expect(health([task('1')], { dueDate: '2026-09-06' }).project.dueDateStatus).toBe('overdue');
    expect(health([task('1')], { dueDate: '2026-09-14' }).project.dueDateStatus).toBe('due_soon');
    expect(health([task('1')], { dueDate: '2026-09-15' }).project.dueDateStatus).toBe('on_track');
    expect(health([task('1')], { status: 'completed', dueDate: '2026-09-06' }).project.dueDateStatus).toBe('completed');

    const completed = health([task('1', { status: 'completed' })], { dueDate: '2026-09-06' });
    expect(completed).toMatchObject({ status: 'healthy', reasons: [], metrics: { completionPercentage: 100 } });
  });

  test('orders attention by overdue, blocked, high priority, due date, then ID', () => {
    const result = health([
      task('dependency', { status: 'in_progress' }),
      task('z-overdue', { dueDate: '2026-09-01' }),
      task('a-blocked', { dependencies: ['dependency'] }),
      task('b-high', { priority: 'high', dueDate: '2026-09-20' }),
      task('a-high', { priority: 'high', dueDate: '2026-09-20' }),
    ]);
    expect(result.attentionTasks.map((item) => item._id)).toEqual([
      'z-overdue', 'a-blocked', 'a-high', 'b-high',
    ]);
  });
});
