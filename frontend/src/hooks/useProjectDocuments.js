import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { formatAiError } from '../utils/aiErrorUtils';
import { getUploadFileValidationError } from '../utils/documentUtils';

const useProjectDocuments = (projectId) => {
  const [resource, setResource] = useState({ projectId: null, documents: [], error: '' });
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  const [creatingDocument, setCreatingDocument] = useState(false);
  const [createDocumentError, setCreateDocumentError] = useState('');
  const [editingDocumentId, setEditingDocumentId] = useState(null);
  const [editDocumentTitle, setEditDocumentTitle] = useState('');
  const [editDocumentContent, setEditDocumentContent] = useState('');
  const [savingDocument, setSavingDocument] = useState(false);
  const [editDocumentError, setEditDocumentError] = useState('');
  const [deletingDocumentId, setDeletingDocumentId] = useState(null);
  const [deleteDocumentError, setDeleteDocumentError] = useState('');
  const [createModeResource, setCreateModeResource] = useState({ projectId: null, mode: 'text' });
  const [uploadResource, setUploadResource] = useState({
    projectId: null,
    title: '',
    file: null,
    error: '',
    success: '',
    inputVersion: 0,
  });
  const [uploadingProjectId, setUploadingProjectId] = useState(null);
  const projectIdRef = useRef(projectId);
  const uploadRequestIdRef = useRef(0);
  const uploadPendingRef = useRef(false);
  projectIdRef.current = projectId;

  const refreshDocuments = useCallback(async () => {
    setResource((current) => ({ ...current, projectId, error: '', loading: true }));
    try {
      const response = await api.get(`/documents/project/${projectId}`);
      if (projectIdRef.current !== projectId) return null;
      setResource({ projectId, documents: response.data.documents, error: '', loading: false });
      return response.data.documents;
    } catch (error) {
      console.error('Fetch documents error:', error);
      if (projectIdRef.current !== projectId) return null;
      setResource((current) => ({
        projectId,
        documents: current.projectId === projectId ? current.documents : [],
        error: error.response?.data?.message || 'Failed to load documents.',
        loading: false,
      }));
      return null;
    }
  }, [projectId]);

  useEffect(() => {
    uploadRequestIdRef.current += 1;
    uploadPendingRef.current = false;
    let active = true;
    api.get(`/documents/project/${projectId}`)
      .then((response) => {
        if (active) setResource({ projectId, documents: response.data.documents, error: '', loading: false });
      })
      .catch((error) => {
        console.error('Fetch documents error:', error);
        if (active) {
          setResource((current) => ({
            projectId,
            documents: current.projectId === projectId ? current.documents : [],
            error: error.response?.data?.message || 'Failed to load documents.',
            loading: false,
          }));
        }
      });
    return () => { active = false; };
  }, [projectId]);

  const createMode = createModeResource.projectId === projectId ? createModeResource.mode : 'text';
  const currentUpload = uploadResource.projectId === projectId
    ? uploadResource
    : { title: '', file: null, error: '', success: '', inputVersion: 0 };
  const uploadingDocument = uploadingProjectId === projectId;

  const setCreateMode = (mode) => {
    if (mode !== 'text' && mode !== 'upload') return;
    setCreateModeResource({ projectId, mode });
  };

  const setUploadTitle = (title) => {
    setUploadResource((current) => ({
      ...(current.projectId === projectId ? current : {}),
      projectId,
      title,
      file: current.projectId === projectId ? current.file : null,
      error: '',
      success: '',
      inputVersion: current.projectId === projectId ? current.inputVersion : 0,
    }));
  };

  const selectUploadFile = (file) => {
    const error = getUploadFileValidationError(file);
    setUploadResource((current) => ({
      ...(current.projectId === projectId ? current : {}),
      projectId,
      title: current.projectId === projectId ? current.title : '',
      file,
      error,
      success: '',
      inputVersion: current.projectId === projectId ? current.inputVersion : 0,
    }));
  };

  const removeUploadFile = () => {
    setUploadResource((current) => ({
      ...(current.projectId === projectId ? current : {}),
      projectId,
      file: null,
      error: '',
      success: '',
      inputVersion: (current.projectId === projectId ? current.inputVersion : 0) + 1,
    }));
  };

  const uploadDocument = async (event) => {
    event.preventDefault();
    if (uploadPendingRef.current) return;
    const title = currentUpload.title.trim();
    const validationError = !title
      ? 'Document title is required.'
      : getUploadFileValidationError(currentUpload.file);
    if (validationError) {
      setUploadResource((current) => ({ ...current, projectId, error: validationError, success: '' }));
      return;
    }

    const requestProjectId = projectId;
    const requestId = uploadRequestIdRef.current + 1;
    uploadRequestIdRef.current = requestId;
    uploadPendingRef.current = true;
    setUploadingProjectId(requestProjectId);
    setUploadResource((current) => ({ ...current, projectId, error: '', success: '' }));
    const formData = new FormData();
    formData.append('projectId', requestProjectId);
    formData.append('title', title);
    formData.append('file', currentUpload.file);

    try {
      await api.post('/documents/upload', formData);
      if (projectIdRef.current !== requestProjectId || uploadRequestIdRef.current !== requestId) return;
      setUploadResource((current) => ({
        ...current,
        projectId: requestProjectId,
        title: '',
        file: null,
        error: '',
        success: 'Document uploaded and indexed successfully.',
        inputVersion: current.inputVersion + 1,
      }));
      await refreshDocuments();
    } catch (error) {
      if (projectIdRef.current !== requestProjectId || uploadRequestIdRef.current !== requestId) return;
      setUploadResource((current) => ({
        ...current,
        projectId: requestProjectId,
        error: formatAiError(error, 'Failed to upload document.'),
        success: '',
      }));
    } finally {
      setUploadingProjectId((current) => (current === requestProjectId ? null : current));
      if (projectIdRef.current === requestProjectId && uploadRequestIdRef.current === requestId) {
        uploadPendingRef.current = false;
      }
    }
  };

  const resetDocumentEdit = () => {
    setEditingDocumentId(null);
    setEditDocumentTitle('');
    setEditDocumentContent('');
    setEditDocumentError('');
  };

  const startDocumentEdit = (document) => {
    setEditingDocumentId(document._id);
    setEditDocumentTitle(document.title);
    setEditDocumentContent(document.content || '');
    setEditDocumentError('');
  };

  const createDocument = async (event) => {
    event.preventDefault();
    setCreateDocumentError('');
    if (!documentTitle.trim()) {
      setCreateDocumentError('Document title is required.');
      return;
    }
    if (!documentContent.trim()) {
      setCreateDocumentError('Document content is required.');
      return;
    }
    try {
      setCreatingDocument(true);
      await api.post('/documents', {
        title: documentTitle.trim(),
        content: documentContent.trim(),
        project: projectId,
        sourceType: 'text',
      });
      setDocumentTitle('');
      setDocumentContent('');
      await refreshDocuments();
    } catch (error) {
      setCreateDocumentError(formatAiError(error, 'Failed to create document.'));
    } finally {
      setCreatingDocument(false);
    }
  };

  const updateDocument = async (event) => {
    event.preventDefault();
    setEditDocumentError('');
    if (!editDocumentTitle.trim()) {
      setEditDocumentError('Document title is required.');
      return;
    }
    if (!editDocumentContent.trim()) {
      setEditDocumentError('Document content is required.');
      return;
    }
    const currentDocument = resource.documents.find((document) => document._id === editingDocumentId);
    const updates = {};
    if (editDocumentTitle.trim() !== currentDocument?.title) updates.title = editDocumentTitle.trim();
    if (editDocumentContent.trim() !== currentDocument?.content) updates.content = editDocumentContent.trim();
    if (Object.keys(updates).length === 0) {
      resetDocumentEdit();
      return;
    }
    try {
      setSavingDocument(true);
      await api.patch(`/documents/${editingDocumentId}`, updates);
      resetDocumentEdit();
      await refreshDocuments();
    } catch (error) {
      setEditDocumentError(formatAiError(error, 'Failed to update document.'));
    } finally {
      setSavingDocument(false);
    }
  };

  const deleteDocument = async (documentId) => {
    if (deletingDocumentId) return;
    if (!window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) return;
    try {
      setDeletingDocumentId(documentId);
      setDeleteDocumentError('');
      await api.delete(`/documents/${documentId}`);
      if (editingDocumentId === documentId) resetDocumentEdit();
      await refreshDocuments();
    } catch (error) {
      console.error('Delete document error:', error);
      setDeleteDocumentError(error.response?.data?.message || 'Failed to delete document.');
    } finally {
      setDeletingDocumentId(null);
    }
  };

  const documents = resource.projectId === projectId ? resource.documents : [];
  return {
    documents,
    documentsLoading: resource.projectId !== projectId || resource.loading === true,
    documentsError: resource.projectId === projectId ? resource.error : '',
    documentTitle,
    setDocumentTitle,
    documentContent,
    setDocumentContent,
    creatingDocument,
    createDocumentError,
    editingDocumentId,
    editDocumentTitle,
    setEditDocumentTitle,
    editDocumentContent,
    setEditDocumentContent,
    savingDocument,
    editDocumentError,
    deletingDocumentId,
    deleteDocumentError,
    documentMutationInProgress: creatingDocument || uploadingDocument || savingDocument || deletingDocumentId !== null,
    createMode,
    setCreateMode,
    uploadTitle: currentUpload.title,
    setUploadTitle,
    uploadFile: currentUpload.file,
    selectUploadFile,
    removeUploadFile,
    uploadInputVersion: currentUpload.inputVersion,
    uploadingDocument,
    uploadDocumentError: currentUpload.error,
    uploadDocumentSuccess: currentUpload.success,
    uploadDocument,
    createDocument,
    updateDocument,
    deleteDocument,
    startDocumentEdit,
    resetDocumentEdit,
  };
};

export default useProjectDocuments;
