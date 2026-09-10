import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import AppShell from '../components/AppShell';
import ProjectDetails from '../pages/ProjectDetails';
import api from '../services/api';

let mockUser = { id: 'owner-1', name: 'Owner' };

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
vi.mock('../context/NotificationsContext', () => ({
  useNotificationsContext: () => ({ unreadCount: 0 }),
}));
vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const task = {
  _id: 'task-1', title: 'Critical task', description: 'Keep this behavior protected.',
  status: 'todo', priority: 'high', dependencies: [], createdAt: '2026-01-01T00:00:00.000Z',
};

const configureProjectApi = (ownerId) => {
  api.get.mockImplementation((url) => {
    if (url === '/projects/project-1') return Promise.resolve({ data: { project: {
      _id: 'project-1', name: 'Shared Project', description: 'Shared context', status: 'active', owner: ownerId,
    } } });
    if (url === '/tasks/project/project-1') return Promise.resolve({ data: { tasks: [task] } });
    if (url === '/projects/project-1/members') return Promise.resolve({ data: { members: [] } });
    if (url === '/projects/project-1/health') return Promise.resolve({ data: { health: {
      asOf: '2026-09-10T00:00:00.000Z', status: 'insufficient_data', reasons: ['no_tasks'],
      project: { _id: 'project-1', name: 'Shared Project', status: 'active', dueDateStatus: 'no_due_date' },
      metrics: { totalTasks: 0, completedTasks: 0, completionPercentage: null }, attentionTasks: [],
    } } });
    if (url === '/projects/project-1/activities') {
      return Promise.resolve({ data: { activities: [], nextCursor: null } });
    }
    if (url === '/documents/project/project-1') return Promise.resolve({ data: { documents: [{
      _id: 'document-1', title: 'Project Notes', content: 'Reference content', sourceType: 'text',
    }] } });
    throw new Error(`Unexpected API request: ${url}`);
  });
};

const renderProject = (ownerId, workspace = 'project-tasks') => {
  configureProjectApi(ownerId);
  return render(
    <MemoryRouter initialEntries={[`/projects/project-1#${workspace}`]}>
      <Routes><Route path="/projects/:id" element={<ProjectDetails />} /></Routes>
    </MemoryRouter>,
  );
};

const renderProjectWorkspace = (hash = '') => {
  configureProjectApi('owner-1');
  const entry = `/projects/project-1${hash}`;
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/projects/:id" element={<ProjectDetails />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUser = { id: 'owner-1', name: 'Owner' };
});

describe('Project Details permission visibility', () => {
  test('keeps URL workspace navigation, active state, and visible content synchronized', async () => {
    renderProjectWorkspace();
    await screen.findByText('Shared Project');

    const workspaces = [
      ['Health', 'project-health'],
      ['Members', 'project-members'],
      ['Tasks', 'project-tasks'],
      ['Documents', 'project-documents'],
      ['Project Q&A', 'project-qa'],
      ['Activity', 'project-activity'],
    ];

    for (const [label, workspace] of workspaces) {
      const link = screen.getByRole('link', { name: label });
      fireEvent.click(link);
      await waitFor(() => expect(link).toHaveAttribute('aria-current', 'page'));
      expect(document.querySelector('.project-workspace')).toHaveAttribute(
        'data-active-workspace', workspace,
      );
      expect(document.querySelectorAll('.project-workspace__panel:not([hidden])')).toHaveLength(1);
    }

    expect(api.post).not.toHaveBeenCalled();
  });

  test('supports direct workspace links and safely defaults unknown workspace values', async () => {
    const directView = renderProjectWorkspace('#project-documents');
    await screen.findByText('Shared Project');
    expect(screen.getByRole('link', { name: 'Documents' })).toHaveAttribute('aria-current', 'page');
    expect(document.querySelector('.project-workspace')).toHaveAttribute(
      'data-active-workspace', 'project-documents',
    );
    directView.unmount();

    renderProjectWorkspace('#not-a-workspace');
    await screen.findByText('Shared Project');
    expect(screen.getByRole('link', { name: 'Health' })).toHaveAttribute('aria-current', 'page');
    expect(document.querySelector('.project-workspace')).toHaveAttribute(
      'data-active-workspace', 'project-health',
    );
  });

  test('shows owner-only controls to the owner', async () => {
    const tasksView = renderProject('owner-1');
    expect(await screen.findByRole('button', { name: 'Edit Project' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Project' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Task' })).toBeInTheDocument();
    tasksView.unmount();

    const membersView = renderProject('owner-1', 'project-members');
    expect(await screen.findByRole('button', { name: '+ Add member' })).toBeInTheDocument();
    membersView.unmount();

    renderProject('owner-1', 'project-documents');
    expect(await screen.findByRole('button', { name: 'Create Document' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  test('keeps members productive while hiding owner-only controls', async () => {
    mockUser = { id: 'member-1', name: 'Member' };
    const tasksView = renderProject('owner-1');
    expect(await screen.findByText('Shared Project')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Task' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Task' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate Tasks with AI' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Project' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Project' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Task' })).not.toBeInTheDocument();
    tasksView.unmount();

    const qaView = renderProject('owner-1', 'project-qa');
    expect(await screen.findByRole('button', { name: 'Ask AI' })).toBeInTheDocument();
    qaView.unmount();

    const membersView = renderProject('owner-1', 'project-members');
    await screen.findByText('Shared Project');
    expect(screen.queryByRole('button', { name: '+ Add member' })).not.toBeInTheDocument();
    membersView.unmount();

    renderProject('owner-1', 'project-documents');
    expect(await screen.findByText('Project Notes')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create Document' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  test('preserves tasks and prevents duplicate AI generation after a provider failure', async () => {
    api.post.mockRejectedValue({ response: { data: {
      code: 'AI_TEMPORARILY_UNAVAILABLE', message: 'provider detail',
    } } });
    renderProject('owner-1');
    expect(await screen.findByText('Critical task')).toBeInTheDocument();
    const generate = screen.getByRole('button', { name: 'Generate Tasks with AI' });
    fireEvent.click(generate);
    fireEvent.click(generate);
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The AI service is temporarily unavailable. Please try again.',
    );
    expect(screen.getByText('Critical task')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate Tasks with AI' })).toBeEnabled();
  });
});
