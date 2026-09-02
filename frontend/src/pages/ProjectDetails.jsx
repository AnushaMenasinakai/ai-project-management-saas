import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Alert from '../components/Alert';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import PageHeader from '../components/PageHeader';
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
    <button className="project-back-link" type="button" onClick={() => navigate('/projects')}>
      <span aria-hidden="true">←</span> Projects
    </button>
    <PageHeader
      eyebrow={isProjectOwner ? 'Owner workspace' : 'Shared workspace'}
      title={project.name}
      description={project.description || 'No description provided.'}
      actions={(
        <>
          <Badge variant={statusVariant(project.status)}>{formatLabel(project.status)}</Badge>
          {isProjectOwner && (
            <>
              <Button variant="secondary" onClick={() => {
                setName(project.name);
                setDescription(project.description || '');
                setStatus(project.status);
                setFormError('');
                setEditing(true);
              }}>
                Edit Project
              </Button>
              <Button variant="danger" onClick={handleDeleteProject} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete Project'}
              </Button>
            </>
          )}
        </>
      )}
    />
    {isProjectOwner && deleteError && <Alert>{deleteError}</Alert>}

    <Card id="project-members" className="workspace-section members-workspace" aria-labelledby="members-heading">
      <div className="workspace-section__header">
        <div><p className="section-eyebrow">Collaboration</p><h2 id="members-heading">Members</h2>
        <p>{members.length} {members.length === 1 ? 'member' : 'members'} can collaborate in this project.</p></div>
        {isProjectOwner && !showMemberForm && (
          <Button variant="secondary" onClick={() => { setShowMemberForm(true); setAddMemberError(''); }}>
            + Add member
          </Button>
        )}
      </div>

{isProjectOwner && showMemberForm && (
<form className="workspace-form member-form" onSubmit={handleAddMember}>
  <div className="member-form__heading"><h3>Add project member</h3><p>Add a registered user by email address.</p></div>
  <div className="form-field">
    <label htmlFor="member-email">Member Email</label>

    <input
      id="member-email"
      type="email"
      value={memberEmail}
      onChange={(event) => setMemberEmail(event.target.value)}
      placeholder="Enter member email"
    />
  </div>

  {addMemberError && <Alert>{addMemberError}</Alert>}

  <Button type="submit" disabled={addingMember}>
    {addingMember ? 'Adding...' : 'Add Member'}
  </Button>
  <Button type="button" variant="secondary" disabled={addingMember} onClick={() => { setShowMemberForm(false); setAddMemberError(''); }}>
    Cancel
  </Button>
</form>
)}

{isProjectOwner && removeMemberError && <Alert>{removeMemberError}</Alert>}

{membersLoading && <LoadingState message="Loading members..." />}

{membersError && <Alert>{membersError}</Alert>}

{!membersLoading && !membersError && members.length === 0 && (
  <EmptyState title="No members yet" description="Project members will appear here after the owner adds them." />
)}

