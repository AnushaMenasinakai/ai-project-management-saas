import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div>
      <h1>Dashboard</h1>

      <h2>Welcome, {user.name}!</h2>

      <p>Email: {user.email}</p>

      <button type="button" onClick={() => navigate('/projects')}>
        View Projects
      </button>

      <button type="button" onClick={logout}>
        Logout
      </button>
    </div>
  );
};

export default Dashboard;
