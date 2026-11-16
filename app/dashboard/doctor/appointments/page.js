"use client";

import { useState, useEffect, useCallback } from 'react';
import { Search, Calendar, Clock, Stethoscope, ArrowRight, X, Edit3, Trash2, Loader2, AlertCircle, Check, UserX } from 'lucide-react';
import Sidebar from '@/components/Doctor_Sidebar';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function Appointments() {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'today' | 'upcoming' | 'past'
  const [selectedDoctor, setSelectedDoctor] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null); // For reschedule modal
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');

  const [allAppointments, setAllAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function loadAppointments() {
      try {
        const res = await fetch('/api/appointments?limit=200');
        const data = await res.json();
        if (!ignore) {
          if (data.success) {
            setAllAppointments(data.appointments || []);
          } else {
            setErrorMsg(data.error || 'Failed to fetch appointments');
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error('Error fetching doctor appointments:', err);
          setErrorMsg('Network error while fetching appointments.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadAppointments();
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  const handleCancel = async (aptId) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;

    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/appointments/${aptId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to cancel appointment');
        return;
      }

      setSuccessMsg('Appointment cancelled successfully.');
      setRefreshKey((k) => k + 1);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      setErrorMsg('Network error while cancelling appointment.');
    }
  };

  const handleMarkNoShow = async (aptId) => {
    if (!confirm('Mark this patient as No-Show for this appointment?')) return;
    try {
      const res = await fetch(`/api/appointments/${aptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'No-Show' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to update appointment status to No-Show');
        return;
      }
      setSuccessMsg('Appointment marked as No-Show.');
      setRefreshKey((k) => k + 1);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Error updating No-Show status:', err);
      setErrorMsg('Network error updating No-Show status.');
    }
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleDate || !rescheduleTime || !selectedAppointment) return;

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const aptId = selectedAppointment.appointmentId || selectedAppointment._id;

    try {
      const res = await fetch(`/api/appointments/${aptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: rescheduleDate,
          time: rescheduleTime,
          status: 'Scheduled',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to reschedule appointment');
        return;
      }

      setSuccessMsg(`Appointment ${aptId} rescheduled to ${rescheduleDate} at ${rescheduleTime}`);
      setSelectedAppointment(null);
      setRescheduleDate('');
      setRescheduleTime('');
      setRefreshKey((k) => k + 1);

      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error rescheduling appointment:', err);
      setErrorMsg('Network error while rescheduling.');
    } finally {
      setSubmitting(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const counts = {
    all: allAppointments.length,
    today: allAppointments.filter((a) => a.date === todayStr).length,
    upcoming: allAppointments.filter((a) => a.date > todayStr).length,
    past: allAppointments.filter((a) => a.date < todayStr).length,
  };

  const tabAppointments = allAppointments.filter((a) => {
    if (activeTab === 'today') return a.date === todayStr;
    if (activeTab === 'upcoming') return a.date > todayStr;
    if (activeTab === 'past') return a.date < todayStr;
    return true; // 'all'
  });

  const filteredAppointments = tabAppointments.filter((apt) => {
    const name = apt.patientName || apt.patient?.name || '';
    const reason = apt.reason || '';
    const id = apt.appointmentId || '';
    const doctor = apt.doctorName || '';
    const q = searchQuery.toLowerCase();

    const matchesSearch =
      name.toLowerCase().includes(q) ||
      reason.toLowerCase().includes(q) ||
      id.toLowerCase().includes(q) ||
      doctor.toLowerCase().includes(q);

    const matchesDoctor =
      selectedDoctor === 'All' ||
      doctor.toLowerCase().includes(selectedDoctor.toLowerCase());

    return matchesSearch && matchesDoctor;
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background p-margin no-scrollbar">
        {/* Header */}
        <header className="flex justify-between items-center mb-lg">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold">Appointments</h2>
            <p className="text-body-sm text-on-surface-variant">View and manage clinical appointments, schedules, and patient intake.</p>
          </div>
        </header>

        {errorMsg && (
          <div className="mb-lg p-md rounded-2xl bg-error-container text-on-error-container flex items-center gap-2 clinical-shadow font-semibold text-body-sm">
            <AlertCircle className="w-5 h-5 text-error shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-lg p-md rounded-2xl bg-secondary-container text-on-secondary-container flex items-center gap-2 clinical-shadow font-semibold text-body-sm transition-all animate-bounce">
            <Check className="w-5 h-5 text-secondary shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Filters and Search */}
        <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 mb-lg">
          {/* Tabs with live counts */}
          <div className="flex bg-surface-container rounded-2xl p-1 overflow-x-auto text-xs font-bold gap-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`cursor-pointer px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-white text-primary clinical-shadow'
                  : 'text-outline hover:text-primary'
              }`}
            >
              All ({counts.all})
            </button>
            <button
              onClick={() => setActiveTab('today')}
              className={`cursor-pointer px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'today'
                  ? 'bg-white text-primary clinical-shadow'
                  : 'text-outline hover:text-primary'
              }`}
            >
              Today ({counts.today})
            </button>
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`cursor-pointer px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'upcoming'
                  ? 'bg-white text-primary clinical-shadow'
                  : 'text-outline hover:text-primary'
              }`}
            >
              Upcoming ({counts.upcoming})
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`cursor-pointer px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'past'
                  ? 'bg-white text-primary clinical-shadow'
                  : 'text-outline hover:text-primary'
              }`}
            >
              Past Records ({counts.past})
            </button>
          </div>

          {/* Search & Doctor Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="w-full sm:w-auto text-xs font-semibold px-3 py-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl text-on-surface focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="All">All Doctors</option>
              <option value="Dr. Ayesha Siddiqui">Dr. Ayesha Siddiqui</option>
              <option value="Dr. Asim Raza">Dr. Asim Raza</option>
              <option value="Dr. Tariq Mahmood">Dr. Tariq Mahmood</option>
              <option value="Dr. Sarah Johnson">Dr. Sarah Johnson</option>
              <option value="Dr. Robert Chen">Dr. Robert Chen</option>
            </select>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
              <input
                type="text"
                placeholder="Search patient, doctor, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Appointment Cards */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-outline gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="font-semibold text-body-sm">Loading appointments from database...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter mb-lg">
            {filteredAppointments.length > 0 ? (
              filteredAppointments.map((apt) => {
                const aptId = apt.appointmentId || apt._id;
                const patientName = apt.patientName || apt.patient?.name || 'Patient';
                const age = apt.patient?.age || apt.age || '--';
                const gender = apt.patient?.gender || apt.gender || '--';
                const patientId = apt.patientId || apt.patient?.patientId || '';

                const isToday = apt.date === todayStr;
                const isTomorrow = apt.date === tomorrowStr;

                return (
                  <div key={aptId} className="glass-card p-md rounded-2xl clinical-shadow border border-outline-variant/20 flex flex-col justify-between min-h-[240px] transition-all hover:scale-[1.01]">
                    <div>
                      <div className="flex justify-between items-start mb-sm gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant uppercase tracking-wider font-mono">
                          {aptId}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isToday && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-on-primary uppercase">
                              Today
                            </span>
                          )}
                          {isTomorrow && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-on-secondary uppercase">
                              Tomorrow
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            apt.type === 'Emergency' ? 'bg-error-container text-on-error-container font-bold' : 'bg-surface-container-high text-outline'
                          }`}>
                            {apt.type}
                          </span>
                        </div>
                      </div>

                      <h4 className="font-bold text-on-surface text-body-lg mb-0.5">{patientName}</h4>
                      <p className="text-[12px] text-outline mb-sm">{gender}, {age} Years {patientId && `• ${patientId}`}</p>
                      
                      <div className="bg-surface-container/40 p-2.5 rounded-xl border border-outline-variant/10 space-y-1.5">
                        <p className="text-body-sm text-on-surface-variant font-semibold flex items-center gap-2 truncate">
                          <Stethoscope size={14} className="text-secondary shrink-0" /> {apt.reason}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-outline">
                          <span className="flex items-center gap-1 font-medium text-primary"><Clock size={12} /> {apt.time}</span>
                          {apt.date && <span className="flex items-center gap-1"><Calendar size={12} /> {apt.date}</span>}
                          {apt.doctorName && <span className="text-[11px] font-semibold text-outline-variant bg-surface-container px-2 py-0.5 rounded-md">Dr: {apt.doctorName}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-md pt-2 border-t border-outline-variant/20">
                      <div className="flex gap-2">
                        {apt.status !== 'Completed' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedAppointment({ ...apt, name: patientName, age, gender, id: aptId });
                                setRescheduleDate(apt.date || new Date().toISOString().split('T')[0]);
                                setRescheduleTime(apt.time);
                              }}
                              className="cursor-pointer p-2 hover:bg-surface-container rounded-xl text-primary transition-colors"
                              title="Reschedule"
                            >
                              <Edit3 size={18} />
                            </button>
                            <button
                              onClick={() => handleCancel(aptId)}
                              className="cursor-pointer p-2 hover:bg-error-container rounded-xl text-error transition-colors"
                              title="Cancel Appointment"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {apt.status === 'Completed' && (
                          <span className="text-[11px] font-bold text-secondary bg-secondary-container px-3 py-1 rounded-full uppercase">
                            Completed
                          </span>
                        )}
                        {apt.status === 'No-Show' && (
                          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/20 border border-amber-500/30 px-3 py-1 rounded-full uppercase">
                            No-Show
                          </span>
                        )}
                        {apt.status === 'Reschedule Required' && (
                          <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/20 border border-rose-500/30 px-3 py-1 rounded-full uppercase">
                            Reschedule Required
                          </span>
                        )}
                        {apt.status === 'In Progress' && (
                          <Link 
                            href={`/dashboard/doctor/consultations?patientId=${patientId}&appointmentId=${aptId}`}
                            className="cursor-pointer text-xs font-bold bg-secondary text-on-secondary px-4 py-2 rounded-xl flex items-center gap-1 hover:opacity-90 transition-all clinical-shadow"
                          >
                            Resume Note <ArrowRight size={14} />
                          </Link>
                        )}
                        {(apt.status === 'Scheduled' || apt.status === 'Checked In') && (
                          <div className="flex items-center gap-1.5">
                            <Link 
                              href={`/dashboard/doctor/consultations?patientId=${patientId}&appointmentId=${aptId}`}
                              className="cursor-pointer text-xs font-bold bg-primary text-on-primary px-4 py-2 rounded-xl flex items-center gap-1 hover:opacity-90 transition-all clinical-shadow"
                            >
                              Start Consult <ArrowRight size={14} />
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleMarkNoShow(aptId)}
                              className="cursor-pointer text-xs font-semibold border border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 px-2.5 py-2 rounded-xl flex items-center gap-1 transition-all"
                              title="Mark as No-Show"
                            >
                              <UserX size={13} /> No-Show
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-16 text-center text-outline">
                <Calendar className="mx-auto w-12 h-12 text-outline-variant mb-3" />
                <p className="font-semibold text-body-md">No appointments found for the &quot;{activeTab}&quot; tab.</p>
              </div>
            )}
          </div>
        )}

        {/* Reschedule Modal */}
        {selectedAppointment && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-md animate-fade-in">
            <div className="bg-surface-container-lowest rounded-2xl max-w-240 w-full clinical-shadow border border-outline-variant/30 overflow-hidden">
              <div className="px-6 py-4.5 bg-primary text-on-primary flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-title-sm">Reschedule Clinical Appointment</h3>
                  <p className="text-xs text-on-primary/80">Adjust clinical slot and patient visit time</p>
                </div>
                <button onClick={() => setSelectedAppointment(null)} className="cursor-pointer hover:bg-white/10 p-1.5 rounded-full transition-colors text-white">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleRescheduleSubmit} className="p-6 md:p-8 space-y-5">
                <div className="p-4 bg-surface-container/30 border border-outline-variant/20 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-outline block">Selected Patient</span>
                    <p className="font-bold text-on-surface text-body-md">{selectedAppointment.name}</p>
                    <p className="text-xs text-on-surface-variant font-medium mt-0.5">{selectedAppointment.gender}, {selectedAppointment.age} yrs • Reason: {selectedAppointment.reason}</p>
                  </div>
                  <span className="text-xs font-bold text-primary bg-primary-fixed px-3 py-1 rounded-full uppercase tracking-wider font-mono">
                    {selectedAppointment.id}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-body-sm text-outline mb-1.5 font-semibold">New Appointment Date</label>
                    <input
                      type="date"
                      required
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="w-full p-3 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-body-sm text-outline mb-1.5 font-semibold">New Time Slot</label>
                    <select
                      required
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                      className="w-full p-3 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="">Select Time Slot...</option>
                      <option value="09:00 AM">09:00 AM</option>
                      <option value="09:30 AM">09:30 AM</option>
                      <option value="10:00 AM">10:00 AM</option>
                      <option value="10:30 AM">10:30 AM</option>
                      <option value="11:00 AM">11:00 AM</option>
                      <option value="11:30 AM">11:30 AM</option>
                      <option value="12:00 PM">12:00 PM</option>
                      <option value="01:30 PM">01:30 PM</option>
                      <option value="02:00 PM">02:00 PM</option>
                      <option value="02:30 PM">02:30 PM</option>
                      <option value="03:00 PM">03:00 PM</option>
                      <option value="03:30 PM">03:30 PM</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-sm pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAppointment(null)}
                    className="cursor-pointer px-4 py-2 border border-outline-variant/40 rounded-xl hover:bg-surface-container transition-colors text-body-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="cursor-pointer px-5 py-2 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 disabled:opacity-50 transition-all clinical-shadow text-body-sm flex items-center gap-2"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                    <span>Confirm Reschedule</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <Footer />
      </main>
    </div>
  );
}

