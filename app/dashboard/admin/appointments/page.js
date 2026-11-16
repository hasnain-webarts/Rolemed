"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/Admin_Sidebar';
import Footer from '@/components/Footer';
import ConfirmationModal from '@/components/ConfirmationModal';
import { 
  MdAdd, 
  MdDownload, 
  MdSearch, 
  MdClose,
  MdRefresh 
} from 'react-icons/md';
import { Calendar, Clock, User, Stethoscope, Check, AlertCircle, X } from 'lucide-react';
import { exportToCsv } from '@/lib/csvExport';

const tabs = ['All', 'Scheduled', 'Checked In', 'In Progress', 'Completed', 'Cancelled'];

function checkDoctorAvailability(doctor, dateStr) {
  if (!doctor || !dateStr) {
    return { available: true, status: 'available', message: 'Doctor Available' };
  }

  // 1. Check leaves
  if (doctor.leaves && Array.isArray(doctor.leaves) && doctor.leaves.length > 0) {
    const leaveConflict = doctor.leaves.find((l) => {
      if (!l.startDate || !l.endDate) return false;
      const st = (l.status || '').toLowerCase();
      const isApproved = st === 'approved';
      return isApproved && dateStr >= l.startDate && dateStr <= l.endDate;
    });

    if (leaveConflict) {
      return {
        available: false,
        status: 'leave',
        message: `On Scheduled Leave (${leaveConflict.startDate} to ${leaveConflict.endDate}): ${leaveConflict.reason || 'Personal / Medical'}`,
      };
    }
  }

  // 2. Check weekly consulting schedule
  if (doctor.weeklySchedule && Array.isArray(doctor.weeklySchedule) && doctor.weeklySchedule.length > 0) {
    const dateObj = new Date(`${dateStr}T12:00:00Z`);
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const daySlot = doctor.weeklySchedule.find(
      (s) => s.day && s.day.toLowerCase() === dayOfWeek.toLowerCase()
    );

    if (daySlot && daySlot.active === false) {
      return {
        available: false,
        status: 'off-duty',
        message: `Off-Duty on ${dayOfWeek}s. Please pick an active clinic day.`,
      };
    }
  }

  return {
    available: true,
    status: 'available',
    message: `Available for Consultations (${doctor.specialization || doctor.department || 'Specialist'})`,
  };
}

