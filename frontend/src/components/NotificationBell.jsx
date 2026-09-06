import { NavLink } from 'react-router-dom';
import { useNotificationsContext } from '../context/NotificationsContext';

const NotificationBell = ({ className = '' }) => {
  const { unreadCount } = useNotificationsContext();
  const label = unreadCount > 0
    ? `Notifications, ${unreadCount} unread`
    : 'Notifications, no unread notifications';

  return (
    <NavLink className={`notification-bell ${className}`.trim()} to="/notifications" aria-label={label}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </svg>
      {unreadCount > 0 && <span className="notification-bell__badge" aria-hidden="true">{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </NavLink>
  );
};

export default NotificationBell;
