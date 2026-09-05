import { groupTasksByStatus } from '../../features/project-details/projectDetailsUtils';
import KanbanColumn from './KanbanColumn';

const columns = [
  { status: 'todo', label: 'To Do' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'completed', label: 'Completed' },
];

const KanbanBoard = ({
  tasks,
  isProjectOwner,
  priorityVariant,
  formatLabel,
  onEdit,
  onDelete,
}) => {
  const groupedTasks = groupTasksByStatus(tasks);

  return (
    <div className="kanban-board" aria-label="Project task board">
      {columns.map(({ status, label }) => (
        <KanbanColumn
          key={status}
          label={label}
          tasks={groupedTasks[status]}
          isProjectOwner={isProjectOwner}
          priorityVariant={priorityVariant}
          formatLabel={formatLabel}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

export default KanbanBoard;
