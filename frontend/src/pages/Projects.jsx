import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

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
    return <p>Loading projects...</p>;
  }

  return (
    <div>
      <h1>Projects</h1>
      <button
  type="button"
  onClick={() => {
    setShowForm((current) => !current);
    setFormError('');
  }}
>
  {showForm ? 'Cancel' : 'Create Project'}
</button>

{showForm && (
  <form onSubmit={handleCreateProject}>
    <div>
      <label htmlFor="project-name">Project Name</label>
      <input
        id="project-name"
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Enter project name"
      />
    </div>

    <div>
      <label htmlFor="project-description">Description</label>
      <textarea
        id="project-description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Enter project description"
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

    <button type="submit" disabled={creating}>
      {creating ? 'Creating...' : 'Create Project'}
    </button>
  </form>
)}

      {error && <p>{error}</p>}

      {!error && projects.length === 0 && (
        <p>You don't have any projects yet.</p>
      )}

      {projects.map((project) => (
  <div key={project._id}>
    <h2>{project.name}</h2>

    <p>{project.description}</p>

    <p>Status: {project.status}</p>
    <p>Total Tasks: {project.totalTasks}</p>

    <p>Completed Tasks: {project.completedTasks}</p>

    <p>Progress: {project.progress}%</p>

    <button
      type="button"
      onClick={() => navigate(`/projects/${project._id}`)}
    >
      View Details
    </button>
  </div>
))}

      <button type="button" onClick={() => navigate('/dashboard')}>
        Back to Dashboard
      </button>
    </div>
  );
};

export default Projects;