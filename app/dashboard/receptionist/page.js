"use client";

import { useState, useEffect } from 'react';
import { Users, Calendar, Bed, ListOrdered, UserPlus, Clock, ArrowRight, RefreshCw, Loader2 } from 'lucide-react';
import { IoMdNotificationsOutline } from "react-icons/io";
import Sidebar from '@/components/Receptionist_Sidebar';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function ReceptionistDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Live state
  const [queue, setQueue] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [stats, setStats] = useState({
    todayAppointments: 0,
    scheduledAppointments: 0,
    completedAppointments: 0,
    waitingCount: 0,
    occupiedBeds: 0,
    icuBeds: 0,
    doctorCount: 4,
  });

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function loadDashboardData() {
      try {
        const [queueRes, patRes, aptRes, admRes] = await Promise.all([
          fetch('/api/queue'),
          fetch('/api/patients?limit=5'),
          fetch('/api/appointments?tab=today'),
          fetch('/api/admissions?status=Admitted'),
        ]);

        const queueData = await queueRes.json();
        const patData = await patRes.json();
        const aptData = await aptRes.json();
        const admData = await admRes.json();

        if (!ignore) {
          let activeQueueList = [];
          let docsList = [];
          if (queueData.success) {
            activeQueueList = (queueData.queue || []).filter(q => q.status !== 'Completed');
            docsList = queueData.doctors || [];
            setQueue(activeQueueList);
          }

          if (patData.success) {
            const mappedPatients = (patData.patients || []).map(p => ({
              id: p.patientId,
              name: p.name,
              age: p.age || '--',
              phone: p.phone,
              time: new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }));
            setRegistrations(mappedPatients);
          }

          const todayApts = aptData.success ? aptData.appointments || [] : [];
          const scheduledCount = todayApts.filter(a => a.status === 'Scheduled').length;
          const completedCount = todayApts.filter(a => a.status === 'Completed').length;

          const activeAdmissions = admData.success ? admData.admissions || [] : [];
          const icuCount = activeAdmissions.filter(a => (a.ward || '').toUpperCase().includes('ICU')).length;

          setStats({
            todayAppointments: todayApts.length,
            scheduledAppointments: scheduledCount,
            completedAppointments: completedCount,
            waitingCount: activeQueueList.length,
            occupiedBeds: activeAdmissions.length,
            icuBeds: icuCount,
            doctorCount: docsList.length || 4,
          });
        }
      } catch (err) {
        console.error('Error fetching receptionist dashboard data:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadDashboardData();
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="flex-1 overflow-y-auto bg-background p-margin no-scrollbar">
        {/* Header */}
        <Header
          onMenuClick={() => setIsSidebarOpen(true)}
          onRefresh={() => {
            setLoading(true);
            setRefreshKey((k) => k + 1);
          }}
          loading={loading}
        />

        {/* KPI Grid */}
        <KpiGrid stats={stats} loading={loading} />

        <div className="grid grid-cols-12 gap-gutter mb-lg">
          {/* Active Queue Status */}
          <QueueWidget queue={queue} loading={loading} />

          {/* Quick Actions and Recent registrations */}
          <div className="col-span-12 lg:col-span-4 space-y-gutter">
            <QuickActions />
            <RecentRegistrations registrations={registrations} loading={loading} />
          </div>
        </div>

        <Footer />
      </main>
    </div>
  );
}

// --- Subcomponents ---

function Header({ onMenuClick, onRefresh, loading }) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-md mb-lg">
      <div className="flex items-center gap-sm">
        <button
          className="cursor-pointer lg:hidden p-xs text-on-surface-variant hover:bg-surface-container rounded-lg"
          onClick={onMenuClick}
        >
          <ListOrdered size={24} />
        </button>
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface font-bold">Reception Overview</h2>
          <p className="text-body-sm text-on-surface-variant">Front desk operations, patient intake, and clinic queue management.</p>
        </div>
      </div>
      <div className="flex items-center gap-sm">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="cursor-pointer p-sm rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors text-primary border border-outline-variant/30 flex items-center gap-1.5 text-xs font-semibold"
          title="Refresh statistics"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
        <Link href="/dashboard/receptionist/queue" className="cursor-pointer flex items-center gap-2 px-md py-sm bg-primary text-on-primary rounded-xl font-bold clinical-shadow hover:opacity-90 transition-all text-body-sm">
          <ListOrdered size={18} />
          Manage Live Queue
        </Link>
      </div>
    </header>
  );
}

