"use client";

import { useState, useEffect } from 'react';
import PatientDossierPrintModal from '@/components/PatientDossierPrintModal';
import {
  X,
  FileText,
  Activity,
  Pill,
  FlaskConical,
  Bed,
  Calendar,
  Heart,
  ShieldAlert,
  Phone,
  Mail,
  MapPin,
  Printer,
  Loader2,
  Clock,
  User,
  AlertCircle,
  Stethoscope,
  CheckCircle2,
} from 'lucide-react';

export default function PatientEHRModal({ patientId, isOpen, onClose, initialTab = 'overview' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showDossierPrint, setShowDossierPrint] = useState(false);

  const patientKey = isOpen && patientId ? `${typeof patientId === 'object' ? patientId.patientId || patientId._id : patientId}` : null;
  const [prevPatientKey, setPrevPatientKey] = useState(patientKey);

  if (patientKey !== prevPatientKey) {
    setPrevPatientKey(patientKey);
    setActiveTab(initialTab);
  }

  useEffect(() => {
    if (!isOpen || !patientId) return;

    let ignore = false;
    async function fetchEHR() {
      setLoading(true);
      setErrorMsg('');
      try {
        const id = typeof patientId === 'object' ? patientId.patientId || patientId._id : patientId;
        const res = await fetch(`/api/patients/${id}`, { cache: 'no-store' });
        const data = await res.json();
        if (!ignore) {
          if (data.success && data.patient) {
            setPatientData(data.patient);
          } else {
            setErrorMsg(data.error || 'Failed to retrieve electronic health record');
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error('Error fetching EHR chart:', err);
          setErrorMsg('Network error while connecting to hospital clinical records');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchEHR();

    return () => {
      ignore = true;
    };
  }, [isOpen, patientId]);

  if (!isOpen) return null;

  const handlePrint = () => {
    setShowDossierPrint(true);
  };

  const p = patientData || (typeof patientId === 'object' ? patientId : null);
  const consultations = p?.consultations || [];
  const prescriptions = p?.prescriptions || [];
  const labOrders = p?.labOrders || [];
  const appointments = p?.appointments || [];
  const allAdmissions = p?.allAdmissions || (p?.currentAdmission ? [p.currentAdmission] : []);
  const vitalsHistory = p?.vitalsHistory || [];
  const allergies = Array.isArray(p?.allergies) ? p.allergies : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-fade-in print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] clinical-shadow border border-outline-variant/30 flex flex-col overflow-hidden print:max-h-none print:border-none print:shadow-none print:rounded-none">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-primary to-primary-container text-on-primary flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 print:bg-none print:text-black print:border-b-2 print:border-black">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white font-bold text-title-md shrink-0 print:border-black">
              {(p?.name || 'P')
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-title-md leading-tight text-white print:text-black">
                  {p?.name || 'Patient EHR Chart'}
                </h3>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/20 text-white print:border print:border-black print:text-black">
                  {p?.patientId || 'PAT-ID'}
                </span>
                {p?.currentAdmission && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-secondary text-on-secondary flex items-center gap-1">
                    <Bed size={12} /> IPD: {p.currentAdmission.ward} (Bed {p.currentAdmission.bedNumber})
                  </span>
                )}
              </div>
              <p className="text-xs text-white/80 mt-0.5 print:text-black">
                {p?.gender || 'N/A'} • {p?.age ? `${p.age} Years` : 'Age N/A'} • Blood: <strong className="text-white print:text-black">{p?.bloodGroup || 'Unknown'}</strong>
                {p?.cnic && <> • CNIC: <span className="font-mono">{p.cnic}</span></>}
                {p?.phone && <> • Phone: {p.phone}</>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto print:hidden">
            <button
              onClick={handlePrint}
              className="cursor-pointer flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition-colors"
              title="Print complete electronic health record"
            >
              <Printer size={15} /> Print Summary
            </button>
            <button
              onClick={onClose}
              className="cursor-pointer hover:bg-white/20 p-2 rounded-xl transition-colors text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Drug Allergy Warning Ribbon if any */}
        {allergies.length > 0 && (
          <div className="bg-error-container/80 text-on-error-container px-6 py-2 border-b border-error/20 flex items-center gap-2 text-xs font-bold shrink-0">
            <ShieldAlert size={16} className="text-error shrink-0" />
            <span>Documented Drug & Food Allergies: {allergies.join(', ')}</span>
          </div>
        )}

        {/* Tab Navigation Navigation Bar */}
        <div className="flex border-b border-outline-variant/20 px-6 bg-surface-container-lowest overflow-x-auto no-scrollbar shrink-0 print:hidden">
          <button
            onClick={() => setActiveTab('overview')}
            className={`cursor-pointer px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-outline hover:text-on-surface'
            }`}
          >
            <User size={15} /> Clinical Overview
          </button>
          <button
            onClick={() => setActiveTab('visits')}
            className={`cursor-pointer px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'visits'
                ? 'border-primary text-primary'
                : 'border-transparent text-outline hover:text-on-surface'
            }`}
          >
            <Calendar size={15} /> Past Visits ({consultations.length + appointments.length})
          </button>
          <button
            onClick={() => setActiveTab('diagnoses')}
            className={`cursor-pointer px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'diagnoses'
                ? 'border-primary text-primary'
                : 'border-transparent text-outline hover:text-on-surface'
            }`}
          >
            <Activity size={15} /> Diagnoses & ICD-10 ({consultations.filter(c => c.diagnosis).length})
          </button>
          <button
            onClick={() => setActiveTab('prescriptions')}
            className={`cursor-pointer px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'prescriptions'
                ? 'border-primary text-primary'
                : 'border-transparent text-outline hover:text-on-surface'
            }`}
          >
            <Pill size={15} /> Prescriptions ({prescriptions.length})
          </button>
          <button
            onClick={() => setActiveTab('labs')}
            className={`cursor-pointer px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'labs'
                ? 'border-primary text-primary'
                : 'border-transparent text-outline hover:text-on-surface'
            }`}
          >
            <FlaskConical size={15} /> Diagnostic Labs ({labOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('admissions')}
            className={`cursor-pointer px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'admissions'
                ? 'border-primary text-primary'
                : 'border-transparent text-outline hover:text-on-surface'
            }`}
          >
            <Bed size={15} /> IPD Hospital Stays ({allAdmissions.length})
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 sidebar-scroll">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-outline gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-body-sm font-semibold">Retrieving patient longitudinal medical records...</p>
            </div>
          ) : errorMsg ? (
            <div className="p-4 rounded-2xl bg-error-container text-on-error-container flex items-center gap-2">
              <AlertCircle size={20} className="text-error shrink-0" />
              <p className="text-body-sm font-semibold">{errorMsg}</p>
            </div>
          ) : !p ? (
            <div className="py-16 text-center text-outline">
              <User size={36} className="mx-auto mb-2 text-outline-variant" />
              <p className="text-body-sm">No electronic record available for this patient.</p>
            </div>
          ) : (
            <>
              {/* TAB 1: CLINICAL OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Demographics & Clinical Profile */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-surface-container/30 border border-outline-variant/20">
                      <span className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">
                        Contact Info
                      </span>
                      <p className="text-body-sm font-bold text-on-surface flex items-center gap-1.5">
                        <Phone size={14} className="text-primary" /> {p.phone || 'None'}
                      </p>
                      <p className="text-body-sm text-outline mt-1 flex items-center gap-1.5 truncate">
                        <Mail size={14} /> {p.email || 'No email registered'}
                      </p>
                      <p className="text-body-sm text-outline mt-1 flex items-center gap-1.5">
                        <MapPin size={14} /> {p.address || 'Address unlisted'}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-surface-container/30 border border-outline-variant/20">
                      <span className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">
                        Emergency Contact
                      </span>
                      <p className="text-body-sm font-bold text-on-surface">
                        {typeof p.emergencyContact === 'object'
                          ? p.emergencyContact?.name || 'None listed'
                          : p.emergencyContact || 'None listed'}
                      </p>
                      <p className="text-xs text-outline mt-0.5">
                        Relation: {p.emergencyContact?.relation || 'Family'}
                      </p>
                      <p className="text-xs text-outline mt-0.5 flex items-center gap-1">
                        <Phone size={12} /> {p.emergencyContact?.phone || p.emergencyPhone || 'No phone'}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-surface-container/30 border border-outline-variant/20">
                      <span className="text-[11px] font-bold text-outline uppercase tracking-wider block mb-1">
                        Care Summary
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2.5 py-1 rounded-xl bg-primary-fixed text-on-primary-fixed-variant text-xs font-bold">
                          {consultations.length} Consultations
                        </span>
                        <span className="px-2.5 py-1 rounded-xl bg-secondary-container text-on-secondary-container text-xs font-bold">
                          {prescriptions.length} Prescriptions
                        </span>
                      </div>
                      <p className="text-xs text-outline mt-2">
                        Registered on: {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Active Inpatient Stay Banner */}
                  {p.currentAdmission && (
                    <div className="p-4 bg-secondary-container/40 border border-secondary/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-secondary px-2 py-0.5 bg-secondary-container rounded-md inline-block mb-1">
                          Active Inpatient Stay
                        </span>
                        <h4 className="font-bold text-on-surface text-body-md">
                          {p.currentAdmission.ward} — Bed {p.currentAdmission.bedNumber}
                        </h4>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          Admitted on {p.currentAdmission.admissionDate} by {p.currentAdmission.doctorName || p.currentAdmission.attendingDoctor || 'Physician'}
                        </p>
                        <p className="text-xs text-outline mt-0.5">
                          Diagnosis: <strong>{p.currentAdmission.admittingDiagnosis}</strong>
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold text-secondary bg-white px-3 py-1.5 rounded-xl border border-secondary/20 shadow-xs shrink-0">
                        {p.currentAdmission.admissionId}
                      </span>
                    </div>
                  )}

                  {/* Vitals History Table */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-body-md text-on-surface flex items-center gap-2">
                        <Activity size={18} className="text-secondary" /> Vital Signs Log History
                      </h4>
                      <span className="text-xs text-outline">Latest recorded clinical vitals</span>
                    </div>

                    <div className="border border-outline-variant/20 rounded-2xl overflow-hidden bg-white">
                      <table className="w-full text-left text-body-sm">
                        <thead className="bg-surface-container-high text-outline text-xs">
                          <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">Blood Pressure</th>
                            <th className="p-3">Heart Rate</th>
                            <th className="p-3">Temp</th>
                            <th className="p-3">Weight</th>
                            <th className="p-3">Recorded By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/10">
                          {vitalsHistory.length > 0 ? (
                            vitalsHistory.map((v, i) => (
                              <tr key={i} className="hover:bg-surface-container/20">
                                <td className="p-3 font-semibold text-outline">{v.date}</td>
                                <td className="p-3 font-bold text-on-surface">{v.bp || '120/80'}</td>
                                <td className="p-3 text-on-surface-variant">{v.pulse || '72 bpm'}</td>
                                <td className="p-3 text-on-surface-variant">{v.temp || '98.6°F'}</td>
                                <td className="p-3 text-on-surface-variant">{v.weight || '70 kg'}</td>
                                <td className="p-3 text-xs text-outline">{v.recordedBy || 'Clinical Staff'}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="p-6 text-center text-outline italic">
                                No vital logs recorded yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PAST VISITS & CONSULTATIONS */}
              {activeTab === 'visits' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-body-md text-on-surface flex items-center gap-2">
                      <Stethoscope size={18} className="text-primary" /> Longitudinal Clinical Visits Timeline
                    </h4>
                    <span className="text-xs text-outline">Sorted newest first</span>
                  </div>

                  {consultations.length > 0 ? (
                    <div className="space-y-4">
                      {consultations.map((con) => (
                        <div
                          key={con.consultationId || con._id}
                          className="p-4 bg-surface-container-low border border-outline-variant/20 rounded-2xl clinical-shadow space-y-2"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-outline-variant/10">
                            <div>
                              <span className="text-xs font-mono font-bold text-primary bg-primary-fixed px-2 py-0.5 rounded-md">
                                {con.consultationId}
                              </span>
                              <span className="text-xs text-outline font-semibold ml-2">
                                Attending: <strong className="text-on-surface">{con.doctorName || 'Doctor'}</strong>
                              </span>
                            </div>
                            <span className="text-xs text-outline font-semibold flex items-center gap-1">
                              <Calendar size={13} /> {con.date || (con.createdAt ? new Date(con.createdAt).toLocaleDateString() : 'N/A')}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            <div>
                              <span className="text-[11px] font-bold text-outline uppercase block">Chief Symptoms / Reason</span>
                              <p className="text-body-sm text-on-surface mt-0.5">{con.symptoms || 'Routine checkup'}</p>
                            </div>
                            <div>
                              <span className="text-[11px] font-bold text-outline uppercase block">Assessment / Diagnosis</span>
                              <p className="text-body-sm font-bold text-primary mt-0.5">{con.diagnosis}</p>
                            </div>
                          </div>

                          {con.notes && (
                            <div className="p-3 bg-surface-container/30 rounded-xl border border-outline-variant/10 text-xs text-on-surface-variant">
                              <span className="font-bold text-outline block mb-0.5 uppercase text-[10px]">Clinical Progress Note:</span>
                              {con.notes}
                            </div>
                          )}

                          {con.vitals && (
                            <div className="flex flex-wrap gap-3 pt-1 text-xs text-outline">
                              <span>BP: <strong className="text-on-surface">{con.vitals.bp || '120/80'}</strong></span>
                              <span>Pulse: <strong className="text-on-surface">{con.vitals.pulse || '72'}</strong></span>
                              <span>Temp: <strong className="text-on-surface">{con.vitals.temp || '98.6°F'}</strong></span>
                              {con.vitals.spO2 && <span>SpO2: <strong className="text-on-surface">{con.vitals.spO2}</strong></span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-16 text-center text-outline">
                      <Stethoscope size={36} className="mx-auto mb-2 text-outline-variant" />
                      <p className="text-body-sm">No documented consultations for this patient.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: DIAGNOSES & ICD-10 TIMELINE */}
              {activeTab === 'diagnoses' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-body-md text-on-surface flex items-center gap-2">
                      <Activity size={18} className="text-primary" /> Diagnoses & ICD-10 Record History
                    </h4>
                  </div>

                  {consultations.filter(c => c.diagnosis).length > 0 ? (
                    <div className="space-y-3">
                      {consultations.filter(c => c.diagnosis).map((con, idx) => (
                        <div
                          key={con.consultationId || idx}
                          className="p-4 bg-surface-container-low border border-outline-variant/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <span className="text-[11px] font-mono font-bold text-primary bg-primary-fixed px-2 py-0.5 rounded-md">
                              {con.consultationId}
                            </span>
                            <h5 className="font-bold text-body-md text-on-surface mt-1">{con.diagnosis}</h5>
                            <p className="text-xs text-outline">
                              Diagnosed by {con.doctorName || 'Physician'} on {con.date || (con.createdAt ? new Date(con.createdAt).toLocaleDateString() : 'N/A')}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-secondary bg-secondary-container px-3 py-1 rounded-xl self-start sm:self-auto">
                            Clinical Record
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-16 text-center text-outline">
                      <Activity size={36} className="mx-auto mb-2 text-outline-variant" />
                      <p className="text-body-sm">No clinical diagnoses recorded for this patient.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: PRESCRIPTIONS & MEDICATION HISTORY */}
              {activeTab === 'prescriptions' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-body-md text-on-surface flex items-center gap-2">
                      <Pill size={18} className="text-secondary" /> Longitudinal Prescription & Medication History
                    </h4>
                    <span className="text-xs text-outline">{prescriptions.length} Total Issued</span>
                  </div>

                  {prescriptions.length > 0 ? (
                    <div className="space-y-4">
                      {prescriptions.map((rx) => (
                        <div
                          key={rx.prescriptionId || rx._id}
                          className="p-4 bg-surface-container-low border border-outline-variant/20 rounded-2xl clinical-shadow space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-outline-variant/10">
                            <div>
                              <span className="text-xs font-mono font-bold text-secondary bg-secondary-container px-2.5 py-0.5 rounded-md">
                                {rx.prescriptionId}
                              </span>
                              <span className="text-xs text-outline font-semibold ml-2">
                                Prescribed by <strong className="text-on-surface">{rx.doctorName}</strong>
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-outline">{rx.date}</span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  rx.status === 'Dispensed'
                                    ? 'bg-secondary-container text-on-secondary-container'
                                    : 'bg-primary-fixed text-on-primary-fixed-variant'
                                }`}
                              >
                                {rx.status}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <span className="text-[11px] font-bold text-outline uppercase block">Prescribed Drugs & Regimens</span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {(rx.drugs || []).map((drug, dIdx) => (
                                <div
                                  key={dIdx}
                                  className="p-3 bg-white rounded-xl border border-outline-variant/15 text-xs flex justify-between items-start"
                                >
                                  <div>
                                    <p className="font-bold text-on-surface text-body-sm">{drug.name}</p>
                                    <p className="text-outline text-xs mt-0.5">
                                      Dosage: <strong className="text-primary">{drug.dosage}</strong> • Frequency: {drug.frequency}
                                    </p>
                                    <p className="text-outline text-[11px] mt-0.5">
                                      Duration: {drug.duration} • Instruction: <em>{drug.instruction}</em>
                                    </p>
                                  </div>
                                  <span className="text-[11px] font-bold text-outline bg-surface-container px-2 py-0.5 rounded-md">
                                    Qty: {drug.qtyNeeded || 10}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {rx.notes && (
                            <p className="text-xs text-outline italic pt-1 border-t border-outline-variant/10">
                              Doctor instructions: {rx.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-16 text-center text-outline">
                      <Pill size={36} className="mx-auto mb-2 text-outline-variant" />
                      <p className="text-body-sm">No prescriptions found on file for this patient.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: DIAGNOSTIC LABS */}
              {activeTab === 'labs' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-body-md text-on-surface flex items-center gap-2">
                      <FlaskConical size={18} className="text-primary" /> Diagnostic Investigations & Pathology Reports
                    </h4>
                    <span className="text-xs text-outline">{labOrders.length} Orders</span>
                  </div>

                  {labOrders.length > 0 ? (
                    <div className="space-y-3">
                      {labOrders.map((lab) => (
                        <div
                          key={lab.orderId || lab._id}
                          className="p-4 bg-surface-container-low border border-outline-variant/20 rounded-2xl clinical-shadow space-y-2"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <span className="text-xs font-mono font-bold text-primary bg-primary-fixed px-2 py-0.5 rounded-md">
                                {lab.orderId}
                              </span>
                              <h5 className="font-bold text-body-md text-on-surface mt-1">{lab.testName}</h5>
                              <p className="text-xs text-outline">
                                Ordered by {lab.doctorName} • Priority: <strong className="text-error">{lab.priority || 'Routine'}</strong>
                              </p>
                            </div>
                            <div className="text-right">
                              <span
                                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-block ${
                                  lab.status === 'Completed'
                                    ? 'bg-secondary-container text-on-secondary-container'
                                    : 'bg-primary-fixed text-on-primary-fixed-variant'
                                }`}
                              >
                                {lab.status}
                              </span>
                              <span className="text-xs text-outline block mt-1">{lab.date || (lab.createdAt ? new Date(lab.createdAt).toLocaleDateString() : '')}</span>
                            </div>
                          </div>

                          {lab.resultNotes && (
                            <div className="p-3 bg-white rounded-xl border border-outline-variant/15 text-xs text-on-surface-variant">
                              <span className="font-bold text-primary block mb-0.5">Laboratory Findings / Test Outcome:</span>
                              <p>{lab.resultNotes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-16 text-center text-outline">
                      <FlaskConical size={36} className="mx-auto mb-2 text-outline-variant" />
                      <p className="text-body-sm">No diagnostic lab orders or pathology reports recorded.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: IPD ADMISSIONS */}
              {activeTab === 'admissions' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-body-md text-on-surface flex items-center gap-2">
                      <Bed size={18} className="text-secondary" /> Inpatient Admission History & Ward Stays
                    </h4>
                  </div>

                  {allAdmissions.length > 0 ? (
                    <div className="space-y-3">
                      {allAdmissions.map((adm) => (
                        <div
                          key={adm.admissionId || adm._id}
                          className="p-4 bg-surface-container-low border border-outline-variant/20 rounded-2xl clinical-shadow space-y-2"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <span className="text-xs font-mono font-bold text-secondary bg-secondary-container px-2 py-0.5 rounded-md">
                                {adm.admissionId}
                              </span>
                              <h5 className="font-bold text-body-md text-on-surface mt-1">
                                {adm.ward} — Bed {adm.bedNumber}
                              </h5>
                              <p className="text-xs text-outline">
                                Attending Physician: <strong className="text-on-surface">{adm.doctorName || adm.attendingDoctor || 'Physician'}</strong>
                              </p>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-full self-start sm:self-auto ${
                                adm.status === 'Admitted'
                                  ? 'bg-secondary text-on-secondary'
                                  : 'bg-surface-container-high text-outline'
                              }`}
                            >
                              {adm.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                            <div>
                              <span className="text-outline font-semibold">Admission Date:</span>{' '}
                              <strong className="text-on-surface">{adm.admissionDate}</strong>
                            </div>
                            <div>
                              <span className="text-outline font-semibold">Discharge Date:</span>{' '}
                              <strong className="text-on-surface">{adm.dischargeDate || 'Currently Inpatient'}</strong>
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-outline font-semibold">Admitting Diagnosis:</span>{' '}
                              <strong className="text-on-surface">{adm.admittingDiagnosis}</strong>
                            </div>
                          </div>

                          {adm.dischargeSummary && (
                            <div className="p-3 bg-white rounded-xl border border-outline-variant/10 text-xs">
                              <span className="font-bold text-outline block mb-0.5">Discharge Summary:</span>
                              <p className="text-on-surface-variant">{adm.dischargeSummary}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-16 text-center text-outline">
                      <Bed size={36} className="mx-auto mb-2 text-outline-variant" />
                      <p className="text-body-sm">No hospital inpatient stays recorded.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-surface-container border-t border-outline-variant/20 flex items-center justify-between print:hidden">
          <span className="text-xs text-outline font-mono">
            EHR ID: {p?.patientId || 'N/A'} • RoleMed Master Patient Index
          </span>
          <button
            onClick={onClose}
            className="cursor-pointer px-5 py-2 bg-primary text-on-primary rounded-xl font-bold text-xs hover:opacity-90 transition-opacity clinical-shadow"
          >
            Close Chart
          </button>
        </div>
      </div>

      {showDossierPrint && (
        <PatientDossierPrintModal
          isOpen={showDossierPrint}
          patientId={p?.patientId}
          onClose={() => setShowDossierPrint(false)}
          initialPreset="all"
        />
      )}
    </div>
  );
}

