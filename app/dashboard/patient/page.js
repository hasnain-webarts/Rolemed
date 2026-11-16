"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Calendar,
  Clock,
  Pill,
  FlaskConical,
  Bed,
  Activity,
  FileText,
  Printer,
  ChevronRight,
  Loader2,
  AlertCircle,
  Heart,
  ShieldAlert,
  User,
} from 'lucide-react';
import PatientSidebar from '@/components/Patient_Sidebar';
import Footer from '@/components/Footer';
import PatientEHRModal from '@/components/PatientEHRModal';
import Link from 'next/link';

export default function PatientDashboard() {
  const { data: session } = useSession();
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [showEHRModal, setShowEHRModal] = useState(false);

  const patientId = session?.user?.patientId || 'PAT-001';
  const patientName = session?.user?.name || patientData?.name || 'Valued Patient';

  useEffect(() => {
    let ignore = false;
    async function loadPatientDetails() {
      try {
        const res = await fetch(`/api/patients/${patientId}`, { cache: 'no-store' });
        const data = await res.json();
        if (!ignore) {
          if (data.success && data.patient) {
            setPatientData(data.patient);
          } else {
            setErrorMsg(data.error || 'Failed to retrieve patient medical profile');
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error('Error fetching patient records:', err);
          setErrorMsg('Network error while connecting to patient health records.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadPatientDetails();
    return () => {
      ignore = true;
    };
  }, [patientId]);

  const appointments = patientData?.appointments || [];
  const prescriptions = patientData?.prescriptions || [];
  const labOrders = patientData?.labOrders || [];
  const consultations = patientData?.consultations || [];
  const currentAdmission = patientData?.currentAdmission;
  const allergies = Array.isArray(patientData?.allergies) ? patientData.allergies : [];

  const upcomingApts = appointments.filter(
    (a) => a.status === 'Scheduled' || a.status === 'Checked In' || a.status === 'In Progress'
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <PatientSidebar />
      <main className="flex-1 overflow-y-auto bg-background p-margin no-scrollbar">
        {/* Welcome Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-lg">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                Welcome, {patientName}
              </h2>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant">
                {patientId}
              </span>
            </div>
            <p className="text-body-sm text-on-surface-variant">
              RoleMed Patient Health Portal — Manage your clinic visits, queue tokens, prescriptions, and test results.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEHRModal(true)}
              className="cursor-pointer flex items-center gap-1.5 px-4 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold clinical-shadow hover:opacity-90 transition-all"
            >
              <FileText size={16} /> View Complete Health Record (EHR)
            </button>
          </div>
        </header>

        {errorMsg && (
          <div className="mb-lg p-md rounded-2xl bg-error-container text-on-error-container flex items-center gap-2 clinical-shadow font-semibold text-body-sm">
            <AlertCircle className="w-5 h-5 text-error shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {allergies.length > 0 && (
          <div className="mb-lg p-3 bg-error-container/60 border border-error/20 rounded-2xl flex items-center gap-2 text-xs font-bold text-on-error-container">
            <ShieldAlert size={16} className="text-error shrink-0" />
            <span>Documented Allergies: {allergies.join(', ')}</span>
          </div>
        )}

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-outline gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-body-sm font-semibold">Synchronizing your clinical records...</p>
          </div>
        ) : (
          <>
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter mb-lg">
              {/* Next Appointment Card */}
              <div className="glass-card p-md rounded-2xl clinical-shadow border-l-4 border-primary">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-bold text-outline uppercase tracking-wider">
                    Next Consultation
                  </span>
                  <div className="p-2 rounded-xl bg-primary-fixed text-primary">
                    <Calendar size={18} />
                  </div>
                </div>
                <h3 className="font-bold text-headline-sm text-on-surface">
                  {upcomingApts.length > 0 ? upcomingApts[0].date : 'No Visits'}
                </h3>
                <p className="text-xs text-primary font-semibold mt-1">
                  {upcomingApts.length > 0
                    ? `${upcomingApts[0].time || 'Token Slot'} • ${upcomingApts[0].doctorName}`
                    : 'All consultations up to date'}
                </p>
              </div>

              {/* Active Prescriptions Card */}
              <div className="glass-card p-md rounded-2xl clinical-shadow border-l-4 border-secondary">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-bold text-outline uppercase tracking-wider">
                    Prescriptions
                  </span>
                  <div className="p-2 rounded-xl bg-secondary-container text-secondary">
                    <Pill size={18} />
                  </div>
                </div>
                <h3 className="font-bold text-headline-sm text-on-surface">
                  {prescriptions.length} Issued
                </h3>
                <p className="text-xs text-secondary font-semibold mt-1">
                  {prescriptions.filter((p) => p.status === 'Dispensed').length} Dispensed by Pharmacy
                </p>
              </div>

              {/* Lab Reports Card */}
              <div className="glass-card p-md rounded-2xl clinical-shadow border-l-4 border-tertiary">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-bold text-outline uppercase tracking-wider">
                    Diagnostic Labs
                  </span>
                  <div className="p-2 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed-variant">
                    <FlaskConical size={18} />
                  </div>
                </div>
                <h3 className="font-bold text-headline-sm text-on-surface">
                  {labOrders.length} Tests
                </h3>
                <p className="text-xs text-outline font-semibold mt-1">
                  {labOrders.filter((l) => l.status === 'Completed').length} Results Published
                </p>
              </div>

              {/* Inpatient Admission Status */}
              <div className="glass-card p-md rounded-2xl clinical-shadow border-l-4 border-amber-500">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-bold text-outline uppercase tracking-wider">
                    Care Status
                  </span>
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                    <Bed size={18} />
                  </div>
                </div>
                <h3 className="font-bold text-headline-sm text-on-surface">
                  {currentAdmission ? 'Inpatient (IPD)' : 'Outpatient (OPD)'}
                </h3>
                <p className="text-xs text-outline font-medium mt-1">
                  {currentAdmission
                    ? `${currentAdmission.ward} — Bed ${currentAdmission.bedNumber}`
                    : 'Home recovery / Routine follow-up'}
                </p>
              </div>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-12 gap-gutter mb-lg">
              {/* Left Column: Upcoming Appointments & Current Prescriptions */}
              <div className="col-span-12 lg:col-span-7 space-y-gutter">
                {/* Upcoming Appointments */}
                <div className="glass-card p-margin rounded-[24px] clinical-shadow">
                  <div className="flex items-center justify-between mb-md">
                    <h3 className="text-title-sm font-bold text-on-surface flex items-center gap-2">
                      <Clock className="text-primary" /> Upcoming Clinic Visits & OPD Tokens
                    </h3>
                    <Link
                      href="/dashboard/patient/appointments"
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      View All
                    </Link>
                  </div>

                  {upcomingApts.length > 0 ? (
                    <div className="space-y-3">
                      {upcomingApts.map((apt) => (
                        <div
                          key={apt.appointmentId || apt._id}
                          className="p-4 bg-surface-container-low border border-outline-variant/15 rounded-2xl clinical-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-primary bg-primary-fixed px-2 py-0.5 rounded-md">
                                {apt.appointmentId}
                              </span>
                              <span className="text-xs font-bold text-secondary bg-secondary-container px-2 py-0.5 rounded-md">
                                {apt.time || `Token #${apt.queueNumber || 1}`}
                              </span>
                            </div>
                            <h5 className="font-bold text-on-surface text-body-md mt-1">
                              {apt.doctorName}
                            </h5>
                            <p className="text-xs text-outline">
                              Date: <strong>{apt.date}</strong> • Reason: {apt.reason}
                            </p>
                          </div>
                          <span className="text-xs font-bold px-3 py-1 rounded-xl bg-white border border-outline-variant/20 self-start sm:self-auto text-primary">
                            {apt.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center text-outline">
                      <Calendar size={32} className="mx-auto mb-2 text-outline-variant" />
                      <p className="text-xs font-semibold">You have no upcoming appointments scheduled.</p>
                    </div>
                  )}
                </div>

                {/* Active Prescriptions */}
                <div className="glass-card p-margin rounded-[24px] clinical-shadow">
                  <div className="flex items-center justify-between mb-md">
                    <h3 className="text-title-sm font-bold text-on-surface flex items-center gap-2">
                      <Pill className="text-secondary" /> Prescriptions & Medications
                    </h3>
                    <button
                      onClick={() => setShowEHRModal(true)}
                      className="text-xs font-bold text-secondary hover:underline"
                    >
                      Complete History
                    </button>
                  </div>

                  {prescriptions.length > 0 ? (
                    <div className="space-y-3">
                      {prescriptions.slice(0, 3).map((rx) => (
                        <div
                          key={rx.prescriptionId || rx._id}
                          className="p-4 bg-surface-container-low border border-outline-variant/15 rounded-2xl clinical-shadow space-y-2"
                        >
                          <div className="flex justify-between items-center pb-2 border-b border-outline-variant/10">
                            <div>
                              <span className="text-xs font-mono font-bold text-secondary bg-secondary-container px-2.5 py-0.5 rounded-md">
                                {rx.prescriptionId}
                              </span>
                              <span className="text-xs text-outline font-semibold ml-2">
                                Prescribed by {rx.doctorName}
                              </span>
                            </div>
                            <span className="text-xs text-outline">{rx.date}</span>
                          </div>

                          <div className="space-y-1.5">
                            {(rx.drugs || []).map((drug, dIdx) => (
                              <div
                                key={dIdx}
                                className="p-2.5 bg-white rounded-xl border border-outline-variant/10 text-xs flex justify-between items-center"
                              >
                                <div>
                                  <span className="font-bold text-on-surface">{drug.name}</span>
                                  <span className="text-primary font-semibold ml-2">({drug.dosage})</span>
                                  <p className="text-outline text-[11px] mt-0.5">
                                    {drug.frequency} • {drug.duration} • <em>{drug.instruction}</em>
                                  </p>
                                </div>
                                <span className="text-xs font-bold text-outline">Qty: {drug.qtyNeeded || 10}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center text-outline">
                      <Pill size={32} className="mx-auto mb-2 text-outline-variant" />
                      <p className="text-xs font-semibold">No active prescriptions on file.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Lab Reports & Vitals History */}
              <div className="col-span-12 lg:col-span-5 space-y-gutter">
                {/* Diagnostic Lab Reports */}
                <div className="glass-card p-margin rounded-[24px] clinical-shadow">
                  <div className="flex items-center justify-between mb-md">
                    <h3 className="text-title-sm font-bold text-on-surface flex items-center gap-2">
                      <FlaskConical className="text-primary" /> Pathology & Lab Reports
                    </h3>
                  </div>

                  {labOrders.length > 0 ? (
                    <div className="space-y-3">
                      {labOrders.slice(0, 4).map((lab) => (
                        <div
                          key={lab.orderId || lab._id}
                          className="p-3.5 bg-surface-container-low border border-outline-variant/15 rounded-xl clinical-shadow space-y-1.5"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] font-mono font-bold text-primary bg-primary-fixed px-1.5 py-0.5 rounded">
                                {lab.orderId}
                              </span>
                              <h5 className="font-bold text-on-surface text-body-sm mt-1">{lab.testName}</h5>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                lab.status === 'Completed'
                                  ? 'bg-secondary-container text-on-secondary-container'
                                  : 'bg-primary-fixed text-on-primary-fixed-variant'
                              }`}
                            >
                              {lab.status}
                            </span>
                          </div>

                          {lab.resultNotes && (
                            <p className="text-xs bg-white p-2.5 rounded-lg border border-outline-variant/10 text-on-surface-variant font-medium">
                              Findings: {lab.resultNotes}
                            </p>
                          )}
                          <p className="text-[10px] text-outline">Ordered on: {lab.date || 'Recent'}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center text-outline">
                      <FlaskConical size={32} className="mx-auto mb-2 text-outline-variant" />
                      <p className="text-xs font-semibold">No lab investigation reports recorded.</p>
                    </div>
                  )}
                </div>

                {/* Vitals Snapshot */}
                <div className="glass-card p-margin rounded-[24px] clinical-shadow">
                  <h3 className="text-title-sm font-bold text-on-surface mb-md flex items-center gap-2">
                    <Activity className="text-secondary" /> Latest Clinical Vitals
                  </h3>

                  {patientData?.vitalsHistory && patientData.vitalsHistory.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      {(() => {
                        const latest = patientData.vitalsHistory[patientData.vitalsHistory.length - 1];
                        return (
                          <>
                            <div className="p-3 rounded-xl bg-surface-container/30 border border-outline-variant/10">
                              <span className="text-[10px] text-outline block font-bold uppercase">Blood Pressure</span>
                              <span className="font-bold text-body-md text-on-surface">{latest.bp || '120/80'}</span>
                            </div>
                            <div className="p-3 rounded-xl bg-surface-container/30 border border-outline-variant/10">
                              <span className="text-[10px] text-outline block font-bold uppercase">Heart Rate</span>
                              <span className="font-bold text-body-md text-on-surface">{latest.pulse || '72 bpm'}</span>
                            </div>
                            <div className="p-3 rounded-xl bg-surface-container/30 border border-outline-variant/10">
                              <span className="text-[10px] text-outline block font-bold uppercase">Temperature</span>
                              <span className="font-bold text-body-md text-on-surface">{latest.temp || '98.6°F'}</span>
                            </div>
                            <div className="p-3 rounded-xl bg-surface-container/30 border border-outline-variant/10">
                              <span className="text-[10px] text-outline block font-bold uppercase">Body Weight</span>
                              <span className="font-bold text-body-md text-on-surface">{latest.weight || '70 kg'}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <p className="text-xs text-outline italic text-center py-6">
                      No vitals recorded in recent visits.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* 360 EHR Modal for Patient */}
        <PatientEHRModal
          patientId={patientId}
          isOpen={showEHRModal}
          onClose={() => setShowEHRModal(false)}
        />

        <Footer />
      </main>
    </div>
  );
}

