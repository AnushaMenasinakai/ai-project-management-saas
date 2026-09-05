import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import TaskCommentsPanel from '../components/project-details/TaskCommentsPanel';
import api from '../services/api';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const task = { _id: 'task-1', title: 'Build Dashboard' };
const ownComment = {
  _id: 'comment-own',
  author: { _id: 'user-1', name: 'Anusha' },
  content: 'Original update.',
  createdAt: '2026-09-05T10:00:00.000Z',
  updatedAt: '2026-09-05T10:00:00.000Z',
};
const otherComment = {
  _id: 'comment-other',
  author: { _id: 'user-2', name: 'Teammate' },
  content: 'Teammate update.',
  createdAt: '2026-09-05T11:00:00.000Z',
  updatedAt: '2026-09-05T11:00:00.000Z',
};

const renderPanel = async ({
  comments = [ownComment, otherComment],
  currentUserId = 'user-1',
  isProjectOwner = false,
} = {}) => {
  api.get.mockResolvedValueOnce({ data: { comments } });
  render(
    <TaskCommentsPanel
      task={task}
      currentUserId={currentUserId}
      isProjectOwner={isProjectOwner}
      onClose={vi.fn()}
    />,
  );
  await screen.findByText(comments[0].content);
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

describe('task comment mutation permissions and behavior', () => {
  test('shows author controls based on ID and supports cancel and local validation', async () => {
    await renderPanel();

    expect(screen.getByRole('button', { name: 'Edit comment by Anusha' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete comment by Anusha' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit comment by Teammate' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete comment by Teammate' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit comment by Anusha' }));
    const textarea = screen.getByLabelText('Edit comment');
    expect(textarea).toHaveValue('Original update.');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(api.patch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Edit comment by Anusha' }));
    fireEvent.change(screen.getByLabelText('Edit comment'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Comment content is required.');
    expect(api.patch).not.toHaveBeenCalled();
  });

  test('uses IDs rather than names and gives owners delete-only moderation', async () => {
    await renderPanel({
      comments: [{ ...otherComment, author: { _id: 'user-2', name: 'Anusha' } }],
      currentUserId: 'user-1',
      isProjectOwner: true,
    });

    expect(screen.queryByRole('button', { name: 'Edit comment by Anusha' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete comment by Anusha' })).toBeInTheDocument();
  });

  test('keeps another member from receiving mutation controls', async () => {
    await renderPanel({ currentUserId: 'viewer-3' });

    expect(screen.queryByRole('button', { name: /Edit comment by/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete comment by/ })).not.toBeInTheDocument();
  });

  test('sends a trimmed update, disables the pending edit, and replaces only that comment', async () => {
    let resolveUpdate;
    api.patch.mockReturnValueOnce(new Promise((resolve) => { resolveUpdate = resolve; }));
    await renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Edit comment by Anusha' }));
    fireEvent.change(screen.getByLabelText('Edit comment'), { target: { value: '  Updated locally.  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(api.patch).toHaveBeenCalledWith('/comments/comment-own', { content: 'Updated locally.' });
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    await act(async () => {
      resolveUpdate({
        data: {
          comment: {
            ...ownComment,
            content: 'Updated locally.',
            updatedAt: '2026-09-05T10:00:03.000Z',
          },
        },
      });
    });

    expect(await screen.findByText('Updated locally.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Edit comment')).not.toBeInTheDocument();
    expect(screen.getByText(/Edited/)).toBeInTheDocument();
    expect(screen.getByText('Teammate update.')).toBeInTheDocument();
  });

  test('keeps edit mode and its draft when PATCH fails', async () => {
    api.patch.mockRejectedValueOnce({ response: { data: { message: 'Update was rejected.' } } });
    await renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Edit comment by Anusha' }));
    fireEvent.change(screen.getByLabelText('Edit comment'), { target: { value: 'Preserve this draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Update was rejected.');
    expect(screen.getByLabelText('Edit comment')).toHaveValue('Preserve this draft');
    expect(screen.getByText('Teammate update.')).toBeInTheDocument();
  });

  test('removes a confirmed owner-moderated comment only after DELETE succeeds', async () => {
    let resolveDelete;
    api.delete.mockReturnValueOnce(new Promise((resolve) => { resolveDelete = resolve; }));
    await renderPanel({ currentUserId: 'owner-1', isProjectOwner: true });

    const teammateItem = screen.getByText('Teammate update.').closest('li');
    fireEvent.click(within(teammateItem).getByRole('button', { name: 'Delete comment by Teammate' }));

    expect(window.confirm).toHaveBeenCalled();
    expect(api.delete).toHaveBeenCalledWith('/comments/comment-other');
    expect(within(teammateItem).getByRole('button', { name: 'Delete comment by Teammate' })).toBeDisabled();
    expect(screen.getByText('Teammate update.')).toBeInTheDocument();

    await act(async () => {
      resolveDelete({ data: { message: 'Comment deleted successfully.' } });
    });
    await waitFor(() => expect(screen.queryByText('Teammate update.')).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Comments — Build Dashboard' })).toHaveFocus();
  });

  test('keeps a failed deletion visible and does not block another comment', async () => {
    let rejectDelete;
    api.delete.mockReturnValueOnce(new Promise((resolve, reject) => { rejectDelete = reject; }));
    await renderPanel({ comments: [ownComment, { ...otherComment, author: ownComment.author }] });

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete comment by Anusha' });
    fireEvent.click(deleteButtons[0]);
    expect(deleteButtons[0]).toBeDisabled();
    expect(deleteButtons[1]).toBeEnabled();

    await act(async () => {
      rejectDelete({ response: { data: { message: 'Delete was rejected.' } } });
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Delete was rejected.');
    expect(screen.getByText('Original update.')).toBeInTheDocument();
    expect(screen.getByText('Teammate update.')).toBeInTheDocument();
  });
});
