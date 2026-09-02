import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '../components/Alert';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import PageHeader from '../components/PageHeader';
import api from '../services/api';

const statusVariants = {
  planning: 'info',
  active: 'success',
  completed: 'primary',
  archived: 'neutral',
};

const formatStatus = (status) =>
  status ? `${status.charAt(0).toUpperCase()}${status.slice(1)}` : 'Unknown';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('planning');
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);

  const navigate = useNavigate();

  const openCreateForm = () => {
    setShowForm(true);
    setFormError('');
  };

  const closeCreateForm = () => {
    setShowForm(false);
    setFormError('');
  };

  const handleCreateProject = async (event) => {
    event.preventDefault();

    setFormError('');

    if (!name.trim()) {
      setFormError('Project name is required.');
      return;
    }

    try {
      setCreating(true);

      const response = await api.post('/projects', {
        name: name.trim(),
        description: description.trim(),
        status,
      });

      setProjects((currentProjects) => [
        response.data.project,
        ...currentProjects,
      ]);

      setName('');
      setDescription('');
      setStatus('planning');
      setShowForm(false);
    } catch (err) {
      console.error('Create project error:', err);

      setFormError(
        err.response?.data?.message || 'Failed to create project.'
      );
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await api.get('/projects');
        setProjects(response.data.projects);
      } catch (err) {
        console.error('Fetch projects error:', err);
        setError(
          err.response?.data?.message || 'Failed to load projects.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="page projects-page">
        <PageHeader
          eyebrow="Workspace"
          title="Projects"
          description="Manage your owned and shared project workspaces."
        />
        <LoadingState message="Loading your projects..." />
      </div>
    );
  }

  return (
    <div className="page projects-page">
      <PageHeader
        eyebrow="Workspace"
        title="Projects"
        description="Plan work, coordinate members, and keep project knowledge connected."
        actions={
          <Button
            variant={showForm ? 'secondary' : 'primary'}
            onClick={showForm ? closeCreateForm : openCreateForm}
          >
            {showForm ? 'Close form' : 'Create project'}
          </Button>
        }
      />

      {showForm && (
        <Card className="project-create-panel" aria-labelledby="create-project-title">
          <div className="project-create-panel__header">
            <div>
              <p className="section-heading__eyebrow">New workspace</p>
              <h2 id="create-project-title">Create a project</h2>
              <p>Give your team a focused place for tasks, documents, and project AI.</p>
            </div>
          </div>

          <form className="project-form" onSubmit={handleCreateProject}>
            <div className="project-form__field project-form__field--wide">
              <label htmlFor="project-name">Project name</label>
              <input
                id="project-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter project name"
              />
            </div>

            <div className="project-form__field project-form__field--wide">
              <label htmlFor="project-description">Description</label>
              <textarea
                id="project-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the project goals and context"
                rows={4}
              />
            </div>

            <div className="project-form__field">
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

            {formError && (
              <Alert className="project-form__feedback" title="Unable to create project">
                {formError}
              </Alert>
            )}

            <div className="project-form__actions">
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating project...' : 'Create project'}
              </Button>
              <Button variant="secondary" onClick={closeCreateForm} disabled={creating}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {error && (
        <Alert title="Projects could not be loaded">
          {error}
        </Alert>
      )}

      {!error && projects.length === 0 && (
        <EmptyState
          icon={
            <svg viewBox="0 0 24 24">
              <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h4A1.5 1.5 0 0 1 11 5.5v4A1.5 1.5 0 0 1 9.5 11h-4A1.5 1.5 0 0 1 4 9.5v-4Zm9 0A1.5 1.5 0 0 1 14.5 4h4A1.5 1.5 0 0 1 20 5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 13 9.5v-4Zm-9 9A1.5 1.5 0 0 1 5.5 13h4a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 9.5 20h-4A1.5 1.5 0 0 1 4 18.5v-4Zm9 0a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5v-4Z" />
            </svg>
          }
          title="Create your first project"
          description="Start a workspace for tasks, teammates, documents, and AI-assisted planning."
          action={<Button onClick={openCreateForm}>Create project</Button>}
        />
      )}

      {!error && projects.length > 0 && (
        <section className="projects-collection" aria-labelledby="project-list-title">
          <div className="section-heading section-heading--compact">
            <h2 id="project-list-title">All projects</h2>
            <p>{projects.length} {projects.length === 1 ? 'workspace' : 'workspaces'}</p>
          </div>

          <div className="project-grid">
            {projects.map((project) => {
              const totalTasks = project.totalTasks ?? 0;
              const completedTasks = project.completedTasks ?? 0;
              const progress = project.progress ?? 0;

              return (
                <Card as="article" className="project-card" key={project._id}>
                  <div className="project-card__header">
                    <div className="project-card__icon" aria-hidden="true">
                      {project.name?.trim()?.charAt(0)?.toUpperCase() || 'P'}
                    </div>
                    <Badge variant={statusVariants[project.status] || 'neutral'}>
                      {formatStatus(project.status)}
                    </Badge>
                  </div>

                  <div className="project-card__body">
                    <h3>{project.name}</h3>
                    <p>{project.description || 'No description provided.'}</p>
                  </div>

                  <dl className="project-card__metrics">
                    <div>
                      <dt>Total tasks</dt>
                      <dd>{totalTasks}</dd>
                    </div>
                    <div>
                      <dt>Completed</dt>
                      <dd>{completedTasks}</dd>
                    </div>
                  </dl>

                  <div className="project-progress">
                    <div className="project-progress__label">
                      <span>Progress</span>
                      <strong>{progress}%</strong>
                    </div>
                    <div
                      className="project-progress__track"
                      role="progressbar"
                      aria-label={`${project.name} progress`}
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-valuenow={progress}
                    >
                      <span style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  <Button
                    className="project-card__action"
                    variant="secondary"
                    onClick={() => navigate(`/projects/${project._id}`)}
                  >
                    Open project
                    <span aria-hidden="true">→</span>
                  </Button>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default Projects;
