"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  FileText,
  Activity,
  Pill,
  FlaskConical,
  Bed,
  Calendar,
  Printer,
  Loader2,
  AlertCircle,
  Stethoscope,
  ShieldAlert,
} from 'lucide-react';
import PatientSidebar from '@/components/Patient_Sidebar';
import Footer from '@/components/Footer';

export default function PatientRecords() {
  const { data: session } = useSession();
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('consultations'); // 'consultations' | 'prescriptions' | 'labs' | 'admissions' | 'vitals'
  const [errorMsg, setErrorMsg] = useState('');

  const patientId = session?.user?.patientId || 'PAT-001';

  useEffect(() => {
    let ignore = false;
    async function loadRecords() {
      try {
        const res = await fetch(`/api/patients/${patientId}`, { cache: 'no-store' });
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
          console.error('Error fetching records:', err);
          setErrorMsg('Network error while connecting to hospital medical records.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadRecords();
    return () => {
      ignore = true;
    };
  }, [patientId]);

  const consultations = patientData?.consultations || [];
  const prescriptions = patientData?.prescriptions || [];
  const labOrders = patientData?.labOrders || [];
  const allAdmissions = patientData?.allAdmissions || (patientData?.currentAdmission ? [patientData.currentAdmission] : []);
  const vitalsHistory = patientData?.vitalsHistory || [];
  const allergies = Array.isArray(patientData?.allergies) ? patientData.allergies : [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <PatientSidebar />
      <main className="flex-1 overflow-y-auto bg-background p-margin no-scrollbar">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-lg print:border-b-2 print:border-black print:pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                Electronic Health Record (EHR)
              </h2>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant">
                {patientId}
              </span>
            </div>
            <p className="text-body-sm text-on-surface-variant">
              Your verified longitudinal hospital clinical history, diagnoses, medication plans, and laboratory findings.
            </p>
          </div>

          <button
            onClick={handlePrint}
            className="cursor-pointer flex items-center gap-1.5 px-4 py-2 bg-surface-container border border-outline-variant/30 text-on-surface rounded-xl text-xs font-bold hover:bg-surface-container-high transition-colors print:hidden"
          >
            <Printer size={15} /> Print Clinical Summary
          </button>
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
            <span>Drug / Food Allergies Warning: {allergies.join(', ')}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex bg-surface-container rounded-2xl p-1 text-xs font-bold overflow-x-auto no-scrollbar mb-lg print:hidden">
          <button
            onClick={() => setActiveTab('consultations')}
            className={`cursor-pointer px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'consultations'
                ? 'bg-primary text-on-primary clinical-shadow'
                : 'text-outline hover:text-on-surface'
            }`}
          >
            <Stethoscope size={15} /> Consultations ({consultations.length})
          </button>
          <button
            onClick={() => setActiveTab('prescriptions')}
            className={`cursor-pointer px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'prescriptions'
                ? 'bg-primary text-on-primary clinical-shadow'
                : 'text-outline hover:text-on-surface'
            }`}
          >
            <Pill size={15} /> Prescriptions ({prescriptions.length})
          </button>
          <button
            onClick={() => setActiveTab('labs')}
            className={`cursor-pointer px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'labs'
                ? 'bg-primary text-on-primary clinical-shadow'
                : 'text-outline hover:text-on-surface'
            }`}
          >
            <FlaskConical size={15} /> Lab Findings ({labOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('admissions')}
            className={`cursor-pointer px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'admissions'
                ? 'bg-primary text-on-primary clinical-shadow'
                : 'text-outline hover:text-on-surface'
            }`}
          >
            <Bed size={15} /> Inpatient Stays ({allAdmissions.length})
          </button>
          <button
            onClick={() => setActiveTab('vitals')}
            className={`cursor-pointer px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'vitals'
                ? 'bg-primary text-on-primary clinical-shadow'
                : 'text-outline hover:text-on-surface'
            }`}
          >
            <Activity size={15} /> Vitals History ({vitalsHistory.length})
          </button>
        </div>

        {/* Content Container */}
        <div className="glass-card p-margin rounded-[24px] clinical-shadow">
          {loading ? (
            <div className="py-24 text-center text-outline flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs font-semibold">Loading electronic health record...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: CONSULTATIONS */}
              {activeTab === 'consultations' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center pb-2 border-b border-outline-variant/10">
                    <h3 className="text-title-sm font-bold text-on-surface flex items-center gap-2">
                      <Stethoscope className="text-primary" /> Outpatient Consultations & Clinical Diagnoses
                    </h3>
                  </div>

                  {consultations.length > 0 ? (
                    <div className="space-y-4">
                      {consultations.map((con) => (
                        <div
                          key={con.consultationId || con._id}
                          className="p-4 bg-surface-container-low border border-outline-variant/15 rounded-2xl clinical-shadow space-y-2"
                        >
                          <div className="flex justify-between items-start pb-2 border-b border-outline-variant/10">
                            <div>
                              <span className="text-xs font-mono font-bold text-primary bg-primary-fixed px-2 py-0.5 rounded-md">
                                {con.consultationId}
                              </span>
                              <span className="text-xs text-outline font-semibold ml-2">
                                Examining Doctor: <strong className="text-on-surface">{con.doctorName}</strong>
                              </span>
                            </div>
                            <span className="text-xs text-outline">{con.date}</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                            <div>
                              <span className="text-outline uppercase text-[10px] font-bold block">Reported Symptoms</span>
                              <p className="font-medium text-on-surface mt-0.5">{con.symptoms || 'Routine follow-up'}</p>
                            </div>
                            <div>
                              <span className="text-outline uppercase text-[10px] font-bold block">Doctor Assessment / Diagnosis</span>
                              <p className="font-bold text-primary mt-0.5">{con.diagnosis}</p>
                            </div>
                          </div>

                          {con.notes && (
                            <div className="p-3 bg-white rounded-xl border border-outline-variant/10 text-xs text-on-surface-variant">
                              <span className="font-bold text-outline text-[10px] block uppercase mb-0.5">Clinical Note:</span>
                              {con.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-16 text-center text-outline">
                      <Stethoscope size={36} className="mx-auto mb-2 text-outline-variant" />
                      <p className="text-body-sm font-semibold">No consultation records recorded.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: PRESCRIPTIONS */}
              {activeTab === 'prescriptions' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center pb-2 border-b border-outline-variant/10">
                    <h3 className="text-title-sm font-bold text-on-surface flex items-center gap-2">
                      <Pill className="text-secondary" /> Issued Prescriptions & Medication Regimens
                    </h3>
                  </div>

                  {prescriptions.length > 0 ? (
                    <div className="space-y-4">
                      {prescriptions.map((rx) => (
                        <div
                          key={rx.prescriptionId || rx._id}
                          className="p-4 bg-surface-container-low border border-outline-variant/15 rounded-2xl clinical-shadow space-y-3"
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
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant">
                              {rx.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {(rx.drugs || []).map((drug, dIdx) => (
                              <div
                                key={dIdx}
                                className="p-3 bg-white rounded-xl border border-outline-variant/10 text-xs"
                              >
                                <p className="font-bold text-on-surface text-body-sm">{drug.name}</p>
                                <p className="text-primary font-semibold text-xs mt-0.5">
                                  Dosage: {drug.dosage} • Frequency: {drug.frequency}
                                </p>
                                <p className="text-outline text-[11px] mt-0.5">
                                  Duration: {drug.duration} • Instruction: <em>{drug.instruction}</em>
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-16 text-center text-outline">
                      <Pill size={36} className="mx-auto mb-2 text-outline-variant" />
                      <p className="text-body-sm font-semibold">No prescription records found on file.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: LABS */}
              {activeTab === 'labs' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center pb-2 border-b border-outline-variant/10">
                    <h3 className="text-title-sm font-bold text-on-surface flex items-center gap-2">
                      <FlaskConical className="text-primary" /> Diagnostic Investigations & Pathology Findings
                    </h3>
                  </div>

                  {labOrders.length > 0 ? (
                    <div className="space-y-3">
                      {labOrders.map((lab) => (
                        <div
                          key={lab.orderId || lab._id}
                          className="p-4 bg-surface-container-low border border-outline-variant/15 rounded-2xl clinical-shadow space-y-2"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-xs font-mono font-bold text-primary bg-primary-fixed px-2 py-0.5 rounded-md">
                                {lab.orderId}
                              </span>
                              <h4 className="font-bold text-on-surface text-body-md mt-1">{lab.testName}</h4>
                              <p className="text-xs text-outline">
                                Ordered by {lab.doctorName} • Date: {lab.date || 'Recent'}
                              </p>
                            </div>
                            <span
                              className={`text-xs font-bold px-3 py-1 rounded-xl ${
                                lab.status === 'Completed'
                                  ? 'bg-secondary-container text-on-secondary-container'
                                  : 'bg-primary-fixed text-on-primary-fixed-variant'
                              }`}
                            >
                              {lab.status}
                            </span>
                          </div>

                          {lab.resultNotes && (
                            <div className="p-3 bg-white rounded-xl border border-outline-variant/10 text-xs text-on-surface-variant font-medium">
                              <span className="font-bold text-primary block mb-0.5">Test Outcome / Findings:</span>
                              {lab.resultNotes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-16 text-center text-outline">
                      <FlaskConical size={36} className="mx-auto mb-2 text-outline-variant" />
                      <p className="text-body-sm font-semibold">No laboratory findings recorded.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: ADMISSIONS */}
              {activeTab === 'admissions' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center pb-2 border-b border-outline-variant/10">
                    <h3 className="text-title-sm font-bold text-on-surface flex items-center gap-2">
                      <Bed className="text-secondary" /> Hospital Inpatient Ward Stays
                    </h3>
                  </div>

                  {allAdmissions.length > 0 ? (
                    <div className="space-y-3">
                      {allAdmissions.map((adm) => (
                        <div
                          key={adm.admissionId || adm._id}
                          className="p-4 bg-surface-container-low border border-outline-variant/15 rounded-2xl clinical-shadow space-y-2"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-xs font-mono font-bold text-secondary bg-secondary-container px-2 py-0.5 rounded-md">
                                {adm.admissionId}
                              </span>
                              <h4 className="font-bold text-on-surface text-body-md mt-1">
                                {adm.ward} — Bed {adm.bedNumber}
                              </h4>
                              <p className="text-xs text-outline">Attending: {adm.doctorName || adm.attendingDoctor || 'Physician'}</p>
                            </div>
                            <span className="text-xs font-bold px-3 py-1 rounded-xl bg-white border border-outline-variant/20">
                              {adm.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                            <div>
                              <span className="text-outline font-semibold">Admitted:</span> <strong>{adm.admissionDate}</strong>
                            </div>
                            <div>
                              <span className="text-outline font-semibold">Discharged:</span>{' '}
                              <strong>{adm.dischargeDate || 'Active Stay'}</strong>
                            </div>
                            <div className="col-span-2">
                              <span className="text-outline font-semibold">Admitting Diagnosis:</span>{' '}
                              <strong>{adm.admittingDiagnosis}</strong>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-16 text-center text-outline">
                      <Bed size={36} className="mx-auto mb-2 text-outline-variant" />
                      <p className="text-body-sm font-semibold">No hospital inpatient admissions recorded.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: VITALS */}
              {activeTab === 'vitals' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex justify-between items-center pb-2 border-b border-outline-variant/10">
                    <h3 className="text-title-sm font-bold text-on-surface flex items-center gap-2">
                      <Activity className="text-primary" /> Longitudinal Clinical Vitals Log
                    </h3>
                  </div>

                  <div className="border border-outline-variant/20 rounded-2xl overflow-hidden bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-container text-outline">
                        <tr>
                          <th className="p-3">Visit Date</th>
                          <th className="p-3">Blood Pressure</th>
                          <th className="p-3">Pulse Rate</th>
                          <th className="p-3">Body Temp</th>
                          <th className="p-3">Weight</th>
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
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-outline italic">
                              No recorded vital signs found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <Footer />
      </main>
    </div>
  );
}

