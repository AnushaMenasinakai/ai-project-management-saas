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
  const [taskStatusFilter, setTaskStatusFilter] = useState('all');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState('all');
  const [taskSort, setTaskSort] = useState('created_desc');
  const [taskSearch, setTaskSearch] = useState('');
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
  const [taskAssignedTo, setTaskAssignedTo] = useState('');
  const [taskFormError, setTaskFormError] = useState(''); 
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDescription, setEditTaskDescription] = useState('');
  const [editTaskStatus, setEditTaskStatus] = useState('todo');
  const [editTaskPriority, setEditTaskPriority] = useState('medium');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [editTaskAssignedTo, setEditTaskAssignedTo] = useState('');
  const [updatingTask, setUpdatingTask] = useState(false);
  const [editTaskError, setEditTaskError] = useState(''); 
  const [editTaskDependencies, setEditTaskDependencies] = useState([]);
  const [dependencyError, setDependencyError] = useState('');
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState('');
  const [memberUserId, setMemberUserId] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState('');
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [removeMemberError, setRemoveMemberError] = useState('');

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
  assignedTo: taskAssignedTo || undefined,
});

    setTaskTitle('');
    setTaskDescription('');
    setTaskStatus('todo');
    setTaskPriority('medium');
    setTaskDueDate('');
    setTaskAssignedTo('');
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
  assignedTo: editTaskAssignedTo || undefined,
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



const fetchMembers = async () => {
  try {
    setMembersLoading(true);
    setMembersError('');

    const response = await api.get(`/projects/${id}/members`);

    setMembers(response.data.members);
  } catch (err) {
    console.error('Fetch members error:', err);

    setMembersError(
      err.response?.data?.message || 'Failed to load project members.'
    );
  } finally {
    setMembersLoading(false);
  }
};

const handleAddMember = async (event) => {
  event.preventDefault();

  setAddMemberError('');

  if (!memberUserId.trim()) {
    setAddMemberError('User ID is required.');
    return;
  }

  try {
    setAddingMember(true);

    await api.post(`/projects/${id}/members`, {
      userId: memberUserId.trim(),
    });

    setMemberUserId('');

    await fetchMembers();
  } catch (err) {
    console.error('Add member error:', err);

    setAddMemberError(
      err.response?.data?.message || 'Failed to add member.'
    );
  } finally {
    setAddingMember(false);
  }
};

const handleRemoveMember = async (userId) => {
  const confirmed = window.confirm(
    'Are you sure you want to remove this member from the project?'
  );

  if (!confirmed) {
    return;
  }

  try {
    setRemovingMemberId(userId);
    setRemoveMemberError('');

    await api.delete(`/projects/${id}/members/${userId}`);

    await fetchMembers();
  } catch (err) {
    console.error('Remove member error:', err);

    setRemoveMemberError(
      err.response?.data?.message || 'Failed to remove member.'
    );
  } finally {
    setRemovingMemberId(null);
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
    fetchMembers();
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
  const filteredTasks = tasks
  .filter((task) => {
    const matchesStatus =
      taskStatusFilter === 'all' ||
      task.status === taskStatusFilter;

    const matchesPriority =
      taskPriorityFilter === 'all' ||
      task.priority === taskPriorityFilter;

    const searchTerm = taskSearch.trim().toLowerCase();

    const matchesSearch =
      !searchTerm ||
      task.title.toLowerCase().includes(searchTerm) ||
      (task.description || '').toLowerCase().includes(searchTerm);

    return matchesStatus && matchesPriority && matchesSearch;
  })
  .sort((a, b) => {
    if (taskSort === 'created_asc') {
      return new Date(a.createdAt) - new Date(b.createdAt);
    }

    if (taskSort === 'created_desc') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }

    if (taskSort === 'due_asc') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;

      return new Date(a.dueDate) - new Date(b.dueDate);
    }

    if (taskSort === 'due_desc') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;

      return new Date(b.dueDate) - new Date(a.dueDate);
    }

    if (taskSort === 'priority_high') {
      const priorityOrder = {
        high: 3,
        medium: 2,
        low: 1,
      };

      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }

    if (taskSort === 'priority_low') {
      const priorityOrder = {
        low: 1,
        medium: 2,
        high: 3,
      };

      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }

    return 0;
  });


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
   <h2>Members</h2>

