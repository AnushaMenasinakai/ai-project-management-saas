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
  const [updatingCommentIds, setUpdatingCommentIds] = useState(() => new Set());
  const [deletingCommentIds, setDeletingCommentIds] = useState(() => new Set());
  const [mutationErrors, setMutationErrors] = useState({});
  const requestIdRef = useRef(0);
  const updatingCommentIdsRef = useRef(new Set());
  const deletingCommentIdsRef = useRef(new Set());

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

  const setCommentPending = (reference, setter, commentId, pending) => {
    if (pending) reference.current.add(commentId);
    else reference.current.delete(commentId);
    setter(new Set(reference.current));
  };

  const setMutationError = (commentId, message = '') => {
    setMutationErrors((current) => {
      if (message) return { ...current, [commentId]: message };
      const next = { ...current };
      delete next[commentId];
      return next;
    });
  };

  const updateComment = async (commentId, content) => {
    const trimmedContent = typeof content === 'string' ? content.trim() : '';

    setMutationError(commentId);

    if (!trimmedContent) {
      setMutationError(commentId, 'Comment content is required.');
      return false;
    }

    if (
      updatingCommentIdsRef.current.has(commentId)
      || deletingCommentIdsRef.current.has(commentId)
    ) {
      return false;
    }

    setCommentPending(updatingCommentIdsRef, setUpdatingCommentIds, commentId, true);

    try {
      const response = await api.patch(`/comments/${commentId}`, {
        content: trimmedContent,
      });
      setResource((current) => ({
        ...current,
        comments: current.comments.map((comment) => (
          comment._id === commentId ? response.data.comment : comment
        )),
      }));
      return true;
    } catch (error) {
      setMutationError(
        commentId,
        error.response?.data?.message || 'Failed to update comment.',
      );
      return false;
    } finally {
      setCommentPending(updatingCommentIdsRef, setUpdatingCommentIds, commentId, false);
    }
  };

  const deleteComment = async (commentId) => {
    setMutationError(commentId);

    if (
      updatingCommentIdsRef.current.has(commentId)
      || deletingCommentIdsRef.current.has(commentId)
    ) {
      return false;
    }

    setCommentPending(deletingCommentIdsRef, setDeletingCommentIds, commentId, true);

    try {
      await api.delete(`/comments/${commentId}`);
      setResource((current) => ({
        ...current,
        comments: current.comments.filter((comment) => comment._id !== commentId),
      }));
      return true;
    } catch (error) {
      setMutationError(
        commentId,
        error.response?.data?.message || 'Failed to delete comment.',
      );
      return false;
    } finally {
      setCommentPending(deletingCommentIdsRef, setDeletingCommentIds, commentId, false);
    }
  };

  const isCurrentTask = resource.taskId === taskId;

  return {
    comments: isCurrentTask ? resource.comments : [],
    loading: Boolean(taskId) && (!isCurrentTask || resource.loading),
    error: isCurrentTask ? resource.error : '',
    creating,
    createError,
    updatingCommentIds,
    deletingCommentIds,
    mutationErrors,
    fetchComments,
    createComment,
    updateComment,
    deleteComment,
  };
};

export default useTaskComments;
