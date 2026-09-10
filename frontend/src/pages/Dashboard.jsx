import { Link, Navigate } from 'react-router-dom';
import Alert from '../components/Alert';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import useDashboardData from '../hooks/useDashboardData';
import { formatActivityTimestamp } from '../utils/activityUtils';
import { formatHealthReason, formatHealthStatus, formatUtcDate, healthStatusVariant } from '../utils/projectHealthUtils';

const projectStatusVariants = { planning: 'info', active: 'success', completed: 'primary', archived: 'neutral' };
const formatProjectStatus = (status) => status ? `${status.charAt(0).toUpperCase()}${status.slice(1)}` : 'Unknown';
const firstName = (name) => {
  const value = name?.trim().split(/\s+/)[0] || 'there';
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
};
const healthSummary = (health) => {
  if (health.reasons?.[0]) return formatHealthReason(health.reasons[0]);
  if (health.status === 'healthy') return 'No current health rules require attention.';
  if (health.status === 'insufficient_data') return 'Add tasks to begin evaluating project health.';
  return 'Review the project health details for current concerns.';
};

const MetricCard = ({ label, value, detail, icon }) => (
  <Card className="dashboard-metric-card" aria-label={`${label}: ${value}`}>
    <span className="dashboard-metric-card__icon" aria-hidden="true">{icon}</span>
    <div><p>{label}</p><strong>{value}</strong><span>{detail}</span></div>
  </Card>
);

