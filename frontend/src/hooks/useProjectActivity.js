import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';

const useProjectActivity = (projectId) => {
  const [resource, setResource] = useState({
    projectId: null,
    activities: [],
    nextCursor: null,
    loading: false,
    error: '',
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState('');
  const requestIdRef = useRef(0);
  const initializedProjectIdRef = useRef(null);
  const fetchingRef = useRef(false);

  const fetchActivities = useCallback(async ({ force = false } = {}) => {
    if (
      !projectId
      || fetchingRef.current
      || (!force && initializedProjectIdRef.current === projectId)
    ) return false;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    initializedProjectIdRef.current = projectId;
    fetchingRef.current = true;
    setResource({ projectId, activities: [], nextCursor: null, loading: true, error: '' });
    setLoadMoreError('');

    try {
      const response = await api.get(`/projects/${projectId}/activities`);

      if (requestId === requestIdRef.current) {
        setResource({
          projectId,
          activities: response.data.activities,
          nextCursor: response.data.nextCursor,
          loading: false,
          error: '',
        });
      }
      return true;
    } catch (error) {
      if (requestId === requestIdRef.current) {
        setResource({
          projectId,
          activities: [],
          nextCursor: null,
          loading: false,
          error: error.response?.data?.message || 'Failed to load project activity.',
        });
      }
      return false;
    } finally {
      fetchingRef.current = false;
    }
  }, [projectId]);

  useEffect(() => () => {
    requestIdRef.current += 1;
  }, []);

  const loadMore = async () => {
    if (
      loadingMore
      || resource.projectId !== projectId
      || !resource.nextCursor
    ) {
      return false;
    }

    const cursor = resource.nextCursor;
    setLoadingMore(true);
    setLoadMoreError('');

    try {
      const response = await api.get(
        `/projects/${projectId}/activities?cursor=${encodeURIComponent(cursor)}`,
      );
      setResource((current) => (
        current.projectId === projectId && current.nextCursor === cursor
          ? {
            ...current,
            activities: [...current.activities, ...response.data.activities],
            nextCursor: response.data.nextCursor,
          }
          : current
      ));
      return true;
    } catch (error) {
      setLoadMoreError(error.response?.data?.message || 'Failed to load more activity.');
      return false;
    } finally {
      setLoadingMore(false);
    }
  };

  const isCurrentProject = resource.projectId === projectId;

  return {
    activities: isCurrentProject ? resource.activities : [],
    initialized: isCurrentProject,
    loading: isCurrentProject && resource.loading,
    error: isCurrentProject ? resource.error : '',
    nextCursor: isCurrentProject ? resource.nextCursor : null,
    loadingMore,
    loadMoreError,
    fetchActivities,
    loadMore,
  };
};

export default useProjectActivity;
