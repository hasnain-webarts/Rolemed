"use client";

import { useState, useEffect, useMemo } from "react";
import Sidebar from '@/components/Admin_Sidebar';
import Footer from '@/components/Footer';
import { Search, Filter, Download, Eye, Phone, User, Calendar, Activity, X, RefreshCw, AlertCircle } from "lucide-react";
import { exportToCsv } from "@/lib/csvExport";
import { matchesPhone } from "@/lib/phoneUtils";

export default function AdminPatientsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All"); // All | Inpatient | Outpatient
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientsList, setPatientsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let ignore = false;
    async function loadPatients() {
      setLoading(true);
      try {
        const res = await fetch("/api/patients?limit=200", { cache: "no-store" });
        const data = await res.json();
        if (!ignore && data.success) {
          setPatientsList(data.patients || []);
        }
      } catch (err) {
        console.error("Error loading patients:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadPatients();
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  const filteredPatients = useMemo(() => {
    return patientsList.filter((p) => {
      const matchesStatus =
        statusFilter === "All" ||
        (p.status || "Outpatient").toLowerCase() === statusFilter.toLowerCase();

      if (!matchesStatus) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const pName = (p.name || "").toLowerCase();
      const pId = (p.patientId || "").toLowerCase();
      const pCnic = (p.cnic || "").toLowerCase();
      const pPhone = (p.phone || "").toLowerCase();
      const pBed = (p.assignedBed || "").toLowerCase();

      return (
        pName.includes(q) ||
        pId.includes(q) ||
        pCnic.includes(q) ||
        pPhone.includes(q) ||
        matchesPhone(q, p.phone) ||
        pBed.includes(q)
      );
    });
  }, [patientsList, statusFilter, searchQuery]);

  const handleExportPatients = () => {
    const columns = [
      { key: "patientId", label: "Patient ID" },
      { key: "name", label: "Full Name" },
      { key: "age", label: "Age" },
      { key: "gender", label: "Gender" },
      { key: "bloodGroup", label: "Blood Group" },
      { key: "status", label: "Admission Status" },
      { key: "assignedBed", label: "Ward / Bed" },
      { key: "cnic", label: "CNIC Number" },
      { key: "phone", label: "Contact Phone" },
      { key: "email", label: "Email" },
    ];
    exportToCsv("rolemed_patients_directory.csv", columns, filteredPatients);
    setNotice(`Exported ${filteredPatients.length} patient records to CSV.`);
    setTimeout(() => setNotice(""), 3500);
  };

  const inPatientsCount = patientsList.filter((p) => p.status === "Inpatient").length;
  const outPatientsCount = Math.max(0, patientsList.length - inPatientsCount);

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
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold font-headline tracking-tight">
                    Master Patient Registry (MPI)
                  </h1>
                  <p className="text-sm text-outline">
                    Comprehensive electronic health records, active admission states, and clinical demographics.
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
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh Registry
              </button>

              <button
                type="button"
                onClick={handleExportPatients}
                className="cursor-pointer px-4 py-2 border border-outline-variant/30 rounded-xl text-xs font-semibold hover:bg-surface-container flex items-center gap-1.5 transition-all text-outline hover:text-on-surface"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Quick Notice */}
          {notice && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-semibold flex items-center justify-between animate-in fade-in">
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice("")} className="cursor-pointer p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Quick Counts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
              <span className="text-xs font-semibold text-outline uppercase tracking-wider block">Total Registered</span>
              <p className="text-2xl font-black font-headline text-on-surface mt-1">{patientsList.length}</p>
              <p className="text-[10px] text-outline mt-0.5">Verified Master Patient Index</p>
            </div>
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
              <span className="text-xs font-semibold text-outline uppercase tracking-wider block">Inpatients (Admitted)</span>
              <p className="text-2xl font-black font-headline text-amber-600 dark:text-amber-400 mt-1">{inPatientsCount}</p>
              <p className="text-[10px] text-outline mt-0.5">Currently assigned to hospital beds</p>
            </div>
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
              <span className="text-xs font-semibold text-outline uppercase tracking-wider block">Outpatients (Ambulatory)</span>
              <p className="text-2xl font-black font-headline text-primary mt-1">{outPatientsCount}</p>
              <p className="text-[10px] text-outline mt-0.5">Consultation &amp; clinic queue</p>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 p-1 bg-surface-container/40 rounded-2xl border border-outline-variant/20 overflow-x-auto">
              {["All", "Inpatient", "Outpatient"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    statusFilter === st
                      ? "bg-surface-container-lowest text-primary shadow-xs font-headline"
                      : "text-outline hover:text-on-surface"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-outline absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient by Name, ID, CNIC..."
                className="pl-9 pr-4 py-2 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-72"
              />
            </div>
          </div>

          {/* Patient Directory Table */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container/40 text-outline text-[11px] font-bold">
                  <tr>
                    <th className="p-3.5">Patient ID</th>
                    <th className="p-3.5">Demographics</th>
                    <th className="p-3.5">CNIC / ID</th>
                    <th className="p-3.5">Blood Group</th>
                    <th className="p-3.5">Contact Phone</th>
                    <th className="p-3.5">Ward / Bed</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {filteredPatients.map((p) => (
                    <tr key={p.patientId || p._id} className="hover:bg-surface-container/30 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-primary">{p.patientId}</td>
                      <td className="p-3.5">
                        <span className="font-bold text-on-surface block">{p.name}</span>
                        <span className="text-[10px] text-outline">
                          {p.gender}, {p.age} years
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-outline">{p.cnic || "N/A"}</td>
                      <td className="p-3.5 font-bold text-primary">{p.bloodGroup || "O+"}</td>
                      <td className="p-3.5 font-mono text-outline">{p.phone || "03000000000"}</td>
                      <td className="p-3.5 font-medium text-on-surface">
                        {p.assignedBed || "None (Ambulatory)"}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === "Inpatient"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          {p.status || "Outpatient"}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedPatient(p)}
                          className="cursor-pointer px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-on-primary font-bold text-xs transition-all flex items-center gap-1 ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View EMR
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredPatients.length === 0 && (
                    <tr>
                      <td colSpan="8" className="p-10 text-center text-outline text-xs">
                        {loading ? "Loading patients from MongoDB..." : "No patients found matching criteria."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Patient Details Modal */}
        {selectedPatient && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
            <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl w-full max-w-240 shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container/30">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <span className="font-bold text-sm">Patient Health Record Demographics</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="cursor-pointer p-1 rounded-lg hover:bg-surface-container text-outline"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div className="flex justify-between items-start border-b border-outline-variant/10 pb-3">
                  <div>
                    <span className="font-mono font-bold text-primary block">{selectedPatient.patientId}</span>
                    <h3 className="font-bold text-base text-on-surface">{selectedPatient.name}</h3>
                    <p className="text-[11px] text-outline mt-0.5">CNIC: {selectedPatient.cnic || "N/A"}</p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                      selectedPatient.status === "Inpatient"
                        ? "bg-amber-500/10 text-amber-600"
                        : "bg-blue-500/10 text-blue-600"
                    }`}
                  >
                    {selectedPatient.status || "Outpatient"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-surface-container/30 p-3 rounded-xl border border-outline-variant/10">
                  <div>
                    <span className="text-outline text-[10px] uppercase font-semibold block">Age &amp; Gender</span>
                    <span className="font-bold text-on-surface">{selectedPatient.age} years • {selectedPatient.gender}</span>
                  </div>
                  <div>
                    <span className="text-outline text-[10px] uppercase font-semibold block">Blood Group</span>
                    <span className="font-bold text-primary">{selectedPatient.bloodGroup || "O+"}</span>
                  </div>
                  <div>
                    <span className="text-outline text-[10px] uppercase font-semibold block">Phone</span>
                    <span className="font-mono font-semibold text-on-surface">{selectedPatient.phone || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-outline text-[10px] uppercase font-semibold block">Assigned Ward Bed</span>
                    <span className="font-semibold text-on-surface">{selectedPatient.assignedBed || "None"}</span>
                  </div>
                </div>

                {selectedPatient.emergencyContact && (
                  <div className="p-3 rounded-xl bg-surface-container/20 border border-outline-variant/10 text-[11px]">
                    <span className="font-bold text-outline uppercase block mb-1">Emergency Contact</span>
                    <p className="font-semibold">{selectedPatient.emergencyContact.name} ({selectedPatient.emergencyContact.relation || "Kin"})</p>
                    <p className="font-mono text-outline">{selectedPatient.emergencyContact.phone}</p>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedPatient(null)}
                    className="cursor-pointer px-4 py-2 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <Footer />
      </main>
    </div>
  );
}
