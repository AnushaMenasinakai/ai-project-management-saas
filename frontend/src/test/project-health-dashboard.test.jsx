import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import AppShell from '../components/AppShell';
import ProjectHealthSection from '../components/project-details/ProjectHealthSection';
import api from '../services/api';
import {
  formatHealthReason,
  formatHealthStatus,
  formatProjectDueStatus,
} from '../utils/projectHealthUtils';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'owner-1', name: 'Owner' }, logout: vi.fn() }),
}));
vi.mock('../context/NotificationsContext', () => ({
  useNotificationsContext: () => ({ unreadCount: 0 }),
}));
vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const health = {
  asOf: '2026-09-07T12:30:00.000Z',
  status: 'at_risk',
  reasons: ['overdue_tasks', 'blocked_tasks', 'future_reason'],
  project: {
    _id: 'project-1', name: 'Orbit', status: 'active', startDate: null,
    dueDate: '2026-09-12T00:00:00.000Z', dueDateStatus: 'due_soon',
  },
  metrics: {
    totalTasks: 4, completedTasks: 1, inProgressTasks: 1, todoTasks: 2,
    incompleteTasks: 3, completionPercentage: 25, overdueTasks: 1,
    dueSoonTasks: 1, highPriorityIncompleteTasks: 1,
    unassignedIncompleteTasks: 1, blockedTasks: 1,
  },
  attentionTasks: [{
    _id: 'task-1', title: 'Ship a very long dashboard name', status: 'in_progress',
    priority: 'high', dueDate: '2026-09-06T00:00:00.000Z',
    issues: ['overdue', 'high_priority', 'blocked'],
    blockingDependencies: [{ _id: 'task-2', title: 'Complete API', status: 'todo' }],
  }],
};

const emptyHealth = {
  ...health,
  status: 'insufficient_data',
  reasons: ['no_tasks'],
  project: { ...health.project, dueDate: null, dueDateStatus: 'no_due_date' },
  metrics: Object.fromEntries(Object.keys(health.metrics).map((key) => [
    key, key === 'completionPercentage' ? null : 0,
  ])),
  attentionTasks: [],
};

const insightResponse = {
  health,
  insight: {
    summary: 'Focus on the blocked dashboard task.',
    keyConcerns: ['One task is blocked.', '<script>plain text concern</script>'],
    suggestedActions: ['Complete the API dependency.'],
  },
  generatedAt: '2026-09-07T13:00:00.000Z',
};

const renderSection = (projectId = 'project-1') => render(
  <ProjectHealthSection projectId={projectId} />,
);

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue({ data: { health } });
  api.post.mockResolvedValue({ data: insightResponse });
  Element.prototype.scrollIntoView = vi.fn();
});

