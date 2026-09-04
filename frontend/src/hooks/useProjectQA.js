import { useState } from 'react';
import api from '../services/api';

const useProjectQA = (projectId) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const askProject = async (event) => {
    event.preventDefault();
    if (loading) return;
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setError('Please enter a question.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      setAnswer('');
      setSources([]);
      const response = await api.post(`/projects/${projectId}/ask`, { question: trimmedQuestion });
      setAnswer(response.data.answer);
      setSources(Array.isArray(response.data.sources) ? response.data.sources : []);
    } catch (requestError) {
      console.error('Ask project error:', requestError);
      setAnswer('');
      setSources([]);
      setError(requestError.response?.data?.message || 'Failed to generate an answer.');
    } finally {
      setLoading(false);
    }
  };

  return { question, setQuestion, answer, sources, loading, error, askProject };
};

export default useProjectQA;
