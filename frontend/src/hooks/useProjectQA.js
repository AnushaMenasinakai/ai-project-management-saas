import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { formatAiError } from '../utils/aiErrorUtils';

const useProjectQA = (projectId) => {
  const [questionResource, setQuestionResource] = useState({ projectId, value: '' });
  const [result, setResult] = useState({ projectId, question: '', answer: '', sources: [] });
  const [requestState, setRequestState] = useState({ projectId, loading: false, error: '' });
  const requestIdRef = useRef(0);
  const loadingRef = useRef(false);

  useEffect(() => {
    requestIdRef.current += 1;
    loadingRef.current = false;
  }, [projectId]);

  const question = questionResource.projectId === projectId ? questionResource.value : '';
  const setQuestion = (value) => setQuestionResource({ projectId, value });

  const askProject = async (event) => {
    event.preventDefault();
    if (loadingRef.current) return;
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setRequestState({ projectId, loading: false, error: 'Please enter a question.' });
      return;
    }
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    loadingRef.current = true;
    try {
      setRequestState({ projectId, loading: true, error: '' });
      const response = await api.post(`/projects/${projectId}/ask`, { question: trimmedQuestion });
      if (requestId === requestIdRef.current) {
        setResult({
          projectId,
          question: trimmedQuestion,
          answer: response.data.answer,
          sources: Array.isArray(response.data.sources) ? response.data.sources : [],
        });
      }
    } catch (requestError) {
      if (requestId === requestIdRef.current) {
        setRequestState({
          projectId,
          loading: false,
          error: formatAiError(requestError, 'Failed to generate an answer.'),
        });
      }
    } finally {
      if (requestId === requestIdRef.current) {
        loadingRef.current = false;
        setRequestState((current) => ({ ...current, projectId, loading: false }));
      }
    }
  };

  const isCurrentProject = result.projectId === projectId;
  const isCurrentRequestState = requestState.projectId === projectId;
  return {
    question,
    setQuestion,
    answer: isCurrentProject ? result.answer : '',
    answerQuestion: isCurrentProject ? result.question : '',
    sources: isCurrentProject ? result.sources : [],
    loading: isCurrentRequestState && requestState.loading,
    error: isCurrentRequestState ? requestState.error : '',
    askProject,
  };
};

export default useProjectQA;
