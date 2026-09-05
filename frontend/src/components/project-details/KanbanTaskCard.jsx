import { useDraggable } from '@dnd-kit/react';
import Badge from '../Badge';
import Button from '../Button';
import Card from '../Card';

const KanbanTaskCard = ({
  task,
  isProjectOwner,
  priorityVariant,
  formatLabel,
  isPending,
  onEdit,
  onDelete,
}) => {
  const { ref, handleRef, isDragging } = useDraggable({
    id: task._id,
    data: { taskId: task._id, status: task.status },
    type: 'kanban-task',
    disabled: isPending,
  });

  return (
  <Card
    ref={ref}
    as="article"
    className={`kanban-task-card${isDragging ? ' kanban-task-card--dragging' : ''}${isPending ? ' kanban-task-card--pending' : ''}`}
    aria-busy={isPending || undefined}
  >
    <div className="kanban-task-card__header">
      <div className="kanban-task-card__title-row">
        <h4>{task.title}</h4>
        <button
          ref={handleRef}
          type="button"
          className="kanban-task-card__drag-handle"
          aria-label={`Move ${task.title}`}
          title={`Move ${task.title}`}
          disabled={isPending}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="6" cy="5" r="1.4" />
            <circle cx="14" cy="5" r="1.4" />
            <circle cx="6" cy="10" r="1.4" />
            <circle cx="14" cy="10" r="1.4" />
            <circle cx="6" cy="15" r="1.4" />
            <circle cx="14" cy="15" r="1.4" />
          </svg>
        </button>
      </div>
      <Badge variant={priorityVariant(task.priority)}>
        {formatLabel(task.priority)} priority
      </Badge>
    </div>

    {task.description && <p className="kanban-task-card__description">{task.description}</p>}

    <dl className="kanban-task-card__metadata">
      <div>
        <dt>Assigned to</dt>
        <dd>{task.assignedTo?.name || 'Unassigned'}</dd>
      </div>
      {task.dueDate && (
        <div>
          <dt>Due date</dt>
          <dd>
            {new Date(task.dueDate).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </dd>
        </div>
      )}
    </dl>

    {task.dependencies?.length > 0 && (
      <p className="kanban-task-card__dependency-count">
        {task.dependencies.length} {task.dependencies.length === 1 ? 'dependency' : 'dependencies'}
      </p>
    )}

    <div className="kanban-task-card__actions">
      <Button variant="secondary" disabled={isPending} onClick={() => onEdit(task)}>Edit</Button>
      {isProjectOwner && (
        <Button variant="danger-secondary" disabled={isPending} onClick={() => onDelete(task._id)}>Delete</Button>
      )}
    </div>
  </Card>
  );
};

export default KanbanTaskCard;