describe('Project health dashboard', () => {
  test('formats every status and reason without showing raw values', () => {
    expect(formatHealthStatus('healthy')).toBe('Healthy');
    expect(formatHealthStatus('at_risk')).toBe('At Risk');
    expect(formatHealthStatus('critical')).toBe('Critical');
    expect(formatHealthStatus('insufficient_data')).toBe('Insufficient Data');
    expect(formatProjectDueStatus('no_due_date')).toBe('No due date');
    expect(formatProjectDueStatus('on_track')).toBe('On track');
    expect(formatHealthReason('project_overdue')).toMatch(/due date has passed/i);
    expect(formatHealthReason('high_priority_overdue_tasks')).toMatch(/high-priority task is overdue/i);
    expect(formatHealthReason('high_priority_due_soon_tasks')).toMatch(/due within seven days/i);
    expect(formatHealthReason('high_priority_unassigned_tasks')).toMatch(/needs an assignee/i);
    expect(formatHealthReason('project_due_soon')).toMatch(/project is due within seven days/i);
    expect(formatHealthReason('unknown')).toMatch(/needs attention/i);
  });

  test('is lazy, opens from first workspace navigation item, and fetches only Health', async () => {
    render(
      <MemoryRouter initialEntries={['/projects/project-1']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/projects/:id" element={<ProjectHealthSection projectId="project-1" />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(api.get).not.toHaveBeenCalled();
    const projectNavigation = screen.getByLabelText('Project sections');
    expect(projectNavigation.querySelector('button')?.textContent).toBe('Health');
    fireEvent.click(screen.getByRole('button', { name: 'Members' }));
    expect(api.get).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Health' }));
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/projects/project-1/health'));
    fireEvent.click(screen.getByRole('button', { name: 'Health' }));
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  test('announces loading and renders status, progress, metrics, reasons, and attention details', async () => {
    let resolveRequest;
    api.get.mockReturnValueOnce(new Promise((resolve) => { resolveRequest = resolve; }));
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Load health' }));
    expect(screen.getByRole('status')).toHaveTextContent('Loading project health...');
    resolveRequest({ data: { health } });

    expect(await screen.findByText('At Risk')).toBeInTheDocument();
    expect(screen.getByText('1 of 4 tasks')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Project task completion' })).toHaveAttribute('value', '25');
    expect(screen.getByText('Due soon', { selector: '.project-health__due span' })).toBeInTheDocument();
    expect(screen.getByText(/incomplete tasks are overdue/i)).toBeInTheDocument();
    expect(screen.getByText(/current project data indicates/i)).toBeInTheDocument();
    expect(screen.getByText('Ship a very long dashboard name')).toBeInTheDocument();
    expect(screen.getByText('In Progress · High')).toBeInTheDocument();
    expect(screen.getByText('Complete API (To Do)')).toBeInTheDocument();
    expect(screen.getByLabelText('Issues for Ship a very long dashboard name')).toHaveTextContent('Blocked');
    expect(screen.getAllByRole('time').length).toBeGreaterThan(0);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  test('renders the zero-task state without misleading percentage and handles all-completed data', async () => {
    api.get.mockResolvedValueOnce({ data: { health: emptyHealth } });
    const view = renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Load health' }));
    expect(await screen.findByText('Insufficient Data')).toBeInTheDocument();
    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
    expect(screen.getByText(/health indicators become useful/i)).toBeInTheDocument();
    expect(screen.getByText('No tasks currently need attention.')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

    view.unmount();
    api.get.mockResolvedValueOnce({ data: { health: {
      ...health, status: 'healthy', reasons: [], attentionTasks: [],
      project: { ...health.project, status: 'completed', dueDateStatus: 'completed' },
      metrics: { ...health.metrics, totalTasks: 4, completedTasks: 4, incompleteTasks: 0, completionPercentage: 100 },
    } } });
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Load health' }));
    expect(await screen.findByText('Healthy')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '100');
    expect(screen.getByText('Completed', { selector: '.project-health__due span' })).toBeInTheDocument();
  });

  test('retries initial errors and preserves successful data when refresh fails', async () => {
    api.get
      .mockRejectedValueOnce({ response: { data: { message: 'Health unavailable.' } } })
      .mockResolvedValueOnce({ data: { health } })
      .mockRejectedValueOnce({ response: { data: { message: 'Refresh unavailable.' } } });
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Load health' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Health unavailable.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('At Risk')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Refresh unavailable.');
    expect(screen.getByText('At Risk')).toBeInTheDocument();
    expect(screen.getByText('Ship a very long dashboard name')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(3);
  });

  test('ignores stale responses after the project changes', async () => {
    let resolveFirst;
    api.get
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce({ data: { health: { ...health, project: { ...health.project, _id: 'project-2', name: 'Second' } } } });
    const view = renderSection('project-1');
    fireEvent.click(screen.getByRole('button', { name: 'Load health' }));
    view.rerender(<ProjectHealthSection projectId="project-2" />);
    fireEvent.click(screen.getByRole('button', { name: 'Load health' }));
    expect(await screen.findByText('At Risk')).toBeInTheDocument();
    resolveFirst({ data: { health: { ...emptyHealth, project: { ...emptyHealth.project, name: 'Stale' } } } });
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('Insufficient Data')).not.toBeInTheDocument();
    expect(api.get).toHaveBeenLastCalledWith('/projects/project-2/health');
  });

  test('generates insight only on explicit action and prevents duplicate pending requests', async () => {
    let resolveInsight;
    api.post.mockReturnValueOnce(new Promise((resolve) => { resolveInsight = resolve; }));
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Load health' }));
    await screen.findByText('At Risk');
    expect(api.post).not.toHaveBeenCalled();

    const generate = screen.getByRole('button', { name: 'Generate AI insight' });
    fireEvent.click(generate);
    fireEvent.click(generate);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/projects/project-1/health/insight');
    expect(screen.getByRole('status')).toHaveTextContent('Generating AI health insight...');
    expect(screen.getByRole('button', { name: 'Generating...' })).toBeDisabled();

    resolveInsight({ data: insightResponse });
    expect(await screen.findByText('Focus on the blocked dashboard task.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Key concerns' })).toBeInTheDocument();
    expect(screen.getByText('One task is blocked.')).toBeInTheDocument();
    expect(screen.getByText('<script>plain text concern</script>')).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByText('Complete the API dependency.')).toBeInTheDocument();
    expect(screen.getByText(/review AI suggestions before acting/i)).toBeInTheDocument();
    expect(screen.getByText(/Generated/).querySelector('time')).toHaveAttribute(
      'datetime', '2026-09-07T13:00:00.000Z',
    );
  });

  test('preserves health on AI failure and supports retry', async () => {
    api.post
      .mockRejectedValueOnce({ response: { data: { message: 'Insight unavailable.' } } })
      .mockResolvedValueOnce({ data: insightResponse });
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Load health' }));
    await screen.findByText('At Risk');
    fireEvent.click(screen.getByRole('button', { name: 'Generate AI insight' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Insight unavailable.');
    expect(screen.getByText('Ship a very long dashboard name')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Focus on the blocked dashboard task.')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledTimes(2);
  });

  test('labels retained insight stale after a successful health refresh', async () => {
    const refreshedHealth = { ...health, asOf: '2026-09-07T14:00:00.000Z' };
    api.get
      .mockResolvedValueOnce({ data: { health } })
      .mockResolvedValueOnce({ data: { health: refreshedHealth } });
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Load health' }));
    await screen.findByText('At Risk');
    fireEvent.click(screen.getByRole('button', { name: 'Generate AI insight' }));
    await screen.findByText('Focus on the blocked dashboard task.');
    expect(screen.queryByText(/health data has changed since/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText(/health data has changed since this insight was generated/i)).toBeInTheDocument();
    expect(screen.getByText('Focus on the blocked dashboard task.')).toBeInTheDocument();
  });

  test('does not let a pending insight replace a newer refreshed health snapshot', async () => {
    let resolveInsight;
    const refreshedHealth = {
      ...health,
      asOf: '2026-09-07T14:00:00.000Z',
      metrics: { ...health.metrics, completedTasks: 2, completionPercentage: 50 },
    };
    api.get
      .mockResolvedValueOnce({ data: { health } })
      .mockResolvedValueOnce({ data: { health: refreshedHealth } });
    api.post.mockReturnValueOnce(new Promise((resolve) => { resolveInsight = resolve; }));
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Load health' }));
    await screen.findByText('At Risk');
    fireEvent.click(screen.getByRole('button', { name: 'Generate AI insight' }));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText('50%')).toBeInTheDocument();

    resolveInsight({ data: insightResponse });
    expect(await screen.findByText('Focus on the blocked dashboard task.')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText(/health data has changed since this insight was generated/i)).toBeInTheDocument();
  });

  test('does not apply a pending insight response after switching projects', async () => {
    let resolveInsight;
    api.post.mockReturnValueOnce(new Promise((resolve) => { resolveInsight = resolve; }));
    const view = renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Load health' }));
    await screen.findByText('At Risk');
    fireEvent.click(screen.getByRole('button', { name: 'Generate AI insight' }));
    view.rerender(<ProjectHealthSection projectId="project-2" />);
    resolveInsight({ data: insightResponse });
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Focus on the blocked dashboard task.')).not.toBeInTheDocument();
  });
});
