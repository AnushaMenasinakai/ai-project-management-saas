import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import useDashboardData from '../hooks/useDashboardData';
import api from '../services/api';
import {
  buildDashboardSummary,
  mergeRecentActivities,
  selectRecentProjects,
} from '../utils/dashboardUtils';

vi.mock('../services/api', () => ({
  default: { get: vi.fn() },
}));

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

describe('dashboard data foundation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('aggregates real project task totals and uses null progress for no tasks', () => {
    expect(buildDashboardSummary([
      { totalTasks: 3, completedTasks: 2 },
      { totalTasks: 2, completedTasks: 0 },
    ])).toEqual({
      totalProjects: 2,
      totalTasks: 5,
      completedTasks: 2,
      overallProgressPercentage: 40,
    });

    expect(buildDashboardSummary([{ totalTasks: 0, completedTasks: 0 }]))
      .toEqual({
        totalProjects: 1,
        totalTasks: 0,
        completedTasks: 0,
        overallProgressPercentage: null,
      });
  });

  test('selects at most three recently updated projects with dashboard-ready fields', () => {
    const projects = [1, 2, 3, 4].map((number) => ({
      _id: `project-${number}`,
      name: `Project ${number}`,
      status: 'active',
      members: ['member-1'],
      totalTasks: number,
      completedTasks: 1,
      updatedAt: `2026-09-0${number}T00:00:00.000Z`,
    }));

    const recent = selectRecentProjects(projects);

    expect(recent.map((project) => project._id)).toEqual(['project-4', 'project-3', 'project-2']);
    expect(recent[0]).toMatchObject({ memberCount: 1, progressPercentage: 25 });
  });

  test('merges project-scoped activity newest first and limits the preview', () => {
    const activities = mergeRecentActivities([
      {
        project: { _id: 'project-1', name: 'One' },
        activities: [{ _id: 'a', type: 'task_created', actorName: 'Anusha', entityName: 'Plan', metadata: { private: 'ignored' }, createdAt: '2026-09-01T00:00:00.000Z' }],
      },
      {
        project: { _id: 'project-2', name: 'Two' },
        activities: [{ _id: 'b', type: 'task_created', actorName: 'Anusha', entityName: 'Build', metadata: { private: 'ignored' }, createdAt: '2026-09-02T00:00:00.000Z' }],
      },
    ], 1);

    expect(activities).toEqual([expect.objectContaining({
      _id: 'b', projectId: 'project-2', projectName: 'Two', message: 'Anusha created task Build.',
    })]);
    expect(activities[0]).not.toHaveProperty('metadata');
  });

  test('loads projects once and builds bounded activity and health summaries', async () => {
    const projects = [
      { _id: 'project-1', name: 'One', totalTasks: 3, completedTasks: 2, updatedAt: '2026-09-03' },
      { _id: 'project-2', name: 'Two', totalTasks: 1, completedTasks: 1, updatedAt: '2026-09-02' },
    ];
    api.get.mockImplementation((url) => {
      if (url === '/projects') return Promise.resolve({ data: { projects } });
      if (url.endsWith('/activities?limit=5')) {
        const projectId = url.split('/')[2];
        return Promise.resolve({ data: { activities: [{
          _id: `activity-${projectId}`,
          createdAt: projectId === 'project-1' ? '2026-09-04' : '2026-09-03',
        }] } });
      }
      return Promise.resolve({ data: { health: { status: url.includes('project-1') ? 'at_risk' : 'healthy' } } });
    });

    const { result } = renderHook(() => useDashboardData('user-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.summary).toEqual({
      totalProjects: 2, totalTasks: 4, completedTasks: 3, overallProgressPercentage: 75,
    });
    expect(result.current.recentActivity).toHaveLength(2);
    expect(result.current.healthSummary).toMatchObject({ evaluatedProjects: 2, healthy: 1 });
    expect(api.get).toHaveBeenCalledTimes(5);
    expect(api.get).toHaveBeenCalledWith('/projects/project-1/activities?limit=5');
  });

  test('exposes a retry after the project request fails', async () => {
    api.get
      .mockRejectedValueOnce({ response: { data: { message: 'Dashboard unavailable.' } } })
      .mockResolvedValueOnce({ data: { projects: [] } });

    const { result } = renderHook(() => useDashboardData('user-1'));
    await waitFor(() => expect(result.current.error).toBe('Dashboard unavailable.'));

    await act(async () => { await result.current.retry(); });

    expect(result.current.error).toBe('');
    expect(result.current.summary.totalProjects).toBe(0);
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  test('does not let an earlier account response replace the current account data', async () => {
    const firstRequest = deferred();
    api.get.mockImplementation((url) => {
      if (url === '/projects' && api.get.mock.calls.filter(([path]) => path === '/projects').length === 1) {
        return firstRequest.promise;
      }
      if (url === '/projects') {
        return Promise.resolve({ data: { projects: [{
          _id: 'project-b', name: 'B', totalTasks: 2, completedTasks: 1, updatedAt: '2026-09-04',
        }] } });
      }
      if (url.endsWith('/activities?limit=5')) return Promise.resolve({ data: { activities: [] } });
      return Promise.resolve({ data: { health: { status: 'healthy' } } });
    });

    const { result, rerender } = renderHook(
      ({ userId }) => useDashboardData(userId),
      { initialProps: { userId: 'user-a' } },
    );
    rerender({ userId: 'user-b' });

    await waitFor(() => expect(result.current.summary.totalTasks).toBe(2));
    await act(async () => {
      firstRequest.resolve({ data: { projects: [{
        _id: 'project-a', name: 'A', totalTasks: 99, completedTasks: 0, updatedAt: '2026-09-05',
      }] } });
      await firstRequest.promise;
    });

    expect(result.current.summary.totalTasks).toBe(2);
    expect(result.current.recentProjects[0]._id).toBe('project-b');
  });
});
