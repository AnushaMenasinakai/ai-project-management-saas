import Alert from '../Alert';
import Button from '../Button';
import Card from '../Card';
import DocumentCard from './DocumentCard';
import { formatFileSize, getDocumentFileTypeLabel } from '../../utils/documentUtils';

const DocumentsSection = ({
  documents,
  isProjectOwner,
  loading,
  error,
  deleteError,
  documentTitle,
  documentContent,
  creatingDocument,
  createError,
  createMode,
  uploadTitle,
  uploadFile,
  uploadInputVersion,
  uploadingDocument,
  uploadError,
  uploadSuccess,
  mutationInProgress,
  editingDocumentId,
  editTitle,
  editContent,
  savingDocument,
  deletingDocumentId,
  editError,
  formatLabel,
  onCreate,
  onCreateTitleChange,
  onCreateContentChange,
  onCreateModeChange,
  onUploadTitleChange,
  onUploadFileChange,
  onRemoveUploadFile,
  onUpload,
  onStartEdit,
  onEditTitleChange,
  onEditContentChange,
  onUpdate,
  onCancelEdit,
  onDelete,
}) => (
  <Card id="project-documents" className="documents-section workspace-section" aria-labelledby="documents-heading">
    <div className="documents-section__header">
      <h2 id="documents-heading">Documents</h2>
      <p>Reference material for this project.</p>
    </div>
    {isProjectOwner && (
      <form className="document-form document-create-form" onSubmit={createMode === 'text' ? onCreate : onUpload}>
        <div className="document-form__header">
          <p className="section-eyebrow">Create document</p>
          <h3>Add project knowledge</h3>
          <p>Paste text or upload a file to add project knowledge.</p>
        </div>
        <fieldset className="document-create-mode">
          <legend>Document source</legend>
          <label><input type="radio" name="document-create-mode" checked={createMode === 'text'} onChange={() => onCreateModeChange('text')} /><span>Paste text</span></label>
          <label><input type="radio" name="document-create-mode" checked={createMode === 'upload'} onChange={() => onCreateModeChange('upload')} /><span>Upload file</span></label>
        </fieldset>
        {createMode === 'text' ? <>
          <div className="document-field">
            <label htmlFor="document-title">Document title</label>
            <input id="document-title" type="text" value={documentTitle} onChange={onCreateTitleChange} placeholder="Enter document title" />
          </div>
          <div className="document-field">
            <label htmlFor="document-content">Document content</label>
            <textarea id="document-content" value={documentContent} onChange={onCreateContentChange} placeholder="Enter document content" rows={5} />
          </div>
          {createError && <Alert>{createError}</Alert>}
        </> : <>
          <div className="document-field">
            <label htmlFor="upload-document-title">Document title</label>
            <input id="upload-document-title" type="text" value={uploadTitle} onChange={onUploadTitleChange} placeholder="Enter document title" />
          </div>
          <div className="document-field">
            <label htmlFor="document-file">File</label>
            <input key={uploadInputVersion} id="document-file" type="file" accept=".txt,.pdf,.docx" onChange={onUploadFileChange} />
            <p className="document-field__help">TXT, text-based PDF, or DOCX. Maximum 5 MB.</p>
          </div>
          {uploadFile && <div className="document-upload-selection" aria-label="Selected file">
            <div><strong>{uploadFile.name}</strong><span>{getDocumentFileTypeLabel(uploadFile)} · {formatFileSize(uploadFile.size)}</span></div>
            <Button type="button" variant="secondary" onClick={onRemoveUploadFile} disabled={uploadingDocument}>Remove file</Button>
          </div>}
          {uploadingDocument && <p className="document-message" role="status" aria-live="polite">Extracting and indexing…</p>}
          {uploadError && <Alert>{uploadError}</Alert>}
          {uploadSuccess && <p className="document-upload-success" role="status">{uploadSuccess}</p>}
        </>}
        <div className="document-actions">
          <Button type="submit" disabled={mutationInProgress}>{createMode === 'text' ? (creatingDocument ? 'Creating...' : 'Create Document') : (uploadingDocument ? 'Extracting and indexing…' : 'Upload Document')}</Button>
        </div>
      </form>
    )}
    {loading && <p className="document-message">Loading documents...</p>}
    {error && <Alert>{error}</Alert>}
    {deleteError && <Alert>{deleteError}</Alert>}
    <div className="document-list-heading">
      <div><p className="section-eyebrow">Project documents</p><h3>Available reference material</h3></div>
      <span>{documents.length} {documents.length === 1 ? 'document' : 'documents'}</span>
    </div>
    {!loading && !error && documents.length === 0 && <p className="document-message">No documents yet.</p>}
    {!loading && !error && documents.length > 0 && (
      <ul className="document-list">
        {documents.map((document) => (
          <DocumentCard
            key={document._id}
            document={document}
            isProjectOwner={isProjectOwner}
            mutationInProgress={mutationInProgress}
            editingDocumentId={editingDocumentId}
            editTitle={editTitle}
            editContent={editContent}
            savingDocument={savingDocument}
            deletingDocumentId={deletingDocumentId}
            editError={editError}
            formatLabel={formatLabel}
            onStartEdit={onStartEdit}
            onTitleChange={onEditTitleChange}
            onContentChange={onEditContentChange}
            onUpdate={onUpdate}
            onCancelEdit={onCancelEdit}
            onDelete={onDelete}
          />
        ))}
      </ul>
    )}
  </Card>
);

export default DocumentsSection;
