import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
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
        <Route
        path="/projects/:id"
        element={
       <ProtectedRoute>
      <ProjectDetails />
    </ProtectedRoute>
  }
/>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
