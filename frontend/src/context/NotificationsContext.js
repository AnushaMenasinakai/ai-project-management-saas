import { createContext, useContext } from 'react';

export const NotificationsContext = createContext(null);

const defaultValue = {
  unreadCount: 0,
  refreshUnreadCount: async () => false,
  decrementUnreadCount: () => {},
  clearUnreadCount: () => {},
};

export const useNotificationsContext = () => useContext(NotificationsContext) || defaultValue;
