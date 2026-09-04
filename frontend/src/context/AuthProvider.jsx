import { useCallback, useEffect, useState } from 'react';
import api, { setAuthFailureHandler } from '../services/api';
import { AuthContext } from './AuthContext';

const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const newToken = response.data.token;
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(response.data.user);
    return response.data;
  };

  const register = async (name, email, password) => {
    const response = await api.post('/auth/register', { name, email, password });
    return response.data;
  };

  const clearAuth = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => setAuthFailureHandler(clearAuth), [clearAuth]);

  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(response.data.user);
      } catch (error) {
        if (error.response?.status === 401) clearAuth();
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [token, clearAuth]);

  return (
    <AuthContext.Provider value={{ token, user, loading, login, register, logout: clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