{!membersLoading && !membersError && members.length > 0 && (
  <ul className="member-list">
    {members.map((member) => (
      <li className="member-row" key={member._id}>
        <span className="member-avatar" aria-hidden="true">{member.name?.charAt(0).toUpperCase() || '?'}</span>
        <span className="member-identity"><strong>{member.name}</strong><span>{member.email}</span></span>

        {isProjectOwner && (
          <Button
            type="button"
            variant="danger-secondary"
            onClick={() => handleRemoveMember(member._id)}
            disabled={removingMemberId === member._id}
          >
            {removingMemberId === member._id
              ? 'Removing...'
              : 'Remove'}
          </Button>
        )}
      </li>
    ))}
  </ul>
)}
    </Card>
    <Card id="project-documents" className="documents-section workspace-section" aria-labelledby="documents-heading">
      <div className="documents-section__header">
        <h2 id="documents-heading">Documents</h2>
        <p>Reference material for this project.</p>
      </div>

      {isProjectOwner && (
        <form className="document-form document-create-form" onSubmit={handleCreateDocument}>
          <div className="document-form__header"><p className="section-eyebrow">Create document</p><h3>Add project knowledge</h3><p>Create a text reference that the project can use.</p></div>

          <div className="document-field">
            <label htmlFor="document-title">Document title</label>
            <input
              id="document-title"
              type="text"
              value={documentTitle}
              onChange={(event) => setDocumentTitle(event.target.value)}
              placeholder="Enter document title"
            />
          </div>

          <div className="document-field">
            <label htmlFor="document-content">Document content</label>
            <textarea
              id="document-content"
              value={documentContent}
              onChange={(event) => setDocumentContent(event.target.value)}
              placeholder="Enter document content"
              rows={5}
            />
          </div>

          {createDocumentError && <Alert>{createDocumentError}</Alert>}

          <div className="document-actions">
            <Button type="submit" disabled={documentMutationInProgress}>
              {creatingDocument ? 'Creating...' : 'Create Document'}
            </Button>
          </div>
        </form>
      )}

      {documentsLoading && <p className="document-message">Loading documents...</p>}
      {documentsError && <Alert>{documentsError}</Alert>}
      {deleteDocumentError && (
        <Alert>{deleteDocumentError}</Alert>
      )}

      <div className="document-list-heading">
        <div><p className="section-eyebrow">Project documents</p><h3>Available reference material</h3></div>
        <span>{documents.length} {documents.length === 1 ? 'document' : 'documents'}</span>
      </div>

      {!documentsLoading && !documentsError && documents.length === 0 && (
        <p className="document-message">No documents yet.</p>
      )}

      {!documentsLoading && !documentsError && documents.length > 0 && (
        <ul className="document-list">
          {documents.map((document) => (
            <li className="document-card" key={document._id}>
              <div className="document-card__header">
                <div>
                  <h3 className="document-card__title">{document.title}</h3>
                  {document.sourceType && (
                    <Badge className="document-source">{formatLabel(document.sourceType)}</Badge>
                  )}
                  {document.content && <p className="document-card__preview">{document.content}</p>}
                </div>

                {isProjectOwner && (
                  <div className="document-actions">
                    {document.sourceType === 'text' && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setEditingDocumentId(document._id);
                          setEditDocumentTitle(document.title);
                          setEditDocumentContent(document.content || '');
                          setEditDocumentError('');
                        }}
                        disabled={documentMutationInProgress}
                      >
                        Edit
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="danger-secondary"
                      onClick={() => handleDeleteDocument(document._id)}
                      disabled={documentMutationInProgress}
                    >
                      {deletingDocumentId === document._id
                        ? 'Deleting...'
                        : 'Delete'}
                    </Button>
                  </div>
                )}
              </div>

              {isProjectOwner && editingDocumentId === document._id && (
                <form className="document-form document-edit-form" onSubmit={handleUpdateDocument}>
                  <h4>Editing “{document.title}”</h4>

                  <div className="document-field">
                    <label htmlFor={`edit-document-title-${document._id}`}>
                      Document title
                    </label>
                    <input
                      id={`edit-document-title-${document._id}`}
                      type="text"
                      value={editDocumentTitle}
                      onChange={(event) =>
                        setEditDocumentTitle(event.target.value)
                      }
                    />
                  </div>

                  <div className="document-field">
                    <label htmlFor={`edit-document-content-${document._id}`}>
                      Document content
                    </label>
                    <textarea
                      id={`edit-document-content-${document._id}`}
                      value={editDocumentContent}
                      onChange={(event) =>
                        setEditDocumentContent(event.target.value)
                      }
                      rows={8}
                    />
                  </div>

                  {editDocumentError && <Alert>{editDocumentError}</Alert>}

                  <div className="document-actions">
                    <Button type="submit" disabled={documentMutationInProgress}>
                      {savingDocument ? 'Saving...' : 'Save Changes'}
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={resetDocumentEdit}
                      disabled={savingDocument}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
    <Card id="project-qa" className="project-qa-section workspace-section" aria-labelledby="project-qa-heading">
      <div className="documents-section__header"><h2 id="project-qa-heading">Project Q&amp;A</h2><p>Ask questions using knowledge from this project's documents.</p></div>

      <form className="project-qa-form" onSubmit={handleAskProject}>
        <div className="project-qa-field">
          <label htmlFor="project-question">Ask a question</label>
          <textarea
            id="project-question"
            value={ragQuestion}
            onChange={(event) => setRagQuestion(event.target.value)}
            placeholder="Ask a question about the project documents"
            rows={3}
          />
        </div>

        {ragError && <Alert>{ragError}</Alert>}

        <Button type="submit" disabled={ragLoading}>
          {ragLoading ? 'Asking...' : 'Ask AI'}
        </Button>
      </form>

      {ragLoading && (
        <p className="project-qa-loading" role="status">
          Searching project documents and generating an answer...
        </p>
      )}

      {ragAnswer && (
        <div className="project-qa-answer" aria-live="polite">
          <p className="section-eyebrow">AI answer</p>
          <p>{ragAnswer}</p>
        </div>
      )}

      {ragSources.length > 0 && (
        <div className="project-qa-sources">
          <div className="project-qa-sources__header"><h3>Sources</h3><span>{ragSources.length} {ragSources.length === 1 ? 'source' : 'sources'}</span></div>
          <ul>
            {ragSources.map((source, index) => (
              <li key={source.chunkId || index}>
                <div className="project-qa-source__header">{source.title && <strong>{source.title}</strong>}
                {typeof source.score === 'number' && (
                  <span className="project-qa-source-score">
                    Relevance {(source.score * 100).toFixed(1)}%
                  </span>
                )}</div>
                {source.content && (
                  <p className="project-qa-source-content">{source.content}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
    <section id="project-tasks" className="task-workspace workspace-section" aria-labelledby="tasks-heading">
    <div className="workspace-section__header task-workspace__header">
      <div><p className="section-eyebrow">Execution</p><h2 id="tasks-heading">Tasks</h2>
      <p>{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} in this project.</p></div>
      <Button onClick={() => { setShowTaskForm(true); setTaskFormError(''); }}>
        Create Task
      </Button>
    </div>
    <section
      className="ai-task-generation"
      aria-labelledby="ai-task-generation-heading"
    >
      <h3 id="ai-task-generation-heading">AI Task Generation</h3>
      <p className="ai-task-generation__description">
        Generate a set of tasks from this project's name and description.
      </p>

      <button
        type="button"
        onClick={handleGenerateTasks}
        disabled={generatingTasks}
      >
        {generatingTasks ? 'Generating Tasks...' : 'Generate Tasks with AI'}
      </button>

      <p className="ai-task-generation__note">
        Running AI generation again will create another set of tasks.
      </p>

      {generatingTasks && (
        <p className="ai-task-generation__status" role="status">
          AI is generating and organizing tasks for this project...
        </p>
      )}
      {generateTasksError && <Alert>{generateTasksError}</Alert>}
      {generateTasksSuccess && (
        <p className="ai-task-generation__success alert alert--success" role="status">
          {generateTasksSuccess}
        </p>
      )}
    </section>
    <div className="task-toolbar" aria-label="Task search, filters, and sorting">
    <div className="form-field task-toolbar__search">
  <label htmlFor="task-search">Search</label>

  <input
    id="task-search"
    type="text"
    value={taskSearch}
    onChange={(event) => setTaskSearch(event.target.value)}
    placeholder="Search by title or description"
  />
</div>

    <div className="form-field">
  <label htmlFor="task-status-filter">Status</label>

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

<div className="form-field">
  <label htmlFor="task-priority-filter">Priority</label>

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

<div className="form-field">
  <label htmlFor="task-sort">Sort</label>

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
</div>

<div className="task-list-heading"><p className="section-eyebrow">Your tasks</p><span>{filteredTasks.length} shown</span></div>

{tasksLoading && <LoadingState message="Loading tasks..." />}

{tasksError && <Alert>{tasksError}</Alert>}

{!tasksLoading && !tasksError && tasks.length === 0 && (
  <EmptyState title="No tasks yet" description="Create a task or use AI task generation to start planning this project." />
)}
{!tasksLoading &&
  !tasksError &&
  tasks.length > 0 &&
  filteredTasks.length === 0 && (
    <EmptyState title="No matching tasks" description="Try changing the search term or filters." />
)}
  {filteredTasks.map((task) => (
  <Card as="article" className="task-card" key={task._id}>
    <div className="task-card__header"><h3>{task.title}</h3><div className="task-card__badges">
      <Badge variant={statusVariant(task.status)}>{formatLabel(task.status)}</Badge>
      <Badge variant={priorityVariant(task.priority)}>{formatLabel(task.priority)} priority</Badge>
    </div></div>

    <p className="task-card__description">
      {task.description || 'No description provided.'}
    </p>

    <dl className="task-card__metadata">
      <div><dt>Assigned to</dt><dd>{task.assignedTo?.name || 'Unassigned'}</dd></div>
      <div><dt>Due date</dt><dd>{task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No due date'}</dd></div>
    </dl>
    {task.dependencies && task.dependencies.length > 0 && (
  <div className="task-card__dependencies">
    <p>Dependencies</p>
    <ul className="dependency-chips">
      {task.dependencies.map((dependency) => (
        <li key={dependency._id || dependency}>
          {dependency.title || dependency}
        </li>
      ))}
    </ul>
  </div>
)}

    <div className="task-card__actions"><Button variant="secondary"
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
    </Button>

    {isProjectOwner && (
      <Button
        variant="danger-secondary"
        type="button"
        onClick={() => handleDeleteTask(task._id)}
      >
        Delete Task
      </Button>
    )}</div>

    {editingTaskId === task._id && (
      <form className="workspace-form task-edit-form" onSubmit={handleUpdateTask}>
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
            rows={4}
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

        <div className="task-form__dependencies">
  <label htmlFor="edit-task-dependencies">
    Dependencies
  </label>

  <select
    id="edit-task-dependencies"
    multiple
    size={3}
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
  <small className="form-help">Hold Ctrl or Command to select more than one dependency.</small>
</div>

{dependencyError && <Alert>{dependencyError}</Alert>}

        {editTaskError && <Alert>{editTaskError}</Alert>}

        <div className="form-actions task-form__actions">
        <Button type="button" variant="secondary" onClick={() => {
  setEditingTaskId(null);
  setEditTaskError('');
  setDependencyError('');
  setEditTaskDependencies([]);
  setEditTaskAssignedTo('');
}}>
          Cancel
        </Button>
        <Button type="submit" disabled={updatingTask}>
          {updatingTask ? 'Updating...' : 'Update Task'}
        </Button>
        </div>
      </form>
    )}
  </Card>
))}

{showTaskForm && (
  <form className="workspace-form task-create-form" onSubmit={handleCreateTask}>
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
        rows={4}
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

    {taskFormError && <Alert>{taskFormError}</Alert>}

    <div className="form-actions task-form__actions">
    <Button type="button" variant="secondary" onClick={() => {
        setShowTaskForm(false);
        setTaskFormError('');
      }}>
      Cancel
    </Button>
    <Button type="submit" disabled={creatingTask}>
      {creatingTask ? 'Creating...' : 'Create Task'}
    </Button>
    </div>
  </form>
)}
    </section>
  </div>
);
};

export default ProjectDetails;
