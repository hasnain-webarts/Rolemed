"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Search,
  FileText,
  Activity,
  Plus,
  Eye,
  Check,
  X,
  Stethoscope,
  Pill,
  ArrowRight,
  RotateCcw,
  Loader2,
  AlertCircle,
  FlaskConical,
  FolderOpen,
} from 'lucide-react';
import Sidebar from '@/components/Doctor_Sidebar';
import Footer from '@/components/Footer';
import PatientEHRModal from '@/components/PatientEHRModal';
import Link from 'next/link';

const STANDARD_LAB_TESTS = [
  { id: 'LAB-1', name: 'Complete Blood Count (CBC)' },
  { id: 'LAB-2', name: 'Fasting Blood Sugar (FBS)' },
  { id: 'LAB-3', name: 'Lipid Profile' },
  { id: 'LAB-4', name: 'Electrocardiogram (ECG)' },
  { id: 'LAB-5', name: 'Chest X-Ray' },
  { id: 'LAB-6', name: 'Liver Function Panel (LFT)' },
  { id: 'LAB-7', name: 'Kidney Function Panel (KFT/BUN)' },
  { id: 'LAB-8', name: 'Thyroid Stimulating Hormone (TSH)' },
];

const DIAGNOSIS_MAP = {
  'hypertension follow-up': 'I10 - Essential (primary) hypertension',
  'seasonal allergies & cough': 'J30.9 - Allergic rhinitis, unspecified / Acute URI',
  'chest tightness consultation': 'R07.9 - Chest pain, unspecified (Cardiac evaluation)',
  'post-op stitches removal': 'Z48.02 - Encounter for removal of sutures',
  'chronic headaches review': 'G44.2 - Tension-type headache',
  'prenatal routine check-up': 'Z34.0 - Supervision of normal pregnancy',
  'regular cardiac check': 'Z01.810 - Encounter for preprocedural cardiovascular exam',
  'annual wellness exams': 'Z00.00 - Encounter for general adult medical examination',
  'physical therapy assessment': 'Z96.651 - Musculoskeletal rehabilitation assessment',
  'allergy immunotherapy': 'T78.40XA - Allergy, unspecified, initial encounter',
};

