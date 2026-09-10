import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import DocumentsSection from '../components/project-details/DocumentsSection';
import useProjectDocuments from '../hooks/useProjectDocuments';
import api from '../services/api';
import { formatAiError } from '../utils/aiErrorUtils';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const baseProps = {
  documents: [], isProjectOwner: true, loading: false, error: '', deleteError: '',
  documentTitle: '', documentContent: '', creatingDocument: false, createError: '',
  createMode: 'text', uploadTitle: '', uploadFile: null, uploadInputVersion: 0,
  uploadingDocument: false, uploadError: '', uploadSuccess: '', mutationInProgress: false,
  editingDocumentId: null, editTitle: '', editContent: '', savingDocument: false,
  deletingDocumentId: null, editError: '', formatLabel: (value) => value,
  onCreate: vi.fn(), onCreateTitleChange: vi.fn(), onCreateContentChange: vi.fn(),
  onCreateModeChange: vi.fn(), onUploadTitleChange: vi.fn(), onUploadFileChange: vi.fn(),
  onRemoveUploadFile: vi.fn(), onUpload: vi.fn(), onStartEdit: vi.fn(),
  onEditTitleChange: vi.fn(), onEditContentChange: vi.fn(), onUpdate: vi.fn(),
  onCancelEdit: vi.fn(), onDelete: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue({ data: { documents: [] } });
});

describe('document upload interface', () => {
  test('keeps the library first and opens the default Paste text flow only for owners', () => {
    const { rerender } = render(<DocumentsSection {...baseProps} />);
    expect(screen.getByText('No project documents yet')).toBeInTheDocument();
    expect(screen.queryByLabelText('Document content')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '+ Add document' }));
    expect(screen.getByRole('radio', { name: 'Paste text' })).toBeChecked();
    expect(screen.getByLabelText('Document content')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Upload file' }));
    expect(baseProps.onCreateModeChange).toHaveBeenCalledWith('upload');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('radio', { name: 'Upload file' })).not.toBeInTheDocument();

    rerender(<DocumentsSection {...baseProps} isProjectOwner={false} />);
    expect(screen.queryByRole('button', { name: '+ Add document' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'Upload file' })).not.toBeInTheDocument();
  });

  test('shows selected file metadata and uploaded-document metadata without a download action', () => {
    const file = new File(['hello'], 'brief.pdf', { type: 'application/pdf' });
    render(<DocumentsSection
      {...baseProps}
      createMode="upload"
      uploadFile={file}
      documents={[{
        _id: 'doc-1', title: 'Brief', sourceType: 'file', originalFilename: 'brief.pdf',
        mimeType: 'application/pdf', fileSize: 1536, pageCount: 2,
      }]}
    />);
    fireEvent.click(screen.getByRole('button', { name: '+ Add document' }));
    expect(screen.getAllByText('brief.pdf')).toHaveLength(2);
    expect(screen.getByText(/PDF · 5 B/)).toBeInTheDocument();
    expect(screen.getByText('1.5 KB')).toBeInTheDocument();
    expect(screen.getByText('2 pages')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /download/i })).not.toBeInTheDocument();
  });
});

