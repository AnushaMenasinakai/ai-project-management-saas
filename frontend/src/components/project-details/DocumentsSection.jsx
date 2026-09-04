import Alert from '../Alert';
import Button from '../Button';
import Card from '../Card';
import DocumentCard from './DocumentCard';

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
      <form className="document-form document-create-form" onSubmit={onCreate}>
        <div className="document-form__header">
          <p className="section-eyebrow">Create document</p>
          <h3>Add project knowledge</h3>
          <p>Create a text reference that the project can use.</p>
        </div>
        <div className="document-field">
          <label htmlFor="document-title">Document title</label>
          <input id="document-title" type="text" value={documentTitle} onChange={onCreateTitleChange} placeholder="Enter document title" />
        </div>
        <div className="document-field">
          <label htmlFor="document-content">Document content</label>
          <textarea id="document-content" value={documentContent} onChange={onCreateContentChange} placeholder="Enter document content" rows={5} />
        </div>
        {createError && <Alert>{createError}</Alert>}
        <div className="document-actions">
          <Button type="submit" disabled={mutationInProgress}>{creatingDocument ? 'Creating...' : 'Create Document'}</Button>
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
