import { useDroppable } from '@dnd-kit/react';
import KanbanTaskCard from './KanbanTaskCard';

const KanbanColumn = ({
  status,
  label,
  tasks,
  isProjectOwner,
  priorityVariant,
  formatLabel,
  pendingTaskMoves,
  emptyMessage,
  onEdit,
  onOpenComments,
  onDelete,
  onMoveTask,
}) => {
  const { ref, isDropTarget } = useDroppable({
    id: `kanban-column-${status}`,
    data: { status },
    type: 'kanban-column',
    accept: 'kanban-task',
  });
  const headingId = `kanban-${label.toLowerCase().replaceAll(' ', '-')}`;

  return (
    <section
      ref={ref}
      className={`kanban-column${isDropTarget ? ' kanban-column--drop-target' : ''}`}
      aria-labelledby={headingId}
    >
      <div className="kanban-column__header">
        <h3 id={headingId}>{label}</h3>
        <span aria-label={`${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`}>
          {tasks.length}
        </span>
      </div>

      {isDropTarget && <p className="kanban-column__drop-hint">Drop task here</p>}

      <div className="kanban-column__tasks">
        {tasks.length === 0 && <p className="kanban-column__empty">{emptyMessage}</p>}
        {tasks.map((task) => (
          <KanbanTaskCard
            key={task._id}
            task={task}
            isProjectOwner={isProjectOwner}
            priorityVariant={priorityVariant}
            formatLabel={formatLabel}
            isPending={pendingTaskMoves.has(task._id)}
            onEdit={onEdit}
            onOpenComments={onOpenComments}
            onDelete={onDelete}
            onMoveTask={onMoveTask}
          />
        ))}
      </div>
    </section>
  );
};

export default KanbanColumn;
