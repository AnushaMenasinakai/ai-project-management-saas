import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';
import Dashboard from '../pages/Dashboard';
import { AuthContext } from '../context/AuthContext';
import useDashboardData from '../hooks/useDashboardData';

vi.mock('../hooks/useDashboardData');

const retry = vi.fn();
const baseData = {
  summary: { totalProjects: 2, totalTasks: 8, completedTasks: 5, overallProgressPercentage: 63 },
  recentProjects: [{
    _id: 'project-1', name: 'Orbit Launch', status: 'active', description: 'Ship the next release.',
    totalTasks: 6, completedTasks: 4, progressPercentage: 67, memberCount: 3,
    dueDate: '2026-10-12T00:00:00.000Z',
    health: { status: 'at_risk', reasons: ['blocked_tasks'] },
  }, {
    _id: 'project-2', name: 'Research', status: 'planning', description: '',
    totalTasks: 2, completedTasks: 1, progressPercentage: 50, memberCount: 1,
    dueDate: null, health: { status: 'healthy', reasons: [] },
  }],
  recentActivity: [{
    _id: 'activity-1', projectId: 'project-1', projectName: 'Orbit Launch',
    message: 'Anusha completed Release checklist.', createdAt: '2026-09-10T10:30:00.000Z',
  }],
  loading: false, error: '', activityError: '', healthError: '', retry,
};

const renderDashboard = (user = { _id: 'user-1', name: 'anusha kumar', role: 'member' }) => render(
  <AuthContext.Provider value={{ user, loading: false }}>
    <MemoryRouter><Dashboard /></MemoryRouter>
  </AuthContext.Provider>,
);

beforeEach(() => {
  vi.clearAllMocks();
  useDashboardData.mockReturnValue(baseData);
});

test('renders the authenticated name and real workspace summary metrics', () => {
  renderDashboard();
  expect(screen.getByRole('heading', { name: /Welcome back, Anusha/i })).toBeInTheDocument();
  expect(screen.getByLabelText('Projects: 2')).toBeInTheDocument();
  expect(screen.getByLabelText('Tasks: 8')).toBeInTheDocument();
  expect(screen.getByLabelText('Completed: 5')).toBeInTheDocument();
  expect(screen.getByLabelText('Progress: 63%')).toBeInTheDocument();
});

test('renders recent project details, status, progress, and navigation', () => {
  renderDashboard();
  expect(screen.getAllByRole('heading', { name: 'Orbit Launch' })).toHaveLength(2);
  expect(screen.getByText('Active')).toBeInTheDocument();
  expect(screen.getByRole('progressbar', { name: 'Orbit Launch progress' })).toHaveAttribute('aria-valuenow', '67');
  expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/projects');
  expect(screen.getAllByRole('link', { name: /Open project/i })[0]).toHaveAttribute('href', '/projects/project-1');
});

test('shows a truthful no-task progress state without a progressbar', () => {
  useDashboardData.mockReturnValue({
    ...baseData,
    summary: { totalProjects: 1, totalTasks: 0, completedTasks: 0, overallProgressPercentage: null },
    recentProjects: [{ ...baseData.recentProjects[0], totalTasks: 0, completedTasks: 0, progressPercentage: null }],
  });
  renderDashboard();
  expect(screen.getByLabelText('Progress: No tasks yet')).toBeInTheDocument();
  expect(screen.getAllByText('No tasks yet')).toHaveLength(2);
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
});

test('renders health, local unavailable state, recent activity, and quick-action links', () => {
  useDashboardData.mockReturnValue({
    ...baseData,
    recentProjects: [baseData.recentProjects[0], { ...baseData.recentProjects[1], health: null }],
    healthError: 'Some project health summaries could not be loaded.',
  });
  renderDashboard();
  expect(screen.getByText('At Risk')).toBeInTheDocument();
  expect(screen.getByText('Unavailable')).toBeInTheDocument();
  expect(screen.getByText('Health data is temporarily unavailable for this project.')).toBeInTheDocument();
  expect(screen.getByText('Anusha completed Release checklist.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Ask Project Q&A/i })).toHaveAttribute('href', '/projects/project-1#project-qa');
  expect(screen.getByRole('link', { name: /Open Documents/i })).toHaveAttribute('href', '/projects/project-1#project-documents');
  expect(screen.getByRole('link', { name: /Generate Tasks/i })).toHaveAttribute('href', '/projects/project-1#project-tasks');
});

test('shows an activity empty state and keeps metrics visible after a partial failure', () => {
  useDashboardData.mockReturnValue({ ...baseData, recentActivity: [], activityError: 'Some recent activity could not be loaded.' });
  renderDashboard();
  expect(screen.getByText('No recent activity yet.')).toBeInTheDocument();
  expect(screen.getByText('Some recent activity could not be loaded.')).toHaveAttribute('role', 'status');
  expect(screen.getByLabelText('Tasks: 8')).toBeInTheDocument();
});

test('renders a focused zero-project empty state without dashboard sections', () => {
  useDashboardData.mockReturnValue({
    ...baseData,
    summary: { totalProjects: 0, totalTasks: 0, completedTasks: 0, overallProgressPercentage: null },
    recentProjects: [], recentActivity: [],
  });
  renderDashboard();
  expect(screen.getByRole('heading', { name: 'No projects yet' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Create project' })).toHaveAttribute('href', '/projects');
  expect(screen.queryByRole('heading', { name: 'Recent Projects' })).not.toBeInTheDocument();
});

test('renders loading and primary error states with an accessible retry', () => {
  useDashboardData.mockReturnValue({ ...baseData, loading: true });
  const { rerender } = renderDashboard();
  expect(screen.getByText('Loading dashboard data...')).toBeInTheDocument();

  useDashboardData.mockReturnValue({ ...baseData, loading: false, error: 'Please try again.' });
  rerender(<AuthContext.Provider value={{ user: { _id: 'user-1', name: 'Member User' }, loading: false }}><MemoryRouter><Dashboard /></MemoryRouter></AuthContext.Provider>);
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(retry).toHaveBeenCalledTimes(1);
  expect(screen.queryByLabelText('Projects: 2')).not.toBeInTheDocument();
});
