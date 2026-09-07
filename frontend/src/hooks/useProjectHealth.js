import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';

const useProjectHealth = (projectId) => {
  const [resource, setResource] = useState({
    projectId: null,
    health: null,
    loading: false,
    error: '',
    refreshError: '',
  });
  const requestIdRef = useRef(0);
  const initializedProjectIdRef = useRef(null);
  const fetchingRef = useRef(false);

  const fetchHealth = useCallback(async ({ force = false } = {}) => {
    if (
      !projectId
      || fetchingRef.current
      || (!force && initializedProjectIdRef.current === projectId)
    ) return false;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    initializedProjectIdRef.current = projectId;
    fetchingRef.current = true;

    setResource((current) => ({
      projectId,
      health: current.projectId === projectId ? current.health : null,
      loading: true,
      error: '',
      refreshError: '',
    }));

    try {
      const response = await api.get(`/projects/${projectId}/health`);
      if (requestId === requestIdRef.current) {
        setResource({
          projectId,
          health: response.data.health,
          loading: false,
          error: '',
          refreshError: '',
        });
      }
      return true;
    } catch (error) {
      if (requestId === requestIdRef.current) {
        setResource((current) => ({
          projectId,
          health: current.projectId === projectId ? current.health : null,
          loading: false,
          error: current.projectId === projectId && current.health
            ? ''
            : error.response?.data?.message || 'Failed to load project health.',
          refreshError: current.projectId === projectId && current.health
            ? error.response?.data?.message || 'Failed to refresh project health.'
            : '',
        }));
      }
      return false;
    } finally {
      if (requestId === requestIdRef.current) fetchingRef.current = false;
    }
  }, [projectId]);

  useEffect(() => {
    requestIdRef.current += 1;
    fetchingRef.current = false;
    initializedProjectIdRef.current = null;
  }, [projectId]);

  const setHealthSnapshot = useCallback((health, expectedCurrentAsOf) => {
    if (!health) return;
    setResource((current) => (
      current.projectId === projectId
        && (!expectedCurrentAsOf || current.health?.asOf === expectedCurrentAsOf)
        ? { ...current, health, loading: false, error: '', refreshError: '' }
        : current
    ));
  }, [projectId]);

  const isCurrentProject = resource.projectId === projectId;

  return {
    health: isCurrentProject ? resource.health : null,
    initialized: isCurrentProject,
    loading: isCurrentProject && resource.loading,
    error: isCurrentProject ? resource.error : '',
    refreshError: isCurrentProject ? resource.refreshError : '',
    fetchHealth,
    setHealthSnapshot,
  };
};

export default useProjectHealth;
