import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Alert from '../components/Alert';
import Button from '../components/Button';
import Card from '../components/Card';
import LoadingState from '../components/LoadingState';
import PageHeader from '../components/PageHeader';
import DocumentsSection from '../components/project-details/DocumentsSection';
import MembersSection from '../components/project-details/MembersSection';
import ProjectHeader from '../components/project-details/ProjectHeader';
import ProjectQASection from '../components/project-details/ProjectQASection';
import TasksSection from '../components/project-details/TasksSection';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const formatLabel = (value) =>
  value ? value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Unknown';

const statusVariant = (status) => ({
  active: 'success',
  completed: 'success',
  in_progress: 'info',
  planning: 'info',
  todo: 'neutral',
}[status] || 'neutral');

const priorityVariant = (priority) => ({
  high: 'danger',
  low: 'neutral',
  medium: 'warning',
}[priority] || 'neutral');

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('all');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState('all');
  const [taskSort, setTaskSort] = useState('created_desc');
  const [taskSearch, setTaskSearch] = useState('');
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [generateTasksError, setGenerateTasksError] = useState('');
  const [generateTasksSuccess, setGenerateTasksSuccess] = useState('');
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
  const [memberEmail, setMemberEmail] = useState('');
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState('');
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [removeMemberError, setRemoveMemberError] = useState('');
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentsError, setDocumentsError] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  const [creatingDocument, setCreatingDocument] = useState(false);
  const [createDocumentError, setCreateDocumentError] = useState('');
  const [editingDocumentId, setEditingDocumentId] = useState(null);
  const [editDocumentTitle, setEditDocumentTitle] = useState('');
  const [editDocumentContent, setEditDocumentContent] = useState('');
  const [savingDocument, setSavingDocument] = useState(false);
  const [editDocumentError, setEditDocumentError] = useState('');
  const [deletingDocumentId, setDeletingDocumentId] = useState(null);
  const [deleteDocumentError, setDeleteDocumentError] = useState('');
  const [ragQuestion, setRagQuestion] = useState('');
  const [ragAnswer, setRagAnswer] = useState('');
  const [ragSources, setRagSources] = useState([]);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragError, setRagError] = useState('');

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
  dueDate: editTaskDueDate || null,
  assignedTo: editTaskAssignedTo || null,
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

