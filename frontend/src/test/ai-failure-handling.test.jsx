import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import ProjectQASection from '../components/project-details/ProjectQASection';
import useProjectDocuments from '../hooks/useProjectDocuments';
import useProjectQA from '../hooks/useProjectQA';
import api from '../services/api';
import { formatAiError } from '../utils/aiErrorUtils';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

beforeEach(() => vi.clearAllMocks());

describe('AI error formatting', () => {
  test.each([
    ['AI_QUOTA_EXHAUSTED', 'AI usage is temporarily unavailable because the service quota has been reached. Please try again later.'],
    ['AI_TEMPORARILY_UNAVAILABLE', 'The AI service is temporarily unavailable. Please try again.'],
    ['AI_TIMEOUT', 'The AI service took too long to respond. Please try again.'],
    ['AI_CONFIGURATION_ERROR', 'The AI service is currently unavailable because its configuration needs attention.'],
    ['AI_INVALID_RESPONSE', 'The AI service returned an invalid response. Please try again later.'],
    ['AI_ERROR', 'The AI request could not be completed. Please try again later.'],
    ['DOCUMENT_EMBEDDING_LIMIT_EXCEEDED', 'This document exceeds the current AI embedding limit. Shorten the content and try again.'],
  ])('maps %s without parsing provider text', (code, expected) => {
    expect(formatAiError({ response: { data: { code, message: 'raw provider detail' } } })).toBe(expected);
  });

  test('preserves ordinary server messages and does not infer quota from HTTP 429', () => {
    expect(formatAiError({
      response: { status: 429, data: { message: 'Too many AI requests. Please try again later.' } },
    })).toBe('Too many AI requests. Please try again later.');
    expect(formatAiError({ response: { data: { message: 'Project not found.' } } }))
      .toBe('Project not found.');
    expect(formatAiError(new Error('private provider error'), 'Safe fallback.')).toBe('Safe fallback.');
  });
});

describe('RAG failure preservation', () => {
  test('keeps and labels the prior answer while a new question fails', async () => {
    let rejectSecond;
    api.post
      .mockResolvedValueOnce({ data: { answer: 'Express powers the API.', sources: [{ chunkId: 'one' }] } })
      .mockReturnValueOnce(new Promise((resolve, reject) => { rejectSecond = reject; }));
    const { result } = renderHook(() => useProjectQA('project-1'));

    act(() => result.current.setQuestion('Which framework is used?'));
    await act(async () => result.current.askProject({ preventDefault: vi.fn() }));
    expect(result.current.answer).toBe('Express powers the API.');
    expect(result.current.answerQuestion).toBe('Which framework is used?');

    act(() => result.current.setQuestion('What database is used?'));
    let secondRequest;
    act(() => { secondRequest = result.current.askProject({ preventDefault: vi.fn() }); });
    expect(result.current.loading).toBe(true);
    expect(result.current.answer).toBe('Express powers the API.');
    expect(result.current.sources).toEqual([{ chunkId: 'one' }]);
    await act(async () => {
      rejectSecond({ response: { data: { code: 'AI_TIMEOUT', message: 'provider detail' } } });
      await secondRequest;
    });

    expect(result.current.question).toBe('What database is used?');
    expect(result.current.answer).toBe('Express powers the API.');
    expect(result.current.sources).toEqual([{ chunkId: 'one' }]);
    expect(result.current.error).toBe('The AI service took too long to respond. Please try again.');

    render(<ProjectQASection
      question={result.current.question}
      answer={result.current.answer}
      answerQuestion={result.current.answerQuestion}
      sources={result.current.sources}
      loading={false}
      error={result.current.error}
      onQuestionChange={vi.fn()}
      onSubmit={vi.fn()}
    />);
    expect(screen.getByText('Answer to “Which framework is used?”')).toBeInTheDocument();
    expect(screen.getByText(/previous successful question/i)).toBeInTheDocument();
  });

  test('replaces retained results after a successful new answer', async () => {
    api.post
      .mockResolvedValueOnce({ data: { answer: 'First answer', sources: [{ chunkId: 'one' }] } })
      .mockResolvedValueOnce({ data: { answer: 'Second answer', sources: [{ chunkId: 'two' }] } });
    const { result } = renderHook(() => useProjectQA('project-1'));
    act(() => result.current.setQuestion('First question'));
    await act(async () => result.current.askProject({ preventDefault: vi.fn() }));
    act(() => result.current.setQuestion('Second question'));
    await act(async () => result.current.askProject({ preventDefault: vi.fn() }));
    expect(result.current).toMatchObject({
      answer: 'Second answer', answerQuestion: 'Second question', sources: [{ chunkId: 'two' }],
    });
  });

  test('ignores an old project response after switching projects', async () => {
    let resolveFirst;
    api.post.mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }));
    const { result, rerender } = renderHook(
      ({ projectId }) => useProjectQA(projectId),
      { initialProps: { projectId: 'project-1' } },
    );
    act(() => result.current.setQuestion('Old question'));
    let request;
    act(() => { request = result.current.askProject({ preventDefault: vi.fn() }); });
    rerender({ projectId: 'project-2' });
    await act(async () => {
      resolveFirst({ data: { answer: 'Stale answer', sources: [] } });
      await request;
    });
    expect(result.current.answer).toBe('');
    expect(result.current.question).toBe('');
  });
});

describe('document AI failure preservation', () => {
  test('keeps the document list and create draft after a Gemini failure', async () => {
    const documents = [{ _id: 'doc-1', title: 'Existing', content: 'Stored content' }];
    api.get.mockResolvedValue({ data: { documents } });
    api.post.mockRejectedValue({
      response: { data: { code: 'AI_TEMPORARILY_UNAVAILABLE', message: 'provider detail' } },
    });
    const { result } = renderHook(() => useProjectDocuments('project-1'));
    await waitFor(() => expect(result.current.documents).toEqual(documents));
    act(() => {
      result.current.setDocumentTitle('New document');
      result.current.setDocumentContent('Draft content');
    });
    await act(async () => result.current.createDocument({ preventDefault: vi.fn() }));
    expect(result.current.documents).toEqual(documents);
    expect(result.current.documentTitle).toBe('New document');
    expect(result.current.documentContent).toBe('Draft content');
    expect(result.current.createDocumentError).toBe('The AI service is temporarily unavailable. Please try again.');
  });

  test('keeps the edit draft when content exceeds the embedding limit', async () => {
    const document = { _id: 'doc-1', title: 'Existing', content: 'Stored content' };
    api.get.mockResolvedValue({ data: { documents: [document] } });
    api.patch.mockRejectedValue({
      response: { data: { code: 'DOCUMENT_EMBEDDING_LIMIT_EXCEEDED', message: 'server detail' } },
    });
    const { result } = renderHook(() => useProjectDocuments('project-1'));
    await waitFor(() => expect(result.current.documents).toEqual([document]));
    act(() => {
      result.current.startDocumentEdit(document);
      result.current.setEditDocumentContent('Oversized draft');
    });
    await act(async () => result.current.updateDocument({ preventDefault: vi.fn() }));
    expect(result.current.documents).toEqual([document]);
    expect(result.current.editingDocumentId).toBe('doc-1');
    expect(result.current.editDocumentContent).toBe('Oversized draft');
    expect(result.current.editDocumentError).toMatch(/exceeds the current AI embedding limit/i);
  });
});
