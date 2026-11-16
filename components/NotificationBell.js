"use client";

import { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  X,
  Mail,
  MessageSquare,
  AlertCircle,
  Calendar,
  FlaskConical,
  Bed,
  KeyRound,
  Wrench,
  UserPlus,
  Clock,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

export default function NotificationBell({ role = 'admin' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
  const popoverRef = useRef(null);

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications?limit=25', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    }
  }

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 25000); // 25s auto-refresh
    return () => clearInterval(interval);
  }, []);

  // Click outside and escape key handling
  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  async function handleMarkAsRead(notifId) {
    try {
      const res = await fetch(`/api/notifications/${notifId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'read' }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.notificationId === notifId ? { ...n, deliveryStatus: { ...n.deliveryStatus, inApp: 'read' } } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.warn('Error marking notification as read:', err);
    }
  }

  async function handleMarkAllAsRead() {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', { method: 'PATCH' });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, deliveryStatus: { ...n.deliveryStatus, inApp: 'read' } }))
        );
        setUnreadCount(0);
      }
    } catch (err) {
      console.warn('Error marking all as read:', err);
    } finally {
      setLoading(false);
    }
  }

  function getNotificationIcon(type) {
    switch (type) {
      case 'PATIENT_REGISTRATION':
        return <UserPlus size={16} className="text-primary" />;
      case 'APPOINTMENT_CONFIRMATION':
      case 'APPOINTMENT_RESCHEDULED':
        return <Calendar size={16} className="text-blue-500" />;
      case 'LAB_REPORT_READY':
        return <FlaskConical size={16} className="text-emerald-500" />;
      case 'LAB_PAYMENT_PENDING':
        return <AlertCircle size={16} className="text-amber-500" />;
      case 'INPATIENT_ADMISSION':
      case 'INPATIENT_DISCHARGE':
        return <Bed size={16} className="text-purple-500" />;
      case 'STAFF_CREDENTIALS':
        return <KeyRound size={16} className="text-indigo-500" />;
      case 'LEAVE_STATUS_UPDATE':
        return <Clock size={16} className="text-teal-500" />;
      case 'EQUIPMENT_MAINTENANCE_DUE':
        return <Wrench size={16} className="text-orange-500" />;
      default:
        return <Bell size={16} className="text-primary" />;
    }
  }

  function formatTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffSecs = Math.floor((now - date) / 1000);
    if (diffSecs < 60) return 'Just now';
    if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  const displayedList = activeTab === 'unread'
    ? notifications.filter((n) => n.deliveryStatus?.inApp === 'unread')
    : notifications;

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        aria-label="Open notifications"
        className="cursor-pointer relative p-2.5 rounded-xl border border-outline-variant/30 text-on-surface hover:bg-surface-container transition-all flex items-center justify-center"
      >
        <Bell size={18} className="text-outline hover:text-on-surface" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white shadow-xs animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-2xl z-50 overflow-hidden animate-fade-in text-on-surface">
          {/* Header */}
          <div className="p-4 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container/30">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  disabled={loading}
                  title="Mark all as read"
                  className="cursor-pointer p-1.5 rounded-lg text-outline hover:text-primary text-xs font-semibold flex items-center gap-1 hover:bg-surface-container transition-all"
                >
                  {loading ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={14} />}
                  <span className="hidden sm:inline text-[11px]">Mark read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="cursor-pointer p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-all"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Tab Filter */}
          <div className="px-4 py-2 border-b border-outline-variant/10 flex gap-2 text-xs bg-surface-container-lowest">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`cursor-pointer px-3 py-1 rounded-lg font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-primary text-on-primary'
                  : 'text-outline hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('unread')}
              className={`cursor-pointer px-3 py-1 rounded-lg font-semibold transition-all ${
                activeTab === 'unread'
                  ? 'bg-primary text-on-primary'
                  : 'text-outline hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notifications Scroll List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-outline-variant/10">
            {displayedList.length === 0 ? (
              <div className="p-8 text-center text-outline text-xs space-y-2">
                <Bell size={24} className="mx-auto opacity-30" />
                <p>No {activeTab === 'unread' ? 'unread' : ''} notifications found.</p>
              </div>
            ) : (
              displayedList.map((n) => {
                const isUnread = n.deliveryStatus?.inApp === 'unread';
                return (
                  <div
                    key={n.notificationId || n._id}
                    onClick={() => {
                      if (isUnread) handleMarkAsRead(n.notificationId);
                    }}
                    className={`p-3.5 hover:bg-surface-container/40 transition-colors flex items-start gap-3 cursor-pointer ${
                      isUnread ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-surface-container border border-outline-variant/20 shrink-0 mt-0.5">
                      {getNotificationIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-xs truncate text-on-surface">
                          {n.title}
                        </span>
                        <span className="text-[10px] text-outline shrink-0 font-mono">
                          {formatTime(n.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-outline line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        {n.channels?.includes('email') && (
                          <span
                            title={`Email: ${n.deliveryStatus?.email || 'pending'}`}
                            className="flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant/20 text-outline"
                          >
                            <Mail size={10} />
                            {n.deliveryStatus?.email === 'sent' ? 'Sent' : n.deliveryStatus?.email}
                          </span>
                        )}
                        {n.channels?.includes('whatsapp') && (
                          <span
                            title={`WhatsApp: ${n.deliveryStatus?.whatsapp || 'pending'}`}
                            className="flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          >
                            <MessageSquare size={10} />
                            WhatsApp
                          </span>
                        )}
                        {isUnread && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary ml-auto" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer for Admin Role */}
          {role === 'admin' && (
            <div className="p-2.5 bg-surface-container/30 border-t border-outline-variant/15 text-center">
              <Link
                href="/dashboard/admin/notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs font-bold text-primary hover:underline flex items-center justify-center gap-1 py-1"
              >
                <span>View Full Communication Outbox</span>
                <ExternalLink size={12} />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

