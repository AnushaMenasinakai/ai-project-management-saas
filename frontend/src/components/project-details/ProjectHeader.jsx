import Alert from '../Alert';
import Badge from '../Badge';
import Button from '../Button';
import PageHeader from '../PageHeader';

const ProjectHeader = ({
  project,
  isProjectOwner,
  deleting,
  deleteError,
  statusVariant,
  formatLabel,
  onBack,
  onEdit,
  onDelete,
}) => (
  <>
    <button className="project-back-link" type="button" onClick={onBack}>
      <span aria-hidden="true">←</span> Projects
    </button>
    <PageHeader
      eyebrow={isProjectOwner ? 'Owner workspace' : 'Shared workspace'}
      title={project.name}
      description={project.description || 'No description provided.'}
      actions={(
        <>
          <Badge variant={statusVariant(project.status)}>{formatLabel(project.status)}</Badge>
          {isProjectOwner && (
            <>
              <Button variant="secondary" onClick={onEdit}>Edit Project</Button>
              <Button variant="danger" onClick={onDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete Project'}
              </Button>
            </>
          )}
        </>
      )}
    />
    {isProjectOwner && deleteError && <Alert>{deleteError}</Alert>}
  </>
);

export default ProjectHeader;
