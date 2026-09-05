import { DragDropProvider } from '@dnd-kit/react';
import { getKanbanMove, groupTasksByStatus } from '../../features/project-details/projectDetailsUtils';
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
  pendingTaskMoves = new Set(),
  filtersActive = false,
  onEdit,
  onDelete,
  onMoveTask,
}) => {
  const groupedTasks = groupTasksByStatus(tasks);
  const handleDragEnd = (event) => {
    const move = getKanbanMove(event);
    if (move) onMoveTask(move.taskId, move.nextStatus);
  };

  return (
    <DragDropProvider onDragEnd={handleDragEnd}>
      <div className="kanban-board" role="region" aria-label="Project task board">
        {columns.map(({ status, label }) => (
          <KanbanColumn
            key={status}
            status={status}
            label={label}
            tasks={groupedTasks[status]}
            isProjectOwner={isProjectOwner}
            priorityVariant={priorityVariant}
            formatLabel={formatLabel}
            pendingTaskMoves={pendingTaskMoves}
            emptyMessage={filtersActive ? 'No matching tasks.' : 'No tasks in this status.'}
            onEdit={onEdit}
            onDelete={onDelete}
            onMoveTask={onMoveTask}
          />
        ))}
      </div>
    </DragDropProvider>
  );
};

export default KanbanBoard;
