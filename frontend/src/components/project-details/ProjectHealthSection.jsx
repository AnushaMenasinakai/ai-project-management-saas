import { useEffect } from 'react';
import useProjectHealth from '../../hooks/useProjectHealth';
import useProjectHealthInsight from '../../hooks/useProjectHealthInsight';
import {
  formatHealthIssue,
  formatHealthPriority,
  formatHealthReason,
  formatHealthStatus,
  formatHealthTaskStatus,
  formatProjectDueStatus,
  formatUtcDate,
  healthStatusVariant,
} from '../../utils/projectHealthUtils';
import Alert from '../Alert';
import Badge from '../Badge';
import Button from '../Button';
import Card from '../Card';
import LoadingState from '../LoadingState';

const metricItems = [
  ['totalTasks', 'Total tasks'],
  ['completedTasks', 'Completed'],
  ['inProgressTasks', 'In progress'],
  ['todoTasks', 'To do'],
  ['overdueTasks', 'Overdue'],
  ['dueSoonTasks', 'Due soon'],
  ['highPriorityIncompleteTasks', 'High priority incomplete'],
  ['unassignedIncompleteTasks', 'Unassigned incomplete'],
  ['blockedTasks', 'Blocked'],
];

const ProjectHealthSection = ({ projectId, active = false }) => {
  const {
    health, initialized, loading, error, refreshError, fetchHealth, setHealthSnapshot,
  } = useProjectHealth(projectId);
  const {
    insight, generatedAt, healthAsOf, generating, error: insightError, generateInsight,
  } = useProjectHealthInsight(projectId);

  useEffect(() => {
    if (active) fetchHealth();
  }, [active, fetchHealth]);

  const metrics = health?.metrics;
  const hasTasks = Boolean(metrics?.totalTasks);
  const insightIsStale = Boolean(insight && health?.asOf && healthAsOf !== health.asOf);
  const handleGenerateInsight = async () => {
    const healthAsOfAtRequest = health?.asOf;
    const result = await generateInsight();
    if (result?.health) setHealthSnapshot(result.health, healthAsOfAtRequest);
  };

  return (
    <Card
      id="project-health"
      className="project-health workspace-section"
      aria-labelledby="project-health-heading"
    >
      <div className="section-heading project-health__header">
        <div>
          <p className="section-eyebrow">Current project data</p>
          <h2 id="project-health-heading">Health</h2>
          <p>Transparent indicators based on tasks, deadlines, assignments, and dependencies.</p>
        </div>
        {!initialized ? (
          <Button variant="secondary" onClick={fetchHealth}>Load health</Button>
        ) : (
          <Button variant="secondary" disabled={loading} onClick={() => fetchHealth({ force: true })}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        )}
      </div>

      {loading && !health && <LoadingState message="Loading project health..." />}
      {error && (
        <Alert>
          <span>{error}</span>{' '}
          <button type="button" className="alert-link-button" onClick={() => fetchHealth({ force: true })}>
            Try again
          </button>
        </Alert>
      )}
      {refreshError && <Alert>{refreshError} The previous health result is still shown.</Alert>}

      {health && (
        <div className="project-health__content">
          <section className="project-health__summary" aria-labelledby="health-summary-heading">
            <div>
              <p className="section-eyebrow">Overall status</p>
              <h3 id="health-summary-heading">
                <Badge variant={healthStatusVariant(health.status)}>{formatHealthStatus(health.status)}</Badge>
              </h3>
              <p>This classification reflects current project data and transparent rules; it is not a guaranteed prediction.</p>
            </div>
            <div className="project-health__due">
              <strong>Project due status</strong>
              <span>{formatProjectDueStatus(health.project?.dueDateStatus)}</span>
              {health.project?.dueDate && (
                <time dateTime={health.project.dueDate}>{formatUtcDate(health.project.dueDate)}</time>
              )}
            </div>
          </section>

          <section aria-labelledby="health-progress-heading">
            <div className="project-health__section-title">
              <h3 id="health-progress-heading">Completion progress</h3>
              <span>{hasTasks ? `${metrics.completedTasks} of ${metrics.totalTasks} tasks` : 'No tasks yet'}</span>
            </div>
            {hasTasks ? (
              <div className="project-health__progress">
                <progress value={metrics.completionPercentage} max="100" aria-label="Project task completion" />
                <strong>{metrics.completionPercentage}%</strong>
              </div>
            ) : (
              <p>Health indicators become useful after tasks are added.</p>
            )}
          </section>

          <section aria-labelledby="health-metrics-heading">
            <h3 id="health-metrics-heading">Metrics</h3>
            <dl className="project-health__metrics">
              {metricItems.map(([key, label]) => (
                <div className="project-health__metric" key={key}>
                  <dt>{label}</dt>
                  <dd>{metrics[key]}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="health-reasons-heading">
            <h3 id="health-reasons-heading">Why this status</h3>
            {health.reasons.length ? (
              <ul className="project-health__reasons">
                {health.reasons.map((reason, index) => (
                  <li key={`${reason}-${index}`}>{formatHealthReason(reason)}</li>
                ))}
              </ul>
            ) : (
              <p>No current rule-based health concerns were identified.</p>
            )}
          </section>

          <section aria-labelledby="attention-tasks-heading">
            <h3 id="attention-tasks-heading">Tasks needing attention</h3>
            {health.attentionTasks.length === 0 ? (
              <p className="project-health__empty">No tasks currently need attention.</p>
            ) : (
              <ul className="project-health__tasks">
                {health.attentionTasks.map((task) => (
                  <li className="project-health__task" key={task._id}>
                    <div className="project-health__task-heading">
                      <strong>{task.title}</strong>
                      <span>{formatHealthTaskStatus(task.status)} · {formatHealthPriority(task.priority)}</span>
                    </div>
                    {task.dueDate && <time dateTime={task.dueDate}>Due {formatUtcDate(task.dueDate)}</time>}
                    <ul className="project-health__issues" aria-label={`Issues for ${task.title}`}>
                      {task.issues.map((issue) => <li key={issue}>{formatHealthIssue(issue)}</li>)}
                    </ul>
                    {task.blockingDependencies?.length > 0 && (
                      <div className="project-health__dependencies">
                        <strong>Waiting on</strong>
                        <ul>
                          {task.blockingDependencies.map((dependency) => (
                            <li key={dependency._id}>
                              {dependency.title} ({formatHealthTaskStatus(dependency.status)})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="project-health__as-of">
            Evaluated <time dateTime={health.asOf}>{new Date(health.asOf).toLocaleString()}</time>
          </p>

          <section className="project-health__insight" aria-labelledby="health-insight-heading">
            <div className="project-health__section-title">
              <div>
                <h3 id="health-insight-heading">AI insight</h3>
                <p>Generate an explanation and suggested next steps from the health facts above.</p>
              </div>
              <Button disabled={generating} onClick={handleGenerateInsight}>
                {generating ? 'Generating...' : insight ? 'Generate again' : 'Generate AI insight'}
              </Button>
            </div>
            {generating && <LoadingState message="Generating AI health insight..." />}
            {insightError && (
              <Alert>
                <span>{insightError}</span>{' '}
                <button type="button" className="alert-link-button" disabled={generating} onClick={handleGenerateInsight}>
                  Try again
                </button>
              </Alert>
            )}
            {insight && (
              <div className="project-health__insight-result">
                {insightIsStale && (
                  <Alert variant="info">Health data has changed since this insight was generated. Generate again for an updated view.</Alert>
                )}
                <div><h4>Summary</h4><p>{insight.summary}</p></div>
                <div>
                  <h4>Key concerns</h4>
                  {insight.keyConcerns.length
                    ? <ul>{insight.keyConcerns.map((concern, index) => <li key={index}>{concern}</li>)}</ul>
                    : <p>No additional concerns were identified.</p>}
                </div>
                <div>
                  <h4>Suggested actions</h4>
                  {insight.suggestedActions.length
                    ? <ul>{insight.suggestedActions.map((action, index) => <li key={index}>{action}</li>)}</ul>
                    : <p>No additional actions were suggested.</p>}
                </div>
                <p className="project-health__insight-note">Review AI suggestions before acting; they are not guarantees.</p>
                {generatedAt && (
                  <p className="project-health__as-of">Generated <time dateTime={generatedAt}>{new Date(generatedAt).toLocaleString()}</time></p>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </Card>
  );
};

export default ProjectHealthSection;
