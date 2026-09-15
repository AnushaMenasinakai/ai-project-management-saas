import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import api from '../services/api';
import useProjectDocuments from '../hooks/useProjectDocuments';

const originalAdapter = api.defaults.adapter;
let transport;

beforeEach(() => {
  // Mock only transport: the real client, interceptors and Axios transforms run.
  transport = vi.fn(async (config) => ({
    data: config.method === 'get' ? { documents: [] } : {},
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  }));
  api.defaults.adapter = transport;
});

afterEach(() => {
  api.defaults.adapter = originalAdapter;
});

describe('document upload Axios serialization', () => {
  test.each([
    ['txt', 'text/plain'],
    ['pdf', 'application/pdf'],
    ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ])('preserves the %s file through the real request transform', async (extension, type) => {
    localStorage.setItem('token', 'test-only-token');
    const { result } = renderHook(() => useProjectDocuments('project-1'));
    await waitFor(() => expect(result.current.documentsLoading).toBe(false));
    // These fixtures exercise transport, not backend document parsing.
    const file = new File(['upload bytes'], `brief.${extension}`, { type });
    act(() => {
      result.current.setUploadTitle('Project brief');
      result.current.selectUploadFile(file);
    });
    await act(async () => result.current.uploadDocument({ preventDefault: vi.fn() }));

    const uploads = transport.mock.calls
      .map(([config]) => config)
      .filter((config) => config.method === 'post');
    expect(uploads).toHaveLength(1);
    const request = uploads[0];
    expect(request.url).toBe('/documents/upload');
    expect(request.headers.getContentType()).not.toContain('application/json');
    expect(request.headers.get('Authorization')).toBe('Bearer test-only-token');
    expect(request.data).toBeInstanceOf(FormData);
    expect(request.data.get('projectId')).toBe('project-1');
    expect(request.data.get('title')).toBe('Project brief');
    expect(request.data.get('file')).toBe(file);
    expect(request.data.get('file')).toBeInstanceOf(File);
    expect(result.current.uploadDocumentError).toBe('');
    expect(result.current.uploadFile).toBeNull();

    // The upload override must not change the shared JSON default.
    await api.post('/documents', { title: 'Text document', content: 'Notes' });
    const jsonRequest = transport.mock.calls.at(-1)[0];
    expect(jsonRequest.headers.getContentType()).toBe('application/json');
    expect(JSON.parse(jsonRequest.data)).toEqual({ title: 'Text document', content: 'Notes' });
  });
});
