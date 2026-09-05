import { useRef, useState } from 'react';
import Alert from '../Alert';
import Button from '../Button';

const formatCommentTimestamp = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const wasMeaningfullyEdited = (comment) => {
  const createdAt = new Date(comment.createdAt).getTime();
  const updatedAt = new Date(comment.updatedAt).getTime();

  return Number.isFinite(createdAt)
    && Number.isFinite(updatedAt)
    && updatedAt - createdAt > 1000;
};

const TaskComment = ({
  comment,
  currentUserId,
  isProjectOwner,
  updating,
  deleting,
  mutationError,
  onUpdate,
  onDelete,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const editButtonRef = useRef(null);
  const authorName = comment.author?.name || 'Unknown user';
  const isAuthor = Boolean(
    currentUserId
    && comment.author?._id
    && String(comment.author._id) === String(currentUserId),
  );
  const canEdit = isAuthor;
  const canDelete = isAuthor || isProjectOwner;
  const pending = updating || deleting;

  const saveComment = async (event) => {
    event.preventDefault();

    if (await onUpdate(comment._id, draft)) {
      setEditing(false);
      setTimeout(() => editButtonRef.current?.focus(), 0);
    }
  };

  const cancelEdit = () => {
    setDraft(comment.content);
    setEditing(false);
    setTimeout(() => editButtonRef.current?.focus(), 0);
  };

  const confirmDelete = () => {
    if (window.confirm(`Delete comment by ${authorName}? This action cannot be undone.`)) {
      onDelete(comment._id);
    }
  };

  return (
    <li className="task-comment" aria-busy={pending || undefined}>
      <div className="task-comment__header">
        <strong>{authorName}</strong>
        <span>
          {formatCommentTimestamp(comment.createdAt)}
          {wasMeaningfullyEdited(comment) && ' · Edited'}
        </span>
      </div>

      {editing ? (
        <form className="task-comment-edit" onSubmit={saveComment}>
          <label htmlFor={`edit-comment-${comment._id}`}>Edit comment</label>
          <textarea
            id={`edit-comment-${comment._id}`}
            rows={3}
            maxLength={5000}
            value={draft}
            disabled={pending}
            onChange={(event) => setDraft(event.target.value)}
          />
          {mutationError && <Alert>{mutationError}</Alert>}
          <div className="task-comment__actions">
            <Button type="button" variant="secondary" disabled={pending} onClick={cancelEdit}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {updating ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      ) : (
        <>
          <p>{comment.content}</p>
          {mutationError && <Alert>{mutationError}</Alert>}
          {(canEdit || canDelete) && (
            <div className="task-comment__actions">
              {canEdit && (
                <Button
                  ref={editButtonRef}
                  variant="secondary"
                  disabled={pending}
                  aria-label={`Edit comment by ${authorName}`}
                  onClick={() => {
                    setDraft(comment.content);
                    setEditing(true);
                  }}
                >
                  Edit
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="danger-secondary"
                  disabled={pending}
                  aria-label={`Delete comment by ${authorName}`}
                  onClick={confirmDelete}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </li>
  );
};

export default TaskComment;
