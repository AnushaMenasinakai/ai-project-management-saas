import { useCallback, useEffect, useRef, useState } from 'react';
import { filterAndSortTasks, normalizeDependencyIds } from '../features/project-details/projectDetailsUtils';
import api from '../services/api';

const TASK_STATUSES = new Set(['todo', 'in_progress', 'completed']);

const useProjectTasks = (projectId) => {
  const [resource, setResource] = useState({ projectId: null, tasks: [], error: '' });
  const [filters, setFilters] = useState({ search: '', status: 'all', priority: 'all', sort: 'created_desc' });
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskFormError, setTaskFormError] = useState('');
  const [createValues, setCreateValues] = useState({ title: '', description: '', status: 'todo', priority: 'medium', dueDate: '', assignedTo: '' });
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [updatingTask, setUpdatingTask] = useState(false);
  const [editTaskError, setEditTaskError] = useState('');
  const [dependencyError, setDependencyError] = useState('');
  const [editValues, setEditValues] = useState({ title: '', description: '', status: 'todo', priority: 'medium', dueDate: '', assignedTo: '', dependencies: [] });
  const [pendingTaskMoves, setPendingTaskMoves] = useState(() => new Set());
  const [taskMoveError, setTaskMoveError] = useState('');
  const pendingTaskMovesRef = useRef(new Set());

  const refreshTasks = useCallback(async () => {
    setResource((current) => ({ ...current, projectId, error: '', loading: true }));
    try {
      const response = await api.get(`/tasks/project/${projectId}`);
      setResource({ projectId, tasks: response.data.tasks, error: '', loading: false });
      return response.data.tasks;
    } catch (error) {
      console.error('Fetch tasks error:', error);
      setResource((current) => ({
        projectId,
        tasks: current.projectId === projectId ? current.tasks : [],
        error: error.response?.data?.message || 'Failed to load tasks.',
        loading: false,
      }));
      return null;
    }
  }, [projectId]);

  useEffect(() => {
    let active = true;
    api.get(`/tasks/project/${projectId}`)
      .then((response) => {
        if (active) setResource({ projectId, tasks: response.data.tasks, error: '', loading: false });
      })
      .catch((error) => {
        console.error('Fetch tasks error:', error);
        if (active) {
          setResource((current) => ({
            projectId,
            tasks: current.projectId === projectId ? current.tasks : [],
            error: error.response?.data?.message || 'Failed to load tasks.',
            loading: false,
          }));
        }
      });
    return () => { active = false; };
  }, [projectId]);

  const setFilter = (field, value) => setFilters((current) => ({ ...current, [field]: value }));
  const setCreateValue = (field, value) => setCreateValues((current) => ({ ...current, [field]: value }));
  const setEditValue = (field, value) => setEditValues((current) => ({ ...current, [field]: value }));

  const showCreateTask = () => {
    setShowTaskForm(true);
    setTaskFormError('');
  };
  const cancelCreateTask = () => {
    setShowTaskForm(false);
    setTaskFormError('');
  };
  const startTaskEdit = (task) => {
    setEditingTaskId(task._id);
    setEditValues({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      assignedTo: task.assignedTo?._id || task.assignedTo || '',
      dependencies: normalizeDependencyIds(task.dependencies),
    });
    setEditTaskError('');
    setDependencyError('');
  };
  const cancelTaskEdit = () => {
    setEditingTaskId(null);
    setEditTaskError('');
    setDependencyError('');
    setEditValues((current) => ({ ...current, assignedTo: '', dependencies: [] }));
  };

  const createTask = async (event) => {
    event.preventDefault();
    setTaskFormError('');
    if (!createValues.title.trim()) {
      setTaskFormError('Task title is required.');
      return;
    }
    try {
      setCreatingTask(true);
      await api.post('/tasks', {
        title: createValues.title.trim(),
        description: createValues.description.trim(),
        project: projectId,
        status: createValues.status,
        priority: createValues.priority,
        dueDate: createValues.dueDate || undefined,
        assignedTo: createValues.assignedTo || undefined,
      });
      setCreateValues({ title: '', description: '', status: 'todo', priority: 'medium', dueDate: '', assignedTo: '' });
      setCreatingTask(false);
      setShowTaskForm(false);
      await refreshTasks();
    } catch (error) {
      console.error('Create task error:', error);
      setTaskFormError(error.response?.data?.message || 'Failed to create task.');
      setCreatingTask(false);
    }
  };

  const updateTask = async (event) => {
    event.preventDefault();
    setEditTaskError('');
    if (!editValues.title.trim()) {
      setEditTaskError('Task title is required.');
      return;
    }
    try {
      setUpdatingTask(true);
      await api.patch(`/tasks/${editingTaskId}`, {
        title: editValues.title.trim(),
        description: editValues.description.trim(),
        status: editValues.status,
        priority: editValues.priority,
        dueDate: editValues.dueDate || null,
        assignedTo: editValues.assignedTo || null,
        dependencies: editValues.dependencies,
      });
      setEditingTaskId(null);
      setUpdatingTask(false);
      await refreshTasks();
    } catch (error) {
      console.error('Update task error:', error);
      setEditTaskError(error.response?.data?.message || 'Failed to update task.');
      setUpdatingTask(false);
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      await refreshTasks();
    } catch (error) {
      console.error('Delete task error:', error);
      setResource((current) => ({
        ...current,
        error: error.response?.data?.message || 'Failed to delete task.',
      }));
    }
  };

  const updateTaskStatus = async (taskId, nextStatus) => {
    const currentTasks = resource.projectId === projectId ? resource.tasks : [];
    const task = currentTasks.find((item) => item._id === taskId);

    if (!TASK_STATUSES.has(nextStatus) || !task || task.status === nextStatus) {
      return false;
    }

    if (pendingTaskMovesRef.current.has(taskId)) {
      return false;
    }

    pendingTaskMovesRef.current.add(taskId);
    setPendingTaskMoves(new Set(pendingTaskMovesRef.current));
    setTaskMoveError('');

    try {
      await api.patch(`/tasks/${taskId}`, { status: nextStatus });
      setResource((current) => ({
        ...current,
        tasks: current.projectId === projectId
          ? current.tasks.map((item) => (
            item._id === taskId ? { ...item, status: nextStatus } : item
          ))
          : current.tasks,
      }));

      const refreshedTasks = await refreshTasks();
      if (refreshedTasks === null) {
        setTaskMoveError('Task status was updated, but the latest task details could not be refreshed.');
      }

      return true;
    } catch (error) {
      console.error('Update task status error:', error);
      setTaskMoveError(error.response?.data?.message || 'Failed to move task.');
      return false;
    } finally {
      pendingTaskMovesRef.current.delete(taskId);
      setPendingTaskMoves(new Set(pendingTaskMovesRef.current));
    }
  };

  const tasks = resource.projectId === projectId ? resource.tasks : [];
  const tasksLoading = resource.projectId !== projectId || resource.loading === true;

  return {
    tasks,
    filteredTasks: filterAndSortTasks(tasks, filters),
    tasksLoading,
    tasksError: resource.projectId === projectId ? resource.error : '',
    filters,
    setFilter,
    showTaskForm,
    creatingTask,
    taskFormError,
    createValues,
    setCreateValue,
    editingTaskId,
    updatingTask,
    editTaskError,
    dependencyError,
    editValues,
    setEditValue,
    setEditDependencies: (dependencies) => setEditValue('dependencies', dependencies),
    showCreateTask,
    cancelCreateTask,
    startTaskEdit,
    cancelTaskEdit,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    pendingTaskMoves,
    taskMoveError,
    refreshTasks,
  };
};

export default useProjectTasks;