const Dashboard = () => {
  const { user, loading } = useAuth();
  const { summary, recentProjects, recentActivity, loading: dashboardLoading, error, activityError, healthError, retry } = useDashboardData(user?._id || user?.id);

  if (loading) return <LoadingState message="Loading your workspace..." />;
  if (!user) return <Navigate to="/login" replace />;

  const primaryProject = recentProjects[0];
  const projectAction = (hash = '') => primaryProject ? `/projects/${primaryProject._id}${hash}` : '/projects';

  return (
    <div className="page dashboard-page">
      <PageHeader eyebrow="Dashboard" title={<>Welcome back, {firstName(user.name)} <span aria-hidden="true">👋</span></>} description="Here’s what’s happening across your projects." />

      {dashboardLoading && <LoadingState message="Loading dashboard data..." />}
      {error && <Alert title="Dashboard data could not be loaded"><p>{error}</p><Button variant="secondary" onClick={retry}>Retry</Button></Alert>}

      {!dashboardLoading && !error && summary.totalProjects === 0 && (
        <EmptyState icon={<span aria-hidden="true">＋</span>} title="No projects yet" description="Create your first project to start planning work, adding tasks, collaborating with members, and using AI tools." action={<Link className="button" to="/projects">Create project</Link>} />
      )}

      {!dashboardLoading && !error && summary.totalProjects > 0 && <>
        <section className="dashboard-metrics" aria-label="Workspace summary">
          <MetricCard label="Projects" value={summary.totalProjects} detail="Visible workspaces" icon="▦" />
          <MetricCard label="Tasks" value={summary.totalTasks} detail="Across all projects" icon="☷" />
          <MetricCard label="Completed" value={summary.completedTasks} detail="Tasks finished" icon="✓" />
          <MetricCard label="Progress" value={summary.overallProgressPercentage === null ? 'No tasks yet' : `${summary.overallProgressPercentage}%`} detail="Overall completion" icon="◔" />
        </section>

        <section className="dashboard-section" aria-labelledby="recent-projects-heading">
          <div className="dashboard-section__heading"><div><p className="section-heading__eyebrow">Workspace</p><h2 id="recent-projects-heading">Recent Projects</h2></div><Link className="dashboard-text-link" to="/projects">View all</Link></div>
          <div className="dashboard-project-grid">
            {recentProjects.map((project) => (
              <Card as="article" className="dashboard-project-card" key={project._id}>
                <div className="dashboard-project-card__header"><h3>{project.name}</h3><Badge variant={projectStatusVariants[project.status] || 'neutral'}>{formatProjectStatus(project.status)}</Badge></div>
                <p className="dashboard-project-card__description">{project.description || 'No description provided.'}</p>
                <dl className="dashboard-project-card__facts">
                  <div><dt>Tasks</dt><dd>{project.totalTasks}</dd></div><div><dt>Completed</dt><dd>{project.completedTasks}</dd></div>
                  {project.memberCount !== null && <div><dt>Members</dt><dd>{project.memberCount}</dd></div>}
                  <div><dt>Due</dt><dd>{project.dueDate ? <time dateTime={project.dueDate}>{formatUtcDate(project.dueDate)}</time> : 'No due date'}</dd></div>
                </dl>
                <div className="dashboard-project-card__progress"><div><span>Progress</span><strong>{project.progressPercentage === null ? 'No tasks yet' : `${project.progressPercentage}%`}</strong></div>
                  {project.progressPercentage !== null && <div className="project-progress__track" role="progressbar" aria-label={`${project.name} progress`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={project.progressPercentage}><span style={{ width: `${project.progressPercentage}%` }} /></div>}
                </div>
                <Link className="button button--secondary dashboard-project-card__action" to={`/projects/${project._id}`}>Open project <span aria-hidden="true">→</span></Link>
              </Card>
            ))}
          </div>
        </section>

        <div className="dashboard-detail-grid">
          <Card className="dashboard-panel" aria-labelledby="project-health-preview-heading">
            <div className="dashboard-section__heading"><div><p className="section-heading__eyebrow">Deterministic overview</p><h2 id="project-health-preview-heading">Project Health</h2></div></div>
            {healthError && <p className="dashboard-inline-error" role="status">{healthError}</p>}
            <ul className="dashboard-health-list">{recentProjects.map((project) => <li key={project._id}>
              <div className="dashboard-health-list__content"><div><h3>{project.name}</h3>{project.health ? <Badge variant={healthStatusVariant(project.health.status)}>{project.health.status === 'insufficient_data' ? 'Not enough data' : formatHealthStatus(project.health.status)}</Badge> : <Badge variant="neutral">Unavailable</Badge>}</div>
                <p>{project.health ? healthSummary(project.health) : 'Health data is temporarily unavailable for this project.'}</p></div>
              <Link className="dashboard-row-link" to={`/projects/${project._id}#project-health`}>View health</Link>
            </li>)}</ul>
          </Card>

          <Card className="dashboard-panel" aria-labelledby="recent-activity-heading">
            <div className="dashboard-section__heading"><div><p className="section-heading__eyebrow">Latest changes</p><h2 id="recent-activity-heading">Recent Activity</h2></div></div>
            {activityError && <p className="dashboard-inline-error" role="status">{activityError}</p>}
            {recentActivity.length === 0 ? <p className="dashboard-panel__empty">No recent activity yet.</p> : <ol className="dashboard-activity-list">{recentActivity.map((activity) => <li key={`${activity.projectId}-${activity._id}`}>
              <span className="dashboard-activity-list__marker" aria-hidden="true" /><div><p>{activity.message}</p><span>{activity.projectName}{activity.createdAt && <> · <time dateTime={activity.createdAt}>{formatActivityTimestamp(activity.createdAt)}</time></>}</span></div>
            </li>)}</ol>}
          </Card>
        </div>

        <section className="dashboard-section" aria-labelledby="ai-quick-actions-heading">
          <div className="dashboard-section__heading"><div><p className="section-heading__eyebrow">Shortcuts</p><h2 id="ai-quick-actions-heading">AI Quick Actions</h2><p>Open an existing workspace tool—AI runs only when you choose an action there.</p></div></div>
          <nav className="dashboard-quick-actions" aria-label="Project and AI quick actions">
            <Link className="dashboard-quick-action" to="/projects"><strong>Open Projects</strong><span>Choose a workspace</span></Link>
            <Link className="dashboard-quick-action" to={projectAction('#project-qa')}><strong>Ask Project Q&amp;A</strong><span>{primaryProject ? primaryProject.name : 'Choose a project first'}</span></Link>
            <Link className="dashboard-quick-action" to={projectAction('#project-documents')}><strong>Open Documents</strong><span>{primaryProject ? primaryProject.name : 'Choose a project first'}</span></Link>
            <Link className="dashboard-quick-action" to={projectAction('#project-tasks')}><strong>Generate Tasks</strong><span>{primaryProject ? primaryProject.name : 'Choose a project first'}</span></Link>
          </nav>
        </section>
      </>}
    </div>
  );
};

export default Dashboard;
