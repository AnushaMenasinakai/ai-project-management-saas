import Alert from '../Alert';
import Badge from '../Badge';
import Button from '../Button';
import Card from '../Card';

const TaskCard = ({
  task,
  tasks,
  members,
  isProjectOwner,
  editingTaskId,
  editValues,
  updatingTask,
  editTaskError,
  dependencyError,
  statusVariant,
  priorityVariant,
  formatLabel,
  onStartEdit,
  onOpenComments,
  onDelete,
  onUpdate,
  onEditChange,
  onDependenciesChange,
  onCancelEdit,
}) => (
  <Card as="article" className="task-card">
    <div className="task-card__header">
      <h3>{task.title}</h3>
      <div className="task-card__badges">
        <Badge variant={statusVariant(task.status)}>{formatLabel(task.status)}</Badge>
        <Badge variant={priorityVariant(task.priority)}>{formatLabel(task.priority)} priority</Badge>
      </div>
    </div>
    <p className="task-card__description">{task.description || 'No description provided.'}</p>
    <dl className="task-card__metadata">
      <div><dt>Assigned to</dt><dd>{task.assignedTo?.name || 'Unassigned'}</dd></div>
      <div>
        <dt>Due date</dt>
        <dd>{task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No due date'}</dd>
      </div>
    </dl>
    {task.dependencies && task.dependencies.length > 0 && (
      <div className="task-card__dependencies">
        <p>Dependencies</p>
        <ul className="dependency-chips">
          {task.dependencies.map((dependency) => (
            <li key={dependency._id || dependency}>{dependency.title || dependency}</li>
          ))}
        </ul>
      </div>
    )}
    <div className="task-card__actions">
      <Button
        variant="secondary"
        type="button"
        aria-label={`View comments for ${task.title}`}
        onClick={() => onOpenComments(task)}
      >
        Comments
      </Button>
      <Button variant="secondary" type="button" onClick={() => onStartEdit(task)}>Edit Task</Button>
      {isProjectOwner && (
        <Button variant="danger-secondary" type="button" onClick={() => onDelete(task._id)}>Delete Task</Button>
      )}
    </div>
    {editingTaskId === task._id && (
      <form className="workspace-form task-edit-form" onSubmit={onUpdate}>
        <h3>Edit Task</h3>
        <div>
          <label htmlFor="edit-task-title">Task Title</label>
          <input id="edit-task-title" type="text" value={editValues.title} onChange={(event) => onEditChange('title', event.target.value)} />
        </div>
        <div>
          <label htmlFor="edit-task-description">Description</label>
          <textarea id="edit-task-description" rows={4} value={editValues.description} onChange={(event) => onEditChange('description', event.target.value)} />
        </div>
        <div>
          <label htmlFor="edit-task-status">Status</label>
          <select id="edit-task-status" value={editValues.status} onChange={(event) => onEditChange('status', event.target.value)}>
            <option value="todo">Todo</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div>
          <label htmlFor="edit-task-priority">Priority</label>
          <select id="edit-task-priority" value={editValues.priority} onChange={(event) => onEditChange('priority', event.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div>
          <label htmlFor="edit-task-due-date">Due Date</label>
          <input id="edit-task-due-date" type="date" value={editValues.dueDate} onChange={(event) => onEditChange('dueDate', event.target.value)} />
        </div>
        <div>
          <label htmlFor="edit-task-assigned-to">Assign To</label>
          <select id="edit-task-assigned-to" value={editValues.assignedTo} onChange={(event) => onEditChange('assignedTo', event.target.value)}>
            <option value="">Unassigned</option>
            {members.map((member) => <option key={member._id} value={member._id}>{member.name} ({member.email})</option>)}
          </select>
        </div>
        <div className="task-form__dependencies">
          <label htmlFor="edit-task-dependencies">Dependencies</label>
          <select
            id="edit-task-dependencies"
            multiple
            size={3}
            value={editValues.dependencies}
            onChange={(event) => onDependenciesChange(Array.from(event.target.selectedOptions, (option) => option.value))}
          >
            {tasks.filter((availableTask) => availableTask._id !== editingTaskId).map((availableTask) => (
              <option key={availableTask._id} value={availableTask._id}>{availableTask.title}</option>
            ))}
          </select>
          <small className="form-help">Hold Ctrl or Command to select more than one dependency.</small>
        </div>
        {dependencyError && <Alert>{dependencyError}</Alert>}
        {editTaskError && <Alert>{editTaskError}</Alert>}
        <div className="form-actions task-form__actions">
          <Button type="button" variant="secondary" onClick={onCancelEdit}>Cancel</Button>
          <Button type="submit" disabled={updatingTask}>{updatingTask ? 'Updating...' : 'Update Task'}</Button>
        </div>
      </form>
    )}
  </Card>
);

export default TaskCard;
