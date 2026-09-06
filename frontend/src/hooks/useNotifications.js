import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { useNotificationsContext } from '../context/NotificationsContext';

const useNotifications = () => {
  const { decrementUnreadCount, clearUnreadCount } = useNotificationsContext();
  const [notifications, setNotifications] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState('');
  const [actionError, setActionError] = useState('');
  const [pendingIds, setPendingIds] = useState(new Set());
  const [markingAll, setMarkingAll] = useState(false);
  const pendingIdsRef = useRef(new Set());
  const markingAllRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.notifications);
      setNextCursor(response.data.nextCursor);
      return true;
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load notifications.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(fetchNotifications, 0);
    return () => window.clearTimeout(timer);
  }, [fetchNotifications]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return false;
    const cursor = nextCursor;
    setLoadingMore(true);
    setLoadMoreError('');
    try {
      const response = await api.get(`/notifications?cursor=${encodeURIComponent(cursor)}`);
      setNotifications((current) => [...current, ...response.data.notifications]);
      setNextCursor(response.data.nextCursor);
      return true;
    } catch (requestError) {
      setLoadMoreError(requestError.response?.data?.message || 'Failed to load more notifications.');
      return false;
    } finally {
      setLoadingMore(false);
    }
  };

  const markOneRead = async (notification) => {
    const id = notification?._id;
    if (!id || notification.readAt || pendingIdsRef.current.has(id)) return false;
    pendingIdsRef.current.add(id);
    setPendingIds(new Set(pendingIdsRef.current));
    setActionError('');
    try {
      const response = await api.patch(`/notifications/${id}/read`);
      setNotifications((current) => current.map((item) => item._id === id ? response.data.notification : item));
      if (response.data.notification?.readAt) decrementUnreadCount();
      return true;
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || 'Could not mark the notification as read.');
      return false;
    } finally {
      pendingIdsRef.current.delete(id);
      setPendingIds(new Set(pendingIdsRef.current));
    }
  };

  const markAllRead = async () => {
    if (markingAllRef.current) return false;
    markingAllRef.current = true;
    setMarkingAll(true);
    setActionError('');
    try {
      await api.patch('/notifications/read-all');
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((item) => item.readAt ? item : { ...item, readAt }));
      clearUnreadCount();
      return true;
    } catch (requestError) {
      setActionError(requestError.response?.data?.message || 'Could not mark all notifications as read.');
      return false;
    } finally {
      markingAllRef.current = false;
      setMarkingAll(false);
    }
  };

  return { notifications, nextCursor, loading, error, loadingMore, loadMoreError, actionError, pendingIds, markingAll, fetchNotifications, loadMore, markOneRead, markAllRead };
};

export default useNotifications;
