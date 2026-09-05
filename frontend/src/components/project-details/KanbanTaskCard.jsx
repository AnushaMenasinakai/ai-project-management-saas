import Badge from '../Badge';
import Button from '../Button';
import Card from '../Card';

const KanbanTaskCard = ({
  task,
  isProjectOwner,
  priorityVariant,
  formatLabel,
  onEdit,
  onDelete,
}) => (
  <Card as="article" className="kanban-task-card">
    <div className="kanban-task-card__header">
      <h4>{task.title}</h4>
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
      <Button variant="secondary" onClick={() => onEdit(task)}>Edit</Button>
      {isProjectOwner && (
        <Button variant="danger-secondary" onClick={() => onDelete(task._id)}>Delete</Button>
      )}
    </div>
  </Card>
);

export default KanbanTaskCard;
