import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import NotificationBell from '../components/NotificationBell';
import NotificationsProvider from '../context/NotificationsProvider';
import { NotificationsContext } from '../context/NotificationsContext';
import Notifications from '../pages/Notifications';
import api from '../services/api';
import { formatNotificationMessage, getNotificationTarget } from '../utils/notificationUtils';

const mockUser = { id: 'user-1', name: 'Member' };
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
vi.mock('../services/api', () => ({ default: { get: vi.fn(), patch: vi.fn() } }));

const projectId = '507f1f77bcf86cd799439011';
const unread = {
  _id: 'notification-1', type: 'task_assigned', actorName: 'Anusha', project: projectId,
  projectName: 'Orbit PM', entityName: 'Build Dashboard', readAt: null,
  createdAt: '2026-09-06T00:03:00.000Z',
};
const read = { ...unread, _id: 'notification-2', readAt: '2026-09-06T00:04:00.000Z' };

const renderPage = (context = {}) => {
  const value = {
    unreadCount: 1,
    decrementUnreadCount: vi.fn(),
    clearUnreadCount: vi.fn(),
    refreshUnreadCount: vi.fn(),
    ...context,
  };
  return { value, ...render(<NotificationsContext.Provider value={value}><MemoryRouter><Notifications /></MemoryRouter></NotificationsContext.Provider>) };
};

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue({ data: { notifications: [], nextCursor: null } });
});

describe('notification center', () => {
  test('shares one unread count across both accessible bell instances and caps the badge', async () => {
    api.get.mockResolvedValueOnce({ data: { unreadCount: 120 } });
    render(<NotificationsProvider><MemoryRouter><><NotificationBell /><NotificationBell /></></MemoryRouter></NotificationsProvider>);
    expect(await screen.findAllByRole('link', { name: 'Notifications, 120 unread' })).toHaveLength(2);
    expect(screen.getAllByText('99+')).toHaveLength(2);
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  test('keeps both bells usable when unread-count loading fails', async () => {
    api.get.mockRejectedValueOnce(new Error('network'));
    render(<NotificationsProvider><MemoryRouter><><NotificationBell /><NotificationBell /></></MemoryRouter></NotificationsProvider>);
    expect(await screen.findAllByRole('link', { name: 'Notifications, no unread notifications' })).toHaveLength(2);
    expect(screen.queryByText('99+')).not.toBeInTheDocument();
  });

  test('renders loading, empty, error and retry states', async () => {
    let rejectFirst;
    api.get.mockReturnValueOnce(new Promise((resolve, reject) => { rejectFirst = reject; }));
    renderPage({ unreadCount: 0 });
    expect(await screen.findByRole('status')).toHaveTextContent('Loading notifications...');
    rejectFirst({ response: { data: { message: 'Inbox unavailable.' } } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Inbox unavailable.');
    api.get.mockResolvedValueOnce({ data: { notifications: [], nextCursor: null } });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No notifications yet')).toBeInTheDocument();
  });

  test('renders safe semantic messages, snapshots, timestamps and navigation', async () => {
    api.get.mockResolvedValueOnce({ data: { notifications: [unread, { ...read, type: 'project_member_added' }], nextCursor: null } });
    renderPage();
    expect(await screen.findByText('Anusha assigned Build Dashboard to you.')).toBeInTheDocument();
    expect(screen.getByText('Anusha added you to Orbit PM.')).toBeInTheDocument();
    expect(screen.getAllByRole('time')).toHaveLength(2);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: 'View project' })[0]).toHaveAttribute('href', `/projects/${projectId}#project-tasks`);
    expect(formatNotificationMessage({ type: 'future_type', actorName: 'Owner', projectName: 'Orbit', metadata: { secret: 'hidden' } })).toBe('Owner updated something in Orbit.');
    expect(getNotificationTarget({ type: 'task_assigned', project: '../unsafe' })).toBeNull();
  });

  test('marks one notification only after success and preserves unread state on failure', async () => {
    api.get.mockResolvedValueOnce({ data: { notifications: [unread], nextCursor: null } });
    api.patch.mockResolvedValueOnce({ data: { notification: { ...unread, readAt: '2026-09-06T01:00:00.000Z' } } });
    const { value } = renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Mark as read' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Mark as read' })).not.toBeInTheDocument());
    expect(api.patch).toHaveBeenCalledWith('/notifications/notification-1/read');
    expect(value.decrementUnreadCount).toHaveBeenCalledTimes(1);

    api.get.mockResolvedValueOnce({ data: { notifications: [unread], nextCursor: null } });
    api.patch.mockRejectedValueOnce({ response: { data: { message: 'Could not update.' } } });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Mark as read' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not update.');
    expect(screen.getByText('Unread')).toBeInTheDocument();
  });

  test('marks all loaded unread items after success without replacing existing timestamps', async () => {
    api.get.mockResolvedValueOnce({ data: { notifications: [unread, read], nextCursor: null } });
    api.patch.mockResolvedValueOnce({ data: { modifiedCount: 1 } });
    const { value } = renderPage({ unreadCount: 2 });
    fireEvent.click(await screen.findByRole('button', { name: 'Mark all as read' }));
    await waitFor(() => expect(screen.getAllByText('Read')).toHaveLength(2));
    expect(api.patch).toHaveBeenCalledWith('/notifications/read-all');
    expect(value.clearUnreadCount).toHaveBeenCalledTimes(1);
  });

  test('preserves notifications and shared count when mark-all fails', async () => {
    api.get.mockResolvedValueOnce({ data: { notifications: [unread], nextCursor: null } });
    api.patch.mockRejectedValueOnce({ response: { data: { message: 'Read all failed.' } } });
    const { value } = renderPage({ unreadCount: 1 });
    fireEvent.click(await screen.findByRole('button', { name: 'Mark all as read' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Read all failed.');
    expect(screen.getByText('Unread')).toBeInTheDocument();
    expect(value.clearUnreadCount).not.toHaveBeenCalled();
  });

  test('loads older pages with a cursor and preserves loaded items on pagination failure', async () => {
    api.get.mockResolvedValueOnce({ data: { notifications: [unread], nextCursor: 'next cursor' } });
    api.get.mockResolvedValueOnce({ data: { notifications: [read], nextCursor: 'last' } });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Load more' }));
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2));
    expect(api.get).toHaveBeenNthCalledWith(2, '/notifications?cursor=next%20cursor');
    api.get.mockRejectedValueOnce({ response: { data: { message: 'More unavailable.' } } });
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('More unavailable.');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
