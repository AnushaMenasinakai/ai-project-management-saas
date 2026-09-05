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
  onEdit,
  onDelete,
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

      <div className="kanban-column__tasks">
        {tasks.length === 0 && <p className="kanban-column__empty">No visible tasks</p>}
        {tasks.map((task) => (
          <KanbanTaskCard
            key={task._id}
            task={task}
            isProjectOwner={isProjectOwner}
            priorityVariant={priorityVariant}
            formatLabel={formatLabel}
            isPending={pendingTaskMoves.has(task._id)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
};

export default KanbanColumn;