describe('document upload behavior', () => {
  test('sends the required FormData and resets only after success', async () => {
    api.post.mockResolvedValue({ data: { document: { _id: 'doc-1' } } });
    const { result } = renderHook(() => useProjectDocuments('project-1'));
    await waitFor(() => expect(result.current.documentsLoading).toBe(false));
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    act(() => {
      result.current.setCreateMode('upload');
      result.current.setUploadTitle('Project notes');
      result.current.selectUploadFile(file);
    });
    await act(async () => result.current.uploadDocument({ preventDefault: vi.fn() }));

    expect(api.post).toHaveBeenCalledTimes(1);
    const [url, body, config] = api.post.mock.calls[0];
    expect(url).toBe('/documents/upload');
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('projectId')).toBe('project-1');
    expect(body.get('title')).toBe('Project notes');
    expect(body.get('file')).toBe(file);
    expect(config).toBeUndefined();
    expect(result.current.uploadFile).toBeNull();
    expect(result.current.uploadTitle).toBe('');
    expect(result.current.uploadDocumentSuccess).toMatch(/uploaded and indexed/i);
  });

  test('rejects unsupported and oversized files before making a request', async () => {
    const { result } = renderHook(() => useProjectDocuments('project-1'));
    await waitFor(() => expect(result.current.documentsLoading).toBe(false));
    act(() => result.current.selectUploadFile(new File(['x'], 'script.exe')));
    expect(result.current.uploadDocumentError).toMatch(/supported TXT, PDF, or DOCX/i);
    act(() => result.current.selectUploadFile(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.pdf')));
    expect(result.current.uploadDocumentError).toMatch(/5 MB or smaller/i);
    expect(api.post).not.toHaveBeenCalled();
  });

  test('preserves the selected file, title, and document list after failure without retrying', async () => {
    const documents = [{ _id: 'existing', title: 'Existing', sourceType: 'text' }];
    api.get.mockResolvedValue({ data: { documents } });
    api.post.mockRejectedValue({ response: { data: { code: 'AI_QUOTA_EXHAUSTED', message: 'private detail' } } });
    const { result } = renderHook(() => useProjectDocuments('project-1'));
    await waitFor(() => expect(result.current.documents).toEqual(documents));
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    act(() => {
      result.current.setUploadTitle('Keep this title');
      result.current.selectUploadFile(file);
    });
    await act(async () => result.current.uploadDocument({ preventDefault: vi.fn() }));
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(result.current.documents).toEqual(documents);
    expect(result.current.uploadTitle).toBe('Keep this title');
    expect(result.current.uploadFile).toBe(file);
    expect(result.current.uploadDocumentError).toMatch(/quota has been reached/i);
  });

  test('blocks duplicate pending submissions and ignores a result after switching projects', async () => {
    let resolveUpload;
    api.post.mockReturnValue(new Promise((resolve) => { resolveUpload = resolve; }));
    const { result, rerender } = renderHook(
      ({ projectId }) => useProjectDocuments(projectId),
      { initialProps: { projectId: 'project-1' } },
    );
    await waitFor(() => expect(result.current.documentsLoading).toBe(false));
    act(() => {
      result.current.setUploadTitle('Old project file');
      result.current.selectUploadFile(new File(['hello'], 'notes.txt'));
    });
    let first;
    act(() => {
      first = result.current.uploadDocument({ preventDefault: vi.fn() });
      result.current.uploadDocument({ preventDefault: vi.fn() });
    });
    expect(api.post).toHaveBeenCalledTimes(1);
    rerender({ projectId: 'project-2' });
    await act(async () => {
      resolveUpload({ data: { document: { _id: 'old' } } });
      await first;
    });
    expect(result.current.uploadTitle).toBe('');
    expect(result.current.uploadFile).toBeNull();
    expect(result.current.uploadDocumentSuccess).toBe('');
  });
});

describe('document upload errors', () => {
  test.each([
    ['DOCUMENT_FILE_REQUIRED', /choose a TXT, PDF, or Word file/i],
    ['DOCUMENT_FILE_INVALID', /invalid, corrupt, or protected/i],
    ['DOCUMENT_FILE_TOO_LARGE', /5 MB upload limit/i],
    ['DOCUMENT_EXTRACTED_TEXT_TOO_LARGE', /extracted document text is too large/i],
    ['DOCUMENT_EMBEDDING_LIMIT_EXCEEDED', /embedding limit/i],
    ['AI_TEMPORARILY_UNAVAILABLE', /temporarily unavailable/i],
  ])('maps %s without exposing parser/provider details', (code, expected) => {
    expect(formatAiError({ response: { data: { code, message: 'secret raw error' } } })).toMatch(expected);
  });
});
