export const formatLabel = (value) =>
  value
    ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
    : 'Unknown';

export const statusVariant = (status) => ({
  active: 'success',
  completed: 'success',
  in_progress: 'info',
  planning: 'info',
  todo: 'neutral',
}[status] || 'neutral');

export const priorityVariant = (priority) => ({
  high: 'danger',
  low: 'neutral',
  medium: 'warning',
}[priority] || 'neutral');

export const isProjectOwner = (project, user) => {
  const ownerId = project?.owner?._id || project?.owner;
  return Boolean(user?.id && ownerId && user.id.toString() === ownerId.toString());
};

export const normalizeDependencyIds = (dependencies = []) =>
  dependencies.map((dependency) =>
    dependency?._id ? dependency._id.toString() : dependency.toString()
  );

export const groupTasksByStatus = (tasks = []) => {
  const groups = {
    todo: [],
    in_progress: [],
    completed: [],
  };

  tasks.forEach((task) => {
    if (groups[task.status]) groups[task.status].push(task);
  });

  return groups;
};

export const filterAndSortTasks = (tasks, { search, status, priority, sort }) => {
  const searchTerm = search.trim().toLowerCase();
  const filteredTasks = tasks.filter((task) => {
    const matchesStatus = status === 'all' || task.status === status;
    const matchesPriority = priority === 'all' || task.priority === priority;
    const matchesSearch =
      !searchTerm ||
      task.title.toLowerCase().includes(searchTerm) ||
      (task.description || '').toLowerCase().includes(searchTerm);

    return matchesStatus && matchesPriority && matchesSearch;
  });

  const priorityOrder = { high: 3, medium: 2, low: 1 };

  return filteredTasks.sort((left, right) => {
    if (sort === 'created_asc') return new Date(left.createdAt) - new Date(right.createdAt);
    if (sort === 'created_desc') return new Date(right.createdAt) - new Date(left.createdAt);
    if (sort === 'due_asc' || sort === 'due_desc') {
      if (!left.dueDate) return 1;
      if (!right.dueDate) return -1;
      const difference = new Date(left.dueDate) - new Date(right.dueDate);
      return sort === 'due_asc' ? difference : -difference;
    }
    if (sort === 'priority_high') return priorityOrder[right.priority] - priorityOrder[left.priority];
    if (sort === 'priority_low') return priorityOrder[left.priority] - priorityOrder[right.priority];
    return 0;
  });
};