const handleGenerateTasks = async () => {
  if (generatingTasks) {
    return;
  }

  try {
    setGeneratingTasks(true);
    setGenerateTasksError('');
    setGenerateTasksSuccess('');

    const response = await api.post(`/projects/${id}/ai/generate-tasks`);
    const generatedTaskCount = Array.isArray(response.data.tasks)
      ? response.data.tasks.length
      : 0;

    await fetchTasks();

    setGenerateTasksSuccess(
      generatedTaskCount > 0
        ? `${generatedTaskCount} AI tasks generated successfully.`
        : 'AI tasks generated successfully.'
    );
  } catch (err) {
    console.error('Generate AI tasks error:', err);

    setGenerateTasksSuccess('');
    setGenerateTasksError(
      err.response?.data?.message || 'Failed to generate AI tasks.'
    );
  } finally {
    setGeneratingTasks(false);
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

const fetchDocuments = useCallback(async () => {
  try {
    setDocumentsLoading(true);
    setDocumentsError('');

    const response = await api.get(`/documents/project/${id}`);

    setDocuments(response.data.documents);
  } catch (err) {
    console.error('Fetch documents error:', err);

    setDocumentsError(
      err.response?.data?.message || 'Failed to load documents.'
    );
  } finally {
    setDocumentsLoading(false);
  }
}, [id]);

const handleCreateDocument = async (event) => {
  event.preventDefault();

  setCreateDocumentError('');

  if (!documentTitle.trim()) {
    setCreateDocumentError('Document title is required.');
    return;
  }

  if (!documentContent.trim()) {
    setCreateDocumentError('Document content is required.');
    return;
  }

  try {
    setCreatingDocument(true);

    await api.post('/documents', {
      title: documentTitle.trim(),
      content: documentContent.trim(),
      project: id,
      sourceType: 'text',
    });

    setDocumentTitle('');
    setDocumentContent('');

    await fetchDocuments();
  } catch (err) {
    console.error('Create document error:', err);

    setCreateDocumentError(
      err.response?.data?.message || 'Failed to create document.'
    );
  } finally {
    setCreatingDocument(false);
  }
};

const resetDocumentEdit = () => {
  setEditingDocumentId(null);
  setEditDocumentTitle('');
  setEditDocumentContent('');
  setEditDocumentError('');
};

const handleUpdateDocument = async (event) => {
  event.preventDefault();

  setEditDocumentError('');

  if (!editDocumentTitle.trim()) {
    setEditDocumentError('Document title is required.');
    return;
  }

  if (!editDocumentContent.trim()) {
    setEditDocumentError('Document content is required.');
    return;
  }

  const currentDocument = documents.find(
    (document) => document._id === editingDocumentId
  );
  const updates = {};

  if (editDocumentTitle.trim() !== currentDocument?.title) {
    updates.title = editDocumentTitle.trim();
  }

  if (editDocumentContent.trim() !== currentDocument?.content) {
    updates.content = editDocumentContent.trim();
  }

  if (Object.keys(updates).length === 0) {
    resetDocumentEdit();
    return;
  }

  try {
    setSavingDocument(true);

    await api.patch(`/documents/${editingDocumentId}`, updates);

    resetDocumentEdit();

    await fetchDocuments();
  } catch (err) {
    console.error('Update document error:', err);

    setEditDocumentError(
      err.response?.data?.message || 'Failed to update document.'
    );
  } finally {
    setSavingDocument(false);
  }
};

const handleDeleteDocument = async (documentId) => {
  if (deletingDocumentId) {
    return;
  }

  const confirmed = window.confirm(
    'Are you sure you want to delete this document? This action cannot be undone.'
  );

  if (!confirmed) {
    return;
  }

  try {
    setDeletingDocumentId(documentId);
    setDeleteDocumentError('');

    await api.delete(`/documents/${documentId}`);

    if (editingDocumentId === documentId) {
      resetDocumentEdit();
    }

    await fetchDocuments();
  } catch (err) {
    console.error('Delete document error:', err);

    setDeleteDocumentError(
      err.response?.data?.message || 'Failed to delete document.'
    );
  } finally {
    setDeletingDocumentId(null);
  }
};

const handleAskProject = async (event) => {
  event.preventDefault();

  if (ragLoading) {
    return;
  }

  const trimmedQuestion = ragQuestion.trim();

  if (!trimmedQuestion) {
    setRagError('Please enter a question.');
    return;
  }

  try {
    setRagLoading(true);
    setRagError('');
    setRagAnswer('');
    setRagSources([]);

    const response = await api.post(`/projects/${id}/ask`, {
      question: trimmedQuestion,
    });

    setRagAnswer(response.data.answer);
    setRagSources(
      Array.isArray(response.data.sources) ? response.data.sources : []
    );
  } catch (err) {
    console.error('Ask project error:', err);

    setRagAnswer('');
    setRagSources([]);
    setRagError(
      err.response?.data?.message || 'Failed to generate an answer.'
    );
  } finally {
    setRagLoading(false);
  }
};

const handleAddMember = async (event) => {
  event.preventDefault();

  setAddMemberError('');

  if (!memberEmail.trim()) {
    setAddMemberError('Member email is required.');
    return;
  }

  try {
    setAddingMember(true);

    await api.post(`/projects/${id}/members`, {
      email: memberEmail.trim(),
    });

    setMemberEmail('');

    await fetchMembers();
    setShowMemberForm(false);
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
    fetchDocuments();
  }, [id, fetchDocuments]);

  if (loading) {
    return <LoadingState message="Loading project workspace..." />;
  }

  if (error) {
    return (
      <div className="page project-workspace">
        <PageHeader eyebrow="Project workspace" title="Project unavailable" />
        <Alert>{error}</Alert>
        <Button variant="secondary" onClick={() => navigate('/projects')}>
          Return to Projects
        </Button>
      </div>
    );
  }
  const projectOwnerId = project?.owner?._id || project?.owner;
  const isProjectOwner = Boolean(
    user?.id &&
    projectOwnerId &&
    user.id.toString() === projectOwnerId.toString()
  );
  const documentMutationInProgress =
    creatingDocument || savingDocument || deletingDocumentId !== null;
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


  if (editing && isProjectOwner) {
  return (
    <div className="page project-workspace">
      <PageHeader
        eyebrow="Project settings"
        title={`Edit ${project.name}`}
        description="Update the project details shown to everyone in this workspace."
      />

      <Card className="workspace-form-card project-edit-card">
      <form className="workspace-form" onSubmit={handleUpdateProject}>
        <div className="form-field form-field--wide">
          <label htmlFor="project-name">Project Name</label>

          <input
            id="project-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="form-field form-field--wide">
          <label htmlFor="project-description">Description</label>

          <textarea
            id="project-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="form-field">
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

        {formError && <Alert className="form-field--wide">{formError}</Alert>}

        <div className="form-actions form-field--wide">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setEditing(false);
            setFormError('');
          }}
        >
          Cancel
        </Button>
        </div>
      </form>
      </Card>
    </div>
  );
}