<form onSubmit={handleAddMember}>
  <div>
    <label htmlFor="member-user-id">User ID</label>

    <input
      id="member-user-id"
      type="text"
      value={memberUserId}
      onChange={(event) => setMemberUserId(event.target.value)}
      placeholder="Enter user ID"
    />
  </div>

  {addMemberError && <p>{addMemberError}</p>}

  <button type="submit" disabled={addingMember}>
    {addingMember ? 'Adding...' : 'Add Member'}
  </button>
</form>

{removeMemberError && <p>{removeMemberError}</p>}

{membersLoading && <p>Loading members...</p>}

{membersError && <p>{membersError}</p>}

{!membersLoading && !membersError && members.length === 0 && (
  <p>No members yet.</p>
)}

{!membersLoading && !membersError && members.length > 0 && (
  <ul>
    {members.map((member) => (
      <li key={member._id}>
        <strong>{member.name}</strong> — {member.email}

        <button
          type="button"
          onClick={() => handleRemoveMember(member._id)}
          disabled={removingMemberId === member._id}
        >
          {removingMemberId === member._id
            ? 'Removing...'
            : 'Remove'}
        </button>
      </li>
    ))}
  </ul>
)}
    <h2>Tasks</h2>
    <div>
  <label htmlFor="task-search">Search Tasks: </label>

  <input
    id="task-search"
    type="text"
    value={taskSearch}
    onChange={(event) => setTaskSearch(event.target.value)}
    placeholder="Search by title or description"
  />
</div>

    <div>
  <label htmlFor="task-status-filter">Filter by Status: </label>

  <select
    id="task-status-filter"
    value={taskStatusFilter}
    onChange={(event) => setTaskStatusFilter(event.target.value)}
  >
    <option value="all">All</option>
    <option value="todo">Todo</option>
    <option value="in_progress">In Progress</option>
    <option value="completed">Completed</option>
  </select>
</div>

<div>
  <label htmlFor="task-priority-filter">Filter by Priority: </label>

  <select
    id="task-priority-filter"
    value={taskPriorityFilter}
    onChange={(event) => setTaskPriorityFilter(event.target.value)}
  >
    <option value="all">All</option>
    <option value="low">Low</option>
    <option value="medium">Medium</option>
    <option value="high">High</option>
  </select>
</div>

<div>
  <label htmlFor="task-sort">Sort By: </label>

  <select
    id="task-sort"
    value={taskSort}
    onChange={(event) => setTaskSort(event.target.value)}
  >
    <option value="created_desc">Newest First</option>
    <option value="created_asc">Oldest First</option>
    <option value="due_asc">Due Date: Earliest First</option>
    <option value="due_desc">Due Date: Latest First</option>
    <option value="priority_high">Priority: High to Low</option>
    <option value="priority_low">Priority: Low to High</option>
  </select>
</div>

{tasksLoading && <p>Loading tasks...</p>}

{tasksError && <p>{tasksError}</p>}

{!tasksLoading && !tasksError && tasks.length === 0 && (
  <p>No tasks yet.</p>
)}
{!tasksLoading &&
  !tasksError &&
  tasks.length > 0 &&
  filteredTasks.length === 0 && (
    <p>No tasks match your current search and filters.</p>
)}
  {filteredTasks.map((task) => (
  <div key={task._id}>
    <h3>{task.title}</h3>

    <p>
      {task.description || 'No description provided.'}
    </p>

    <p>Status: {task.status}</p>
    <p>Priority: {task.priority}</p>
    <p>
  Assigned To:{' '}
  {task.assignedTo?.name || 'Unassigned'}
</p>
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
  setEditTaskAssignedTo(
  task.assignedTo?._id || task.assignedTo || ''
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
  <label htmlFor="edit-task-assigned-to">
    Assign To
  </label>

  <select
    id="edit-task-assigned-to"
    value={editTaskAssignedTo}
    onChange={(event) =>
      setEditTaskAssignedTo(event.target.value)
    }
  >
    <option value="">Unassigned</option>

    {members.map((member) => (
      <option key={member._id} value={member._id}>
        {member.name} ({member.email})
      </option>
    ))}
  </select>
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
  setEditTaskAssignedTo('');
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

    <div>
  <label htmlFor="task-assigned-to">Assign To</label>

  <select
    id="task-assigned-to"
    value={taskAssignedTo}
    onChange={(event) => setTaskAssignedTo(event.target.value)}
  >
    <option value="">Unassigned</option>

    {members.map((member) => (
      <option key={member._id} value={member._id}>
        {member.name} ({member.email})
      </option>
    ))}
  </select>
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