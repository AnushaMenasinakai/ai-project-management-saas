import { useState } from 'react';
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
import {
  formatLabel,
  isProjectOwner as checkProjectOwner,
  priorityVariant,
  statusVariant,
} from '../features/project-details/projectDetailsUtils';
import useProject from '../hooks/useProject';
import useProjectDocuments from '../hooks/useProjectDocuments';
import useProjectMembers from '../hooks/useProjectMembers';
import useProjectQA from '../hooks/useProjectQA';
import useProjectTasks from '../hooks/useProjectTasks';
import api from '../services/api';

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    project,
    loading,
    error,
    editing,
    editValues: projectEditValues,
    setEditValue: setProjectEditValue,
    saving,
    formError,
    deleting,
    deleteError,
    startEditing: startProjectEditing,
    cancelEditing: cancelProjectEditing,
    updateProject,
    deleteProject,
  } = useProject(id, () => navigate('/projects'));

  const {
    members,
    membersLoading,
    membersError,
    memberEmail,
    setMemberEmail,
    showMemberForm,
    addingMember,
    addMemberError,
    removingMemberId,
    removeMemberError,
    addMember,
    removeMember,
    showAddMemberForm,
    hideAddMemberForm,
  } = useProjectMembers(id);

  const {
    tasks,
    filteredTasks,
    tasksLoading,
    tasksError,
    filters: taskFilters,
    setFilter: setTaskFilter,
    showTaskForm,
    creatingTask,
    taskFormError,
    createValues: taskCreateValues,
    setCreateValue: setTaskCreateValue,
    editingTaskId,
    updatingTask,
    editTaskError,
    dependencyError,
    editValues: taskEditValues,
    setEditValue: setTaskEditValue,
    setEditDependencies,
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
    taskMoveAnnouncement,
    refreshTasks,
  } = useProjectTasks(id);

  const {
    documents,
    documentsLoading,
    documentsError,
    documentTitle,
    setDocumentTitle,
    documentContent,
    setDocumentContent,
    creatingDocument,
    createDocumentError,
    editingDocumentId,
    editDocumentTitle,
    setEditDocumentTitle,
    editDocumentContent,
    setEditDocumentContent,
    savingDocument,
    editDocumentError,
    deletingDocumentId,
    deleteDocumentError,
    documentMutationInProgress,
    createDocument,
    updateDocument,
    deleteDocument,
    startDocumentEdit,
    resetDocumentEdit,
  } = useProjectDocuments(id);

  const {
    question: ragQuestion,
    setQuestion: setRagQuestion,
    answer: ragAnswer,
    sources: ragSources,
    loading: ragLoading,
    error: ragError,
    askProject,
  } = useProjectQA(id);

  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [generateTasksError, setGenerateTasksError] = useState('');
  const [generateTasksSuccess, setGenerateTasksSuccess] = useState('');

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

    await refreshTasks();

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
  const isProjectOwner = checkProjectOwner(project, user);

  if (editing && isProjectOwner) {
  return (
    <div className="page project-workspace">
      <PageHeader
        eyebrow="Project settings"
        title={`Edit ${project.name}`}
        description="Update the project details shown to everyone in this workspace."
      />

      <Card className="workspace-form-card project-edit-card">
      <form className="workspace-form" onSubmit={updateProject}>
        <div className="form-field form-field--wide">
          <label htmlFor="project-name">Project Name</label>

          <input
            id="project-name"
            type="text"
            value={projectEditValues.name}
            onChange={(event) => setProjectEditValue('name', event.target.value)}
          />
        </div>

        <div className="form-field form-field--wide">
          <label htmlFor="project-description">Description</label>

          <textarea
            id="project-description"
            value={projectEditValues.description}
            onChange={(event) => setProjectEditValue('description', event.target.value)}
          />
        </div>

        <div className="form-field">
          <label htmlFor="project-status">Status</label>

          <select
            id="project-status"
            value={projectEditValues.status}
            onChange={(event) => setProjectEditValue('status', event.target.value)}
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
          onClick={cancelProjectEditing}
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
      onEdit={startProjectEditing}
      onDelete={deleteProject}
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
      onShowForm={showAddMemberForm}
      onHideForm={hideAddMemberForm}
      onEmailChange={(event) => setMemberEmail(event.target.value)}
      onAddMember={addMember}
      onRemoveMember={removeMember}
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
      onCreate={createDocument}
      onCreateTitleChange={(event) => setDocumentTitle(event.target.value)}
      onCreateContentChange={(event) => setDocumentContent(event.target.value)}
      onStartEdit={startDocumentEdit}
      onEditTitleChange={(event) => setEditDocumentTitle(event.target.value)}
      onEditContentChange={(event) => setEditDocumentContent(event.target.value)}
      onUpdate={updateDocument}
      onCancelEdit={resetDocumentEdit}
      onDelete={deleteDocument}
    />
    <ProjectQASection
      question={ragQuestion}
      answer={ragAnswer}
      sources={ragSources}
      loading={ragLoading}
      error={ragError}
      onQuestionChange={(event) => setRagQuestion(event.target.value)}
      onSubmit={askProject}
    />
    <TasksSection
      tasks={tasks}
      filteredTasks={filteredTasks}
      members={members}
      isProjectOwner={isProjectOwner}
      tasksLoading={tasksLoading}
      tasksError={tasksError}
      filters={taskFilters}
      showTaskForm={showTaskForm}
      createValues={taskCreateValues}
      creatingTask={creatingTask}
      taskFormError={taskFormError}
      editingTaskId={editingTaskId}
      editValues={taskEditValues}
      updatingTask={updatingTask}
      editTaskError={editTaskError}
      dependencyError={dependencyError}
      aiState={{ generatingTasks, generateTasksError, generateTasksSuccess }}
      statusVariant={statusVariant}
      priorityVariant={priorityVariant}
      formatLabel={formatLabel}
      onShowCreate={showCreateTask}
      onFilterChange={setTaskFilter}
      onCreate={createTask}
      onCreateChange={setTaskCreateValue}
      onCancelCreate={cancelCreateTask}
      onStartEdit={startTaskEdit}
      onDelete={deleteTask}
      onMoveTask={updateTaskStatus}
      pendingTaskMoves={pendingTaskMoves}
      taskMoveError={taskMoveError}
      taskMoveAnnouncement={taskMoveAnnouncement}
      onUpdate={updateTask}
      onEditChange={setTaskEditValue}
      onDependenciesChange={setEditDependencies}
      onCancelEdit={cancelTaskEdit}
      onGenerate={handleGenerateTasks}
    />
  </div>
);
};

export default ProjectDetails;
