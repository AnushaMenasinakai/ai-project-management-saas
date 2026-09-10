import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import AppShell from '../components/AppShell';
import ActivitySection from '../components/project-details/ActivitySection';
import {
  formatActivityMessage,
  formatActivityStatus,
} from '../utils/activityUtils';
import api from '../services/api';

let mockUser = { id: 'owner-1', name: 'Owner', email: 'owner@test.local' };

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, logout: vi.fn() }),
}));
vi.mock('../services/api', () => ({ default: { get: vi.fn() } }));

const activities = [
  {
    _id: 'activity-3',
    type: 'task_status_changed',
    actorName: 'Mounesh',
    entityName: 'Build Dashboard',
    metadata: { from: 'todo', to: 'in_progress' },
    createdAt: '2026-09-06T00:03:00.000Z',
  },
  {
    _id: 'activity-2',
    type: 'task_created',
    actorName: 'Anusha',
    entityName: 'Test mobile layout',
    metadata: {},
    createdAt: '2026-09-06T00:02:00.000Z',
  },
  {
    _id: 'activity-1',
    type: 'project_created',
    actorName: 'Mounesh',
    entityName: 'Orbit PM',
    metadata: {},
    createdAt: '2026-09-06T00:01:00.000Z',
  },
];

const renderSection = () => render(<ActivitySection projectId="project-1" />);

beforeEach(() => {
  vi.clearAllMocks();
  mockUser = { id: 'owner-1', name: 'Owner', email: 'owner@test.local' };
  api.get.mockResolvedValue({ data: { activities: [], nextCursor: null } });
  Element.prototype.scrollIntoView = vi.fn();
});

describe('Activity timeline', () => {
  test('formats supported events and unknown events safely', () => {
    expect(formatActivityStatus('completed')).toBe('Completed');
    expect(formatActivityMessage(activities[2])).toBe('Mounesh created the project Orbit PM.');
    expect(formatActivityMessage(activities[1])).toBe('Anusha created task Test mobile layout.');
    expect(formatActivityMessage(activities[0])).toBe(
      'Mounesh moved Build Dashboard from To Do to In Progress.',
    );
    expect(formatActivityMessage({
      type: 'future_event', actorName: 'Owner', entityName: 'Archived item', metadata: { secret: 'hidden' },
    })).toBe('Owner updated Archived item.');
  });

  test('formats expanded semantic events without exposing raw metadata', () => {
    const event = (type, entityName, metadata = {}) => ({ type, actorName: 'Owner', entityName, metadata });
    expect(formatActivityMessage(event('project_updated', 'Orbit', { changedFields: ['name', 'dueDate'] })))
      .toBe('Owner updated name and due date on project Orbit.');
    expect(formatActivityMessage(event('task_updated', 'Dashboard', { changedFields: ['priority', 'dependencies'] })))
      .toBe('Owner updated priority and dependencies on Dashboard.');
    expect(formatActivityMessage(event('task_assigned', 'Dashboard', { assigneeName: 'Member' })))
      .toBe('Owner assigned Dashboard to Member.');
    expect(formatActivityMessage(event('task_unassigned', 'Dashboard', { previousAssigneeName: 'Member' })))
      .toBe('Owner unassigned Member from Dashboard.');
    expect(formatActivityMessage(event('task_deleted', 'Old task'))).toBe('Owner deleted task Old task.');
    expect(formatActivityMessage(event('member_added', 'Member'))).toBe('Owner added Member to the project.');
    expect(formatActivityMessage(event('member_removed', 'Member'))).toBe('Owner removed Member from the project.');
    expect(formatActivityMessage(event('document_created', 'Brief'))).toBe('Owner added document Brief.');
    expect(formatActivityMessage(event('document_updated', 'Brief', { changedFields: ['title'] })))
      .toBe('Owner updated title on document Brief.');
    expect(formatActivityMessage(event('document_deleted', 'Brief'))).toBe('Owner deleted document Brief.');
    expect(formatActivityMessage(event('ai_tasks_generated', 'Orbit', { count: 1 })))
      .toBe('Owner generated 1 task with AI.');
    expect(formatActivityMessage(event('ai_tasks_generated', 'Orbit', { count: 5 })))
      .toBe('Owner generated 5 tasks with AI.');
  });

  test('does not fetch eagerly and loads a semantic accessible timeline when opened', async () => {
    let resolveRequest;
    api.get.mockReturnValueOnce(new Promise((resolve) => { resolveRequest = resolve; }));
    renderSection();

    expect(api.get).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Load activity' }));
    expect(api.get).toHaveBeenCalledWith('/projects/project-1/activities');
    expect(screen.getByRole('status')).toHaveTextContent('Loading project activity...');

    resolveRequest({ data: { activities, nextCursor: null } });
    const timeline = await screen.findByRole('list', { name: 'Project activity' });
    expect(timeline).toBeInTheDocument();
    expect(screen.getByText('Mounesh created the project Orbit PM.')).toBeInTheDocument();
    expect(screen.getByText('Anusha created task Test mobile layout.')).toBeInTheDocument();
    expect(screen.getByText('Mounesh moved Build Dashboard from To Do to In Progress.')).toBeInTheDocument();
    expect(screen.getAllByRole('time')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /edit|delete/i })).not.toBeInTheDocument();
  });

  test('shows empty and error states and retries accessibly', async () => {
    api.get.mockRejectedValueOnce({ response: { data: { message: 'Activity unavailable.' } } });
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Load activity' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Activity unavailable.');
    api.get.mockResolvedValueOnce({ data: { activities: [], nextCursor: null } });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No activity yet')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  test('appends cursor pages and preserves loaded activity after pagination failure', async () => {
    api.get
      .mockResolvedValueOnce({ data: { activities: [activities[0]], nextCursor: 'cursor one' } })
      .mockRejectedValueOnce({ response: { data: { message: 'Older activity unavailable.' } } })
      .mockResolvedValueOnce({ data: { activities: [activities[1]], nextCursor: null } });
    renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Load activity' }));
    await screen.findByText('Mounesh moved Build Dashboard from To Do to In Progress.');

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Older activity unavailable.');
    expect(screen.getByText('Mounesh moved Build Dashboard from To Do to In Progress.')).toBeInTheDocument();
    expect(api.get).toHaveBeenLastCalledWith('/projects/project-1/activities?cursor=cursor%20one');

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(await screen.findByText('Anusha created task Test mobile layout.')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  test('project navigation opens Activity once for both owner and member UI', async () => {
    const ActivityWorkspace = () => {
      const location = useLocation();
      return <ActivitySection projectId="project-1" active={location.hash === '#project-activity'} />;
    };
    const renderShell = () => render(
      <MemoryRouter initialEntries={['/projects/project-1']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/projects/:id" element={<ActivityWorkspace />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const ownerView = renderShell();
    fireEvent.click(screen.getByRole('link', { name: 'Activity' }));
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('link', { name: 'Activity' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByRole('link', { name: 'Activity' }));
    expect(api.get).toHaveBeenCalledTimes(1);
    ownerView.unmount();

    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { activities: [], nextCursor: null } });
    mockUser = { id: 'member-1', name: 'Member', email: 'member@test.local' };
    renderShell();
    fireEvent.click(screen.getByRole('link', { name: 'Activity' }));
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));
  });
});
