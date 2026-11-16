"use client";

import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Mail,
  Bell,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  RotateCcw,
  User,
  Shield,
  Smartphone,
  Check,
  X,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import Sidebar from '@/components/Admin_Sidebar';
import Footer from '@/components/Footer';
import NotificationBell from '@/components/NotificationBell';

export default function NotificationsOutboxPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // Preview Modal
  const [previewNotification, setPreviewNotification] = useState(null);
  const [previewTab, setPreviewTab] = useState('whatsapp'); // 'whatsapp' | 'email' | 'metadata'

  // Resend State
  const [resendingId, setResendingId] = useState(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [actionErrorMsg, setActionErrorMsg] = useState('');

  // SMTP Diagnostics & Live Test State
  const [smtpStatus, setSmtpStatus] = useState(null);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function loadOutbox() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (channelFilter !== 'all') params.set('channel', channelFilter);
        if (roleFilter !== 'all') params.set('role', roleFilter);
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (searchQuery.trim()) params.set('search', searchQuery.trim());
        params.set('limit', '100');

        const [notifRes, smtpRes] = await Promise.all([
          fetch(`/api/notifications?${params.toString()}`, { cache: 'no-store' }),
          fetch('/api/notifications/test-email', { cache: 'no-store' }),
        ]);

        const data = await notifRes.json();
        const smtpData = await smtpRes.json().catch(() => null);

        if (!ignore) {
          if (data.success) {
            setNotifications(data.notifications || []);
          }
          if (smtpData && smtpData.success) {
            setSmtpStatus(smtpData);
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load notifications outbox:', err);
          setActionErrorMsg('Failed to connect to notification ledger.');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadOutbox();
    return () => {
      ignore = true;
    };
  }, [channelFilter, roleFilter, statusFilter, searchQuery, refreshKey]);

  async function handleSendTestEmail(e) {
    if (e) e.preventDefault();
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      setActionErrorMsg('Please enter a valid recipient email address (e.g. user@example.com).');
      return;
    }
    setTestEmailLoading(true);
    setActionSuccessMsg('');
    setActionErrorMsg('');
    try {
      const res = await fetch('/api/notifications/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmailAddress }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccessMsg(`Live test email successfully delivered to ${testEmailAddress}! (MessageId: ${data.messageId || 'verified'})`);
        setRefreshKey((k) => k + 1);
      } else {
        setActionErrorMsg(data.error || 'Failed to dispatch test email.');
        if (!data.configured) setShowSetupGuide(true);
      }
    } catch (err) {
      setActionErrorMsg(err.message || 'Network error while attempting test email dispatch.');
    } finally {
      setTestEmailLoading(false);
    }
  }

  async function handleResend(notifId) {
    setResendingId(notifId);
    setActionSuccessMsg('');
    setActionErrorMsg('');
    try {
      const res = await fetch(`/api/notifications/${notifId}/resend`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccessMsg(`Notification successfully re-dispatched to ${data.notification?.recipientName || 'recipient'}.`);
        setRefreshKey((k) => k + 1);
      } else {
        setActionErrorMsg(data.error || 'Failed to re-dispatch notification.');
      }
    } catch (err) {
      setActionErrorMsg(err.message || 'Error executing re-dispatch.');
    } finally {
      setResendingId(null);
      setTimeout(() => {
        setActionSuccessMsg('');
        setActionErrorMsg('');
      }, 5000);
    }
  }

  // Calculate Metrics
  const totalCount = notifications.length;
  const emailSentCount = notifications.filter((n) => n.deliveryStatus?.email === 'sent').length;
  const whatsappSentCount = notifications.filter((n) => n.deliveryStatus?.whatsapp === 'sent').length;
  const unreadInAppCount = notifications.filter((n) => n.deliveryStatus?.inApp === 'unread').length;

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <div className="p-6 md:p-8 space-y-6 flex-1">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/10">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold font-headline tracking-tight">
                    Hospital Messaging &amp; Notification Outbox
                  </h1>
                  <p className="text-sm text-outline">
                    Automated transactional emails and WhatsApp delivery ledger across patients, doctors, and staff.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <NotificationBell role="admin" />
              <button
                type="button"
                onClick={() => setRefreshKey((k) => k + 1)}
                disabled={loading}
                className="cursor-pointer px-3.5 py-2 border border-outline-variant/30 rounded-xl text-xs font-semibold hover:bg-surface-container flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh Outbox
              </button>
            </div>
          </div>

          {/* Feedback Alerts */}
          {actionSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 shrink-0" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}
          {actionErrorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-bold flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{actionErrorMsg}</span>
            </div>
          )}

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
              <div className="flex justify-between items-center text-outline mb-1.5">
                <span className="text-xs font-semibold">Total Dispatches</span>
                <MessageSquare className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-2xl font-black font-headline">{totalCount}</h3>
              <p className="text-[10px] text-outline mt-0.5">Automated clinical messages</p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
              <div className="flex justify-between items-center text-outline mb-1.5">
                <span className="text-xs font-semibold">WhatsApp Messages</span>
                <Smartphone className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-black font-headline text-emerald-600 dark:text-emerald-400">
                {whatsappSentCount}
              </h3>
              <p className="text-[10px] text-outline mt-0.5">+92 E.164 Pakistani gateway</p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
              <div className="flex justify-between items-center text-outline mb-1.5">
                <span className="text-xs font-semibold">Email Deliveries</span>
                <Mail className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-2xl font-black font-headline text-blue-600 dark:text-blue-400">
                {emailSentCount}
              </h3>
              <p className="text-[10px] text-outline mt-0.5">Branded responsive HTML</p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
              <div className="flex justify-between items-center text-outline mb-1.5">
                <span className="text-xs font-semibold">Unread In-App</span>
                <Bell className="w-4 h-4 text-purple-500" />
              </div>
              <h3 className="text-2xl font-black font-headline text-purple-600 dark:text-purple-400">
                {unreadInAppCount}
              </h3>
              <p className="text-[10px] text-outline mt-0.5">Awaiting user acknowledgement</p>
            </div>
          </div>

          {/* Email Delivery Engine Diagnostics & Live Test Bar */}
          <div className="p-4 md:p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/15 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  smtpStatus?.configured
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                }`}>
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold font-headline">Outbound Email Engine</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      smtpStatus?.configured
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20'
                    }`}>
                      {smtpStatus?.configured ? '🟢 Live SMTP Active' : '🟡 Simulated Sandbox Mode'}
                    </span>
                  </div>
                  <p className="text-xs text-outline mt-0.5">
                    {smtpStatus?.configured
                      ? `Connected to ${smtpStatus.service || smtpStatus.host} (Port ${smtpStatus.port}) • Sender: ${smtpStatus.from}`
                      : 'No SMTP credentials detected in .env.local. Emails are logged to this simulated ledger without sending over the web.'}
                  </p>
                </div>
              </div>

              {/* Live Test Form */}
              <form onSubmit={handleSendTestEmail} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                <input
                  type="email"
                  placeholder="Enter email to test (e.g. you@mail.com)"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs text-on-surface focus:outline-none focus:border-primary w-full sm:w-64"
                />
                <button
                  type="submit"
                  disabled={testEmailLoading}
                  className="cursor-pointer px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  {testEmailLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                  <span>{testEmailLoading ? 'Sending...' : 'Send Test Email'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSetupGuide(!showSetupGuide)}
                  className="cursor-pointer px-3 py-2 border border-outline-variant/30 rounded-xl text-xs font-semibold hover:bg-surface-container transition-all text-outline"
                >
                  {showSetupGuide ? 'Hide Guide' : 'SMTP Setup Guide'}
                </button>
              </form>
            </div>

            {/* Quick Setup Instructions Dropdown */}
            {showSetupGuide && (
              <div className="mt-4 pt-4 border-t border-outline-variant/15 text-xs text-outline space-y-2 animate-fade-in">
                <p className="font-bold text-on-surface flex items-center gap-1.5">
                  <Shield size={14} className="text-primary" /> How to configure live email delivery:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 font-mono text-[11px]">
                  <div className="p-3 bg-surface-container rounded-xl border border-outline-variant/20">
                    <strong className="text-primary font-sans block mb-1">Option A: Gmail (Recommended)</strong>
                    <p className="text-outline font-sans text-[11px] mb-1.5">
                      Generate a 16-character App Password at: Google Account &gt; Security &gt; 2-Step Verification &gt; App Passwords. Add to <code>.env.local</code>:
                    </p>
                    <pre className="p-2 bg-surface-container-lowest rounded-lg overflow-x-auto text-on-surface">
{`SMTP_SERVICE=gmail
SMTP_USER=your_email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM="RoleMed Healthcare" <your_email@gmail.com>`}
                    </pre>
                  </div>
                  <div className="p-3 bg-surface-container rounded-xl border border-outline-variant/20">
                    <strong className="text-secondary font-sans block mb-1">Option B: Custom SMTP / Mailtrap / Outlook</strong>
                    <p className="text-outline font-sans text-[11px] mb-1.5">
                      For Mailtrap, Brevo, AWS SES, or custom hospital exchange servers:
                    </p>
                    <pre className="p-2 bg-surface-container-lowest rounded-lg overflow-x-auto text-on-surface">
{`SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your_username
SMTP_PASS=your_password
SMTP_FROM="RoleMed Healthcare" <notifications@rolemed.org>`}
                    </pre>
                  </div>
                </div>
                <p className="text-[11px] text-outline mt-1 font-sans">
                  💡 Note: After updating <code>.env.local</code>, restart the local development server to reload new environment variables.
                </p>
              </div>
            )}
          </div>

          {/* Filter & Search Bar */}
          <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
              <input
                type="text"
                placeholder="Search by recipient name, ID, phone, email, or message title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs focus:outline-none focus:border-primary text-on-surface"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs text-on-surface focus:outline-none focus:border-primary font-medium cursor-pointer"
              >
                <option value="all">All Channels</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="in_app">In-App</option>
              </select>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs text-on-surface focus:outline-none focus:border-primary font-medium cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="patient">Patients</option>
                <option value="doctor">Doctors</option>
                <option value="receptionist">Receptionists</option>
                <option value="admin">Administrators</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-xs text-on-surface focus:outline-none focus:border-primary font-medium cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="sent">Sent</option>
                <option value="unread">Unread (In-App)</option>
                <option value="read">Read (In-App)</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          {/* Outbox Table */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container/50 border-b border-outline-variant/15 text-outline uppercase font-mono text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Message ID</th>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Notification Type</th>
                    <th className="py-3 px-4">Summary</th>
                    <th className="py-3 px-4">Delivery Channels</th>
                    <th className="py-3 px-4">Dispatched At</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-outline">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                        <span>Loading messaging outbox...</span>
                      </td>
                    </tr>
                  ) : notifications.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-outline">
                        No notifications found matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    notifications.map((n) => (
                      <tr key={n.notificationId || n._id} className="hover:bg-surface-container/20 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-primary">
                          {n.notificationId}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-on-surface">{n.recipientName}</div>
                          <div className="text-[11px] text-outline flex items-center gap-1.5 mt-0.5">
                            <span className="capitalize font-mono px-1.5 py-0.2 rounded bg-surface-container text-[10px]">
                              {n.recipientRole}
                            </span>
                            {n.recipientPhone && <span>{n.recipientPhone}</span>}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-[11px] font-semibold text-secondary">
                            {n.type?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-semibold text-on-surface truncate">{n.title}</div>
                          <div className="text-[11px] text-outline truncate mt-0.5">{n.message}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {n.channels?.includes('whatsapp') && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                                n.deliveryStatus?.whatsapp === 'sent'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                              }`}>
                                <Smartphone size={10} />
                                WA: {n.deliveryStatus?.whatsapp || 'pending'}
                              </span>
                            )}
                            {n.channels?.includes('email') && (
                              <span
                                title={n.errorDetails || (n.deliveryStatus?.email === 'simulated' ? 'Simulated Sandbox: No SMTP configured in .env.local' : '')}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                                  n.deliveryStatus?.email === 'sent'
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                    : n.deliveryStatus?.email === 'simulated'
                                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                    : n.deliveryStatus?.email === 'failed'
                                    ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                                    : 'bg-slate-500/10 text-slate-600 border border-slate-500/20'
                                }`}
                              >
                                <Mail size={10} />
                                {n.deliveryStatus?.email === 'sent' && 'Email: Live Sent'}
                                {n.deliveryStatus?.email === 'simulated' && 'Email: Sandbox (No SMTP)'}
                                {n.deliveryStatus?.email === 'failed' && 'Email: Failed'}
                                {n.deliveryStatus?.email === 'skipped' && 'Email: Skipped'}
                                {!['sent', 'simulated', 'failed', 'skipped'].includes(n.deliveryStatus?.email) && `Email: ${n.deliveryStatus?.email || 'pending'}`}
                              </span>
                            )}
                            {n.channels?.includes('in_app') && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                                n.deliveryStatus?.inApp === 'read'
                                  ? 'bg-purple-500/10 text-purple-600 border border-purple-500/20'
                                  : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                              }`}>
                                <Bell size={10} />
                                {n.deliveryStatus?.inApp || 'unread'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-outline font-mono text-[11px]">
                          {new Date(n.createdAt).toLocaleString(undefined, {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewNotification(n);
                                setPreviewTab('whatsapp');
                              }}
                              className="cursor-pointer p-1.5 rounded-lg border border-outline-variant/30 text-outline hover:text-primary hover:bg-surface-container transition-all"
                              title="Preview Message Envelope"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleResend(n.notificationId)}
                              disabled={resendingId === n.notificationId}
                              className="cursor-pointer p-1.5 rounded-lg border border-outline-variant/30 text-outline hover:text-secondary hover:bg-surface-container transition-all disabled:opacity-50"
                              title="Re-dispatch Notification"
                            >
                              {resendingId === n.notificationId ? (
                                <Loader2 size={14} className="animate-spin text-secondary" />
                              ) : (
                                <RotateCcw size={14} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Message Envelope Preview Modal */}
      {previewNotification && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-on-surface animate-fade-in">
            {/* Modal Header */}
            <div className="p-5 border-b border-outline-variant/15 flex items-center justify-between bg-surface-container/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-on-surface">{previewNotification.title}</h3>
                  <p className="text-[11px] text-outline font-mono">
                    {previewNotification.notificationId} • Recipient: {previewNotification.recipientName} ({previewNotification.recipientRole})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewNotification(null)}
                className="cursor-pointer p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Channel Tabs */}
            <div className="px-6 py-2.5 border-b border-outline-variant/10 flex gap-3 text-xs bg-surface-container-lowest">
              <button
                type="button"
                onClick={() => setPreviewTab('whatsapp')}
                className={`cursor-pointer px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  previewTab === 'whatsapp'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-outline hover:bg-surface-container'
                }`}
              >
                <Smartphone size={13} /> WhatsApp Text View
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('email')}
                className={`cursor-pointer px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  previewTab === 'email'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-outline hover:bg-surface-container'
                }`}
              >
                <Mail size={13} /> HTML Email View
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('metadata')}
                className={`cursor-pointer px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  previewTab === 'metadata'
                    ? 'bg-secondary text-white shadow-xs'
                    : 'text-outline hover:bg-surface-container'
                }`}
              >
                <Shield size={13} /> Audit &amp; Metadata
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {previewTab === 'whatsapp' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/20 flex items-center justify-between text-xs font-mono">
                    <span className="text-outline">Recipient Phone:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {previewNotification.recipientPhone || 'N/A (Unassigned)'}
                    </span>
                  </div>

                  {/* WhatsApp Message Bubble Simulation */}
                  <div className="max-w-md mx-auto p-4 rounded-2xl bg-[#dcf8c6] dark:bg-emerald-950/40 text-slate-900 dark:text-emerald-100 border border-emerald-500/20 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-300 font-bold border-b border-emerald-500/20 pb-1">
                      <span>RoleMed Hospital Automated Alert</span>
                      <span>{new Date(previewNotification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs leading-relaxed whitespace-pre-wrap font-sans">
                      {previewNotification.message}
                    </p>
                    <div className="text-[10px] text-right text-emerald-700 dark:text-emerald-400">
                      ✓✓ Delivered
                    </div>
                  </div>
                </div>
              )}

              {previewTab === 'email' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/20 flex items-center justify-between text-xs font-mono">
                    <span className="text-outline">To:</span>
                    <span className="font-bold text-primary">{previewNotification.recipientEmail || 'N/A'}</span>
                  </div>
                  {previewNotification.html ? (
                    <div
                      className="border border-outline-variant/30 rounded-xl overflow-hidden p-2 bg-white"
                      dangerouslySetInnerHTML={{ __html: previewNotification.html }}
                    />
                  ) : (
                    <div className="p-8 text-center text-outline text-xs">No HTML body generated for this alert.</div>
                  )}
                </div>
              )}

              {previewTab === 'metadata' && (
                <div className="space-y-3 font-mono text-xs">
                  <div className="p-4 rounded-xl bg-surface-container/60 border border-outline-variant/20 space-y-2">
                    <div className="text-outline text-[11px] font-bold uppercase mb-2">Delivery State &amp; Audit Trail</div>
                    <div><strong>Notification ID:</strong> {previewNotification.notificationId}</div>
                    <div><strong>Recipient ID:</strong> {previewNotification.recipientId}</div>
                    <div><strong>Recipient Role:</strong> {previewNotification.recipientRole}</div>
                    <div><strong>Notification Type:</strong> {previewNotification.type}</div>
                    <div><strong>Email Status:</strong> {previewNotification.deliveryStatus?.email}</div>
                    <div><strong>WhatsApp Status:</strong> {previewNotification.deliveryStatus?.whatsapp}</div>
                    <div><strong>In-App Status:</strong> {previewNotification.deliveryStatus?.inApp}</div>
                    {previewNotification.errorDetails && (
                      <div className="text-error"><strong>Error Details:</strong> {previewNotification.errorDetails}</div>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-surface-container/30 border border-outline-variant/20">
                    <div className="text-outline text-[11px] font-bold uppercase mb-2">Entity Metadata</div>
                    <pre className="text-[11px] overflow-x-auto text-on-surface">
                      {JSON.stringify(previewNotification.metadata || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-surface-container/30 border-t border-outline-variant/15 flex items-center justify-between">
              <span className="text-[11px] text-outline font-mono">
                Logged at: {new Date(previewNotification.createdAt).toLocaleString()}
              </span>
              <button
                type="button"
                onClick={() => setPreviewNotification(null)}
                className="cursor-pointer px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs hover:opacity-90 transition-opacity"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

