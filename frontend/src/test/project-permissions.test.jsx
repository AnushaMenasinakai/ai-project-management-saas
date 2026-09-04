import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import ProjectDetails from '../pages/ProjectDetails';
import api from '../services/api';

let mockUser = { id: 'owner-1', name: 'Owner' };

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const task = {
  _id: 'task-1', title: 'Critical task', description: 'Keep this behavior protected.',
  status: 'todo', priority: 'high', dependencies: [], createdAt: '2026-01-01T00:00:00.000Z',
};

const renderProject = (ownerId) => {
  api.get.mockImplementation((url) => {
    if (url === '/projects/project-1') return Promise.resolve({ data: { project: {
      _id: 'project-1', name: 'Shared Project', description: 'Shared context', status: 'active', owner: ownerId,
    } } });
    if (url === '/tasks/project/project-1') return Promise.resolve({ data: { tasks: [task] } });
    if (url === '/projects/project-1/members') return Promise.resolve({ data: { members: [] } });
    if (url === '/documents/project/project-1') return Promise.resolve({ data: { documents: [{
      _id: 'document-1', title: 'Project Notes', content: 'Reference content', sourceType: 'text',
    }] } });
    throw new Error(`Unexpected API request: ${url}`);
  });
  return render(
    <MemoryRouter initialEntries={['/projects/project-1']}>
      <Routes><Route path="/projects/:id" element={<ProjectDetails />} /></Routes>
    </MemoryRouter>,
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUser = { id: 'owner-1', name: 'Owner' };
});

describe('Project Details permission visibility', () => {
  test('shows owner-only controls to the owner', async () => {
    renderProject('owner-1');
    expect(await screen.findByRole('button', { name: 'Edit Project' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Project' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Add member' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Task' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Document' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  test('keeps members productive while hiding owner-only controls', async () => {
    mockUser = { id: 'member-1', name: 'Member' };
    renderProject('owner-1');
    expect(await screen.findByText('Shared Project')).toBeInTheDocument();
    expect(screen.getByText('Project Notes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Task' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Task' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ask AI' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate Tasks with AI' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Project' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Project' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Add member' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Task' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create Document' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });
});
