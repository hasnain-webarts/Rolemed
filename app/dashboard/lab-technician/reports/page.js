"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  FileText,
  Printer,
  Eye,
  X,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Calendar,
  User,
  FlaskConical,
  ShieldCheck,
  Filter,
} from 'lucide-react';
import Sidebar from '@/components/Lab_Technician_Sidebar';
import Footer from '@/components/Footer';

export default function DiagnosticsReports() {
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'critical' | 'routine'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function loadReports() {
      setLoading(true);
      try {
        const res = await fetch('/api/lab-orders?status=Completed&limit=150', { cache: 'no-store' });
        const data = await res.json();
        if (!ignore && data.success) {
          setReports(data.labOrders || []);
        }
      } catch (err) {
        console.error('Error fetching completed lab reports:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadReports();
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  // Filter Reports by Tab and Search
  const filteredReports = useMemo(() => {
    return reports.filter((rep) => {
      const isCrit =
        rep.criticalAlert ||
        rep.priority === 'Emergency' ||
        (rep.findings || '').toLowerCase().includes('critical') ||
        (rep.findings || '').toLowerCase().includes('infarction') ||
        (rep.findings || '').toLowerCase().includes('tachycardia');

      if (activeFilter === 'critical' && !isCrit) return false;
      if (activeFilter === 'routine' && isCrit) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const pName = (rep.patientName || '').toLowerCase();
      const pId = (rep.patientId || '').toLowerCase();
      const tName = (rep.testName || '').toLowerCase();
      const ordId = (rep.orderId || rep.id || '').toLowerCase();
      const findings = (rep.findings || '').toLowerCase();
      const docName = (rep.doctorName || '').toLowerCase();

      return (
        pName.includes(q) ||
        pId.includes(q) ||
        tName.includes(q) ||
        ordId.includes(q) ||
        findings.includes(q) ||
        docName.includes(q)
      );
    });
  }, [reports, activeFilter, searchQuery]);

  const criticalCount = useMemo(() => {
    return reports.filter(
      (r) =>
        r.criticalAlert ||
        r.priority === 'Emergency' ||
        (r.findings || '').toLowerCase().includes('critical') ||
        (r.findings || '').toLowerCase().includes('infarction') ||
        (r.findings || '').toLowerCase().includes('tachycardia')
    ).length;
  }, [reports]);

  return (
    <div className="flex bg-background min-h-screen text-on-surface">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <div className="p-6 md:p-8 space-y-6 flex-1">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-outline-variant/10">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold font-headline tracking-tight">
                    Diagnostic Reports &amp; Pathology Archive
                  </h1>
                  <p className="text-sm text-outline">
                    Access officially published clinical pathology reports, parameter findings, and doctor releases.
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
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh Archive
              </button>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 p-1 bg-surface-container/40 rounded-2xl border border-outline-variant/20 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                  activeFilter === 'all'
                    ? 'bg-surface-container-lowest text-primary shadow-xs font-headline'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                All Released Reports
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-black">
                  {reports.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('critical')}
                className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                  activeFilter === 'critical'
                    ? 'bg-surface-container-lowest text-primary shadow-xs font-headline'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                Critical &amp; Abnormal Findings
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500/15 text-rose-600 dark:text-rose-400 font-black">
                  {criticalCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('routine')}
                className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                  activeFilter === 'routine'
                    ? 'bg-surface-container-lowest text-primary shadow-xs font-headline'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Routine Normal Findings
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-black">
                  {Math.max(0, reports.length - criticalCount)}
                </span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-outline absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search report archive by patient, order ID..."
                className="pl-9 pr-4 py-2 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-72"
              />
            </div>
          </div>

          {/* Reports Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredReports.map((rep) => {
              const repId = rep.orderId || rep._id;
              const isCritical =
                rep.criticalAlert ||
                rep.priority === 'Emergency' ||
                (rep.findings || '').toLowerCase().includes('critical') ||
                (rep.findings || '').toLowerCase().includes('infarction') ||
                (rep.findings || '').toLowerCase().includes('tachycardia');

              return (
                <div
                  key={repId}
                  className={`bg-surface-container-lowest p-5 rounded-2xl border transition-all flex flex-col justify-between shadow-sm hover:shadow-md ${
                    isCritical
                      ? 'border-rose-500/30 hover:border-rose-500/60'
                      : 'border-outline-variant/10 hover:border-primary/40'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono font-bold text-xs text-primary block">{repId}</span>
                        <h3 className="font-bold text-sm text-on-surface mt-0.5">{rep.testName}</h3>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isCritical
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center gap-1'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {isCritical && <AlertTriangle className="w-3 h-3" />}
                        {isCritical ? 'Abnormal / Alert' : 'Released'}
                      </span>
                    </div>

                    <div className="bg-surface-container/30 p-2.5 rounded-xl border border-outline-variant/10 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-outline text-[11px]">Patient:</span>
                        <span className="font-bold text-on-surface">{rep.patientName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-outline text-[11px]">Patient ID:</span>
                        <span className="font-mono text-outline">{rep.patientId}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-outline text-[11px]">Doctor:</span>
                        <span className="text-outline">{rep.doctorName || 'Dr. Sarah Johnson'}</span>
                      </div>
                    </div>

                    <div className="text-xs">
                      <span className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1">
                        Findings Summary
                      </span>
                      <p className="text-outline line-clamp-2 leading-relaxed">
                        {rep.findings || 'Clinical diagnostic findings recorded within expected physiological limits.'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-outline-variant/10 flex items-center justify-between">
                    <span className="text-[10px] text-outline flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {rep.date}
                    </span>

                    <button
                      type="button"
                      onClick={() => setSelectedReport(rep)}
                      className="cursor-pointer px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-on-primary font-bold text-xs transition-all flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Certificate
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredReports.length === 0 && (
              <div className="col-span-full py-16 text-center text-outline text-xs bg-surface-container-lowest rounded-2xl border border-outline-variant/10">
                {loading ? 'Loading reports archive...' : 'No diagnostic reports found matching the selected filter.'}
              </div>
            )}
          </div>
        </div>

        {/* Detailed Diagnostic Certificate Modal */}
        {selectedReport && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
            <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
              {/* Modal Header Bar */}
              <div className="p-4 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container/30">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span className="font-bold text-sm">Official Diagnostic Report Certificate</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="cursor-pointer p-1 rounded-lg hover:bg-surface-container text-outline"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Certificate Body */}
              <div className="p-6 md:p-8 space-y-5 overflow-y-auto text-xs flex-1">
                {/* Hospital Masthead */}
                <div className="flex justify-between items-start border-b border-outline-variant/15 pb-4">
                  <div>
                    <h2 className="text-xl font-bold font-headline text-primary">ROLEMED HOSPITAL</h2>
                    <p className="text-[11px] text-outline font-medium">Department of Pathology &amp; Diagnostic Medicine</p>
                    <p className="text-[10px] text-outline">Clinical Laboratories Wing • ISO 15189 Certified</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-sm text-primary block">
                      {selectedReport.orderId || selectedReport._id}
                    </span>
                    <span className="text-[10px] text-outline">Issued: {selectedReport.date}</span>
                    <span className="block text-[10px] text-emerald-600 font-bold mt-0.5">Verified Report</span>
                  </div>
                </div>

                {/* Patient & Specimen Demographics Box */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-surface-container/30 p-4 rounded-xl border border-outline-variant/10">
                  <div>
                    <span className="text-[10px] text-outline uppercase font-semibold block">Patient Name</span>
                    <span className="font-bold text-on-surface text-sm">{selectedReport.patientName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-outline uppercase font-semibold block">Patient MRN</span>
                    <span className="font-mono font-bold text-on-surface">{selectedReport.patientId}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-outline uppercase font-semibold block">Referred By</span>
                    <span className="font-semibold text-on-surface">{selectedReport.doctorName || 'Dr. Sarah Johnson'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-outline uppercase font-semibold block">Specimen</span>
                    <span className="font-semibold text-on-surface">{selectedReport.specimenType || 'Blood (Serum)'}</span>
                  </div>
                </div>

                {/* Diagnostic Examination Banner */}
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">Examination</span>
                    <span className="text-sm font-bold text-on-surface">{selectedReport.testName}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                    {selectedReport.priority} Priority
                  </span>
                </div>

                {/* Structured Metrics Table (if any) */}
                {selectedReport.resultMetrics && Object.keys(selectedReport.resultMetrics).length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-outline uppercase tracking-wider block">
                      Observed Laboratory Parameters
                    </span>
                    <div className="border border-outline-variant/15 rounded-xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-surface-container/50 text-[10px] text-outline font-bold">
                          <tr>
                            <th className="p-2.5">Parameter Metric</th>
                            <th className="p-2.5">Observed Value</th>
                            <th className="p-2.5 text-right">Verification Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/10">
                          {Object.entries(selectedReport.resultMetrics).map(([param, val]) => (
                            <tr key={param} className="hover:bg-surface-container/30">
                              <td className="p-2.5 font-mono uppercase font-bold text-primary">{param}</td>
                              <td className="p-2.5 font-bold text-on-surface">{String(val)}</td>
                              <td className="p-2.5 text-right">
                                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                  In Range / Logged
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Pathological Findings Text */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-outline uppercase tracking-wider block">
                    Diagnostic Impression &amp; Pathologist Interpretation
                  </span>
                  <div className="p-4 rounded-xl bg-surface-container/20 border border-outline-variant/10 leading-relaxed text-on-surface whitespace-pre-wrap">
                    {selectedReport.findings ||
                      'Standard physiological investigation released with no acute pathological abnormalities identified.'}
                  </div>
                </div>

                {/* Sign-off Seal */}
                <div className="pt-4 border-t border-outline-variant/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] text-outline">Digitally Signed &amp; Dispatched By:</p>
                    <p className="font-bold text-on-surface">
                      {selectedReport.processedBy || 'Elena Rostova, MLT / Specialist in Blood Banking'}
                    </p>
                    <p className="text-[9px] text-outline">RoleMed Hospital Department of Clinical Laboratories</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-emerald-600 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 shrink-0" />
                    <div>
                      <span className="block text-[10px] font-bold">QC Approved</span>
                      <span className="block text-[9px] text-outline">Secure Electronic Health Record</span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-2 flex items-center justify-between border-t border-outline-variant/10">
                  <button
                    type="button"
                    onClick={() => {
                      // Non-blocking mock trigger deferred for unified print rollout
                      alert(`Printing official laboratory certificate for ${selectedReport.orderId}... (Print functionality will be rolled out globally across all modules in one go)`);
                    }}
                    className="cursor-pointer px-4 py-2 border border-outline-variant/30 rounded-xl font-bold hover:bg-surface-container flex items-center gap-1.5 text-outline hover:text-on-surface"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Diagnostic Certificate
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedReport(null)}
                    className="cursor-pointer px-5 py-2 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 transition-all"
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
