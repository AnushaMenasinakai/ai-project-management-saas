import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { formatAiError } from '../utils/aiErrorUtils';

const emptyResource = (projectId) => ({
  projectId, insight: null, generatedAt: null, healthAsOf: null, generating: false, error: '',
});

const useProjectHealthInsight = (projectId) => {
  const [resource, setResource] = useState(() => emptyResource(projectId));
  const requestIdRef = useRef(0);
  const generatingRef = useRef(false);

  useEffect(() => {
    requestIdRef.current += 1;
    generatingRef.current = false;
    setResource(emptyResource(projectId));
  }, [projectId]);

  const generateInsight = useCallback(async () => {
    if (!projectId || generatingRef.current) return false;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    generatingRef.current = true;
    setResource((current) => ({ ...current, projectId, generating: true, error: '' }));
    try {
      const response = await api.post(`/projects/${projectId}/health/insight`);
      if (requestId === requestIdRef.current) {
        setResource({
          projectId,
          insight: response.data.insight,
          generatedAt: response.data.generatedAt,
          healthAsOf: response.data.health?.asOf || null,
          generating: false,
          error: '',
        });
        return response.data;
      }
      return false;
    } catch (error) {
      if (requestId === requestIdRef.current) {
        setResource((current) => ({
          ...current,
          projectId,
          generating: false,
          error: formatAiError(error, 'Failed to generate AI health insight.'),
        }));
      }
      return false;
    } finally {
      if (requestId === requestIdRef.current) generatingRef.current = false;
    }
  }, [projectId]);

  const isCurrentProject = resource.projectId === projectId;
  return {
    insight: isCurrentProject ? resource.insight : null,
    generatedAt: isCurrentProject ? resource.generatedAt : null,
    healthAsOf: isCurrentProject ? resource.healthAsOf : null,
    generating: isCurrentProject && resource.generating,
    error: isCurrentProject ? resource.error : '',
    generateInsight,
  };
};

export default useProjectHealthInsight;
