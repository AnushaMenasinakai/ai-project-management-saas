import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import TasksSection from '../components/project-details/TasksSection';
import api from '../services/api';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('@dnd-kit/react', () => ({
  DragDropProvider: ({ children }) => children,
  useDroppable: () => ({ ref: vi.fn(), isDropTarget: false }),
  useDraggable: () => ({ ref: vi.fn(), handleRef: vi.fn(), isDragging: false }),
}));

const task = {
  _id: 'task-1',
  title: 'Build Dashboard',
  description: 'Create the project dashboard.',
  status: 'todo',
  priority: 'high',
  dependencies: [],
};

const comment = {
  _id: 'comment-1',
  task: task._id,
  project: 'project-1',
  author: { _id: 'user-1', name: 'Anusha' },
  content: '<script>plain text only</script>',
  createdAt: '2026-09-05T10:00:00.000Z',
  updatedAt: '2026-09-05T10:00:02.000Z',
};

const renderTasks = () => render(
  <TasksSection
    tasks={[task]}
    filteredTasks={[task]}
    members={[]}
    isProjectOwner
    currentUserId="user-1"
    tasksLoading={false}
    tasksError=""
    filters={{ search: '', status: 'all', priority: 'all', sort: 'created_desc' }}
    showTaskForm={false}
    createValues={{ title: '', description: '', status: 'todo', priority: 'medium', dueDate: '', assignedTo: '' }}
    creatingTask={false}
    taskFormError=""
    editingTaskId={null}
    editValues={{ title: '', description: '', status: 'todo', priority: 'medium', dueDate: '', assignedTo: '', dependencies: [] }}
    updatingTask={false}
    editTaskError=""
    dependencyError=""
    aiState={{ generatingTasks: false, generateTasksError: '', generateTasksSuccess: '' }}
    statusVariant={() => 'neutral'}
    priorityVariant={() => 'neutral'}
    formatLabel={(value) => value}
    onShowCreate={vi.fn()}
    onFilterChange={vi.fn()}
    onCreate={vi.fn()}
    onCreateChange={vi.fn()}
    onCancelCreate={vi.fn()}
    onStartEdit={vi.fn()}
    onDelete={vi.fn()}
    onMoveTask={vi.fn()}
    pendingTaskMoves={new Set()}
    taskMoveError=""
    taskMoveAnnouncement=""
    onUpdate={vi.fn()}
    onEditChange={vi.fn()}
    onDependenciesChange={vi.fn()}
    onCancelEdit={vi.fn()}
    onGenerate={vi.fn()}
  />
);

const openComments = () => {
  fireEvent.click(screen.getByRole('button', { name: 'View comments for Build Dashboard' }));
};

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue({ data: { comments: [] } });
});

describe('task comments read and create UI', () => {
  test('lazy-loads and safely renders a task discussion from List view', async () => {
    api.get.mockResolvedValue({ data: { comments: [comment] } });
    const { container } = renderTasks();

    expect(api.get).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'View comments for Build Dashboard' })).toBeInTheDocument();
    openComments();

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/tasks/task-1/comments');
    expect(await screen.findByText('Anusha')).toBeInTheDocument();
    expect(screen.getByText('<script>plain text only</script>')).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
    expect(screen.getByText(/Edited/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Comments — Build Dashboard' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Edit comment by Anusha' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete comment by Anusha' })).toBeInTheDocument();
    expect(screen.getByLabelText('Add comment')).toHaveAttribute('maxlength', '5000');
  });

  test('shows the empty state and closes the shared panel', async () => {
    renderTasks();
    openComments();

    expect(await screen.findByText('No comments yet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close comments for Build Dashboard' }));
    expect(screen.queryByRole('heading', { name: 'Comments — Build Dashboard' })).not.toBeInTheDocument();
  });

  test('shows loading and fetch-error states with a retry action', async () => {
    let rejectRequest;
    api.get.mockReturnValueOnce(new Promise((resolve, reject) => { rejectRequest = reject; }));
    renderTasks();
    openComments();

    expect(screen.getByRole('status')).toHaveTextContent('Loading comments...');
    rejectRequest({ response: { data: { message: 'Comments unavailable.' } } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Comments unavailable.');

    api.get.mockResolvedValueOnce({ data: { comments: [] } });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No comments yet')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  test('posts trimmed content, appends the returned comment, and clears the input', async () => {
    api.post.mockResolvedValue({
      data: { comment: { ...comment, _id: 'comment-2', content: 'Ready for review.' } },
    });
    renderTasks();
    openComments();
    await screen.findByText('No comments yet');

    const input = screen.getByLabelText('Add comment');
    fireEvent.change(input, { target: { value: '  Ready for review.  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post Comment' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/tasks/task-1/comments', {
      content: 'Ready for review.',
    }));
    expect(await screen.findByText('Ready for review.')).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  test('preserves typed content when comment creation fails', async () => {
    api.post.mockRejectedValue({ response: { data: { message: 'Could not post comment.' } } });
    renderTasks();
    openComments();
    await screen.findByText('No comments yet');

    const input = screen.getByLabelText('Add comment');
    fireEvent.change(input, { target: { value: 'Keep this draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post Comment' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not post comment.');
    expect(input).toHaveValue('Keep this draft');
  });

  test('rejects whitespace-only comments without an API request', async () => {
    renderTasks();
    openComments();
    await screen.findByText('No comments yet');

    fireEvent.change(screen.getByLabelText('Add comment'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post Comment' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Comment content is required.');
    expect(api.post).not.toHaveBeenCalled();
  });

  test('uses the same open discussion while switching between List and Board', async () => {
    renderTasks();
    openComments();
    await screen.findByText('No comments yet');

    fireEvent.click(screen.getByRole('button', { name: 'Board' }));

    expect(screen.getByRole('heading', { name: 'Comments — Build Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View comments for Build Dashboard' })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(1);
  });
});
