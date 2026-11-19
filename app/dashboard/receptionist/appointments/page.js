"use client"

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Calendar, Plus, Clock, Stethoscope, CheckCircle2, User, X, Edit3, Trash2, Check, Download, Loader2, ShieldAlert, UserX } from 'lucide-react';
import Sidebar from '@/components/Receptionist_Sidebar';
import Footer from '@/components/Footer';
import ConfirmationModal from '@/components/ConfirmationModal';
import { downloadCSV } from '@/lib/csvExport';

function checkDoctorAvailability(doctor, dateStr) {
  if (!doctor) {
    return { available: false, status: 'unselected', message: 'Select an attending specialist to verify availability' };
  }
  if (!dateStr) {
    return { available: false, status: 'unselected', message: 'Select an appointment date' };
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
        message: `Off-Duty on ${dayOfWeek}s. Please select an active consulting day.`,
      };
    }
  }

  return {
    available: true,
    status: 'available',
    message: `Available for Consultations (${doctor.specialization || doctor.department || 'Specialist'})`,
  };
}

function AppointmentsContent() {
  const searchParams = useSearchParams();
  const urlPatientId = searchParams.get('patientId') || '';
  const urlDoctor = searchParams.get('doctor') || searchParams.get('doctorId') || '';

  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Book Form State
  const [selectedPatientId, setSelectedPatientId] = useState(urlPatientId);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [appointmentTime, setAppointmentTime] = useState('09:00 AM');
  const [appointmentReason, setAppointmentReason] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Reschedule Modal State
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // Destructive Confirmation Modal State (RM-FE-UX-001)
  const [confirmModalConfig, setConfirmModalConfig] = useState(null);
  const [confirmActionLoading, setConfirmActionLoading] = useState(false);

  // Escape-key modal dismissal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (editingAppointment && !rescheduleLoading) {
          setEditingAppointment(null);
        }
        if (confirmModalConfig && !confirmActionLoading) {
          setConfirmModalConfig(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingAppointment, rescheduleLoading, confirmModalConfig, confirmActionLoading]);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function loadAppointmentsData() {
      try {
        const [aptRes, patRes, docRes] = await Promise.all([
          fetch('/api/appointments?limit=100', { cache: 'no-store' }),
          fetch('/api/patients?limit=200', { cache: 'no-store' }),
          fetch('/api/doctors', { cache: 'no-store' }),
        ]);
        const aptData = aptRes.ok ? await aptRes.json().catch(() => ({})) : {};
        const patData = patRes.ok ? await patRes.json().catch(() => ({})) : {};
        const docData = docRes.ok ? await docRes.json().catch(() => ({})) : {};

        if (!ignore) {
          if (aptData.success && aptData.appointments) {
            setAppointments(aptData.appointments);
          }
          if (patData.success && patData.patients) {
            setPatients(patData.patients);
          }
          const doctorList = docData.doctors || docData.staff || [];
          if (docData.success && doctorList.length > 0) {
            setDoctors(doctorList);
            // Default to first doctor if current selectedDoctor is not set or not in list
            setSelectedDoctor((prev) => {
              if (urlDoctor) {
                const matchUrlDoc = doctorList.find((d) => {
                  const fn = d.name.startsWith('Dr.') ? d.name : `Dr. ${d.name}`;
                  return (
                    fn.toLowerCase().includes(urlDoctor.toLowerCase()) ||
                    d.name.toLowerCase().includes(urlDoctor.toLowerCase())
                  );
                });
                if (matchUrlDoc) {
                  return matchUrlDoc.name.startsWith('Dr.') ? matchUrlDoc.name : `Dr. ${matchUrlDoc.name}`;
                }
              }
              const exists = doctorList.some((d) => {
                const fn = d.name.startsWith('Dr.') ? d.name : `Dr. ${d.name}`;
                return fn === prev || d.name === prev;
              });
              if (exists && prev) return prev;
              const first = doctorList[0];
              return first.name.startsWith('Dr.') ? first.name : `Dr. ${first.name}`;
            });
          }
        }
      } catch (err) {
        console.error('Failed to load appointments data:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadAppointmentsData();
    return () => {
      ignore = true;
    };
  }, [refreshKey, urlDoctor]);

  // Find active doctor object for availability calculation
  const currentDoctorObj = doctors.find((d) => {
    const formatted = d.name.startsWith('Dr.') ? d.name : `Dr. ${d.name}`;
    return formatted === selectedDoctor || d.name === selectedDoctor || d.name === selectedDoctor.replace(/^Dr\.\s*/i, '');
  });

  const availability = checkDoctorAvailability(currentDoctorObj, appointmentDate);

  // Reschedule doctor availability
  const rescheduleDoctorObj = editingAppointment
    ? doctors.find((d) => {
        const formatted = d.name.startsWith('Dr.') ? d.name : `Dr. ${d.name}`;
        return (
          formatted === editingAppointment.doctorName ||
          d.name === editingAppointment.doctorName ||
          d.name === (editingAppointment.doctorName || '').replace(/^Dr\.\s*/i, '')
        );
      })
    : null;

  const rescheduleAvailability = checkDoctorAvailability(rescheduleDoctorObj, editDate);

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!selectedPatientId || !selectedDoctor || !appointmentDate) {
      setErrorMsg('Please select a patient, doctor, and date');
      return;
    }

    if (!availability.available) {
      setErrorMsg(`Cannot book appointment: ${availability.message}`);
      return;
    }

    setBookingLoading(true);
    setErrorMsg('');

    try {
      const patient = patients.find(p => p.patientId === selectedPatientId || p._id === selectedPatientId);

      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient ? patient.patientId : selectedPatientId,
          patientName: patient ? patient.name : 'Patient',
          doctorName: selectedDoctor,
          date: appointmentDate,
          time: '',
          reason: appointmentReason || 'General Consultation',
        }),
      });

      const data = await res.json();
      setBookingLoading(false);

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to book appointment');
      } else {
        setSuccessMsg(
          `Appointment booked! ID: ${data.appointment?.appointmentId} • ${data.appointment?.time || `Token #${data.appointment?.queueNumber || 1}`}`
        );
        setRefreshKey((k) => k + 1);

        // Reset Form fields
        setSelectedPatientId('');
        setAppointmentDate(new Date().toISOString().split('T')[0]);
        setAppointmentReason('');

        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      setBookingLoading(false);
      setErrorMsg('Network error while booking appointment');
    }
  };

  const handleCheckIn = async (appointmentId) => {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Checked In' }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Patient checked in! Moved to live doctor queue.`);
        setRefreshKey((k) => k + 1);
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      setErrorMsg('Failed to update patient check-in status');
    }
  };

  const openCancelModal = (apt) => {
    setConfirmModalConfig({
      title: 'Cancel Clinical Appointment',
      description: `Are you sure you want to cancel the appointment for ${apt.patientName} (${apt.appointmentId}) with ${apt.doctorName}? This action cannot be reversed.`,
      confirmLabel: 'Cancel Appointment',
      cancelLabel: 'Keep Appointment',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmActionLoading(true);
        try {
          const res = await fetch(`/api/appointments/${apt.appointmentId}`, {
            method: 'DELETE',
          });
          const data = await res.json();
          if (data.success) {
            setSuccessMsg('Appointment cancelled successfully.');
            setConfirmModalConfig(null);
            setRefreshKey((k) => k + 1);
            setTimeout(() => setSuccessMsg(''), 3000);
          } else {
            setErrorMsg(data.error || 'Failed to cancel appointment');
          }
        } catch (err) {
          setErrorMsg('Failed to cancel appointment');
        } finally {
          setConfirmActionLoading(false);
        }
      },
    });
  };

  const openNoShowModal = (apt) => {
    setConfirmModalConfig({
      title: 'Mark Patient as No-Show',
      description: `Confirm that patient ${apt.patientName} (${apt.appointmentId}) failed to attend their scheduled consultation with ${apt.doctorName}?`,
      confirmLabel: 'Mark No-Show',
      cancelLabel: 'Dismiss',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmActionLoading(true);
        try {
          const res = await fetch(`/api/appointments/${apt.appointmentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'No-Show' }),
          });
          const data = await res.json();
          if (data.success) {
            setSuccessMsg('Appointment marked as No-Show.');
            setConfirmModalConfig(null);
            setRefreshKey((k) => k + 1);
            setTimeout(() => setSuccessMsg(''), 3000);
          } else {
            setErrorMsg(data.error || 'Failed to update status');
          }
        } catch (err) {
          setErrorMsg('Failed to update appointment status to No-Show');
        } finally {
          setConfirmActionLoading(false);
        }
      },
    });
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!editDate || !editTime || !editingAppointment) return;

    if (!rescheduleAvailability.available) {
      setErrorMsg(`Cannot reschedule: ${rescheduleAvailability.message}`);
      return;
    }

    setRescheduleLoading(true);

    try {
      const res = await fetch(`/api/appointments/${editingAppointment.appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: editDate,
          time: editTime,
          status: 'Scheduled',
        }),
      });

      const data = await res.json();
      setRescheduleLoading(false);

      if (data.success) {
        setSuccessMsg(`Appointment ${editingAppointment.appointmentId} rescheduled to ${editDate} at ${editTime}!`);
        setEditingAppointment(null);
        setRefreshKey((k) => k + 1);
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(data.error || 'Failed to reschedule appointment');
      }
    } catch (err) {
      setRescheduleLoading(false);
      setErrorMsg('Network error updating appointment');
    }
  };

  const handleExportCSV = () => {
    if (appointments.length === 0) return;
    const exportData = appointments.map(a => ({
      'Appointment ID': a.appointmentId,
      'Patient ID': a.patientId,
      'Patient Name': a.patientName,
      'Attending Doctor': a.doctorName,
      'Date': a.date,
      'Time Slot': a.time,
      'Reason': a.reason,
      'Status': a.status,
    }));
    downloadCSV(exportData, `reception_appointments_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const filteredAppointments = appointments.filter(apt => {
    const q = searchQuery.toLowerCase();
    return (
      (apt.patientName || '').toLowerCase().includes(q) ||
      (apt.appointmentId || '').toLowerCase().includes(q) ||
      (apt.patientId || '').toLowerCase().includes(q) ||
      (apt.doctorName || '').toLowerCase().includes(q) ||
      (apt.reason || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background p-margin no-scrollbar">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-md mb-lg">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold">Appointment Scheduling</h2>
            <p className="text-body-sm text-on-surface-variant">Book consultations, assign clinical specialists, triage walk-ins, and manage schedule flow.</p>
          </div>
          <button
            onClick={handleExportCSV}
            className="cursor-pointer flex items-center gap-1.5 px-4 py-2 border border-outline-variant/30 rounded-xl bg-surface-container-lowest hover:bg-surface-container text-body-sm font-semibold transition-colors shadow-sm self-start sm:self-auto"
          >
            <Download size={15} /> Export Ledger (CSV)
          </button>
        </header>

        {successMsg && (
          <div className="mb-lg p-md rounded-2xl bg-secondary-container text-on-secondary-container flex items-center gap-2 clinical-shadow font-semibold text-body-sm animate-fade-in border border-secondary/20">
            <Check className="w-5 h-5 text-secondary shrink-0" /> {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="mb-lg p-md rounded-2xl bg-error-container text-on-error-container flex items-center gap-2 clinical-shadow font-semibold text-body-sm animate-fade-in border border-error/20">
            <ShieldAlert className="w-5 h-5 text-error shrink-0" /> {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-12 gap-gutter mb-lg">
          {/* Booking Form */}
          <div className="col-span-12 xl:col-span-5 glass-card p-margin rounded-[24px] clinical-shadow">
            <h3 className="text-title-sm font-bold text-on-surface mb-md flex items-center gap-2">
              <Plus className="text-primary" /> Book Clinical Appointment
            </h3>

            <form onSubmit={handleBookAppointment} className="space-y-md text-body-sm">
              <div>
                <label className="block text-outline mb-1 font-semibold">Select Patient *</label>
                <select
                  required
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary cursor-pointer font-medium"
                >
                  <option value="">Choose Patient File...</option>
                  {patients.map(p => (
                    <option key={p.patientId || p._id} value={p.patientId}>
                      {p.name} ({p.patientId}) {p.cnic ? `• CNIC: ${p.cnic}` : ''} - {p.gender}, {p.age}y
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-outline mb-1 font-semibold">Attending Doctor / Specialist *</label>
                <select
                  required
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary cursor-pointer font-medium"
                >
                  <option value="">
                    {loading
                      ? 'Loading specialists...'
                      : doctors.length === 0
                      ? 'No specialists available'
                      : 'Select Attending Doctor / Specialist...'}
                  </option>
                  {doctors.map(d => {
                    const docFormattedName = d.name.startsWith('Dr.') ? d.name : `Dr. ${d.name}`;
                    return (
                      <option key={d._id || d.name} value={docFormattedName}>
                        {docFormattedName} ({d.specialization || d.department || 'Specialist'} • {d.deskStation || d.office || 'OPD'})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Dynamic Availability Indicator Badge */}
              {selectedDoctor ? (
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                    !availability.available
                      ? availability.status === 'leave'
                        ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
                        : availability.status === 'off-duty'
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                        : 'bg-outline-variant/10 text-outline border-outline-variant/30'
                      : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: !availability.available
                        ? availability.status === 'leave'
                          ? '#ef4444'
                          : availability.status === 'off-duty'
                          ? '#f59e0b'
                          : '#94a3b8'
                        : '#10b981',
                    }}
                  />
                  <span className="leading-tight">
                    <strong className="font-bold">
                      {!availability.available
                        ? availability.status === 'leave'
                          ? 'Doctor On Leave: '
                          : availability.status === 'off-duty'
                          ? 'Doctor Off-Duty: '
                          : ''
                        : 'Available: '}
                    </strong>
                    {availability.message}
                  </span>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl border border-dashed border-outline-variant/50 text-xs text-outline flex items-center gap-2 bg-surface-container-low/40">
                  <span className="w-2 h-2 rounded-full bg-outline/40 shrink-0" />
                  <span>Select an attending specialist above to verify consulting roster & live leave status.</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                <div>
                  <label className="block text-outline mb-1 font-semibold">Appointment Date *</label>
                  <input
                    type="date"
                    required
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-outline mb-1 font-semibold">Queue / Token Intake</label>
                  <div className="p-2.5 border border-outline-variant/30 rounded-xl bg-surface-container/40 text-body-sm flex items-center justify-between">
                    <span className="font-semibold text-primary flex items-center gap-1.5">
                      <Clock size={16} /> Sequential OPD Token
                    </span>
                    <span className="text-[11px] font-mono font-bold text-outline uppercase bg-white px-2 py-0.5 rounded-md border border-outline-variant/20">
                      Auto-Allocated
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-outline mb-1 font-semibold">Reason for Visit / Chief Complaint</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Follow-up on hypertension readings, persistent cough..."
                  value={appointmentReason}
                  onChange={(e) => setAppointmentReason(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={bookingLoading || !availability.available}
                className="cursor-pointer w-full flex items-center justify-center gap-2 py-3 bg-primary text-on-primary rounded-xl font-bold clinical-shadow hover:opacity-90 disabled:opacity-50 transition-all text-body-sm"
              >
                {bookingLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Scheduling Appointment...
                  </>
                ) : !availability.available ? (
                  <>Doctor Unavailable on Selected Date</>
                ) : (
                  <>
                    <Calendar size={16} /> Confirm Appointment Booking
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Appointments Ledger Column */}
          <div className="col-span-12 xl:col-span-7 glass-card p-margin rounded-[24px] clinical-shadow flex flex-col h-[710px]">
            <div className="mb-md">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-title-sm font-bold text-on-surface">Scheduled Clinical Ledger</h3>
                <span className="text-xs font-semibold text-outline">({appointments.length} active slots)</span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4.5 h-4.5" />
                <input
                  type="text"
                  placeholder="Search by patient, ID, doctor, or symptom..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-surface-container border border-outline-variant/30 rounded-xl text-body-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-sm sidebar-scroll pr-1">
              {loading ? (
                <div className="py-20 text-center text-outline flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-xs font-semibold">Loading appointment ledger...</p>
                </div>
              ) : filteredAppointments.length > 0 ? (
                filteredAppointments.map((apt) => (
                  <div key={apt.appointmentId || apt._id} className="p-md bg-surface-container-low border border-outline-variant/10 rounded-2xl clinical-shadow flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-primary font-label-caps uppercase">{apt.appointmentId}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-outline font-semibold flex items-center gap-1">
                            <Clock size={12} /> {apt.date} • {apt.time}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            apt.status === 'Completed' ? 'bg-secondary-container text-on-secondary-container' :
                            apt.status === 'In Progress' ? 'bg-secondary text-white' :
                            apt.status === 'Checked In' ? 'bg-[#26A69A]/20 text-[#26A69A]' :
                            apt.status === 'No-Show' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30' :
                            apt.status === 'Reschedule Required' ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30' :
                            apt.status === 'Cancelled' ? 'bg-surface-container text-outline line-through' :
                            'bg-surface-container text-outline'
                          }`}>
                            {apt.status}
                          </span>
                        </div>
                      </div>

                      <h5 className="font-bold text-on-surface text-body-md mb-0.5">{apt.patientName} <span className="text-outline text-xs font-normal">({apt.patientId})</span></h5>
                      <p className="text-[12px] text-on-surface-variant font-medium flex items-center gap-1.5 mb-1.5">
                        <Stethoscope size={13} className="text-secondary" /> {apt.doctorName}
                      </p>
                      <p className="text-xs text-outline line-clamp-1">Reason: {apt.reason}</p>
                    </div>

                    <div className="flex justify-between items-center mt-sm pt-2.5 border-t border-outline-variant/10">
                      <div className="flex gap-1.5">
                        {apt.status !== 'Completed' && apt.status !== 'Cancelled' && (
                          <>
                            <button
                              onClick={() => {
                                setEditingAppointment(apt);
                                setEditDate(apt.date);
                                setEditTime(apt.time);
                              }}
                              className="cursor-pointer p-1.5 hover:bg-surface-container rounded-lg text-outline hover:text-primary transition-colors"
                              title="Reschedule appointment"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              onClick={() => openCancelModal(apt)}
                              className="cursor-pointer p-1.5 hover:bg-error-container rounded-lg text-outline hover:text-error transition-colors"
                              title="Cancel appointment"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {(apt.status === 'Scheduled' || apt.status === 'Reschedule Required') && (
                          <>
                            {apt.status === 'Scheduled' && (
                              <button
                                onClick={() => handleCheckIn(apt.appointmentId)}
                                className="cursor-pointer text-xs font-bold bg-[#26A69A] text-white px-3.5 py-1.5 rounded-xl flex items-center gap-1 hover:opacity-90 transition-all clinical-shadow"
                              >
                                <CheckCircle2 size={14} /> Clinic Check-In
                              </button>
                            )}
                            <button
                              onClick={() => openNoShowModal(apt)}
                              className="cursor-pointer text-xs font-semibold border border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-all"
                              title="Mark patient as No-Show"
                            >
                              <UserX size={13} /> No-Show
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-16 text-center text-outline">
                  <User className="mx-auto w-12 h-12 text-outline-variant mb-2" />
                  <p className="font-semibold text-body-sm">No appointment files located in the ledger.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reschedule Modal */}
        {editingAppointment && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reschedule-modal-title"
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-md animate-fade-in"
          >
            <div className="bg-surface-container-lowest rounded-2xl max-w-xl w-full clinical-shadow border border-outline-variant/30 overflow-hidden">
              <div className="px-6 py-4.5 bg-primary text-on-primary flex justify-between items-center">
                <div>
                  <h3 id="reschedule-modal-title" className="font-bold text-title-sm">Reschedule Clinical Slot</h3>
                  <p className="text-xs text-on-primary/80">Adjust patient visit time and specialist allocation</p>
                </div>
                <button onClick={() => setEditingAppointment(null)} className="cursor-pointer hover:bg-white/10 p-1.5 rounded-full transition-colors text-white">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleRescheduleSubmit} className="p-6 md:p-8 space-y-md">
                <div className="p-4 bg-surface-container/30 border border-outline-variant/20 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-outline block">Patient File</span>
                    <p className="font-bold text-on-surface text-body-md">{editingAppointment.patientName}</p>
                    <p className="text-xs text-on-surface-variant font-medium mt-0.5">Doctor: {editingAppointment.doctorName}</p>
                  </div>
                  <span className="text-xs font-bold text-primary bg-primary-fixed px-3 py-1 rounded-full uppercase tracking-wider">
                    {editingAppointment.appointmentId}
                  </span>
                </div>

                {/* Reschedule Availability Indicator */}
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                    !rescheduleAvailability.available
                      ? rescheduleAvailability.status === 'leave'
                        ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: !rescheduleAvailability.available
                        ? rescheduleAvailability.status === 'leave'
                          ? '#ef4444'
                          : '#f59e0b'
                        : '#10b981',
                    }}
                  />
                  <span>
                    <strong>
                      {!rescheduleAvailability.available
                        ? rescheduleAvailability.status === 'leave'
                          ? 'Reschedule Blocked (On Leave): '
                          : 'Reschedule Blocked (Off-Duty): '
                        : 'Doctor Available: '}
                    </strong>
                    {rescheduleAvailability.message}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-body-sm text-outline mb-1.5 font-semibold">New Appointment Date</label>
                    <input
                      type="date"
                      required
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-body-sm text-outline mb-1.5 font-semibold">New Available Slot</label>
                    <select
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary cursor-pointer"
                    >
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

                <div className="flex justify-end gap-sm pt-3 border-t border-outline-variant/20">
                  <button
                    type="button"
                    onClick={() => setEditingAppointment(null)}
                    className="cursor-pointer px-4 py-2 border border-outline-variant/30 rounded-xl hover:bg-surface-container transition-colors text-body-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={rescheduleLoading || !rescheduleAvailability.available}
                    className="cursor-pointer px-6 py-2 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 disabled:opacity-50 transition-all clinical-shadow text-body-sm flex items-center gap-1.5"
                  >
                    {rescheduleLoading && <Loader2 size={15} className="animate-spin" />}
                    Confirm Reschedule
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Destructive Action Confirmation Modal */}
        <ConfirmationModal
          isOpen={Boolean(confirmModalConfig)}
          title={confirmModalConfig?.title || 'Confirm Action'}
          description={confirmModalConfig?.description || 'Are you sure you want to proceed?'}
          confirmLabel={confirmModalConfig?.confirmLabel || 'Confirm'}
          cancelLabel={confirmModalConfig?.cancelLabel || 'Cancel'}
          variant={confirmModalConfig?.variant || 'danger'}
          loading={confirmActionLoading}
          onConfirm={() => confirmModalConfig?.onConfirm && confirmModalConfig.onConfirm()}
          onClose={() => setConfirmModalConfig(null)}
        />

        <Footer />
      </main>
    </div>
  );
}

export default function ReceptionistAppointments() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-outline">Loading appointment schedule...</div>}>
      <AppointmentsContent />
    </Suspense>
  );
}
