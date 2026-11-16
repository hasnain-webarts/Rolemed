"use client";

import { Stethoscope, Users, Calendar, FlaskConical, Activity, Pill, Clock, RefreshCw, Loader2, Filter, FolderOpen } from 'lucide-react';
import { IoMdNotificationsOutline } from "react-icons/io";
import Sidebar from '@/components/Doctor_Sidebar';
import Footer from '@/components/Footer';
import PatientEHRModal from '@/components/PatientEHRModal';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function DoctorDashboard() {
  const { data: session } = useSession();
  const loggedInDoctor = session?.user?.name || 'Dr. Ayesha Siddiqui';

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Timeline Tab & Doctor Filter
  const [timelineTab, setTimelineTab] = useState('all'); // 'all' | 'today' | 'upcoming'
  const [selectedDoctorOverride, setSelectedDoctorOverride] = useState(null);
  const activeDoctor = selectedDoctorOverride ?? session?.user?.name ?? 'Dr. Ayesha Siddiqui';
  const [selectedPatientIdForEHR, setSelectedPatientIdForEHR] = useState(null);

  // Live data states
  const [allAptsList, setAllAptsList] = useState([]);
  const [todayAptsList, setTodayAptsList] = useState([]);
  const [upcomingAptsList, setUpcomingAptsList] = useState([]);
  const [stats, setStats] = useState({
    todayAppointments: 0,
    upcomingAppointments: 0,
    completedToday: 0,
    pendingToday: 0,
    totalPatients: 0,
    waitingCount: 0,
    inProgressCount: 0,
  });

  const [activities, setActivities] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function loadDoctorOverview() {
      try {
        const aptUrl = activeDoctor && activeDoctor !== 'All'
          ? `/api/appointments?doctor=${encodeURIComponent(activeDoctor)}&limit=200`
          : '/api/appointments?limit=200';
        const queueUrl = activeDoctor && activeDoctor !== 'All'
          ? `/api/queue?doctor=${encodeURIComponent(activeDoctor)}`
          : '/api/queue';
        const patUrl = activeDoctor && activeDoctor !== 'All'
          ? `/api/patients?doctor=${encodeURIComponent(activeDoctor)}`
          : '/api/patients';

        const [allRes, patRes, queueRes, conRes, rxRes] = await Promise.all([
          fetch(aptUrl, { cache: 'no-store' }),
          fetch(patUrl, { cache: 'no-store' }),
          fetch(queueUrl, { cache: 'no-store' }),
          fetch('/api/consultations?limit=5', { cache: 'no-store' }),
          fetch('/api/prescriptions?limit=5', { cache: 'no-store' }),
        ]);

        const allData = await allRes.json();
        const patData = await patRes.json();
        const queueData = await queueRes.json();
        const conData = await conRes.json();
        const rxData = await rxRes.json();

        if (!ignore) {
          const allApts = allData.success ? allData.appointments || [] : [];
          const todayStr = new Date().toISOString().split('T')[0];
          const todayApts = allApts.filter((a) => a.date === todayStr);
          const upcomingApts = allApts.filter((a) => a.date > todayStr);

          const totalPatCount = patData.success ? patData.count || (patData.patients || []).length : 0;
          const waitingList = queueData.success ? (queueData.queue || []).filter(q => q.status === 'Waiting' || q.status === 'Calling') : [];

          const completed = todayApts.filter(a => a.status === 'Completed').length;
          const inProgress = todayApts.filter(a => a.status === 'In Progress').length;
          const pending = todayApts.filter(a => a.status === 'Scheduled' || a.status === 'Checked In').length;

          const mapTimelineItem = (a) => {
            let borderClass = 'border-l-outline';
            if (a.status === 'Completed') borderClass = 'border-l-primary';
            else if (a.status === 'In Progress') borderClass = 'border-l-secondary animate-pulse';
            else if (a.status === 'Checked In') borderClass = 'border-l-error';

            return {
              appointmentId: a.appointmentId,
              patientId: a.patientId || a.patient?.patientId || '',
              time: a.time,
              date: a.date,
              doctorName: a.doctorName || 'Attending Physician',
              name: a.patientName || a.patient?.name || 'Patient',
              age: a.patient?.age || a.age || '--',
              gender: a.patient?.gender || a.gender || '',
              reason: a.reason,
              status: a.status,
              color: borderClass,
            };
          };

          setAllAptsList(allApts.map(mapTimelineItem));
          setTodayAptsList(todayApts.map(mapTimelineItem));
          setUpcomingAptsList(upcomingApts.map(mapTimelineItem));

          // Generate dynamic activity items from recent consultations & prescriptions
          const dynamicActs = [];
          if (rxData.success && Array.isArray(rxData.prescriptions)) {
            rxData.prescriptions.slice(0, 3).forEach((r, idx) => {
              dynamicActs.push({
                id: `rx-${idx}`,
                message: `Prescription ${r.prescriptionId || ''} recorded for ${r.patientName}`,
                time: r.date || 'Today',
                icon: <Pill size={16} />,
                color: 'bg-primary text-on-primary',
              });
            });
          }
          if (conData.success && Array.isArray(conData.consultations)) {
            conData.consultations.slice(0, 3).forEach((c, idx) => {
              dynamicActs.push({
                id: `con-${idx}`,
                message: `Consultation note completed for ${c.patientName} (${c.diagnosis})`,
                time: c.date || 'Today',
                icon: <Activity size={16} />,
                color: 'bg-tertiary text-on-tertiary-fixed-variant',
              });
            });
          }

          if (dynamicActs.length === 0) {
            dynamicActs.push({
              id: 'init-1',
              message: 'Clinical operating systems synchronized with MongoDB database',
              time: 'Just now',
              icon: <Stethoscope size={16} />,
              color: 'bg-primary text-on-primary',
            });
          }

          setActivities(dynamicActs);
          setStats({
            todayAppointments: todayApts.length,
            upcomingAppointments: upcomingApts.length,
            completedToday: completed,
            pendingToday: pending,
            totalPatients: totalPatCount,
            waitingCount: waitingList.length,
            inProgressCount: inProgress,
          });
        }
      } catch (err) {
        console.error('Error fetching doctor overview:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadDoctorOverview();
    return () => {
      ignore = true;
    };
  }, [refreshKey, activeDoctor]);

  // Filter current timeline by selected tab & doctor
  const currentList =
    timelineTab === 'all'
      ? allAptsList
      : timelineTab === 'today'
      ? todayAptsList
      : upcomingAptsList;
  const filteredTimeline = currentList.filter((item) => {
    if (activeDoctor === 'All') return true;
    return (item.doctorName || '').toLowerCase().includes(activeDoctor.toLowerCase());
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="flex-1 overflow-y-auto bg-background p-margin no-scrollbar">
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
          {/* Timeline Schedule with All/Today/Upcoming tab switch */}
          <TimelineSchedule
            timeline={filteredTimeline}
            loading={loading}
            timelineTab={timelineTab}
            setTimelineTab={setTimelineTab}
            selectedDoctor={activeDoctor}
            setSelectedDoctor={setSelectedDoctorOverride}
            allCount={allAptsList.length}
            todayCount={todayAptsList.length}
            upcomingCount={upcomingAptsList.length}
            onOpenEHR={setSelectedPatientIdForEHR}
          />

          {/* Quick Actions and Activity Log */}
          <div className="col-span-12 lg:col-span-4 space-y-gutter">
            <QuickActions />
            <ActivityFeed activities={activities} />
          </div>
        </div>

        {/* 360 EHR Patient Chart Modal */}
        <PatientEHRModal
          patientId={selectedPatientIdForEHR}
          isOpen={!!selectedPatientIdForEHR}
          onClose={() => setSelectedPatientIdForEHR(null)}
        />

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
          <Calendar size={24} />
        </button>
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface font-bold">Doctor Overview</h2>
          <p className="text-body-sm text-on-surface-variant">Welcome back. Here is your clinical summary and active schedule.</p>
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
        <Link href="/dashboard/doctor/appointments" className="cursor-pointer flex items-center gap-2 px-md py-sm bg-primary text-on-primary rounded-xl font-bold clinical-shadow hover:opacity-90 transition-all text-body-sm">
          <Calendar size={18} />
          View Full Schedule
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
      subtitle: `${stats.completedToday} completed, ${stats.pendingToday} pending`,
      icon: <Calendar size={24} />,
      iconBg: 'bg-primary-fixed',
      iconColor: 'text-primary'
    },
    {
      title: 'Upcoming Bookings',
      value: loading ? '...' : String(stats.upcomingAppointments),
      subtitle: 'Future patient appointments',
      icon: <Clock size={24} />,
      iconBg: 'bg-secondary-container',
      iconColor: 'text-secondary'
    },
    {
      title: 'Total Active Patients',
      value: loading ? '...' : String(stats.totalPatients),
      subtitle: 'Registered in hospital database',
      icon: <Users size={24} />,
      iconBg: 'bg-tertiary-fixed',
      iconColor: 'text-on-tertiary-fixed-variant'
    },
    {
      title: 'Queue Waiting Room',
      value: loading ? '...' : String(stats.waitingCount),
      subtitle: `${stats.inProgressCount} currently with doctor`,
      icon: <Stethoscope size={24} />,
      iconBg: 'bg-primary-fixed',
      iconColor: 'text-primary'
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

function TimelineSchedule({
  timeline,
  loading,
  timelineTab,
  setTimelineTab,
  selectedDoctor,
  setSelectedDoctor,
  allCount,
  todayCount,
  upcomingCount,
  onOpenEHR,
}) {
  return (
    <div className="col-span-12 lg:col-span-8 glass-card rounded-[24px] p-margin clinical-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-md">
        <div>
          <h4 className="text-title-sm font-bold text-on-surface">Clinical Appointment Schedule</h4>
          <p className="text-body-sm text-outline">
            {timelineTab === 'all'
              ? 'All patient appointments registered in clinical database'
              : timelineTab === 'today'
              ? "Today's hourly patient appointment flow"
              : 'Upcoming scheduled patient appointments'}
          </p>
        </div>

        {/* Tab switcher: All vs Today vs Upcoming */}
        <div className="flex items-center gap-2">
          <div className="flex bg-surface-container rounded-xl p-1 text-xs font-bold">
            <button
              onClick={() => setTimelineTab('all')}
              className={`cursor-pointer px-3 py-1.5 rounded-lg transition-all ${
                timelineTab === 'all' ? 'bg-white text-primary clinical-shadow' : 'text-outline hover:text-on-surface'
              }`}
            >
              All ({allCount})
            </button>
            <button
              onClick={() => setTimelineTab('today')}
              className={`cursor-pointer px-3 py-1.5 rounded-lg transition-all ${
                timelineTab === 'today' ? 'bg-white text-primary clinical-shadow' : 'text-outline hover:text-on-surface'
              }`}
            >
              Today ({todayCount})
            </button>
            <button
              onClick={() => setTimelineTab('upcoming')}
              className={`cursor-pointer px-3 py-1.5 rounded-lg transition-all ${
                timelineTab === 'upcoming' ? 'bg-white text-primary clinical-shadow' : 'text-outline hover:text-on-surface'
              }`}
            >
              Upcoming ({upcomingCount})
            </button>
          </div>

          {/* Doctor filter dropdown */}
          <select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
            className="text-xs font-semibold p-1.5 bg-surface-container border border-outline-variant/30 rounded-xl text-on-surface focus:outline-none cursor-pointer"
          >
            <option value="All">All Doctors</option>
            <option value="Dr. Ayesha Siddiqui">Dr. Ayesha Siddiqui</option>
            <option value="Dr. Asim Raza">Dr. Asim Raza</option>
            <option value="Dr. Tariq Mahmood">Dr. Tariq Mahmood</option>
            <option value="Dr. Sarah Johnson">Dr. Sarah Johnson</option>
            <option value="Dr. Robert Chen">Dr. Robert Chen</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-outline gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-body-sm font-semibold">Loading schedule from database...</p>
        </div>
      ) : timeline.length > 0 ? (
        <div className="relative border-l border-outline-variant/30 pl-6 ml-4 space-y-6">
          {timeline.map((item, index) => (
            <div key={item.appointmentId || index} className="relative">
              {/* Timeline Dot */}
              <div
                className={`absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full border-4 border-white ${
                  item.status === 'Completed'
                    ? 'bg-primary'
                    : item.status === 'In Progress'
                    ? 'bg-secondary'
                    : 'bg-outline-variant'
                } clinical-shadow`}
              ></div>

              {/* Schedule Card */}
              <div
                className={`glass-card p-md rounded-2xl border-l-4 ${item.color} clinical-shadow flex flex-col md:flex-row md:items-center justify-between gap-4`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold tracking-wider text-primary font-mono uppercase">
                      {item.date ? `${item.date} • ` : ''}{item.time} • {item.appointmentId}
                    </span>
                    <span className="text-[10px] font-semibold text-outline px-2 py-0.5 bg-surface-container rounded-md">
                      {item.doctorName}
                    </span>
                  </div>
                  <h5 className="font-bold text-on-surface text-body-md">
                    {item.name}{' '}
                    <span className="text-outline text-body-sm font-normal">
                      ({item.age} yrs {item.gender && `• ${item.gender}`} • {item.patientId})
                    </span>
                  </h5>
                  <p className="text-body-sm text-on-surface-variant flex items-center gap-2">
                    <Activity size={14} className="text-secondary" /> {item.reason}
                  </p>
                </div>
                <div className="flex items-center gap-sm">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.status === 'Completed'
                        ? 'bg-primary-fixed text-on-primary-fixed-variant'
                        : item.status === 'In Progress'
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'bg-surface-container text-outline'
                    }`}
                  >
                    {item.status}
                  </span>
                  {item.patientId && onOpenEHR && (
                    <button
                      type="button"
                      onClick={() => onOpenEHR(item.patientId)}
                      className="cursor-pointer text-xs font-bold text-primary px-2.5 py-1.5 rounded-xl border border-primary/20 hover:bg-primary/10 transition-colors flex items-center gap-1"
                    >
                      <FolderOpen size={13} /> Chart
                    </button>
                  )}
                  {item.status === 'In Progress' && (
                    <Link
                      href={`/dashboard/doctor/consultations?patientId=${item.patientId}&appointmentId=${item.appointmentId}`}
                      className="cursor-pointer text-xs font-bold bg-secondary text-on-secondary px-3 py-1.5 rounded-xl hover:opacity-90 transition-all clinical-shadow"
                    >
                      Enter Note
                    </Link>
                  )}
                  {(item.status === 'Scheduled' || item.status === 'Checked In') && (
                    <Link
                      href={`/dashboard/doctor/consultations?patientId=${item.patientId}&appointmentId=${item.appointmentId}`}
                      className="cursor-pointer text-xs font-bold bg-primary text-on-primary px-3 py-1.5 rounded-xl hover:opacity-90 transition-all clinical-shadow"
                    >
                      Start Consult
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-outline">
          <Calendar className="mx-auto w-12 h-12 text-outline-variant mb-2" />
          <p className="font-semibold text-body-sm">
            {timelineTab === 'today'
              ? 'No clinical appointments scheduled for today.'
              : 'No upcoming appointments found matching filter.'}
          </p>
        </div>
      )}
    </div>
  );
}

function QuickActions() {
  const actions = [
    { title: 'New Consultation Note', desc: 'Log clinical diagnoses & vitals', link: '/dashboard/doctor/consultations', color: 'bg-primary text-on-primary hover:bg-primary/95' },
    { title: 'Write Digital Prescription', desc: 'Create drug orders for pharmacy', link: '/dashboard/doctor/prescriptions', color: 'bg-secondary text-on-secondary hover:bg-secondary/95' },
    { title: 'Master Patient Directory', desc: 'Lookup patient files & charts', link: '/dashboard/doctor/patients', color: 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest border border-outline-variant/30' },
  ];

  return (
    <div className="glass-card rounded-[24px] p-margin clinical-shadow">
      <h4 className="text-title-sm font-bold text-on-surface mb-md">Quick Actions</h4>
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

function ActivityFeed({ activities }) {
  return (
    <div className="glass-card rounded-[24px] p-margin clinical-shadow flex flex-col">
      <h4 className="text-title-sm font-bold text-on-surface mb-md">Recent Hospital Clinical Activity</h4>
      <div className="space-y-md flex-1">
        {activities.map((act) => (
          <div key={act.id} className="flex gap-4 items-start pb-sm border-b border-outline-variant/10 last:border-0 last:pb-0 text-body-sm">
            <div className={`p-2 rounded-xl shrink-0 ${act.color}`}>
              {act.icon}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-body-sm text-on-surface leading-tight font-medium">{act.message}</p>
              <span className="text-[11px] text-outline mt-1 block">{act.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
