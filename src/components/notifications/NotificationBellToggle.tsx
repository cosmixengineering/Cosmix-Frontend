import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bell, Inbox, X } from 'lucide-react';
import { useAuth } from '@/auth/use-auth';
import { request } from '@/services/api/http-client';
import { loadUnreadNotifications } from '@/services/notifications/unread-notifications';
import '@/styles/hr-dashboard.css';

export function NotificationBellToggle() {
  const { status, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const accountId = user?.account?.accountId;
  const ready = status === 'authenticated' && Boolean(accountId);
  const query = useQuery({
    queryKey: ['notifications', accountId, 'unread-preview'],
    queryFn: ({ signal }) => loadUnreadNotifications((path) => request(path, { signal })),
    enabled: ready,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  // A failed or pending refresh cannot turn cached records into a current inbox.
  const page = ready && !query.isError && !query.isFetching ? query.data : undefined;
  const unreadCount = page?.totalCount;

  useEffect(() => {
    function closeOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node))
        setIsOpen(false);
    }
    function closeEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('mousedown', closeOutside);
      document.addEventListener('keydown', closeEscape);
    }
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('keydown', closeEscape);
    };
  }, [isOpen]);

  return (
    <div className="hr-notification-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className={`hr-notification-bell ${isOpen ? 'active' : ''}`}
        aria-label={
          unreadCount === undefined ? 'Notifications' : `${unreadCount} unread notifications`
        }
        aria-expanded={isOpen}
        title="Notifications"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && ready) void query.refetch();
        }}
      >
        <Bell size={17} />
        {unreadCount !== undefined && unreadCount > 0 && (
          <span className="hr-notification-counter">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>
      {isOpen && (
        <section className="hr-notification-dropdown" aria-label="Your notifications">
          <div className="hr-noti-header">
            <h2>Notifications</h2>
            <button type="button" aria-label="Close notifications" onClick={() => setIsOpen(false)}>
              <X size={16} />
            </button>
          </div>
          <div className="hr-noti-list">
            {!ready || query.isFetching ? (
              <p role="status">Loading your notifications…</p>
            ) : query.isError ? (
              <div role="alert">
                <p>Notifications could not be loaded.</p>
                <button type="button" onClick={() => void query.refetch()}>
                  Retry
                </button>
              </div>
            ) : page?.items.length === 0 ? (
              <div className="hr-noti-empty">
                <Inbox size={24} />
                <p>No unread notifications.</p>
              </div>
            ) : (
              page?.items.map((item) => (
                <article className="hr-noti-item unread" key={item.id}>
                  <div className="hr-noti-content">
                    <h3 className="hr-noti-item-title">{item.title}</h3>
                    <p className="hr-noti-item-body">{item.body}</p>
                    <time dateTime={item.createdAt}>
                      {new Date(item.createdAt).toLocaleString()}
                    </time>
                  </div>
                </article>
              ))
            )}
          </div>
          <div className="hr-noti-footer">
            <Link
              className="hr-noti-view-link"
              to="/account/notifications"
              onClick={() => setIsOpen(false)}
            >
              View and manage my notifications
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
