import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { NotificationsContext } from './NotificationsContext';

const NotificationsProvider = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const requestIdRef = useRef(0);

  const refreshUnreadCount = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    if (!user) {
      setUnreadCount(0);
      return false;
    }

    try {
      const response = await api.get('/notifications/unread-count');
      if (requestId === requestIdRef.current) {
        setUnreadCount(Math.max(0, Number(response.data.unreadCount) || 0));
      }
      return true;
    } catch {
      return false;
    }
  }, [user]);

  useEffect(() => {
    const timer = window.setTimeout(refreshUnreadCount, 0);
    return () => {
      window.clearTimeout(timer);
      requestIdRef.current += 1;
    };
  }, [refreshUnreadCount]);

  const value = useMemo(() => ({
    unreadCount,
    refreshUnreadCount,
    decrementUnreadCount: () => setUnreadCount((count) => Math.max(0, count - 1)),
    clearUnreadCount: () => setUnreadCount(0),
  }), [refreshUnreadCount, unreadCount]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};

export default NotificationsProvider;
