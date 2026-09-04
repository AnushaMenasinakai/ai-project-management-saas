import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';

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

  const refreshDocuments = useCallback(async () => {
    setResource((current) => ({ ...current, projectId, error: '', loading: true }));
    try {
      const response = await api.get(`/documents/project/${projectId}`);
      setResource({ projectId, documents: response.data.documents, error: '', loading: false });
      return response.data.documents;
    } catch (error) {
      console.error('Fetch documents error:', error);
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
      console.error('Create document error:', error);
      setCreateDocumentError(error.response?.data?.message || 'Failed to create document.');
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
      console.error('Update document error:', error);
      setEditDocumentError(error.response?.data?.message || 'Failed to update document.');
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
    documentMutationInProgress: creatingDocument || savingDocument || deletingDocumentId !== null,
    createDocument,
    updateDocument,
    deleteDocument,
    startDocumentEdit,
    resetDocumentEdit,
  };
};

export default useProjectDocuments;
