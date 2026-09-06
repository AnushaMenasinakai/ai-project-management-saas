import Alert from '../components/Alert';
import Button from '../components/Button';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import NotificationItem from '../components/notifications/NotificationItem';
import PageHeader from '../components/PageHeader';
import { useNotificationsContext } from '../context/NotificationsContext';
import useNotifications from '../hooks/useNotifications';

const Notifications = () => {
  const { unreadCount } = useNotificationsContext();
  const state = useNotifications();

  return (
    <section className="notifications-page" aria-label="Notifications">
      <PageHeader eyebrow="Inbox" title="Notifications" description="Important project updates that directly affect you."
        actions={unreadCount > 0 && <Button disabled={state.markingAll} onClick={state.markAllRead}>{state.markingAll ? 'Marking all...' : 'Mark all as read'}</Button>}
      />
      <Card className="notifications-card">
        {state.loading && <LoadingState message="Loading notifications..." />}
        {!state.loading && state.error && <Alert><span>{state.error}</span>{' '}<button className="alert-link-button" type="button" onClick={state.fetchNotifications}>Try again</button></Alert>}
        {state.actionError && <Alert>{state.actionError}</Alert>}
        {!state.loading && !state.error && state.notifications.length === 0 && <EmptyState title="No notifications yet" description="Important project updates that affect you will appear here." />}
        {state.notifications.length > 0 && (
          <ul className="notification-list" aria-label="Your notifications">
            {state.notifications.map((notification) => <NotificationItem key={notification._id} notification={notification} pending={state.pendingIds.has(notification._id)} onMarkRead={state.markOneRead} />)}
          </ul>
        )}
        {state.loadMoreError && <Alert>{state.loadMoreError}</Alert>}
        {state.nextCursor && <div className="notifications-card__load-more"><Button variant="secondary" disabled={state.loadingMore} onClick={state.loadMore}>{state.loadingMore ? 'Loading more...' : 'Load more'}</Button></div>}
      </Card>
    </section>
  );
};

export default Notifications;