function KpiGrid({ stats, loading }) {
  const kpis = [
    {
      title: "Today's Appointments",
      value: loading ? '...' : String(stats.todayAppointments),
      subtitle: `${stats.scheduledAppointments} scheduled, ${stats.completedAppointments} completed`,
      icon: <Calendar />,
      iconBg: 'bg-primary-fixed',
      iconColor: 'text-primary'
    },
    {
      title: 'Checked-in / In Queue',
      value: loading ? '...' : String(stats.waitingCount),
      subtitle: 'Outpatient clinic active flow',
      icon: <ListOrdered />,
      iconBg: 'bg-secondary-container',
      iconColor: 'text-secondary'
    },
    {
      title: 'Ward Bed Occupancy',
      value: loading ? '...' : `${stats.occupiedBeds} / 20`,
      subtitle: `${stats.icuBeds} critical care bed(s) in use`,
      icon: <Bed />,
      iconBg: 'bg-tertiary-fixed',
      iconColor: 'text-on-tertiary-fixed-variant'
    },
    {
      title: 'On-Duty Practitioners',
      value: loading ? '...' : String(stats.doctorCount),
      subtitle: 'Active consultation rooms',
      icon: <Users />,
      iconBg: 'bg-error-container',
      iconColor: 'text-on-error-container'
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mb-lg">
      {kpis.map((kpi, index) => (
        <div key={index} className="glass-card p-md rounded-[16px] clinical-shadow">
          <div className="flex items-center gap-4 mb-sm">
            <div className={`p-3 rounded-xl ${kpi.iconBg} ${kpi.iconColor}`}>
              {kpi.icon}
            </div>
            <div>
              <p className="text-outline text-body-sm">{kpi.title}</p>
              <h3 className="text-headline-md font-bold text-on-surface leading-tight">{kpi.value}</h3>
            </div>
          </div>
          <p className="text-[12px] text-outline border-t border-outline-variant/20 pt-2">{kpi.subtitle}</p>
        </div>
      ))}
    </div>
  );
}

function QueueWidget({ queue, loading }) {
  return (
    <div className="col-span-12 lg:col-span-8 glass-card rounded-[24px] p-margin clinical-shadow flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-center mb-lg">
          <div>
            <h4 className="text-title-sm font-bold text-on-surface">Active Clinic Queue</h4>
            <p className="text-body-sm text-outline">Current outpatient clinic check-ins and room calls</p>
          </div>
          <Link href="/dashboard/receptionist/queue" className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5">
            Full Queue Controls <ArrowRight size={14} />
          </Link>
        </div>

        <div className="space-y-sm">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-outline gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-body-sm">Syncing queue with database...</p>
            </div>
          ) : queue.length > 0 ? (
            queue.slice(0, 4).map((item) => (
              <div key={item.appointmentId || item.id} className="p-md bg-surface-container/30 border border-outline-variant/15 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-4">
                  <span className="w-12 h-12 rounded-xl bg-primary-fixed/40 text-primary font-bold flex items-center justify-center text-body-lg shrink-0">
                    {item.id}
                  </span>
                  <div>
                    <h5 className="font-bold text-on-surface text-body-md">
                      {item.patientName || item.patient}{' '}
                      <span className="text-xs font-normal text-outline">({item.patientId})</span>
                    </h5>
                    <p className="text-[12px] text-outline flex items-center gap-3 mt-0.5">
                      <span className="font-semibold text-secondary">{item.doctor}</span>
                      <span>•</span>
                      <span>{item.room}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-sm">
                  <span className="text-[11px] text-outline flex items-center gap-1 font-medium"><Clock size={12} /> {item.time}</span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    item.status === 'With Doctor' ? 'bg-secondary-container text-on-secondary-container' :
                    item.status === 'Calling' ? 'bg-error-container text-on-error-container animate-pulse font-bold' :
                    'bg-surface-container-high text-outline'
                  }`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-outline">
              <ListOrdered className="mx-auto w-10 h-10 text-outline-variant mb-2" />
              <p className="text-body-sm font-semibold">No patients currently waiting in queue.</p>
            </div>
          )}
        </div>
      </div>

      {queue.length > 4 && (
        <div className="mt-md pt-2 border-t border-outline-variant/10 text-center">
          <Link href="/dashboard/receptionist/queue" className="text-xs font-bold text-primary hover:underline">
            View all {queue.length} queue entries →
          </Link>
        </div>
      )}
    </div>
  );
}

function QuickActions() {
  const actions = [
    { title: 'Register Patient', desc: 'Onboard a new patient profile', link: '/dashboard/receptionist/patients', color: 'bg-primary text-on-primary hover:bg-primary/95' },
    { title: 'Book Appointment', desc: 'Schedule slots for consultations', link: '/dashboard/receptionist/appointments', color: 'bg-secondary text-on-secondary hover:bg-secondary/95' },
    { title: 'IPD Bed Admission', desc: 'Admit patients into wards', link: '/dashboard/receptionist/admissions', color: 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest border border-outline-variant/30' },
  ];

  return (
    <div className="glass-card rounded-[24px] p-margin clinical-shadow">
      <h4 className="text-title-sm font-bold text-on-surface mb-md">Quick Operations</h4>
      <div className="flex flex-col gap-sm">
        {actions.map((act, index) => (
          <Link
            key={index}
            href={act.link}
            className={`w-full text-left p-md rounded-2xl clinical-shadow transition-all hover:scale-[1.01] block ${act.color}`}
          >
            <h5 className="font-bold text-body-md">{act.title}</h5>
            <p className="text-[12px] opacity-90">{act.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function RecentRegistrations({ registrations, loading }) {
  return (
    <div className="glass-card rounded-[24px] p-margin clinical-shadow flex flex-col">
      <div className="flex justify-between items-center mb-md">
        <h4 className="text-title-sm font-bold text-on-surface">Recent Registrations</h4>
        <Link href="/dashboard/receptionist/patients" className="text-xs font-bold text-primary hover:underline">
          View All
        </Link>
      </div>

      <div className="space-y-md flex-1">
        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center text-outline gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <p className="text-xs">Loading registrations...</p>
          </div>
        ) : registrations.length > 0 ? (
          registrations.map((reg) => (
            <div key={reg.id} className="flex gap-4 items-start pb-sm border-b border-outline-variant/10 last:border-0 last:pb-0">
              <div className="p-2 rounded-xl bg-primary-fixed text-primary shrink-0">
                <UserPlus size={18} />
              </div>
              <div className="overflow-hidden flex-1">
                <div className="flex justify-between items-center">
                  <p className="text-body-sm font-bold text-on-surface truncate">{reg.name}</p>
                  <span className="text-[10px] text-outline font-semibold">{reg.time}</span>
                </div>
                <p className="text-[12px] text-outline mt-0.5">{reg.id} • Age {reg.age}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="py-6 text-center text-outline text-xs">
            No recent patient records found.
          </div>
        )}
      </div>
    </div>
  );
}

