import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';

const requestTaskComments = (taskId) => api.get(`/tasks/${taskId}/comments`);

const useTaskComments = (taskId) => {
  const [resource, setResource] = useState({
    taskId: null,
    comments: [],
    loading: false,
    error: '',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const requestIdRef = useRef(0);

  const fetchComments = useCallback(async () => {
    if (!taskId) return false;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setResource({ taskId, comments: [], loading: true, error: '' });

    try {
      const response = await requestTaskComments(taskId);

      if (requestId === requestIdRef.current) {
        setResource({ taskId, comments: response.data.comments, loading: false, error: '' });
      }

      return true;
    } catch (error) {
      if (requestId === requestIdRef.current) {
        setResource({
          taskId,
          comments: [],
          loading: false,
          error: error.response?.data?.message || 'Failed to load comments.',
        });
      }

      return false;
    }
  }, [taskId]);

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    requestTaskComments(taskId)
      .then((response) => {
        if (requestId === requestIdRef.current) {
          setResource({ taskId, comments: response.data.comments, loading: false, error: '' });
        }
      })
      .catch((error) => {
        if (requestId === requestIdRef.current) {
          setResource({
            taskId,
            comments: [],
            loading: false,
            error: error.response?.data?.message || 'Failed to load comments.',
          });
        }
      });

    return () => {
      requestIdRef.current += 1;
    };
  }, [taskId]);

  const createComment = async (content) => {
    const trimmedContent = typeof content === 'string' ? content.trim() : '';

    setCreateError('');

    if (!trimmedContent) {
      setCreateError('Comment content is required.');
      return false;
    }

    try {
      setCreating(true);
      const response = await api.post(`/tasks/${taskId}/comments`, {
        content: trimmedContent,
      });

      setResource((current) => (
        current.taskId === taskId
          ? { ...current, comments: [...current.comments, response.data.comment] }
          : current
      ));
      return true;
    } catch (error) {
      setCreateError(error.response?.data?.message || 'Failed to create comment.');
      return false;
    } finally {
      setCreating(false);
    }
  };

  const isCurrentTask = resource.taskId === taskId;

  return {
    comments: isCurrentTask ? resource.comments : [],
    loading: Boolean(taskId) && (!isCurrentTask || resource.loading),
    error: isCurrentTask ? resource.error : '',
    creating,
    createError,
    fetchComments,
    createComment,
  };
};

export default useTaskComments;
