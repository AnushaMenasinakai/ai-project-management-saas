import { useEffect, useRef, useState } from 'react';
import useTaskComments from '../../hooks/useTaskComments';
import Alert from '../Alert';
import Button from '../Button';
import Card from '../Card';
import LoadingState from '../LoadingState';
import TaskComment from './TaskComment';

const TaskCommentsPanel = ({ task, currentUserId, isProjectOwner, onClose }) => {
  const [content, setContent] = useState('');
  const headingRef = useRef(null);
  const {
    comments,
    loading,
    error,
    creating,
    createError,
    updatingCommentIds,
    deletingCommentIds,
    mutationErrors,
    fetchComments,
    createComment,
    updateComment,
    deleteComment,
  } = useTaskComments(task._id);

  useEffect(() => {
    headingRef.current?.focus();
  }, [task._id]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (await createComment(content)) {
      setContent('');
    }
  };

  const handleDelete = async (commentId) => {
    if (await deleteComment(commentId)) {
      headingRef.current?.focus();
    }
  };

  const headingId = `task-comments-${task._id}`;

  return (
    <Card as="section" className="task-comments-panel" aria-labelledby={headingId}>
      <div className="task-comments-panel__header">
        <div>
          <p className="section-eyebrow">Task discussion</p>
          <h3 id={headingId} ref={headingRef} tabIndex="-1">
            Comments — {task.title}
          </h3>
        </div>
        <Button
          variant="secondary"
          onClick={onClose}
          aria-label={`Close comments for ${task.title}`}
        >
          Close
        </Button>
      </div>

      {loading && <LoadingState message="Loading comments..." />}
      {error && (
        <Alert>
          <span>{error}</span>{' '}
          <button type="button" className="alert-link-button" onClick={fetchComments}>
            Try again
          </button>
        </Alert>
      )}
      {!loading && !error && comments.length === 0 && (
        <div className="task-comments-empty" role="status">
          <strong>No comments yet</strong>
          <p>Start the discussion for this task.</p>
        </div>
      )}
      {!loading && !error && comments.length > 0 && (
        <ol className="task-comments-list" aria-label={`Comments for ${task.title}`}>
          {comments.map((comment) => (
            <TaskComment
              key={comment._id}
              comment={comment}
              currentUserId={currentUserId}
              isProjectOwner={isProjectOwner}
              updating={updatingCommentIds.has(comment._id)}
              deleting={deletingCommentIds.has(comment._id)}
              mutationError={mutationErrors[comment._id]}
              onUpdate={updateComment}
              onDelete={handleDelete}
            />
          ))}
        </ol>
      )}

      <form className="task-comment-form" onSubmit={handleSubmit}>
        <label htmlFor={`task-comment-content-${task._id}`}>Add comment</label>
        <textarea
          id={`task-comment-content-${task._id}`}
          rows={3}
          maxLength={5000}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Share an update or ask a question"
        />
        {createError && <Alert>{createError}</Alert>}
        <div className="task-comment-form__actions">
          <Button type="submit" disabled={creating}>
            {creating ? 'Posting...' : 'Post Comment'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default TaskCommentsPanel;
