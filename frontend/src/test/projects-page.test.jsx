import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import Projects from '../pages/Projects';
import api from '../services/api';

vi.mock('../services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

beforeEach(() => vi.clearAllMocks());

describe('Projects page states', () => {
  test('renders loading and then the empty-project state', async () => {
    let resolveRequest;
    api.get.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve; }));
    render(<MemoryRouter><Projects /></MemoryRouter>);
    expect(screen.getByText('Loading your projects...')).toBeInTheDocument();
    resolveRequest({ data: { projects: [] } });
    expect(await screen.findByText('Create your first project')).toBeInTheDocument();
  });

  test('renders project data returned by the API', async () => {
    api.get.mockResolvedValue({ data: { projects: [{
      _id: 'project-1', name: 'Launch Project', description: 'Coordinate the product launch.',
      status: 'active', totalTasks: 4, completedTasks: 2, progress: 50,
    }] } });
    render(<MemoryRouter><Projects /></MemoryRouter>);
    expect(await screen.findByText('Launch Project')).toBeInTheDocument();
    expect(screen.getByText('Coordinate the product launch.')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  });

  test('renders the API error state', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    api.get.mockRejectedValue({ response: { data: { message: 'Projects unavailable.' } } });
    render(<MemoryRouter><Projects /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Projects unavailable.')).toBeInTheDocument());
    consoleError.mockRestore();
  });
});
