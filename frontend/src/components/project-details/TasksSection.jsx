import { useState } from 'react';
import Alert from '../Alert';
import Button from '../Button';
import EmptyState from '../EmptyState';
import LoadingState from '../LoadingState';
import AITaskGenerator from './AITaskGenerator';
import KanbanBoard from './KanbanBoard';
import TaskCard from './TaskCard';
import TaskCommentsPanel from './TaskCommentsPanel';

const TasksSection = ({
  tasks,
  filteredTasks,
  members,
  isProjectOwner,
  tasksLoading,
  tasksError,
  filters,
  showTaskForm,
  createValues,
  creatingTask,
  taskFormError,
  editingTaskId,
  editValues,
  updatingTask,
  editTaskError,
  dependencyError,
  aiState,
  statusVariant,
  priorityVariant,
  formatLabel,
  onShowCreate,
  onFilterChange,
  onCreate,
  onCreateChange,
  onCancelCreate,
  onStartEdit,
  onDelete,
  onMoveTask,
  pendingTaskMoves,
  taskMoveError,
  taskMoveAnnouncement,
  onUpdate,
  onEditChange,
  onDependenciesChange,
  onCancelEdit,
  onGenerate,
}) => {
  const [viewMode, setViewMode] = useState('list');
  const [activeCommentsTask, setActiveCommentsTask] = useState(null);
  const taskFiltersActive = Boolean(
    filters.search.trim() || filters.status !== 'all' || filters.priority !== 'all',
  );
  const editFromBoard = (task) => {
    setViewMode('list');
    onStartEdit(task);
  };

  return (
    <section id="project-tasks" className="task-workspace workspace-section" aria-labelledby="tasks-heading">
    <div className="workspace-section__header task-workspace__header">
      <div>
        <p className="section-eyebrow">Execution</p>
        <h2 id="tasks-heading">Tasks</h2>
        <p>{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} in this project.</p>
      </div>
      <div className="task-workspace__header-actions">
        <div className="task-view-toggle" role="group" aria-label="Task view">
          <Button
            variant={viewMode === 'list' ? 'primary' : 'secondary'}
            aria-pressed={viewMode === 'list'}
            onClick={() => setViewMode('list')}
          >
            List
          </Button>
          <Button
            variant={viewMode === 'board' ? 'primary' : 'secondary'}
            aria-pressed={viewMode === 'board'}
            onClick={() => setViewMode('board')}
          >
            Board
          </Button>
        </div>
        <Button onClick={onShowCreate}>Create Task</Button>
      </div>
    </div>
    <AITaskGenerator {...aiState} onGenerate={onGenerate} />
    <div className="task-toolbar" aria-label="Task search, filters, and sorting">
      <div className="form-field task-toolbar__search">
        <label htmlFor="task-search">Search</label>
        <input id="task-search" type="text" value={filters.search} onChange={(event) => onFilterChange('search', event.target.value)} placeholder="Search by title or description" />
      </div>
      <div className="form-field">
        <label htmlFor="task-status-filter">Status</label>
        <select id="task-status-filter" value={filters.status} onChange={(event) => onFilterChange('status', event.target.value)}>
          <option value="all">All</option><option value="todo">Todo</option><option value="in_progress">In Progress</option><option value="completed">Completed</option>
        </select>
      </div>
      <div className="form-field">
        <label htmlFor="task-priority-filter">Priority</label>
        <select id="task-priority-filter" value={filters.priority} onChange={(event) => onFilterChange('priority', event.target.value)}>
          <option value="all">All</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
        </select>
      </div>
      <div className="form-field">
        <label htmlFor="task-sort">Sort</label>
        <select id="task-sort" value={filters.sort} onChange={(event) => onFilterChange('sort', event.target.value)}>
          <option value="created_desc">Newest First</option><option value="created_asc">Oldest First</option><option value="due_asc">Due Date: Earliest First</option><option value="due_desc">Due Date: Latest First</option><option value="priority_high">Priority: High to Low</option><option value="priority_low">Priority: Low to High</option>
        </select>
      </div>
    </div>
    {activeCommentsTask && (
      <TaskCommentsPanel
        key={activeCommentsTask._id}
        task={activeCommentsTask}
        onClose={() => setActiveCommentsTask(null)}
      />
    )}
    {viewMode === 'list' && (
      <div className="task-list-heading"><p className="section-eyebrow">Your tasks</p><span>{filteredTasks.length} shown</span></div>
    )}
    {tasksLoading && <LoadingState message="Loading tasks..." />}
    {tasksError && <Alert>{tasksError}</Alert>}
    {viewMode === 'list' && !tasksLoading && !tasksError && tasks.length === 0 && <EmptyState title="No tasks yet" description="Create a task or use AI task generation to start planning this project." />}
    {viewMode === 'list' && !tasksLoading && !tasksError && tasks.length > 0 && filteredTasks.length === 0 && <EmptyState title="No matching tasks" description="Try changing the search term or filters." />}
    {viewMode === 'list' && filteredTasks.map((task) => (
        <TaskCard
          key={task._id}
          task={task}
          tasks={tasks}
          members={members}
          isProjectOwner={isProjectOwner}
          editingTaskId={editingTaskId}
          editValues={editValues}
          updatingTask={updatingTask}
          editTaskError={editTaskError}
          dependencyError={dependencyError}
          statusVariant={statusVariant}
          priorityVariant={priorityVariant}
          formatLabel={formatLabel}
          onStartEdit={onStartEdit}
          onOpenComments={setActiveCommentsTask}
          onDelete={onDelete}
          onUpdate={onUpdate}
          onEditChange={onEditChange}
          onDependenciesChange={onDependenciesChange}
          onCancelEdit={onCancelEdit}
        />
    ))}
    {viewMode === 'board' && !tasksLoading && !tasksError && (
      <>
        {taskMoveError && <Alert className="task-move-alert">{taskMoveError}</Alert>}
        <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
          {taskMoveAnnouncement}
        </div>
        <KanbanBoard
          tasks={filteredTasks}
          isProjectOwner={isProjectOwner}
          priorityVariant={priorityVariant}
          formatLabel={formatLabel}
          pendingTaskMoves={pendingTaskMoves}
          filtersActive={taskFiltersActive}
          onEdit={editFromBoard}
          onOpenComments={setActiveCommentsTask}
          onDelete={onDelete}
          onMoveTask={onMoveTask}
        />
      </>
    )}
    {showTaskForm && (
      <form className="workspace-form task-create-form" onSubmit={onCreate}>
        <h3>Create Task</h3>
        <div><label htmlFor="task-title">Task Title</label><input id="task-title" type="text" value={createValues.title} onChange={(event) => onCreateChange('title', event.target.value)} placeholder="Enter task title" /></div>
        <div><label htmlFor="task-description">Description</label><textarea id="task-description" rows={4} value={createValues.description} onChange={(event) => onCreateChange('description', event.target.value)} placeholder="Enter task description" /></div>
        <div><label htmlFor="task-status">Status</label><select id="task-status" value={createValues.status} onChange={(event) => onCreateChange('status', event.target.value)}><option value="todo">Todo</option><option value="in_progress">In Progress</option><option value="completed">Completed</option></select></div>
        <div><label htmlFor="task-priority">Priority</label><select id="task-priority" value={createValues.priority} onChange={(event) => onCreateChange('priority', event.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
        <div><label htmlFor="task-due-date">Due Date</label><input id="task-due-date" type="date" value={createValues.dueDate} onChange={(event) => onCreateChange('dueDate', event.target.value)} /></div>
        <div><label htmlFor="task-assigned-to">Assign To</label><select id="task-assigned-to" value={createValues.assignedTo} onChange={(event) => onCreateChange('assignedTo', event.target.value)}><option value="">Unassigned</option>{members.map((member) => <option key={member._id} value={member._id}>{member.name} ({member.email})</option>)}</select></div>
        {taskFormError && <Alert>{taskFormError}</Alert>}
        <div className="form-actions task-form__actions">
          <Button type="button" variant="secondary" onClick={onCancelCreate}>Cancel</Button>
          <Button type="submit" disabled={creatingTask}>{creatingTask ? 'Creating...' : 'Create Task'}</Button>
        </div>
      </form>
    )}
    </section>
  );
};

export default TasksSection;