function ConsultationsContent() {
  const { data: session } = useSession();
  const doctorName = session?.user?.name || 'Dr. Sarah Johnson';

  const searchParams = useSearchParams();
  const paramPatientId = searchParams.get('patientId') || '';
  const paramAppointmentId = searchParams.get('appointmentId') || '';
  const paramName = searchParams.get('name') || '';
  const paramReason = searchParams.get('reason') || '';
  const paramAge = searchParams.get('age') || '';
  const paramGender = searchParams.get('gender') || '';

  const [patients, setPatients] = useState([]);
  const [consultationHistory, setConsultationHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [showEHRModal, setShowEHRModal] = useState(false);
  const [ehrTargetPatientId, setEhrTargetPatientId] = useState(paramPatientId);

  const [selectedPatient, setSelectedPatient] = useState(paramPatientId);
  const [symptoms, setSymptoms] = useState(() => {
    return paramReason
      ? `Patient presented for scheduled follow-up: "${paramReason}". Clinical review requested.`
      : '';
  });

  const [bp, setBp] = useState(() => (paramReason || paramPatientId ? '120/80' : ''));
  const [temp, setTemp] = useState(() => (paramReason || paramPatientId ? '98.6' : ''));
  const [pulse, setPulse] = useState(() => (paramReason || paramPatientId ? '74' : ''));

  const [diagnosis, setDiagnosis] = useState(() => {
    if (!paramReason && !paramPatientId) return '';
    const normalized = (paramReason || '').toLowerCase().trim();
    return DIAGNOSIS_MAP[normalized] || (paramReason ? `R69 - Clinical Evaluation: ${paramReason}` : 'Z00.00 - General Medical Examination');
  });

  const [notes, setNotes] = useState(() => {
    if (!paramReason && !paramPatientId) return '';
    return (
      `Clinical consultation initiated for ${paramName || 'patient'}${paramAppointmentId ? ` (Ref: ${paramAppointmentId})` : ''}. ` +
      `Chief complaint reviewed: ${paramReason || 'Routine clinical assessment'}. ` +
      `Vitals recorded and within acceptable clinical threshold. Advised adherence to prescribed therapy and scheduled routine review.`
    );
  });

  const [selectedLabs, setSelectedLabs] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [viewingDetails, setViewingDetails] = useState(null);

  const [activeIntake, setActiveIntake] = useState(() => {
    if (paramPatientId || paramName) {
      return {
        appointmentId: paramAppointmentId || 'WALK-IN',
        name: paramName || 'Patient',
        patientId: paramPatientId,
        age: paramAge || '30+',
        gender: paramGender || 'Patient',
        reason: paramReason || 'General Consultation',
      };
    }
    return null;
  });

  // Fetch real patients and consultation history from MongoDB
  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const [patRes, conRes] = await Promise.all([
          fetch('/api/patients'),
          fetch('/api/consultations'),
        ]);

        const patData = await patRes.json();
        const conData = await conRes.json();

        if (!ignore) {
          if (patData.success) {
            let patientList = (patData.patients || []).map((p) => ({
              id: p.patientId,
              name: p.name,
              age: p.age,
              gender: p.gender,
              bloodGroup: p.bloodGroup,
              allergies: p.allergies || [],
            }));

            // If paramPatientId is provided and not yet in list, prepend temporary record
            if (paramPatientId && !patientList.some((p) => p.id === paramPatientId)) {
              patientList = [
                {
                  id: paramPatientId,
                  name: paramName || 'Patient',
                  age: paramAge ? parseInt(paramAge, 10) : 35,
                  gender: paramGender || 'Unspecified',
                  bloodGroup: 'Unknown',
                  allergies: [],
                },
                ...patientList,
              ];
            }

            setPatients(patientList);

            if (paramPatientId) {
              const matched = patientList.find((p) => p.id === paramPatientId);
              if (matched) {
                setActiveIntake((prev) => ({
                  appointmentId: paramAppointmentId || prev?.appointmentId || 'WALK-IN',
                  name: matched.name,
                  patientId: matched.id,
                  age: matched.age,
                  gender: matched.gender,
                  reason: prev?.reason || 'Clinical Assessment & Follow-up',
                }));
                setSelectedPatient(matched.id);
              }
            }
          }

          if (conData.success) {
            setConsultationHistory(conData.consultations || []);
          }
        }
      } catch (err) {
        console.error('Error loading consultations data:', err);
        if (!ignore) {
          setErrorMsg('Failed to synchronize consultation data with hospital server.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [refreshKey, paramAppointmentId, paramPatientId, paramName, paramAge, paramGender]);

  const handleClearIntake = () => {
    setSelectedPatient('');
    setSymptoms('');
    setBp('');
    setTemp('');
    setPulse('');
    setDiagnosis('');
    setNotes('');
    setSelectedLabs([]);
    setActiveIntake(null);
  };

  const handleLabToggle = (testName) => {
    if (selectedLabs.includes(testName)) {
      setSelectedLabs(selectedLabs.filter((l) => l !== testName));
    } else {
      setSelectedLabs([...selectedLabs, testName]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient || !diagnosis || !notes) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const patient = patients.find((p) => p.id === selectedPatient) || { name: 'Unknown Patient', id: selectedPatient };

      const res = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          symptoms: symptoms || 'Routine follow-up assessment',
          bp: bp || '120/80',
          temp: temp || '98.6',
          pulse: pulse || '72',
          diagnosis,
          labs: selectedLabs,
          notes,
          appointmentId: activeIntake?.appointmentId && activeIntake.appointmentId !== 'WALK-IN' ? activeIntake.appointmentId : '',
          doctorName: doctorName,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save consultation record');
      }

      setSuccessMsg(
        `Consultation note saved for ${patient.name} (${data.consultation.consultationId})! ${
          data.dispatchedLabsCount > 0 ? `${data.dispatchedLabsCount} lab order(s) dispatched.` : ''
        }`
      );

      handleClearIntake();
      setRefreshKey((k) => k + 1);

      setTimeout(() => {
        setSuccessMsg('');
      }, 5000);
    } catch (err) {
      console.error('Submit consultation error:', err);
      setErrorMsg(err.message || 'An error occurred while saving the consultation');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredHistory = consultationHistory.filter(
    (c) =>
      c.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.diagnosis.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.consultationId || c.id || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background p-margin no-scrollbar">
        {/* Header */}
        <header className="flex justify-between items-center mb-lg">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold">Consultation Workspace</h2>
            <p className="text-body-sm text-on-surface-variant">
              Log diagnoses, vitals, clinical reports, and coordinate diagnostic lab tests in real-time.
            </p>
          </div>
        </header>

        {errorMsg && (
          <div className="mb-md p-4 rounded-2xl bg-error-container text-on-error-container flex items-center gap-2 border border-error/30 text-body-sm font-semibold">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-lg p-4 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-between gap-2 clinical-shadow font-semibold text-body-sm animate-fade-in border border-secondary/20">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-secondary shrink-0" /> {successMsg}
            </div>
            <Link
              href="/dashboard/doctor/prescriptions"
              className="px-3 py-1.5 bg-secondary text-on-secondary rounded-xl text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1 shadow-sm shrink-0"
            >
              Write Prescription <ArrowRight size={14} />
            </Link>
          </div>
        )}

        <div className="grid grid-cols-12 gap-gutter mb-lg">
          {/* Note Creator Form */}
          <div className="col-span-12 xl:col-span-7 glass-card p-margin rounded-[24px] clinical-shadow">
            <div className="flex items-center justify-between mb-md">
              <h3 className="text-title-sm font-bold text-on-surface flex items-center gap-2">
                <FileText className="text-primary" /> New Consultation Note
              </h3>
              {activeIntake && (
                <button
                  type="button"
                  onClick={handleClearIntake}
                  className="cursor-pointer text-xs font-semibold text-outline hover:text-error flex items-center gap-1 transition-colors"
                >
                  <RotateCcw size={13} /> Reset Intake
                </button>
              )}
            </div>

            {/* Active Connected Intake Banner */}
            {activeIntake && (
              <div className="mb-md p-4 rounded-2xl bg-primary-fixed text-on-primary-fixed-variant border border-primary/20 flex flex-col md:flex-row md:items-center justify-between gap-3 clinical-shadow animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                    <Stethoscope size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-primary text-white px-2 py-0.5 rounded-md">
                        Connected Intake
                      </span>
                      <span className="text-xs font-bold text-primary font-mono">{activeIntake.appointmentId}</span>
                    </div>
                    <p className="text-body-sm font-bold text-on-surface mt-0.5">
                      {activeIntake.name}{' '}
                      <span className="text-outline font-normal text-xs">
                        ({activeIntake.gender}, {activeIntake.age} yrs • {activeIntake.patientId})
                      </span>
                    </p>
                    <p className="text-xs text-on-surface-variant font-medium">
                      Chief Concern: <span className="font-semibold text-primary">{activeIntake.reason}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEhrTargetPatientId(activeIntake.patientId);
                      setShowEHRModal(true);
                    }}
                    className="cursor-pointer flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-white text-primary rounded-xl border border-primary/30 hover:bg-primary hover:text-white transition-colors"
                  >
                    <FolderOpen size={14} /> View Medical History (EHR)
                  </button>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-white/80 rounded-lg text-primary border border-primary/20">
                    Form Autofilled
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-body-sm text-outline font-semibold">Select Patient *</label>
                    {selectedPatient && (
                      <button
                        type="button"
                        onClick={() => {
                          setEhrTargetPatientId(selectedPatient);
                          setShowEHRModal(true);
                        }}
                        className="cursor-pointer text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                      >
                        <FolderOpen size={13} /> View EHR History
                      </button>
                    )}
                  </div>
                  <select
                    required
                    value={selectedPatient}
                    onChange={(e) => setSelectedPatient(e.target.value)}
                    className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary cursor-pointer font-medium"
                  >
                    <option value="">Choose Patient from Registry...</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.id}) — {p.gender}, {p.age}y
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-body-sm text-outline mb-1 font-semibold">Chief Symptoms / Complaints</label>
                  <input
                    type="text"
                    placeholder="e.g. Mild headache, chest congestion, dyspnea"
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Vitals */}
              <div>
                <span className="block text-body-sm text-outline mb-2 font-bold flex items-center gap-1.5">
                  <Activity className="text-secondary w-4 h-4" /> Patient Vitals Log
                </span>
                <div className="grid grid-cols-3 gap-sm p-3 bg-surface-container/30 rounded-xl border border-outline-variant/10">
                  <div>
                    <label className="block text-[11px] text-outline mb-1">Blood Pressure</label>
                    <input
                      type="text"
                      placeholder="120/80"
                      value={bp}
                      onChange={(e) => setBp(e.target.value)}
                      className="w-full p-2 border border-outline-variant/40 rounded-lg bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-outline mb-1">Temperature (°F)</label>
                    <input
                      type="text"
                      placeholder="98.6"
                      value={temp}
                      onChange={(e) => setTemp(e.target.value)}
                      className="w-full p-2 border border-outline-variant/40 rounded-lg bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-outline mb-1">Pulse (bpm)</label>
                    <input
                      type="text"
                      placeholder="72"
                      value={pulse}
                      onChange={(e) => setPulse(e.target.value)}
                      className="w-full p-2 border border-outline-variant/40 rounded-lg bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-body-sm text-outline mb-1 font-semibold">
                  Diagnosis (ICD-10 Code & Clinical Title) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. I10 - Essential (primary) hypertension"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary font-medium"
                />
              </div>

              {/* Lab Request Checkbox list */}
              <div>
                <span className="block text-body-sm text-outline mb-2 font-semibold flex items-center gap-1.5">
                  <FlaskConical className="text-primary w-4 h-4" /> Recommend Lab Investigations
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-surface-container/20 p-3 rounded-xl border border-outline-variant/10">
                  {STANDARD_LAB_TESTS.map((test) => (
                    <label
                      key={test.id}
                      className="flex items-center gap-2 text-body-sm text-on-surface-variant cursor-pointer py-1 hover:text-on-surface transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedLabs.includes(test.name)}
                        onChange={() => handleLabToggle(test.name)}
                        className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                      <span>{test.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-body-sm text-outline mb-1 font-semibold">
                  Treatment Plan / Clinical Notes *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Enter detailed treatment plan, medication changes, rest requirements, and next steps..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary leading-relaxed"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="cursor-pointer w-full flex items-center justify-center gap-2 py-3 bg-primary text-on-primary rounded-xl font-bold clinical-shadow hover:opacity-90 transition-all text-body-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Recording Consultation Note in Database...
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    Save Consultation Note & Dispatch Lab Requests
                  </>
                )}
              </button>
            </form>
          </div>

          {/* History Column */}
          <div className="col-span-12 xl:col-span-5 glass-card p-margin rounded-[24px] clinical-shadow flex flex-col h-[740px]">
            <div className="mb-md">
              <h3 className="text-title-sm font-bold text-on-surface mb-2">
                Previous Consultation Reports ({filteredHistory.length})
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4.5 h-4.5" />
                <input
                  type="text"
                  placeholder="Search by patient, diagnosis, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-surface-container border border-outline-variant/30 rounded-xl text-body-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            {/* List */}
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-outline gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs font-semibold">Loading consultation archive...</span>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-sm sidebar-scroll pr-1">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((item) => {
                    const conId = item.consultationId || item.id || 'CON-DOC';
                    return (
                      <div
                        key={item._id || conId}
                        className="p-md bg-surface-container-low border border-outline-variant/10 rounded-2xl clinical-shadow flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold text-primary font-mono uppercase tracking-wider">
                              {conId}
                            </span>
                            <span className="text-[10px] text-outline font-semibold">{item.date}</span>
                          </div>
                          <h5 className="font-bold text-on-surface text-body-md mb-1">{item.patientName}</h5>
                          <p className="text-[11px] text-secondary font-bold truncate mb-sm">{item.diagnosis}</p>
                          <p className="text-body-sm text-on-surface-variant line-clamp-2">{item.notes}</p>
                        </div>

                        <div className="flex items-center justify-between mt-sm pt-2.5 border-t border-outline-variant/10">
                          <Link
                            href={`/dashboard/doctor/prescriptions?patientId=${item.patientId || 'PAT-001'}&patientName=${encodeURIComponent(
                              item.patientName
                            )}`}
                            className="cursor-pointer text-xs font-bold text-secondary flex items-center gap-1 hover:underline"
                          >
                            <Pill size={13} /> Write Rx
                          </Link>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEhrTargetPatientId(item.patientId);
                                setShowEHRModal(true);
                              }}
                              className="cursor-pointer text-xs font-bold text-outline hover:text-primary flex items-center gap-1"
                            >
                              <FolderOpen size={13} /> EHR
                            </button>
                            <button
                              onClick={() => setViewingDetails(item)}
                              className="cursor-pointer text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                            >
                              <Eye size={14} /> Details
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-16 text-center text-outline italic text-body-sm">
                    No consultation records found matching query.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Detailed Modal view */}
        {viewingDetails && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-md animate-fade-in">
            <div className="bg-surface-container-lowest rounded-2xl max-w-2xl w-full clinical-shadow border border-outline-variant/30 overflow-hidden">
              <div className="px-6 py-4.5 bg-secondary text-on-secondary flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-title-sm">
                    Consultation Record: {viewingDetails.consultationId || viewingDetails.id}
                  </h3>
                  <p className="text-xs text-on-secondary/80">Archived electronic medical report</p>
                </div>
                <button
                  onClick={() => setViewingDetails(null)}
                  className="cursor-pointer hover:bg-white/10 p-1.5 rounded-full transition-colors text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-md overflow-y-auto max-h-[560px] sidebar-scroll">
                <div className="grid grid-cols-2 gap-sm p-4 bg-surface-container/30 rounded-xl border border-outline-variant/10">
                  <div>
                    <p className="text-xs text-outline font-bold uppercase">Patient</p>
                    <p className="font-bold text-on-surface text-body-md">{viewingDetails.patientName}</p>
                    <p className="text-xs text-outline font-medium">{viewingDetails.patientId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-outline font-bold uppercase">Date of Visit</p>
                    <p className="font-semibold text-on-surface-variant text-body-sm">{viewingDetails.date}</p>
                    <span className="inline-block mt-1 text-[10px] font-bold text-secondary bg-secondary-container px-2 py-0.5 rounded-full uppercase">
                      Physician: {viewingDetails.doctorName || 'Dr. Sarah Johnson'}
                    </span>
                  </div>
                </div>

                {viewingDetails.symptoms && (
                  <div>
                    <p className="text-xs text-outline font-bold uppercase mb-1">Chief Complaints</p>
                    <p className="text-body-sm bg-surface-container/30 p-3 rounded-xl text-on-surface-variant border border-outline-variant/10">
                      {viewingDetails.symptoms}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-outline font-bold uppercase mb-1">Vitals Logged</p>
                  <div className="grid grid-cols-3 gap-sm bg-surface-container/20 p-3 rounded-xl border border-outline-variant/10 text-center text-body-sm">
                    <div>
                      <span className="block text-[10px] text-outline">BP</span>
                      <span className="font-bold text-on-surface">{viewingDetails.vitals?.bp || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-outline">Temp</span>
                      <span className="font-bold text-on-surface">{viewingDetails.vitals?.temp || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-outline">Pulse</span>
                      <span className="font-bold text-on-surface">{viewingDetails.vitals?.pulse || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-outline font-bold uppercase mb-1">Diagnosis</p>
                  <p className="font-semibold text-body-sm text-secondary bg-secondary-container/45 p-3 rounded-xl border border-secondary/20">
                    {viewingDetails.diagnosis}
                  </p>
                </div>

                {Array.isArray(viewingDetails.labs) && viewingDetails.labs.length > 0 && (
                  <div>
                    <p className="text-xs text-outline font-bold uppercase mb-1.5">Dispatched Lab Orders</p>
                    <div className="flex flex-wrap gap-1.5">
                      {viewingDetails.labs.map((lab, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-bold px-2.5 py-1 bg-error-container text-on-error-container rounded-lg uppercase tracking-wider"
                        >
                          {lab}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs text-outline font-bold uppercase mb-1">Clinical Notes & Directions</p>
                  <p className="text-body-sm text-on-surface-variant leading-relaxed bg-surface-container/30 p-3.5 rounded-xl border border-outline-variant/10">
                    {viewingDetails.notes}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-outline-variant/20">
                  <Link
                    href={`/dashboard/doctor/prescriptions?patientId=${viewingDetails.patientId || 'PAT-001'}&patientName=${encodeURIComponent(
                      viewingDetails.patientName
                    )}`}
                    className="cursor-pointer px-4 py-2 bg-secondary text-on-secondary rounded-xl font-bold hover:opacity-90 transition-all clinical-shadow text-body-sm flex items-center gap-1.5"
                  >
                    <Pill size={16} /> Write E-Prescription
                  </Link>

                  <button
                    onClick={() => setViewingDetails(null)}
                    className="cursor-pointer px-5 py-2 border border-outline-variant/30 hover:bg-surface-container rounded-xl font-bold transition-all text-body-sm"
                  >
                    Close Record
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 360 EHR Modal */}
        <PatientEHRModal
          patientId={ehrTargetPatientId || selectedPatient}
          isOpen={showEHRModal}
          onClose={() => setShowEHRModal(false)}
        />

        <Footer />
      </main>
    </div>
  );
}

export default function Consultations() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-outline">Loading clinical consultations workspace...</div>}>
      <ConsultationsContent />
    </Suspense>
  );
}
