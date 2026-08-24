import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Projects from './pages/Projects';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
         path="/dashboard"
         element={
         <ProtectedRoute>
         <Dashboard />
         </ProtectedRoute>
  }
/>
        <Route path="*" element={<Navigate to="/login" replace />} />
        <Route
         path="/projects"
         element={
        <ProtectedRoute>
      <Projects />
    </ProtectedRoute>
  }
/>
      </Routes>
    </BrowserRouter>
  );
};

export default App;