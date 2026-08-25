import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('planning');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskStatus, setTaskStatus] = useState('todo');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskFormError, setTaskFormError] = useState(''); 
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDescription, setEditTaskDescription] = useState('');
  const [editTaskStatus, setEditTaskStatus] = useState('todo');
  const [editTaskPriority, setEditTaskPriority] = useState('medium');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [updatingTask, setUpdatingTask] = useState(false);
  const [editTaskError, setEditTaskError] = useState(''); 
  const [editTaskDependencies, setEditTaskDependencies] = useState([]);
  const [dependencyError, setDependencyError] = useState('');

  const handleUpdateProject = async (event) => {
  event.preventDefault();

  setFormError('');

  if (!name.trim()) {
    setFormError('Project name is required.');
    return;
  }

  try {
    setSaving(true);

    const response = await api.patch(`/projects/${id}`, {
      name: name.trim(),
      description: description.trim(),
      status,
    });

    setProject(response.data.project);
    setEditing(false);
  } catch (err) {
    console.error('Update project error:', err);

    setFormError(
      err.response?.data?.message || 'Failed to update project.'
    );
  } finally {
    setSaving(false);
  }
};
  
const handleDeleteProject = async () => {
  const confirmed = window.confirm(
    'Are you sure you want to delete this project? This action cannot be undone.'
  );

  if (!confirmed) {
    return;
  }

  try {
    setDeleting(true);
    setDeleteError('');

    await api.delete(`/projects/${id}`);

    navigate('/projects');
  } catch (err) {
    console.error('Delete project error:', err);

    setDeleteError(
      err.response?.data?.message || 'Failed to delete project.'
    );
  } finally {
    setDeleting(false);
  }
};

const handleCreateTask = async (event) => {
  event.preventDefault();

  setTaskFormError('');

  if (!taskTitle.trim()) {
    setTaskFormError('Task title is required.');
    return;
  }

  try {
    setCreatingTask(true);

    await api.post('/tasks', {
      title: taskTitle.trim(),
      description: taskDescription.trim(),
      project: id,
      status: taskStatus,
      priority: taskPriority,
      dueDate: taskDueDate || undefined,
    });

    setTaskTitle('');
    setTaskDescription('');
    setTaskStatus('todo');
    setTaskPriority('medium');
    setTaskDueDate('');
    setCreatingTask(false);
    setShowTaskForm(false);

    await fetchTasks();
  } catch (err) {
    console.error('Create task error:', err);

    setTaskFormError(
      err.response?.data?.message || 'Failed to create task.'
    );

    setCreatingTask(false);
  }
};
 
const handleUpdateTask = async (event) => {
  event.preventDefault();
  
  

  setEditTaskError('');

  if (!editTaskTitle.trim()) {
    setEditTaskError('Task title is required.');
    return;
  }

  try {
    setUpdatingTask(true);

    await api.patch(`/tasks/${editingTaskId}`, {
  title: editTaskTitle.trim(),
  description: editTaskDescription.trim(),
  status: editTaskStatus,
  priority: editTaskPriority,
  dueDate: editTaskDueDate || undefined,
  dependencies: editTaskDependencies,
});

    setEditingTaskId(null);
    setUpdatingTask(false);

    await fetchTasks();
  } catch (err) {
    console.error('Update task error:', err);

    setEditTaskError(
      err.response?.data?.message || 'Failed to update task.'
    );

    setUpdatingTask(false);
  }
};

