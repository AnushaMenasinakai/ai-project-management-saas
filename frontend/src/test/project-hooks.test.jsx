import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import useProjectMembers from '../hooks/useProjectMembers';
import useProjectTasks from '../hooks/useProjectTasks';
import api from '../services/api';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

beforeEach(() => vi.clearAllMocks());

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
});
