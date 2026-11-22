"use client";

import { useState, useEffect } from "react";
import {
  Printer,
  X,
  CheckSquare,
  Square,
  FileText,
  User,
  Bed,
  Stethoscope,
  Pill,
  FlaskConical,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Clock,
  ShieldCheck,
  Loader2,
  Sparkles,
} from "lucide-react";

function getPresetSections(presetName) {
  switch (presetName) {
    case "discharge_billing":
      return {
        header: true,
        profile: true,
        admission: true,
        consultations: false,
        prescriptions: true,
        labReports: false,
        billing: true,
      };
    case "prescription":
      return {
        header: true,
        profile: true,
        admission: false,
        consultations: true,
        prescriptions: true,
        labReports: false,
        billing: false,
      };
    case "lab_report":
      return {
        header: true,
        profile: true,
        admission: false,
        consultations: false,
        prescriptions: false,
        labReports: true,
        billing: false,
      };
    case "all":
    default:
      return {
        header: true,
        profile: true,
        admission: true,
        consultations: true,
        prescriptions: true,
        labReports: true,
        billing: true,
      };
  }
}

export default function PatientDossierPrintModal({
  patientId,
  isOpen,
  onClose,
  initialPreset = "all", // 'all' | 'discharge_billing' | 'prescription' | 'lab_report'
  defaultSelection = null,
}) {
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Section Checkbox Toggles initialized with preset
  const [sections, setSections] = useState(() => {
    if (defaultSelection) {
      return { ...getPresetSections("all"), ...defaultSelection };
    }
    return getPresetSections(initialPreset || "all");
  });

  // Apply Presets on click
  const applyPreset = (presetName) => {
    setSections(getPresetSections(presetName));
  };

  const toggleSection = (key) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    if (!isOpen || !patientId) return;

    let isMounted = true;
    async function loadPatient() {
      setLoading(true);
      setErrorMsg("");
      try {
        const id = typeof patientId === "object" ? patientId.patientId || patientId._id : patientId;
        const res = await fetch(`/api/patients/${encodeURIComponent(id)}`, { cache: "no-store" });
        const data = await res.json();
        if (isMounted) {
          if (data.success && data.patient) {
            setPatientData(data.patient);
          } else {
            setErrorMsg(data.error || "Failed to load patient medical profile");
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error fetching dossier:", err);
          setErrorMsg("Network error connecting to patient registry");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPatient();
    return () => {
      isMounted = false;
    };
  }, [isOpen, patientId]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const p = patientData || (typeof patientId === "object" ? patientId : null);
  const admissions = p?.allAdmissions || (p?.currentAdmission ? [p.currentAdmission] : []);
  const activeAdmission = p?.currentAdmission || admissions.find((a) => a.status === "Admitted");
  const consultations = p?.consultations || [];
  const prescriptions = p?.prescriptions || [];
  const labOrders = p?.labOrders || [];
  const invoices = p?.invoices || [];
  const latestInvoice = invoices[0] || null;

  const isFinancialCleared = latestInvoice?.paymentStatus === "Paid";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-fade-in print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[94vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden print:max-h-none print:border-none print:shadow-none print:rounded-none">
        {/* Modal Top Bar (Screen Only) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Clinical & Financial Dossier Print Suite</span>
                {p?.patientId && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                    {p.patientId}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Select sections to compile an official medical record or financial clearance certificate.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={loading || !p}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Print Dossier</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Configuration Bar: Presets & Section Checkboxes (Screen Only) */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 shrink-0 space-y-3 print:hidden">
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Presets:</span>
            </span>
            <button
              type="button"
              onClick={() => applyPreset("all")}
              className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition"
            >
              📄 Full Medical Dossier
            </button>
            <button
              type="button"
              onClick={() => applyPreset("discharge_billing")}
              className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition"
            >
              🏥 Discharge & Billing Clearance
            </button>
            <button
              type="button"
              onClick={() => applyPreset("prescription")}
              className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition"
            >
              💊 Rx Prescription Slip
            </button>
            <button
              type="button"
              onClick={() => applyPreset("lab_report")}
              className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition"
            >
              🔬 Diagnostic Lab Report
            </button>
          </div>

          {/* Section Checkboxes */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-700 pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={sections.header}
                onChange={() => toggleSection("header")}
                className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
              />
              <span>Hospital Letterhead</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={sections.profile}
                onChange={() => toggleSection("profile")}
                className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
              />
              <span>Patient Profile</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={sections.admission}
                onChange={() => toggleSection("admission")}
                className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
              />
              <span>Inpatient Stay / Bed</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={sections.consultations}
                onChange={() => toggleSection("consultations")}
                className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
              />
              <span>Consultations & SOAP</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={sections.prescriptions}
                onChange={() => toggleSection("prescriptions")}
                className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
              />
              <span>Prescriptions (Rx)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={sections.labReports}
                onChange={() => toggleSection("labReports")}
                className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
              />
              <span>Diagnostic Lab Tests</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={sections.billing}
                onChange={() => toggleSection("billing")}
                className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
              />
              <span>Billing Clearance</span>
            </label>
          </div>
        </div>

        {/* Scrollable Printable Document Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-100 print:bg-white print:p-0 print:overflow-visible">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Synthesizing clinical and financial records...</p>
            </div>
          ) : errorMsg ? (
            <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
              <h3 className="font-bold text-base">Error Generating Dossier</h3>
              <p className="text-xs">{errorMsg}</p>
            </div>
          ) : !p ? (
            <div className="p-8 text-center text-slate-400">No patient record selected.</div>
          ) : (
            <div
              id="printable-dossier"
              className="max-w-4xl mx-auto bg-white p-8 md:p-12 shadow-md rounded-2xl border border-slate-200 print:shadow-none print:border-none print:p-0 print:max-w-none print:rounded-none space-y-8 text-slate-800"
            >
              {/* SECTION 1: Hospital Letterhead */}
              {sections.header && (
                <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-700 text-white flex items-center justify-center font-black text-xl shrink-0 print:border print:border-black">
                      RM
                    </div>
                    <div>
                      <h1 className="text-2xl font-black tracking-tight text-slate-900">
                        RoleMed Healthcare System
                      </h1>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Tertiary Care Teaching Hospital & Diagnostics Center
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Civil Lines, Sialkot, Punjab, Pakistan • Ph: +92 (52) 429-8800 • UAN: 111-ROLEMED
                      </p>
                    </div>
                  </div>

                  <div className="text-right sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Official Medical Record
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-800 block">
                      Ref: DOS-{p.patientId}-{new Date().toISOString().slice(0, 10).replace(/-/g, "")}
                    </span>
                    <span className="text-xs text-slate-500">
                      Printed: {new Date().toLocaleDateString("en-PK", { dateStyle: "medium" })}
                    </span>
                  </div>
                </div>
              )}

              {/* SECTION 2: Patient Demographics & Profile */}
              {sections.profile && (
                <div className="rounded-xl border border-slate-200 p-5 bg-slate-50/60 print:bg-transparent print:border-slate-300">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-primary" />
                      <span>Patient Profile & Emergency Contacts</span>
                    </h2>
                    <span className="text-xs font-bold text-primary">MRN: {p.patientId}</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Full Name</span>
                      <span className="font-bold text-slate-800 text-sm">{p.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Age / Gender</span>
                      <span className="font-semibold text-slate-800">
                        {p.age} Years • {p.gender}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Blood Group</span>
                      <span className="font-bold text-rose-600">{p.bloodGroup || "Not Recorded"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Contact Phone</span>
                      <span className="font-semibold text-slate-800">{p.phone || "N/A"}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">CNIC / ID Number</span>
                      <span className="font-semibold text-slate-800">{p.cnic || "Not Specified"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Emergency Contact</span>
                      <span className="font-semibold text-slate-800">
                        {p.emergencyContact || p.emergencyContact?.name || "N/A"} (
                        {p.emergencyPhone || p.emergencyContact?.phone || "N/A"})
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-[11px]">Residential Address</span>
                      <span className="font-semibold text-slate-800">{p.address || "Sialkot, Pakistan"}</span>
                    </div>
                  </div>

                  {p.allergies && (
                    <div className="mt-3 pt-2 border-t border-slate-200 text-xs flex items-center gap-2">
                      <span className="font-bold text-rose-600">Allergies / Adverse Reactions:</span>
                      <span className="font-medium text-slate-700">
                        {Array.isArray(p.allergies) ? p.allergies.join(", ") : p.allergies}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 3: Current Encounter / Inpatient Stay */}
              {sections.admission && (
                <div className="space-y-2 break-inside-avoid">
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                    <Bed className="w-3.5 h-3.5 text-blue-600" />
                    <span>Inpatient Hospital Stay & Accommodation</span>
                  </h2>

                  {activeAdmission ? (
                    <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/40 print:bg-transparent print:border-slate-300 text-xs">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Ward & Room</span>
                          <span className="font-bold text-slate-800 text-sm">
                            {activeAdmission.ward} (Bed {activeAdmission.bedNumber})
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Admission Date</span>
                          <span className="font-semibold text-slate-800">
                            {new Date(activeAdmission.admissionDate).toLocaleDateString("en-PK", {
                              dateStyle: "medium",
                            })}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Attending Physician</span>
                          <span className="font-semibold text-slate-800">
                            {activeAdmission.doctorName || "Staff Hospitalist"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Status</span>
                          <span className="font-bold text-blue-700">{activeAdmission.status}</span>
                        </div>
                      </div>

                      {activeAdmission.diagnosis && (
                        <div className="mt-2 pt-2 border-t border-blue-100 text-xs">
                          <span className="font-semibold text-slate-500">Admitting Diagnosis: </span>
                          <span className="text-slate-800">{activeAdmission.diagnosis}</span>
                        </div>
                      )}
                    </div>
                  ) : admissions.length > 0 ? (
                    <div className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl border border-slate-200">
                      Patient has {admissions.length} prior completed hospital admission(s). Currently discharged.
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl border border-slate-200">
                      Outpatient encounter — No active inpatient hospital admission on record.
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 4: Doctor Consultations & Clinical SOAP Notes */}
              {sections.consultations && (
                <div className="space-y-3 break-inside-avoid">
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                    <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Doctor Consultations & Clinical SOAP History ({consultations.length})</span>
                  </h2>

                  {consultations.length > 0 ? (
                    <div className="space-y-3">
                      {consultations.slice(0, 3).map((c, idx) => (
                        <div
                          key={c._id || idx}
                          className="p-4 rounded-xl border border-slate-200 bg-white text-xs space-y-2 print:border-slate-300"
                        >
                          <div className="flex items-center justify-between text-slate-500">
                            <span className="font-bold text-slate-800">
                              {c.doctorName || "Consulting Physician"}
                            </span>
                            <span>{c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-PK") : ""}</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                            <div>
                              <span className="font-semibold text-slate-500">Presenting Symptoms:</span>
                              <p className="text-slate-700 mt-0.5">{c.symptoms || "Routine check-up"}</p>
                            </div>
                            <div>
                              <span className="font-semibold text-slate-500">Clinical Diagnosis:</span>
                              <p className="text-slate-800 font-semibold mt-0.5">
                                {c.diagnosis || "Under clinical evaluation"}
                              </p>
                            </div>
                          </div>

                          {c.notes && (
                            <div className="pt-1 text-slate-600">
                              <span className="font-semibold text-slate-500">Doctor&apos;s Advice & Notes:</span>
                              <p className="mt-0.5 italic">{c.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl border border-slate-200">
                      No clinical consultation history logged.
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 5: Prescriptions & Medication Chart */}
              {sections.prescriptions && (
                <div className="space-y-3 break-inside-avoid">
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                    <Pill className="w-3.5 h-3.5 text-amber-600" />
                    <span>Prescriptions & Medication Chart ({prescriptions.length})</span>
                  </h2>

                  {prescriptions.length > 0 ? (
                    <div className="space-y-3">
                      {prescriptions.slice(0, 3).map((rx, idx) => (
                        <div
                          key={rx._id || idx}
                          className="rounded-xl border border-slate-200 overflow-hidden text-xs print:border-slate-300"
                        >
                          <div className="bg-slate-50 p-3 border-b border-slate-200 flex items-center justify-between">
                            <div>
                              <span className="font-bold text-slate-800">
                                Rx Ref: {rx.consultationId || `RX-${idx + 1}`}
                              </span>
                              <span className="text-slate-400 ml-2">by {rx.doctorName || "Doctor"}</span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                rx.paymentStatus === "Paid"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {rx.paymentStatus || "Unpaid"}
                            </span>
                          </div>

                          <table className="w-full text-left">
                            <thead className="bg-slate-50/50 text-slate-500 text-[11px] border-b border-slate-100">
                              <tr>
                                <th className="p-2.5">Medication Name</th>
                                <th className="p-2.5">Dosage</th>
                                <th className="p-2.5">Quantity</th>
                                <th className="p-2.5">Instructions</th>
                                <th className="p-2.5 text-right">Amount (PKR)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                              {(rx.drugs || []).map((d, dIdx) => (
                                <tr key={dIdx}>
                                  <td className="p-2.5 font-bold text-slate-800">{d.name}</td>
                                  <td className="p-2.5">{d.dosage || "1 Tab"}</td>
                                  <td className="p-2.5">{d.qtyNeeded || 10}</td>
                                  <td className="p-2.5 text-slate-500">{d.instructions || "After meals"}</td>
                                  <td className="p-2.5 text-right font-medium">
                                    Rs. {d.totalPrice || d.unitPrice * d.qtyNeeded || 0}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl border border-slate-200">
                      No prescription orders on record.
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 6: Diagnostic Laboratory Tests */}
              {sections.labReports && (
                <div className="space-y-3 break-inside-avoid">
                  <h2 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                    <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
                    <span>Diagnostic Pathology & Laboratory Reports ({labOrders.length})</span>
                  </h2>

                  {labOrders.length > 0 ? (
                    <div className="rounded-xl border border-slate-200 overflow-hidden text-xs print:border-slate-300">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-[11px] border-b border-slate-200">
                          <tr>
                            <th className="p-3">Order ID</th>
                            <th className="p-3">Test Procedure</th>
                            <th className="p-3">Priority</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Clinical Findings</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {labOrders.map((lab, idx) => (
                            <tr key={lab._id || idx}>
                              <td className="p-3 font-mono font-bold text-slate-800">
                                {lab.orderId || `LAB-${idx + 1}`}
                              </td>
                              <td className="p-3 font-bold text-slate-800">{lab.testName}</td>
                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    lab.priority === "Emergency"
                                      ? "bg-rose-100 text-rose-700"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {lab.priority || "Routine"}
                                </span>
                              </td>
                              <td className="p-3 font-medium text-slate-800">{lab.status || "Completed"}</td>
                              <td className="p-3 text-slate-600">
                                {lab.findings || "Specimen collected; processing within normal parameters."}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-xl border border-slate-200">
                      No pathology laboratory orders on record.
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 7: Consolidated Billing & Financial Clearance Slip */}
              {sections.billing && (
                <div className="space-y-4 break-inside-avoid border-t-2 border-slate-800 pt-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <Receipt className="w-4 h-4 text-emerald-600" />
                        <span>Hospital Financial Invoice & Discharge Clearance</span>
                      </h2>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Consolidated ledger for all medical encounters, bed stay accruals, pharmacy, and diagnostic services.
                      </p>
                    </div>

                    {/* Official Clearance Watermark / Stamp */}
                    <div
                      className={`px-4 py-2 rounded-xl border-2 font-black text-xs tracking-wider uppercase flex items-center gap-1.5 ${
                        isFinancialCleared
                          ? "border-emerald-600 text-emerald-700 bg-emerald-50"
                          : "border-amber-500 text-amber-700 bg-amber-50"
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{isFinancialCleared ? "PAID & FINANCIALLY CLEARED" : "OUTSTANDING BALANCE"}</span>
                    </div>
                  </div>

                  {latestInvoice ? (
                    <div className="rounded-xl border border-slate-200 overflow-hidden text-xs print:border-slate-300">
                      <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center">
                        <span className="font-bold text-slate-800">
                          Invoice ID: {latestInvoice.invoiceId}
                        </span>
                        <span className="text-slate-500">
                          Settled via {latestInvoice.paymentMethod || "Cash Counter"}
                          {latestInvoice.createdAt ? ` on ${new Date(latestInvoice.createdAt).toLocaleDateString("en-PK")}` : ""}
                        </span>
                      </div>

                      <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-slate-500 text-[11px] border-b border-slate-100">
                          <tr>
                            <th className="p-2.5">Department</th>
                            <th className="p-2.5">Item Description</th>
                            <th className="p-2.5 text-center">Qty</th>
                            <th className="p-2.5 text-right">Unit Price</th>
                            <th className="p-2.5 text-right">Total (PKR)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {(latestInvoice.items || []).map((item, iIdx) => (
                            <tr key={iIdx}>
                              <td className="p-2.5 font-semibold text-slate-600">{item.department}</td>
                              <td className="p-2.5 font-bold text-slate-800">{item.itemName}</td>
                              <td className="p-2.5 text-center">{item.quantity}</td>
                              <td className="p-2.5 text-right">Rs. {item.unitPrice}</td>
                              <td className="p-2.5 text-right font-bold text-slate-800">
                                Rs. {item.totalPrice}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50 text-xs border-t border-slate-200 font-bold">
                          <tr>
                            <td colSpan={4} className="p-2.5 text-right text-slate-600">
                              Subtotal:
                            </td>
                            <td className="p-2.5 text-right text-slate-800">
                              Rs. {latestInvoice.subtotal || latestInvoice.totalAmount}
                            </td>
                          </tr>
                          {latestInvoice.discount > 0 && (
                            <tr>
                              <td colSpan={4} className="p-2 text-right text-emerald-600">
                                Waiver / Discount Applied:
                              </td>
                              <td className="p-2 text-right text-emerald-600">
                                - Rs. {latestInvoice.discount}
                              </td>
                            </tr>
                          )}
                          <tr className="text-sm bg-slate-100">
                            <td colSpan={4} className="p-3 text-right text-slate-900 font-black">
                              Net Payable (PKR):
                            </td>
                            <td className="p-3 text-right text-primary font-black">
                              Rs. {latestInvoice.netPayable || latestInvoice.totalAmount}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600">
                      No finalized invoice recorded for this patient yet. Patient charges are currently accumulating in active clinical counters.
                    </div>
                  )}
                </div>
              )}

              {/* Signatures & Hospital Authorization Block */}
              <div className="pt-8 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs break-inside-avoid">
                <div>
                  <div className="border-b border-dashed border-slate-400 pb-8 mb-2"></div>
                  <span className="font-bold text-slate-800 block">Attending Physician</span>
                  <span className="text-[10px] text-slate-400 uppercase">Medical Officer Seal</span>
                </div>
                <div>
                  <div className="border-b border-dashed border-slate-400 pb-8 mb-2"></div>
                  <span className="font-bold text-slate-800 block">Pharmacy / Laboratory</span>
                  <span className="text-[10px] text-slate-400 uppercase">Verification Stamp</span>
                </div>
                <div>
                  <div className="border-b border-dashed border-slate-400 pb-8 mb-2"></div>
                  <span className="font-bold text-slate-800 block">Authorized Cashier</span>
                  <span className="text-[10px] text-slate-400 uppercase">Financial Clearance Officer</span>
                </div>
              </div>

              {/* Footer Note */}
              <div className="text-[10px] text-slate-400 text-center pt-2 print:block">
                This document is a certified electronic medical and financial record generated by RoleMed RB-HMS.
                Valid without physical seal if verified through hospital registry.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