export default function AppointmentsPage() {
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState("");
  const [errorNotice, setErrorNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Appointment Form State
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [aptDate, setAptDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [aptTime, setAptTime] = useState("10:00 AM");
  const [aptReason, setAptReason] = useState("");

  // Confirmation Modal State (RM-FE-UX-001)
  const [cancellingApt, setCancellingApt] = useState(null);
  const [isCancelLoading, setIsCancelLoading] = useState(false);

  // Modal Escape-key handling
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isNewModalOpen && !isSubmitting) setIsNewModalOpen(false);
        if (cancellingApt && !isCancelLoading) setCancellingApt(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNewModalOpen, isSubmitting, cancellingApt, isCancelLoading]);

  // Fetch appointments, patients, and doctors
  useEffect(() => {
    let ignore = false;
    async function loadData() {
      setLoading(true);
      try {
        const [aptsRes, patsRes, docsRes] = await Promise.all([
          fetch('/api/appointments?limit=200', { cache: 'no-store' }),
          fetch('/api/patients?limit=150', { cache: 'no-store' }),
          fetch('/api/doctors', { cache: 'no-store' }),
        ]);

        const [aptsData, patsData, docsData] = await Promise.all([
          aptsRes.json(),
          patsRes.json(),
          docsRes.json(),
        ]);

        if (!ignore) {
          if (aptsData.success) setAppointments(aptsData.appointments || []);
          if (patsData.success) {
            setPatients(patsData.patients || []);
            if (patsData.patients?.length > 0) setSelectedPatientId(patsData.patients[0].patientId);
          }
          if (docsData.success) {
            const docList = docsData.doctors || docsData.staff || [];
            setDoctors(docList);
            if (docList.length > 0) setSelectedDoctorId(docList[0]._id);
          }
        }
      } catch (err) {
        console.error('Error fetching appointment data:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const matchesTab =
        activeTab === 'All' ||
        (apt.status || '').toLowerCase() === activeTab.toLowerCase();

      if (!matchesTab) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const pName = (apt.patientName || '').toLowerCase();
      const aId = (apt.appointmentId || '').toLowerCase();
      const dName = (apt.doctorName || '').toLowerCase();
      const rsn = (apt.reason || '').toLowerCase();

      return pName.includes(q) || aId.includes(q) || dName.includes(q) || rsn.includes(q);
    });
  }, [appointments, activeTab, searchQuery]);

  const selectedDoctorObj = doctors.find((d) => d._id === selectedDoctorId);
  const docAvailability = checkDoctorAvailability(selectedDoctorObj, aptDate);

  // Book Appointment Submit
  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    if (!selectedPatientId || !selectedDoctorId) return;

    if (!docAvailability.available) {
      setErrorNotice(`Cannot schedule appointment: ${docAvailability.message}`);
      return;
    }

    setIsSubmitting(true);
    setErrorNotice("");

    const pat = patients.find((p) => p.patientId === selectedPatientId);
    const doc = doctors.find((d) => d._id === selectedDoctorId);

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatientId,
          doctorId: selectedDoctorId,
          patientName: pat?.name || 'Registered Patient',
          doctorName: doc?.name || 'Dr. Sarah Johnson',
          date: aptDate,
          time: aptTime,
          reason: aptReason.trim() || 'General Medical Consultation',
          status: 'Scheduled',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to schedule appointment');
      }

      setFeedbackNotice(`Appointment ${data.appointment?.appointmentId || ''} booked for ${pat?.name}!`);
      setIsNewModalOpen(false);
      setAptReason('');
      setRefreshKey((k) => k + 1);
      setTimeout(() => setFeedbackNotice(''), 4000);
    } catch (err) {
      setErrorNotice(err.message || 'Error booking appointment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel Appointment Status Trigger
  const handleCancel = (apt) => {
    setCancellingApt(apt);
  };

  const executeCancel = async () => {
    if (!cancellingApt) return;
    setIsCancelLoading(true);

    try {
      const res = await fetch(`/api/appointments/${cancellingApt.appointmentId || cancellingApt._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Cancelled' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel appointment');
      }

      setFeedbackNotice(`Appointment ${cancellingApt.appointmentId} cancelled.`);
      setCancellingApt(null);
      setRefreshKey((k) => k + 1);
      setTimeout(() => setFeedbackNotice(''), 3000);
    } catch (err) {
      setErrorNotice(err.message || 'Failed to update status');
      setTimeout(() => setErrorNotice(''), 4000);
    } finally {
      setIsCancelLoading(false);
    }
  };

  // Export CSV
  const handleExport = () => {
    const columns = [
      { key: 'appointmentId', label: 'Appointment ID' },
      { key: 'patientName', label: 'Patient Name' },
      { key: 'doctorName', label: 'Doctor' },
      { key: 'date', label: 'Date' },
      { key: 'time', label: 'Time' },
      { key: 'status', label: 'Status' },
      { key: 'reason', label: 'Clinical Reason' },
    ];
    exportToCsv('hospital_appointments_log.csv', columns, filteredAppointments);
    setFeedbackNotice(`Exported ${filteredAppointments.length} appointments to CSV.`);
    setTimeout(() => setFeedbackNotice(''), 3500);
  };

  return (
    <div className="flex bg-background min-h-screen text-on-surface">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <div className="p-6 md:p-8 space-y-6 flex-1">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/10">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold font-headline tracking-tight">
                    Hospital Appointments &amp; OPD Booking
                  </h1>
                  <p className="text-sm text-outline">
                    Comprehensive outpatient consultation schedule, queue management, and doctor bookings.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setRefreshKey((k) => k + 1)}
                disabled={loading}
                className="cursor-pointer px-3.5 py-2 border border-outline-variant/30 rounded-xl text-xs font-semibold hover:bg-surface-container flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <MdRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <button
                type="button"
                onClick={handleExport}
                className="cursor-pointer px-4 py-2 border border-outline-variant/30 rounded-xl text-xs font-semibold hover:bg-surface-container flex items-center gap-1.5 transition-all text-outline hover:text-on-surface"
              >
                <MdDownload className="w-4 h-4" />
                Export CSV
              </button>

              <button
                type="button"
                onClick={() => setIsNewModalOpen(true)}
                className="cursor-pointer flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-xl font-bold text-xs hover:opacity-90 transition-all shadow-xs"
              >
                <MdAdd className="w-4 h-4" />
                Book Appointment
              </button>
            </div>
          </div>

          {/* Feedback Notices */}
          {feedbackNotice && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-semibold flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{feedbackNotice}</span>
              </div>
              <button type="button" onClick={() => setFeedbackNotice("")} className="cursor-pointer p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {errorNotice && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-semibold flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorNotice}</span>
              </div>
              <button type="button" onClick={() => setErrorNotice("")} className="cursor-pointer p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 p-1 bg-surface-container/40 rounded-2xl border border-outline-variant/20 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    activeTab === tab
                      ? "bg-surface-container-lowest text-primary shadow-xs font-headline"
                      : "text-outline hover:text-on-surface"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="relative">
              <MdSearch className="w-4 h-4 text-outline absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient, doctor, or ID..."
                className="pl-9 pr-4 py-2 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-72"
              />
            </div>
          </div>

          {/* Appointments Table */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container/40 text-outline text-[11px] font-bold">
                  <tr>
                    <th className="p-3.5">Appointment ID</th>
                    <th className="p-3.5">Patient Details</th>
                    <th className="p-3.5">Attending Doctor</th>
                    <th className="p-3.5">Date &amp; Time</th>
                    <th className="p-3.5">Clinical Purpose</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {filteredAppointments.map((apt) => (
                    <tr key={apt.appointmentId || apt._id} className="hover:bg-surface-container/30 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-primary">{apt.appointmentId}</td>
                      <td className="p-3.5">
                        <span className="font-bold text-on-surface block">{apt.patientName}</span>
                        <span className="text-[10px] text-outline font-mono">{apt.patientId}</span>
                      </td>
                      <td className="p-3.5 font-medium text-on-surface">
                        {apt.doctorName || 'Dr. Sarah Johnson'}
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-on-surface block">{apt.date}</span>
                        <span className="text-[10px] text-outline">{apt.time}</span>
                      </td>
                      <td className="p-3.5 text-outline max-w-xs truncate">
                        {apt.reason || 'General Medical Consultation'}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            apt.status === 'Completed'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : apt.status === 'In Progress' || apt.status === 'Checked In'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : apt.status === 'No-Show'
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                              : apt.status === 'Reschedule Required'
                              ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                              : apt.status === 'Cancelled'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 line-through'
                              : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {apt.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        {apt.status !== 'Cancelled' && apt.status !== 'Completed' && (
                          <button
                            type="button"
                            onClick={() => handleCancel(apt)}
                            className="cursor-pointer px-2.5 py-1 rounded-lg border border-outline-variant/20 hover:bg-rose-500/10 text-outline hover:text-rose-500 text-[11px] font-semibold transition-all"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {filteredAppointments.length === 0 && (
                    <tr>
                      <td colSpan="7" className="p-10 text-center text-outline text-xs">
                        {loading ? 'Loading appointments from MongoDB...' : 'No appointments found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Book Appointment Modal */}
        {isNewModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
            <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl w-full max-w-240 shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container/30">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span className="font-bold text-sm">Schedule OPD Appointment</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="cursor-pointer p-1 rounded-lg hover:bg-surface-container text-outline"
                >
                  <MdClose className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateAppointment} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-outline mb-1">
                    Select Patient from Registry
                  </label>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    required
                    className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none"
                  >
                    {patients.map((p) => (
                      <option key={p.patientId} value={p.patientId}>
                        {p.patientId} - {p.name} ({p.gender}, {p.age}y)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-outline mb-1">
                    Attending Medical Practitioner
                  </label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    required
                    className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none"
                  >
                    {doctors.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name} ({d.specialization || d.department})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Doctor Availability Pill */}
                <div
                  className={`p-2.5 rounded-xl border text-[11px] font-semibold flex items-center gap-2 transition-all ${
                    !docAvailability.available
                      ? docAvailability.status === 'leave'
                        ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: !docAvailability.available
                        ? docAvailability.status === 'leave'
                          ? '#ef4444'
                          : '#f59e0b'
                        : '#10b981',
                    }}
                  />
                  <span>
                    <strong>
                      {!docAvailability.available
                        ? docAvailability.status === 'leave'
                          ? 'Practitioner On Leave: '
                          : 'Practitioner Off-Duty: '
                        : 'Practitioner Available: '}
                    </strong>
                    {docAvailability.message}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-outline mb-1">
                      Consultation Date
                    </label>
                    <input
                      type="date"
                      value={aptDate}
                      onChange={(e) => setAptDate(e.target.value)}
                      required
                      className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-outline mb-1">
                      OPD Queue Intake
                    </label>
                    <div className="p-2.5 bg-surface-container/30 border border-outline-variant/30 rounded-xl flex items-center justify-between text-outline">
                      <span className="font-semibold text-primary flex items-center gap-1">
                        <Clock size={13} /> Token Number
                      </span>
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-outline-variant/20">
                        Auto-Generated
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-outline mb-1">
                    Consultation Clinical Reason
                  </label>
                  <input
                    type="text"
                    value={aptReason}
                    onChange={(e) => setAptReason(e.target.value)}
                    placeholder="e.g., Routine cardiac follow-up, ECG review"
                    className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-outline-variant/10">
                  <button
                    type="button"
                    onClick={() => setIsNewModalOpen(false)}
                    className="cursor-pointer px-4 py-2 border border-outline-variant/30 rounded-xl font-semibold hover:bg-surface-container text-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !docAvailability.available}
                    className="cursor-pointer px-5 py-2 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting
                      ? "Booking..."
                      : !docAvailability.available
                      ? "Doctor Unavailable on Date"
                      : "Confirm Appointment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Destructive Cancellation Confirmation Modal */}
        <ConfirmationModal
          isOpen={Boolean(cancellingApt)}
          title={`Cancel Clinical Appointment: ${cancellingApt?.appointmentId}`}
          description={`Are you sure you want to cancel the appointment for ${cancellingApt?.patientName} with ${cancellingApt?.doctorName}? This action updates the hospital schedule ledger.`}
          confirmLabel="Confirm Cancellation"
          cancelLabel="Keep Scheduled"
          variant="danger"
          loading={isCancelLoading}
          onConfirm={executeCancel}
          onClose={() => setCancellingApt(null)}
        />

        <Footer />
      </main>
    </div>
  );
}
