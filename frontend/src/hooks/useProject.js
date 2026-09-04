import { useEffect, useState } from 'react';
import api from '../services/api';

const useProject = (projectId, onDeleted) => {
  const [resource, setResource] = useState({ projectId: null, project: null, error: '' });
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState({ name: '', description: '', status: 'planning' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    let active = true;
    api.get(`/projects/${projectId}`)
      .then((response) => {
        if (active) setResource({ projectId, project: response.data.project, error: '' });
      })
      .catch((error) => {
        console.error('Fetch project error:', error);
        if (active) {
          setResource({
            projectId,
            project: null,
            error: error.response?.data?.message || 'Failed to load project.',
          });
        }
      });
    return () => { active = false; };
  }, [projectId]);

  const setEditValue = (field, value) => setEditValues((current) => ({ ...current, [field]: value }));
  const startEditing = () => {
    const project = resource.project;
    setEditValues({ name: project.name, description: project.description || '', status: project.status });
    setFormError('');
    setEditing(true);
  };
  const cancelEditing = () => {
    setEditing(false);
    setFormError('');
  };

  const updateProject = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!editValues.name.trim()) {
      setFormError('Project name is required.');
      return;
    }
    try {
      setSaving(true);
      const response = await api.patch(`/projects/${projectId}`, {
        name: editValues.name.trim(),
        description: editValues.description.trim(),
        status: editValues.status,
      });
      setResource({ projectId, project: response.data.project, error: '' });
      setEditing(false);
    } catch (error) {
      console.error('Update project error:', error);
      setFormError(error.response?.data?.message || 'Failed to update project.');
    } finally {
      setSaving(false);
    }
  };

  const deleteProject = async () => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
    try {
      setDeleting(true);
      setDeleteError('');
      await api.delete(`/projects/${projectId}`);
      onDeleted();
    } catch (error) {
      console.error('Delete project error:', error);
      setDeleteError(error.response?.data?.message || 'Failed to delete project.');
    } finally {
      setDeleting(false);
    }
  };

  return {
    project: resource.projectId === projectId ? resource.project : null,
    loading: resource.projectId !== projectId,
    error: resource.projectId === projectId ? resource.error : '',
    editing,
    editValues,
    setEditValue,
    saving,
    formError,
    deleting,
    deleteError,
    startEditing,
    cancelEditing,
    updateProject,
    deleteProject,
  };
};

export default useProject;
