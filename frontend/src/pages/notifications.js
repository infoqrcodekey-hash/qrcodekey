import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { notificationAPI } from '@/lib/api';

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all'); // all, unread

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationAPI.getAll(1, filter === 'unread');
      setNotifications(res.data.data || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, recipients: n.recipients?.map(r => ({ ...r, read: true })) } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) { console.error(err); }
  };

  const markAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, recipients: n.recipients?.map(r => ({ ...r, read: true })) })));
      setUnreadCount(0);
    } catch (err) { console.error(err); }
  };

  const getIcon = (type) => {
    const icons = {
      clock_in: '✅', clock_out: '🚪', absent: '❌', late: '⏰',
      leave_request: '📋', leave_approved: '✅', leave_rejected: '❌',
      emergency: '🚨', visitor: '👤', overtime: '⏱️', holiday: '🎉',
      shift_change: '🔄', report_ready: '📊'
    };
    return icons[type] || '🔔';
  };

  const getPriorityColor = (priority) => {
    const colors = { low: 'text-gray-400', normal: 'text-blue-400', high: 'text-yellow-400', urgent: 'text-red-400' };
    return colors[priority] || 'text-blue-400';
  };

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white">
      <Head><title>Notifications - QRcodeKey</title></Head>

      <div className="max-w-2xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white">← Back</button>
          <h1 className="text-xl font-bold text-purple-400">🔔 Notifications</h1>
          <span className="bg-purple-600 text-xs px-2 py-1 rounded-full">{unreadCount}</span>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          {['all', 'unread'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${filter === f ? 'bg-purple-600' : 'bg-white/5 hover:bg-white/10'}`}>
              {f}
            </button>
          ))}
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="ml-auto text-xs text-purple-400 hover:text-purple-300">
              Mark all read
            </button>
          )}
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="text-center py-10"><div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto"></div></div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <div className="text-4xl mb-2">🔔</div>
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => {
              const isUnread = n.recipients?.some(r => !r.read);
              return (
                <div key={n._id} onClick={() => isUnread && markRead(n._id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${isUnread ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/5 border-white/5'}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm truncate">{n.title}</h3>
                        {isUnread && <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0"></span>}
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{n.message}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-500">{timeAgo(n.createdAt)}</span>
                        <span className={`text-xs ${getPriorityColor(n.priority)}`}>{n.priority}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
