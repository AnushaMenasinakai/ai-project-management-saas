import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import TasksSection from '../components/project-details/TasksSection';

const tasks = [
  { _id: 'todo-1', title: 'Plan release', status: 'todo', priority: 'high', dependencies: [] },
  { _id: 'progress-1', title: 'Build feature', status: 'in_progress', priority: 'medium', dependencies: [{ _id: 'todo-1', title: 'Plan release' }] },
  { _id: 'done-1', title: 'Review scope', status: 'completed', priority: 'low', dependencies: [] },
];

const renderTasks = ({
  filteredTasks = tasks,
  isProjectOwner = true,
} = {}) => render(
  <TasksSection
    tasks={tasks}
    filteredTasks={filteredTasks}
    members={[]}
    isProjectOwner={isProjectOwner}
    tasksLoading={false}
    tasksError=""
    filters={{ search: '', status: 'all', priority: 'all', sort: 'created_desc' }}
    showTaskForm={false}
    createValues={{ title: '', description: '', status: 'todo', priority: 'medium', dueDate: '', assignedTo: '' }}
    creatingTask={false}
    taskFormError=""
    editingTaskId={null}
    editValues={{ title: '', description: '', status: 'todo', priority: 'medium', dueDate: '', assignedTo: '', dependencies: [] }}
    updatingTask={false}
    editTaskError=""
    dependencyError=""
    aiState={{ generatingTasks: false, generateTasksError: '', generateTasksSuccess: '' }}
    statusVariant={() => 'neutral'}
    priorityVariant={() => 'neutral'}
    formatLabel={(value) => value}
    onShowCreate={vi.fn()}
    onFilterChange={vi.fn()}
    onCreate={vi.fn()}
    onCreateChange={vi.fn()}
    onCancelCreate={vi.fn()}
    onStartEdit={vi.fn()}
    onDelete={vi.fn()}
    onUpdate={vi.fn()}
    onEditChange={vi.fn()}
    onDependenciesChange={vi.fn()}
    onCancelEdit={vi.fn()}
    onGenerate={vi.fn()}
  />
);

describe('Kanban board foundation', () => {
  test('defaults to List and can switch to all three board columns and back', () => {
    renderTasks();

    expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('button', { name: 'Edit Task' })).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: 'Board' }));

    expect(screen.getByRole('region', { name: 'To Do' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'In Progress' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Completed' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'To Do' })).getByText('Plan release')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'In Progress' })).getByText('Build feature')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Completed' })).getByText('Review scope')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(screen.getAllByRole('button', { name: 'Edit Task' })).toHaveLength(3);
  });

  test('renders the already filtered collection while keeping empty columns visible', () => {
    renderTasks({ filteredTasks: [tasks[1]] });
    fireEvent.click(screen.getByRole('button', { name: 'Board' }));

    expect(screen.queryByText('Plan release')).not.toBeInTheDocument();
    expect(screen.getByText('Build feature')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'To Do' })).getByText('No visible tasks')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Completed' })).getByText('No visible tasks')).toBeInTheDocument();
  });

  test('shows Edit and Delete actions to the project owner', () => {
    renderTasks({ filteredTasks: [tasks[0]] });
    fireEvent.click(screen.getByRole('button', { name: 'Board' }));

    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  test('keeps Edit visible while hiding Delete from project members', () => {
    renderTasks({ filteredTasks: [tasks[0]], isProjectOwner: false });
    fireEvent.click(screen.getByRole('button', { name: 'Board' }));

    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });
});
