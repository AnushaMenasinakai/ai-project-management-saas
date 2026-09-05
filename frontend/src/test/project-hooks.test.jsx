import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import useProjectMembers from '../hooks/useProjectMembers';
import useProjectTasks from '../hooks/useProjectTasks';
import api from '../services/api';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

beforeEach(() => vi.clearAllMocks());

const createDeferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

describe('project resource hooks', () => {
  test('ignores a stale member response after the project changes', async () => {
    let resolveFirst;
    let resolveSecond;
    api.get
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
      .mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve; }));

    const { result, rerender } = renderHook(
      ({ projectId }) => useProjectMembers(projectId),
      { initialProps: { projectId: 'project-1' } },
    );
    rerender({ projectId: 'project-2' });

    await act(async () => resolveSecond({ data: { members: [{ _id: 'new-member' }] } }));
    await waitFor(() => expect(result.current.members).toEqual([{ _id: 'new-member' }]));

    await act(async () => resolveFirst({ data: { members: [{ _id: 'stale-member' }] } }));
    expect(result.current.members).toEqual([{ _id: 'new-member' }]);
  });

  test('refreshes tasks after a successful create before exposing the new list', async () => {
    api.get
      .mockResolvedValueOnce({ data: { tasks: [] } })
      .mockResolvedValueOnce({ data: { tasks: [{ _id: 'task-1', title: 'New task' }] } });
    api.post.mockResolvedValue({ data: { task: { _id: 'task-1' } } });

    const { result } = renderHook(() => useProjectTasks('project-1'));
    await waitFor(() => expect(result.current.tasksLoading).toBe(false));
    act(() => result.current.setCreateValue('title', 'New task'));

    await act(async () => result.current.createTask({ preventDefault: vi.fn() }));

    expect(api.post).toHaveBeenCalledWith('/tasks', expect.objectContaining({
      title: 'New task',
      project: 'project-1',
    }));
    expect(api.get).toHaveBeenLastCalledWith('/tasks/project/project-1');
    expect(result.current.tasks).toEqual([{ _id: 'task-1', title: 'New task' }]);
    expect(result.current.showTaskForm).toBe(false);
  });

  test('updates task status with a status-only payload and refreshes populated data', async () => {
    const refresh = createDeferred();
    const originalTask = { _id: 'task-1', title: 'Task', status: 'todo' };
    const refreshedTask = { ...originalTask, status: 'in_progress', assignedTo: { _id: 'member-1', name: 'Member' } };
    api.get
      .mockResolvedValueOnce({ data: { tasks: [originalTask] } })
      .mockReturnValueOnce(refresh.promise);
    api.patch.mockResolvedValue({ data: { task: { ...originalTask, status: 'in_progress' } } });

    const { result } = renderHook(() => useProjectTasks('project-1'));
    await waitFor(() => expect(result.current.tasksLoading).toBe(false));

    let moveTask;
    act(() => {
      moveTask = result.current.updateTaskStatus('task-1', 'in_progress');
    });

    expect(api.patch).toHaveBeenCalledWith('/tasks/task-1', { status: 'in_progress' });
    await waitFor(() => expect(result.current.tasks[0].status).toBe('in_progress'));
    expect(result.current.pendingTaskMoves).toEqual(new Set(['task-1']));

    await act(async () => {
      refresh.resolve({ data: { tasks: [refreshedTask] } });
      await moveTask;
    });

    expect(api.get).toHaveBeenLastCalledWith('/tasks/project/project-1');
    expect(result.current.tasks).toEqual([refreshedTask]);
    expect(result.current.pendingTaskMoves.size).toBe(0);
    expect(result.current.taskMoveError).toBe('');
    expect(result.current.taskMoveAnnouncement).toBe('Task moved to In Progress.');
  });

  test('does not request same-status, invalid, or missing task moves', async () => {
    api.get.mockResolvedValue({ data: { tasks: [{ _id: 'task-1', status: 'todo' }] } });
    const { result } = renderHook(() => useProjectTasks('project-1'));
    await waitFor(() => expect(result.current.tasksLoading).toBe(false));

    await act(async () => {
      await result.current.updateTaskStatus('task-1', 'todo');
      await result.current.updateTaskStatus('task-1', 'invalid');
      await result.current.updateTaskStatus('missing', 'completed');
    });

    expect(api.patch).not.toHaveBeenCalled();
  });

  test('keeps the original status when the PATCH fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const originalTask = { _id: 'task-1', title: 'Task', status: 'todo' };
    api.get.mockResolvedValue({ data: { tasks: [originalTask] } });
    api.patch.mockRejectedValue({ response: { data: { message: 'Move rejected.' } } });
    const { result } = renderHook(() => useProjectTasks('project-1'));
    await waitFor(() => expect(result.current.tasksLoading).toBe(false));

    await act(async () => result.current.updateTaskStatus('task-1', 'completed'));

    expect(result.current.tasks[0].status).toBe('todo');
    expect(result.current.taskMoveError).toBe('Could not move Task. Move rejected.');
    expect(result.current.pendingTaskMoves.size).toBe(0);
    consoleSpy.mockRestore();
  });

  test('keeps the successful local status when the following refresh fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const originalTask = { _id: 'task-1', title: 'Task', status: 'todo' };
    api.get
      .mockResolvedValueOnce({ data: { tasks: [originalTask] } })
      .mockRejectedValueOnce({ response: { data: { message: 'Refresh failed.' } } });
    api.patch.mockResolvedValue({ data: { task: { ...originalTask, status: 'completed' } } });
    const { result } = renderHook(() => useProjectTasks('project-1'));
    await waitFor(() => expect(result.current.tasksLoading).toBe(false));

    await act(async () => result.current.updateTaskStatus('task-1', 'completed'));

    expect(result.current.tasks[0].status).toBe('completed');
    expect(result.current.taskMoveError).toBe('Task status was updated, but the latest task details could not be refreshed.');
    expect(result.current.taskMoveAnnouncement).toBe('Task moved to Completed.');
    expect(result.current.pendingTaskMoves.size).toBe(0);
    consoleSpy.mockRestore();
  });

  test('blocks duplicate moves per task without blocking a different task', async () => {
    const firstPatch = createDeferred();
    const secondPatch = createDeferred();
    const initialTasks = [
      { _id: 'task-1', status: 'todo' },
      { _id: 'task-2', status: 'todo' },
    ];
    api.get.mockResolvedValue({ data: { tasks: initialTasks } });
    api.patch
      .mockReturnValueOnce(firstPatch.promise)
      .mockReturnValueOnce(secondPatch.promise);
    const { result } = renderHook(() => useProjectTasks('project-1'));
    await waitFor(() => expect(result.current.tasksLoading).toBe(false));

    let firstMove;
    let duplicateMove;
    let otherMove;
    act(() => {
      firstMove = result.current.updateTaskStatus('task-1', 'in_progress');
      duplicateMove = result.current.updateTaskStatus('task-1', 'completed');
      otherMove = result.current.updateTaskStatus('task-2', 'completed');
    });

    expect(api.patch).toHaveBeenCalledTimes(2);
    expect(result.current.pendingTaskMoves).toEqual(new Set(['task-1', 'task-2']));
    await expect(duplicateMove).resolves.toBe(false);

    await act(async () => {
      firstPatch.resolve({ data: {} });
      secondPatch.resolve({ data: {} });
      await Promise.all([firstMove, otherMove]);
    });

    expect(result.current.pendingTaskMoves.size).toBe(0);
  });

  test('keeps an active status filter when a moved task no longer matches it', async () => {
    const originalTask = { _id: 'task-1', title: 'Filtered task', status: 'todo' };
    const movedTask = { ...originalTask, status: 'in_progress' };
    api.get
      .mockResolvedValueOnce({ data: { tasks: [originalTask] } })
      .mockResolvedValueOnce({ data: { tasks: [movedTask] } });
    api.patch.mockResolvedValue({ data: { task: movedTask } });
    const { result } = renderHook(() => useProjectTasks('project-1'));
    await waitFor(() => expect(result.current.tasksLoading).toBe(false));

    act(() => result.current.setFilter('status', 'todo'));
    await act(async () => result.current.updateTaskStatus('task-1', 'in_progress'));

    expect(result.current.filters.status).toBe('todo');
    expect(result.current.tasks[0].status).toBe('in_progress');
    expect(result.current.filteredTasks).toEqual([]);
  });
});
