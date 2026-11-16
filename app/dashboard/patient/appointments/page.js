"use client";

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { Calendar, Clock, Stethoscope, Search, Loader2, AlertCircle } from 'lucide-react';
import PatientSidebar from '@/components/Patient_Sidebar';
import Footer from '@/components/Footer';

export default function PatientAppointments() {
  const { data: session } = useSession();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'UPCOMING' | 'COMPLETED'
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const patientId = session?.user?.patientId || 'PAT-001';

  useEffect(() => {
    let ignore = false;
    async function fetchAppointments() {
      try {
        const res = await fetch(`/api/appointments?patientId=${patientId}&limit=100`, { cache: 'no-store' });
        const data = await res.json();
        if (!ignore) {
          if (data.success) {
            setAppointments(data.appointments || []);
          } else {
            setErrorMsg(data.error || 'Failed to fetch appointments');
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error('Error loading patient appointments:', err);
          setErrorMsg('Network error while connecting to appointments server.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchAppointments();
    return () => {
      ignore = true;
    };
  }, [patientId]);

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (apt.doctorName || '').toLowerCase().includes(q) ||
        (apt.reason || '').toLowerCase().includes(q) ||
        (apt.appointmentId || '').toLowerCase().includes(q);

      let matchesTab = true;
      if (filterTab === 'UPCOMING') {
        matchesTab = apt.status === 'Scheduled' || apt.status === 'Checked In' || apt.status === 'In Progress';
      } else if (filterTab === 'COMPLETED') {
        matchesTab = apt.status === 'Completed' || apt.status === 'Cancelled';
      }

      return matchesSearch && matchesTab;
    });
  }, [appointments, searchQuery, filterTab]);

  return (
    <div className="flex h-screen overflow-hidden">
      <PatientSidebar />
      <main className="flex-1 overflow-y-auto bg-background p-margin no-scrollbar">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-lg">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
              My Clinic Appointments & Queue Tokens
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              Track your scheduled outpatient consultations, token positions, and past clinic visits.
            </p>
          </div>
        </header>

        {errorMsg && (
          <div className="mb-lg p-md rounded-2xl bg-error-container text-on-error-container flex items-center gap-2 clinical-shadow font-semibold text-body-sm">
            <AlertCircle className="w-5 h-5 text-error shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Filter Controls & Search */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-lg">
          <div className="flex bg-surface-container rounded-2xl p-1 text-xs font-bold w-full sm:w-auto">
            <button
              onClick={() => setFilterTab('ALL')}
              className={`cursor-pointer px-4 py-2 rounded-xl transition-all ${
                filterTab === 'ALL' ? 'bg-primary text-on-primary clinical-shadow' : 'text-outline hover:text-on-surface'
              }`}
            >
              All Bookings ({appointments.length})
            </button>
            <button
              onClick={() => setFilterTab('UPCOMING')}
              className={`cursor-pointer px-4 py-2 rounded-xl transition-all ${
                filterTab === 'UPCOMING' ? 'bg-primary text-on-primary clinical-shadow' : 'text-outline hover:text-on-surface'
              }`}
            >
              Upcoming Active
            </button>
            <button
              onClick={() => setFilterTab('COMPLETED')}
              className={`cursor-pointer px-4 py-2 rounded-xl transition-all ${
                filterTab === 'COMPLETED' ? 'bg-primary text-on-primary clinical-shadow' : 'text-outline hover:text-on-surface'
              }`}
            >
              Past Visits
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
            <input
              type="text"
              placeholder="Search by doctor or concern..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface-container-lowest border border-outline-variant/30 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Appointments Ledger */}
        <div className="glass-card p-margin rounded-[24px] clinical-shadow">
          {loading ? (
            <div className="py-24 text-center text-outline flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs font-semibold">Loading your appointment records...</p>
            </div>
          ) : filteredAppointments.length > 0 ? (
            <div className="space-y-3">
              {filteredAppointments.map((apt) => (
                <div
                  key={apt.appointmentId || apt._id}
                  className="p-4 bg-surface-container-low border border-outline-variant/15 rounded-2xl clinical-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-primary bg-primary-fixed px-2.5 py-0.5 rounded-md">
                        {apt.appointmentId}
                      </span>
                      <span className="text-xs font-bold text-secondary bg-secondary-container px-2.5 py-0.5 rounded-md flex items-center gap-1">
                        <Clock size={12} /> {apt.time || `Token #${apt.queueNumber || 1}`}
                      </span>
                    </div>

                    <h4 className="font-bold text-on-surface text-body-md mt-1 flex items-center gap-1.5">
                      <Stethoscope size={16} className="text-primary" /> {apt.doctorName}
                    </h4>

                    <p className="text-xs text-on-surface-variant font-medium">
                      Chief Concern: <strong className="text-on-surface">{apt.reason}</strong>
                    </p>
                    <p className="text-[11px] text-outline">
                      Consultation Date: <strong>{apt.date}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-start md:self-auto">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-xl ${
                        apt.status === 'Completed'
                          ? 'bg-secondary-container text-on-secondary-container'
                          : apt.status === 'In Progress'
                          ? 'bg-primary-fixed text-on-primary-fixed-variant animate-pulse'
                          : apt.status === 'Cancelled'
                          ? 'bg-error-container text-on-error-container'
                          : 'bg-white border border-outline-variant/30 text-primary shadow-xs'
                      }`}
                    >
                      {apt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-outline">
              <Calendar size={36} className="mx-auto mb-2 text-outline-variant" />
              <p className="text-body-sm font-semibold">No appointment records match your criteria.</p>
            </div>
          )}
        </div>

        <Footer />
      </main>
    </div>
  );
}

