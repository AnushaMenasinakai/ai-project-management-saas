import { describe, expect, test } from 'vitest';
import {
  filterAndSortTasks,
  groupTasksByStatus,
  isProjectOwner,
  normalizeDependencyIds,
} from '../features/project-details/projectDetailsUtils';

const tasks = [
  { _id: '1', title: 'Write API', description: 'Backend work', status: 'todo', priority: 'high', createdAt: '2026-01-01', dueDate: '2026-02-02' },
  { _id: '2', title: 'Design UI', description: '', status: 'completed', priority: 'low', createdAt: '2026-01-02', dueDate: null },
  { _id: '3', title: 'Test API', description: 'Quality', status: 'todo', priority: 'medium', createdAt: '2026-01-03', dueDate: '2026-02-01' },
];

describe('project details utilities', () => {
  test('filters tasks by search, status, and priority without mutating the source', () => {
    const source = [...tasks];
    const result = filterAndSortTasks(tasks, {
      search: 'api', status: 'todo', priority: 'medium', sort: 'created_desc',
    });
    expect(result.map((task) => task._id)).toEqual(['3']);
    expect(tasks).toEqual(source);
  });

  test('sorts due dates while keeping tasks without due dates last', () => {
    const result = filterAndSortTasks(tasks, {
      search: '', status: 'all', priority: 'all', sort: 'due_asc',
    });
    expect(result.map((task) => task._id)).toEqual(['3', '1', '2']);
  });

  test('normalizes populated and raw dependency IDs', () => {
    expect(normalizeDependencyIds([{ _id: 42 }, 'task-2'])).toEqual(['42', 'task-2']);
  });

  test('compares both populated and raw project owner values', () => {
    expect(isProjectOwner({ owner: { _id: 7 } }, { id: '7' })).toBe(true);
    expect(isProjectOwner({ owner: '7' }, { id: '8' })).toBe(false);
  });

  test('groups tasks by status without mutating their order', () => {
    const source = [...tasks];
    const grouped = groupTasksByStatus(tasks);

    expect(grouped.todo.map((task) => task._id)).toEqual(['1', '3']);
    expect(grouped.in_progress).toEqual([]);
    expect(grouped.completed.map((task) => task._id)).toEqual(['2']);
    expect(tasks).toEqual(source);
  });

  test('returns all empty groups for empty input', () => {
    expect(groupTasksByStatus()).toEqual({
      todo: [],
      in_progress: [],
      completed: [],
    });
  });
});
