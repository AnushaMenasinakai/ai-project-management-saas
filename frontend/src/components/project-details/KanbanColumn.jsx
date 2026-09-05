import KanbanTaskCard from './KanbanTaskCard';

const KanbanColumn = ({
  label,
  tasks,
  isProjectOwner,
  priorityVariant,
  formatLabel,
  onEdit,
  onDelete,
}) => (
  <section className="kanban-column" aria-labelledby={`kanban-${label.toLowerCase().replaceAll(' ', '-')}`}>
    <div className="kanban-column__header">
      <h3 id={`kanban-${label.toLowerCase().replaceAll(' ', '-')}`}>{label}</h3>
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
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  </section>
);

export default KanbanColumn;
