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

const TaskComment = ({ comment }) => (
  <li className="task-comment">
    <div className="task-comment__header">
      <strong>{comment.author?.name || 'Unknown user'}</strong>
      <span>
        {formatCommentTimestamp(comment.createdAt)}
        {wasMeaningfullyEdited(comment) && ' · Edited'}
      </span>
    </div>
    <p>{comment.content}</p>
  </li>
);

export default TaskComment;
