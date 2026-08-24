import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const navigate = useNavigate();

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

      {error && <p>{error}</p>}

      {!error && projects.length === 0 && (
        <p>You don't have any projects yet.</p>
      )}

      {projects.map((project) => (
        <div key={project._id}>
          <h2>{project.name}</h2>
          <p>{project.description}</p>
          <p>Status: {project.status}</p>
        </div>
      ))}

      <button type="button" onClick={() => navigate('/dashboard')}>
        Back to Dashboard
      </button>
    </div>
  );
};

export default Projects;