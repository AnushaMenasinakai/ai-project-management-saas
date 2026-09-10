import { useEffect } from 'react';
import useProjectActivity from '../../hooks/useProjectActivity';
import Alert from '../Alert';
import Button from '../Button';
import Card from '../Card';
import LoadingState from '../LoadingState';
import ActivityItem from './ActivityItem';

const ActivitySection = ({ projectId, active = false }) => {
  const {
    activities,
    initialized,
    loading,
    error,
    nextCursor,
    loadingMore,
    loadMoreError,
    fetchActivities,
    loadMore,
  } = useProjectActivity(projectId);

  useEffect(() => {
    if (active) fetchActivities();
  }, [active, fetchActivities]);

  return (
    <Card
      id="project-activity"
      className="activity-section workspace-section"
      aria-labelledby="activity-heading"
    >
      <div className="section-heading activity-section__header">
        <div>
          <p className="section-eyebrow">Project history</p>
          <h2 id="activity-heading">Activity</h2>
          <p>A chronological record of system-generated changes across this project.</p>
        </div>
        {!initialized && (
          <Button variant="secondary" onClick={fetchActivities}>
            Load activity
          </Button>
        )}
      </div>

      {loading && <LoadingState message="Loading project activity..." />}
      {initialized && error && (
        <Alert>
          <span>{error}</span>{' '}
          <button type="button" className="alert-link-button" onClick={() => fetchActivities({ force: true })}>
            Try again
          </button>
        </Alert>
      )}
      {initialized && !loading && !error && activities.length === 0 && (
        <div className="activity-empty" role="status">
          <strong>No activity yet</strong>
          <p>Project changes will appear here as they happen.</p>
        </div>
      )}
      {activities.length > 0 && (
        <ol className="activity-timeline" aria-label="Project activity">
          {activities.map((activity) => (
            <ActivityItem key={activity._id} activity={activity} />
          ))}
        </ol>
      )}

      {loadMoreError && <Alert>{loadMoreError}</Alert>}
      {nextCursor && (
        <div className="activity-section__actions">
          <Button variant="secondary" disabled={loadingMore} onClick={loadMore}>
            {loadingMore ? 'Loading more...' : 'Load more'}
          </Button>
        </div>
      )}
    </Card>
  );
};

export default ActivitySection;
