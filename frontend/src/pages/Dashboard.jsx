import { Navigate, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import LoadingState from '../components/LoadingState';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingState message="Loading your workspace..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="page dashboard-page">
      <PageHeader
        eyebrow="Welcome back"
        title={`Welcome back, ${user.name}`}
        description="Plan work, collaborate with your team, and turn project context into action with AI."
      />

      <Card className="dashboard-next-step" aria-labelledby="dashboard-next-step-title">
          <div className="dashboard-next-step__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M5 4h5l2 2h7a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a2 2 0 0 1 2-2Zm1 4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H6Z" />
            </svg>
          </div>
          <div>
            <p className="dashboard-next-step__label">Project workspace</p>
            <h2 id="dashboard-next-step-title">Your projects, one place</h2>
            <p>Open your project workspace to manage tasks, documents, members, and AI tools.</p>
          </div>
          <Button onClick={() => navigate('/projects')}>
            Open projects
          </Button>
      </Card>

      <section className="dashboard-guidance" aria-labelledby="dashboard-guidance-title">
        <div className="section-heading">
          <p className="section-heading__eyebrow">Workspace tools</p>
          <h2 id="dashboard-guidance-title">Everything your project needs</h2>
          <p>Use these capabilities within each project workspace.</p>
        </div>

        <div className="dashboard-guidance__grid">
          <Card className="guidance-card">
            <span className="guidance-card__number" aria-hidden="true">01</span>
            <h3>Organize the work</h3>
            <p>Create tasks, set priorities and due dates, and keep dependencies visible.</p>
          </Card>
          <Card className="guidance-card">
            <span className="guidance-card__number" aria-hidden="true">02</span>
            <h3>Share project context</h3>
            <p>Bring members and project documents together in one focused workspace.</p>
          </Card>
          <Card className="guidance-card">
            <span className="guidance-card__number" aria-hidden="true">03</span>
            <h3>Work with AI</h3>
            <p>Ask questions across project documents and generate an actionable task plan.</p>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