return (
  <div className="page project-workspace">
    <ProjectHeader
      project={project}
      isProjectOwner={isProjectOwner}
      deleting={deleting}
      deleteError={deleteError}
      statusVariant={statusVariant}
      formatLabel={formatLabel}
      onBack={() => navigate('/projects')}
      onEdit={() => {
        setName(project.name);
        setDescription(project.description || '');
        setStatus(project.status);
        setFormError('');
        setEditing(true);
      }}
      onDelete={handleDeleteProject}
    />
    <MembersSection
      members={members}
      isProjectOwner={isProjectOwner}
      showMemberForm={showMemberForm}
      memberEmail={memberEmail}
      addingMember={addingMember}
      addMemberError={addMemberError}
      removingMemberId={removingMemberId}
      removeMemberError={removeMemberError}
      membersLoading={membersLoading}
      membersError={membersError}
      onShowForm={() => { setShowMemberForm(true); setAddMemberError(''); }}
      onHideForm={() => { setShowMemberForm(false); setAddMemberError(''); }}
      onEmailChange={(event) => setMemberEmail(event.target.value)}
      onAddMember={handleAddMember}
      onRemoveMember={handleRemoveMember}
    />
    <DocumentsSection
      documents={documents}
      isProjectOwner={isProjectOwner}
      loading={documentsLoading}
      error={documentsError}
      deleteError={deleteDocumentError}
      documentTitle={documentTitle}
      documentContent={documentContent}
      creatingDocument={creatingDocument}
      createError={createDocumentError}
      mutationInProgress={documentMutationInProgress}
      editingDocumentId={editingDocumentId}
      editTitle={editDocumentTitle}
      editContent={editDocumentContent}
      savingDocument={savingDocument}
      deletingDocumentId={deletingDocumentId}
      editError={editDocumentError}
      formatLabel={formatLabel}
      onCreate={handleCreateDocument}
      onCreateTitleChange={(event) => setDocumentTitle(event.target.value)}
      onCreateContentChange={(event) => setDocumentContent(event.target.value)}
      onStartEdit={(document) => {
        setEditingDocumentId(document._id);
        setEditDocumentTitle(document.title);
        setEditDocumentContent(document.content || '');
        setEditDocumentError('');
      }}
      onEditTitleChange={(event) => setEditDocumentTitle(event.target.value)}
      onEditContentChange={(event) => setEditDocumentContent(event.target.value)}
      onUpdate={handleUpdateDocument}
      onCancelEdit={resetDocumentEdit}
      onDelete={handleDeleteDocument}
    />
    <ProjectQASection
      question={ragQuestion}
      answer={ragAnswer}
      sources={ragSources}
      loading={ragLoading}
      error={ragError}
      onQuestionChange={(event) => setRagQuestion(event.target.value)}
      onSubmit={handleAskProject}
    />
    <TasksSection
      tasks={tasks}
      filteredTasks={filteredTasks}
      members={members}
      isProjectOwner={isProjectOwner}
      tasksLoading={tasksLoading}
      tasksError={tasksError}
      filters={{ search: taskSearch, status: taskStatusFilter, priority: taskPriorityFilter, sort: taskSort }}
      showTaskForm={showTaskForm}
      createValues={{ title: taskTitle, description: taskDescription, status: taskStatus, priority: taskPriority, dueDate: taskDueDate, assignedTo: taskAssignedTo }}
      creatingTask={creatingTask}
      taskFormError={taskFormError}
      editingTaskId={editingTaskId}
      editValues={{ title: editTaskTitle, description: editTaskDescription, status: editTaskStatus, priority: editTaskPriority, dueDate: editTaskDueDate, assignedTo: editTaskAssignedTo, dependencies: editTaskDependencies }}
      updatingTask={updatingTask}
      editTaskError={editTaskError}
      dependencyError={dependencyError}
      aiState={{ generatingTasks, generateTasksError, generateTasksSuccess }}
      statusVariant={statusVariant}
      priorityVariant={priorityVariant}
      formatLabel={formatLabel}
      onShowCreate={() => { setShowTaskForm(true); setTaskFormError(''); }}
      onFilterChange={(field, value) => {
        if (field === 'search') setTaskSearch(value);
        if (field === 'status') setTaskStatusFilter(value);
        if (field === 'priority') setTaskPriorityFilter(value);
        if (field === 'sort') setTaskSort(value);
      }}
      onCreate={handleCreateTask}
      onCreateChange={(field, value) => {
        if (field === 'title') setTaskTitle(value);
        if (field === 'description') setTaskDescription(value);
        if (field === 'status') setTaskStatus(value);
        if (field === 'priority') setTaskPriority(value);
        if (field === 'dueDate') setTaskDueDate(value);
        if (field === 'assignedTo') setTaskAssignedTo(value);
      }}
      onCancelCreate={() => { setShowTaskForm(false); setTaskFormError(''); }}
      onStartEdit={(task) => {
        setEditingTaskId(task._id);
        setEditTaskTitle(task.title);
        setEditTaskDescription(task.description || '');
        setEditTaskStatus(task.status);
        setEditTaskPriority(task.priority);
        setEditTaskDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
        setEditTaskAssignedTo(task.assignedTo?._id || task.assignedTo || '');
        setEditTaskDependencies((task.dependencies || []).map((dependency) =>
          dependency._id ? dependency._id.toString() : dependency.toString()
        ));
        setEditTaskError('');
        setDependencyError('');
      }}
      onDelete={handleDeleteTask}
      onUpdate={handleUpdateTask}
      onEditChange={(field, value) => {
        if (field === 'title') setEditTaskTitle(value);
        if (field === 'description') setEditTaskDescription(value);
        if (field === 'status') setEditTaskStatus(value);
        if (field === 'priority') setEditTaskPriority(value);
        if (field === 'dueDate') setEditTaskDueDate(value);
        if (field === 'assignedTo') setEditTaskAssignedTo(value);
      }}
      onDependenciesChange={setEditTaskDependencies}
      onCancelEdit={() => {
        setEditingTaskId(null);
        setEditTaskError('');
        setDependencyError('');
        setEditTaskDependencies([]);
        setEditTaskAssignedTo('');
      }}
      onGenerate={handleGenerateTasks}
    />
  </div>
);
};

export default ProjectDetails;
