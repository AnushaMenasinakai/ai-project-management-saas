import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { NotificationsContext } from './NotificationsContext';

const NotificationsProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?._id || user?.id || null;
  const [unreadState, setUnreadState] = useState({ userId: null, count: 0 });
  const requestIdRef = useRef(0);

  const refreshUnreadCount = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    if (!userId) {
      setUnreadState({ userId: null, count: 0 });
      return false;
    }

    try {
      const response = await api.get('/notifications/unread-count');
      if (requestId === requestIdRef.current) {
        setUnreadState({
          userId,
          count: Math.max(0, Number(response.data.unreadCount) || 0),
        });
      }
      return true;
    } catch {
      return false;
    }
  }, [userId]);

  useEffect(() => {
    const timer = window.setTimeout(refreshUnreadCount, 0);
    return () => {
      window.clearTimeout(timer);
      requestIdRef.current += 1;
    };
  }, [refreshUnreadCount]);

  const unreadCount = unreadState.userId === userId ? unreadState.count : 0;
  const value = useMemo(() => ({
    unreadCount,
    refreshUnreadCount,
    decrementUnreadCount: () => setUnreadState((current) => (
      current.userId === userId
        ? { ...current, count: Math.max(0, current.count - 1) }
        : current
    )),
    clearUnreadCount: () => setUnreadState({ userId, count: 0 }),
  }), [refreshUnreadCount, unreadCount, userId]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};

export default NotificationsProvider;