const handleDeleteTask = async (taskId) => {
  const confirmed = window.confirm(
    'Are you sure you want to delete this task? This action cannot be undone.'
  );

  if (!confirmed) {
    return;
  }

  try {
    await api.delete(`/tasks/${taskId}`);
    await fetchTasks();
  } catch (err) {
    console.error('Delete task error:', err);

    setTasksError(
      err.response?.data?.message || 'Failed to delete task.'
    );
  }
};

 const fetchTasks = async () => {
  try {
    setTasksLoading(true);
    setTasksError('');

    const response = await api.get(`/tasks/project/${id}`);

    setTasks(response.data.tasks);
  } catch (err) {
    console.error('Fetch tasks error:', err);

    setTasksError(
      err.response?.data?.message || 'Failed to load tasks.'
    );
  } finally {
    setTasksLoading(false);
  }
};

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await api.get(`/projects/${id}`);
        setProject(response.data.project);
      } catch (err) {
        console.error('Fetch project error:', err);

        setError(
          err.response?.data?.message || 'Failed to load project.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
    fetchTasks();
  }, [id]);

  if (loading) {
    return <p>Loading project...</p>;
  }

  if (error) {
    return (
      <div>
        <p>{error}</p>
        {deleteError && <p>{deleteError}</p>}

<button
  type="button"
  onClick={handleDeleteProject}
  disabled={deleting}
>
  {deleting ? 'Deleting...' : 'Delete Project'}
</button>


        <button type="button" onClick={() => navigate('/projects')}>
          Back to Projects
        </button>
      </div>
    );
  }

  if (editing) {
  return (
    <div>
      <h1>Edit Project</h1>

      <form onSubmit={handleUpdateProject}>
        <div>
          <label htmlFor="project-name">Project Name</label>

          <input
            id="project-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="project-description">Description</label>

          <textarea
            id="project-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="project-status">Status</label>

          <select
            id="project-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {formError && <p>{formError}</p>}

        <button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setFormError('');
          }}
        >
          Cancel
        </button>
      </form>
    </div>
  );
}

