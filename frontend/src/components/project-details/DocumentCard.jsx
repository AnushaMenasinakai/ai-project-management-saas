import Alert from '../Alert';
import Badge from '../Badge';
import Button from '../Button';

const DocumentCard = ({
  document,
  isProjectOwner,
  mutationInProgress,
  editingDocumentId,
  editTitle,
  editContent,
  savingDocument,
  deletingDocumentId,
  editError,
  formatLabel,
  onStartEdit,
  onTitleChange,
  onContentChange,
  onUpdate,
  onCancelEdit,
  onDelete,
}) => (
  <li className="document-card">
    <div className="document-card__header">
      <div>
        <h3 className="document-card__title">{document.title}</h3>
        {document.sourceType && (
          <Badge className="document-source">{formatLabel(document.sourceType)}</Badge>
        )}
        {document.content && <p className="document-card__preview">{document.content}</p>}
      </div>
      {isProjectOwner && (
        <div className="document-actions">
          {document.sourceType === 'text' && (
            <Button type="button" variant="secondary" onClick={() => onStartEdit(document)} disabled={mutationInProgress}>
              Edit
            </Button>
          )}
          <Button type="button" variant="danger-secondary" onClick={() => onDelete(document._id)} disabled={mutationInProgress}>
            {deletingDocumentId === document._id ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      )}
    </div>
    {isProjectOwner && editingDocumentId === document._id && (
      <form className="document-form document-edit-form" onSubmit={onUpdate}>
        <h4>Editing “{document.title}”</h4>
        <div className="document-field">
          <label htmlFor={`edit-document-title-${document._id}`}>Document title</label>
          <input id={`edit-document-title-${document._id}`} type="text" value={editTitle} onChange={onTitleChange} />
        </div>
        <div className="document-field">
          <label htmlFor={`edit-document-content-${document._id}`}>Document content</label>
          <textarea id={`edit-document-content-${document._id}`} value={editContent} onChange={onContentChange} rows={8} />
        </div>
        {editError && <Alert>{editError}</Alert>}
        <div className="document-actions">
          <Button type="submit" disabled={mutationInProgress}>{savingDocument ? 'Saving...' : 'Save Changes'}</Button>
          <Button type="button" variant="secondary" onClick={onCancelEdit} disabled={savingDocument}>Cancel</Button>
        </div>
      </form>
    )}
  </li>
);

export default DocumentCard;
