import { Link } from 'react-router-dom';
import Button from '../Button';
import { formatNotificationMessage, formatNotificationTimestamp, getNotificationTarget } from '../../utils/notificationUtils';

const NotificationItem = ({ notification, pending, onMarkRead }) => {
  const target = getNotificationTarget(notification);
  const unread = !notification.readAt;
  return (
    <li className={`notification-item${unread ? ' notification-item--unread' : ''}`} aria-busy={pending || undefined}>
      <div className="notification-item__content">
        <span className="notification-item__state">{unread ? 'Unread' : 'Read'}</span>
        <p>{formatNotificationMessage(notification)}</p>
        <time dateTime={notification.createdAt}>{formatNotificationTimestamp(notification.createdAt)}</time>
      </div>
      <div className="notification-item__actions">
        {unread && <Button variant="secondary" disabled={pending} onClick={() => onMarkRead(notification)}>{pending ? 'Marking...' : 'Mark as read'}</Button>}
        {target && <Link className="button button--secondary" to={target}>View project</Link>}
      </div>
    </li>
  );
};

export default NotificationItem;