return (
  <div>
    <h1>{project.name}</h1>

    <p>{project.description || 'No description provided.'}</p>

    <p>Status: {project.status}</p>
    <h2>Tasks</h2>

{tasksLoading && <p>Loading tasks...</p>}

{tasksError && <p>{tasksError}</p>}

{!tasksLoading && !tasksError && tasks.length === 0 && (
  <p>No tasks yet.</p>
)}

{tasks.map((task) => (
  <div key={task._id}>
    <h3>{task.title}</h3>

    <p>
      {task.description || 'No description provided.'}
    </p>

    <p>Status: {task.status}</p>
    <p>Priority: {task.priority}</p>
    {task.dependencies && task.dependencies.length > 0 && (
  <div>
    <p>Dependencies:</p>

    <ul>
      {task.dependencies.map((dependency) => (
        <li key={dependency._id || dependency}>
          {dependency.title || dependency}
        </li>
      ))}
    </ul>
  </div>
)}

    {task.dueDate && (
      <p>
        Due: {new Date(task.dueDate).toLocaleDateString()}
      </p>
    )}

    <button
      type="button"
      onClick={() => {
  setEditingTaskId(task._id);
  setEditTaskTitle(task.title);
  setEditTaskDescription(task.description || '');
  setEditTaskStatus(task.status);
  setEditTaskPriority(task.priority);

  setEditTaskDueDate(
    task.dueDate
      ? new Date(task.dueDate).toISOString().split('T')[0]
      : ''
  );

  setEditTaskDependencies(
    (task.dependencies || []).map((dependency) =>
      dependency._id ? dependency._id.toString() : dependency.toString()
    )
  );

  setEditTaskError('');
  setDependencyError('');
}}
    >
      Edit Task
    </button>

    <button
  type="button"
  onClick={() => handleDeleteTask(task._id)}
  >
  Delete Task
  </button>

    {editingTaskId === task._id && (
      <form onSubmit={handleUpdateTask}>
        <h3>Edit Task</h3>

        <div>
          <label htmlFor="edit-task-title">Task Title</label>

          <input
            id="edit-task-title"
            type="text"
            value={editTaskTitle}
            onChange={(event) =>
              setEditTaskTitle(event.target.value)
            }
          />
        </div>

        <div>
          <label htmlFor="edit-task-description">
            Description
          </label>

          <textarea
            id="edit-task-description"
            value={editTaskDescription}
            onChange={(event) =>
              setEditTaskDescription(event.target.value)
            }
          />
        </div>

        <div>
          <label htmlFor="edit-task-status">Status</label>

          <select
            id="edit-task-status"
            value={editTaskStatus}
            onChange={(event) =>
              setEditTaskStatus(event.target.value)
            }
          >
            <option value="todo">Todo</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div>
          <label htmlFor="edit-task-priority">
            Priority
          </label>

          <select
            id="edit-task-priority"
            value={editTaskPriority}
            onChange={(event) =>
              setEditTaskPriority(event.target.value)
            }
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div>
          <label htmlFor="edit-task-due-date">
            Due Date
          </label>

          <input
            id="edit-task-due-date"
            type="date"
            value={editTaskDueDate}
            onChange={(event) =>
              setEditTaskDueDate(event.target.value)
            }
          />
        </div>

        <div>
  <label htmlFor="edit-task-dependencies">
    Dependencies
  </label>

  <select
    id="edit-task-dependencies"
    multiple
    value={editTaskDependencies}
    onChange={(event) => {
      const selectedDependencies = Array.from(
        event.target.selectedOptions,
        (option) => option.value
      );

      setEditTaskDependencies(selectedDependencies);
    }}
  >
    {tasks
      .filter((availableTask) => availableTask._id !== editingTaskId)
      .map((availableTask) => (
        <option key={availableTask._id} value={availableTask._id}>
          {availableTask.title}
        </option>
      ))}
  </select>
</div>

{dependencyError && <p>{dependencyError}</p>}

        {editTaskError && <p>{editTaskError}</p>}

        <button type="submit" disabled={updatingTask}>
          {updatingTask ? 'Updating...' : 'Update Task'}
        </button>

        <button
          type="button"
          onClick={() => {
  setEditingTaskId(null);
  setEditTaskError('');
  setDependencyError('');
  setEditTaskDependencies([]);
}}
        >
          Cancel
        </button>
      </form>
    )}
  </div>
))}

    {deleteError && <p>{deleteError}</p>}

    <button
      type="button"
      onClick={() => {
        setName(project.name);
        setDescription(project.description || '');
        setStatus(project.status);
        setFormError('');
        setEditing(true);
      }}
    >
      Edit Project
    </button>

   <button
  type="button"
  onClick={() => {
    setShowTaskForm(true);
    setTaskFormError('');
  }}
>
  Create Task
</button>

{showTaskForm && (
  <form onSubmit={handleCreateTask}>
    <h3>Create Task</h3>

    <div>
      <label htmlFor="task-title">Task Title</label>

      <input
        id="task-title"
        type="text"
        value={taskTitle}
        onChange={(event) => setTaskTitle(event.target.value)}
        placeholder="Enter task title"
      />
    </div>

    <div>
      <label htmlFor="task-description">Description</label>

      <textarea
        id="task-description"
        value={taskDescription}
        onChange={(event) => setTaskDescription(event.target.value)}
        placeholder="Enter task description"
      />
    </div>

    <div>
      <label htmlFor="task-status">Status</label>

      <select
        id="task-status"
        value={taskStatus}
        onChange={(event) => setTaskStatus(event.target.value)}
      >
        <option value="todo">Todo</option>
        <option value="in_progress">In Progress</option>
        <option value="completed">Completed</option>
      </select>
    </div>

    <div>
      <label htmlFor="task-priority">Priority</label>

      <select
        id="task-priority"
        value={taskPriority}
        onChange={(event) => setTaskPriority(event.target.value)}
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
    </div>

    <div>
      <label htmlFor="task-due-date">Due Date</label>

      <input
        id="task-due-date"
        type="date"
        value={taskDueDate}
        onChange={(event) => setTaskDueDate(event.target.value)}
      />
    </div>

    {taskFormError && <p>{taskFormError}</p>}

    <button type="submit" disabled={creatingTask}>
      {creatingTask ? 'Creating...' : 'Create Task'}
    </button>

    <button
      type="button"
      onClick={() => {
        setShowTaskForm(false);
        setTaskFormError('');
      }}
    >
      Cancel
    </button>
  </form>
)}

    <button
      type="button"
      onClick={handleDeleteProject}
      disabled={deleting}
    >
      {deleting ? 'Deleting...' : 'Delete Project'}
    </button>

    <button
      type="button"
      onClick={() => navigate('/projects')}
    >
      Back to Projects
    </button>
  </div>
);
};

export default ProjectDetails;