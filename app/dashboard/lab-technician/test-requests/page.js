"use client";

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
  Search,
  FlaskConical,
  Play,
  Check,
  X,
  Activity,
  AlertCircle,
  RefreshCw,
  Clock,
  CheckCircle2,
  FileCheck,
  Filter,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import Sidebar from '@/components/Lab_Technician_Sidebar';
import Footer from '@/components/Footer';

export default function TestRequests() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('Pending'); // 'Pending' | 'In Progress' | 'Completed' | 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Orders and Tab Statistics
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    inProgress: 0,
    completed: 0,
    critical: 0,
  });

  // Processing & Results Modal State
  const [processingReq, setProcessingReq] = useState(null);
  const [viewingReq, setViewingReq] = useState(null);

  // Diagnostic sub-parameters state
  // CBC
  const [hb, setHb] = useState('');
  const [wbc, setWbc] = useState('');
  const [rbc, setRbc] = useState('');
  const [platelets, setPlatelets] = useState('');
  // Glucose / Endocrine
  const [glucose, setGlucose] = useState('');
  const [hba1c, setHba1c] = useState('');
  // LFT
  const [alt, setAlt] = useState('');
  const [ast, setAst] = useState('');
  const [bilirubin, setBilirubin] = useState('');
  // RFT
  const [creatinine, setCreatinine] = useState('');
  const [bun, setBun] = useState('');
  // Lipid
  const [cholesterol, setCholesterol] = useState('');
  const [triglycerides, setTriglycerides] = useState('');
  const [hdl, setHdl] = useState('');
  const [ldl, setLdl] = useState('');
  // General & Flags
  const [generalFindings, setGeneralFindings] = useState('');
  const [isCritical, setIsCritical] = useState(false);

  // Fetch Test Requests with Cache Elimination
  useEffect(() => {
    let ignore = false;
    async function loadTestRequests() {
      setLoading(true);
      try {
        const res = await fetch('/api/lab-orders?limit=150', { cache: 'no-store' });
        const data = await res.json();
        if (!ignore) {
          if (data.success) {
            setOrders(data.labOrders || []);
            if (data.stats) {
              setStats(data.stats);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching lab orders:', err);
        if (!ignore) {
          setErrorMsg('Failed to fetch test requests from hospital server.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadTestRequests();
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  // Open Parameter Form Modal & Pre-fill
  const openProcessingModal = (req) => {
    setProcessingReq(req);
    setIsCritical(Boolean(req.criticalAlert));
    setGeneralFindings(req.findings || '');

    const metrics = req.resultMetrics || {};
    setHb(metrics.hb || '');
    setWbc(metrics.wbc || '');
    setRbc(metrics.rbc || '');
    setPlatelets(metrics.platelets || '');
    setGlucose(metrics.glucose || '');
    setHba1c(metrics.hba1c || '');
    setAlt(metrics.alt || '');
    setAst(metrics.ast || '');
    setBilirubin(metrics.bilirubin || '');
    setCreatinine(metrics.creatinine || '');
    setBun(metrics.bun || '');
    setCholesterol(metrics.cholesterol || '');
    setTriglycerides(metrics.triglycerides || '');
    setHdl(metrics.hdl || '');
    setLdl(metrics.ldl || '');
  };

  // 1-Click Collect Specimen (Advances Pending -> In Progress)
  const handleCollectSpecimen = async (order) => {
    try {
      const orderId = order.orderId || order._id;
      const res = await fetch(`/api/lab-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'In Progress',
          specimenCollectedAt: new Date(),
          processedBy: session?.user?.name ? `${session.user.name}, Lab Technologist` : 'Laboratory Technologist',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update order status');
      }

      setSuccessMsg(`Specimen collected for ${order.patientName} (${order.orderId}). Order moved to 'In Progress'.`);
      setRefreshKey((k) => k + 1);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to collect specimen');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  // Reject Compromised Specimen
  const handleRejectSpecimen = async (order) => {
    const reason = prompt(
      `Enter specimen rejection reason for ${order.patientName} (${order.orderId}):\n(e.g., Hemolyzed specimen, Clotted blood, Insufficient volume, Mislabeled container)`,
      'Hemolyzed blood specimen'
    );
    if (!reason || !reason.trim()) return;

    try {
      const orderId = order.orderId || order._id;
      const res = await fetch(`/api/lab-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Specimen Rejected',
          rejectionReason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reject specimen');
      }

      setSuccessMsg(`Specimen for ${order.orderId} rejected: "${reason.trim()}".`);
      setRefreshKey((k) => k + 1);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reject specimen');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  // Request Urgent Specimen Recollection
  const handleRequestRecollection = async (order) => {
    if (!confirm(`Request urgent specimen recollection from nursing/phlebotomy for ${order.patientName} (${order.orderId})?`)) return;

    try {
      const orderId = order.orderId || order._id;
      const res = await fetch(`/api/lab-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Recollection Requested',
          rejectionReason: `${order.rejectionReason || 'Sample compromised'} -> Recollection requested by Lab`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to request recollection');
      }

      setSuccessMsg(`Recollection requested for ${order.orderId}. Ward/Phlebotomy notified.`);
      setRefreshKey((k) => k + 1);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to request recollection');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  // Submit Structured Lab Results & Finalize (Advances -> Completed)
  const handleProcessSubmit = async (e) => {
    e.preventDefault();
    if (!processingReq) return;

    setSubmitting(true);
    setErrorMsg('');

    let resultString = '';
    const metrics = {};
    const testNameLower = (processingReq.testName || '').toLowerCase();

    if (testNameLower.includes('cbc') || testNameLower.includes('blood count')) {
      metrics.hb = hb ? `${hb} g/dL` : '';
      metrics.wbc = wbc ? `${wbc} K/µL` : '';
      metrics.rbc = rbc ? `${rbc} M/µL` : '';
      metrics.platelets = platelets ? `${platelets} K/µL` : '';
      resultString = `CBC Summary: Hb: ${hb || 'N/A'} g/dL (Ref: 13.5-17.5), WBC: ${wbc || 'N/A'} K/µL (Ref: 4.0-11.0), Platelets: ${platelets || 'N/A'} K/µL (Ref: 150-450). ${generalFindings}`;
    } else if (testNameLower.includes('fbs') || testNameLower.includes('sugar') || testNameLower.includes('glucose')) {
      metrics.glucose = glucose ? `${glucose} mg/dL` : '';
      resultString = `Fasting Blood Glucose: ${glucose || 'N/A'} mg/dL (Reference Range: 70-99 mg/dL). ${generalFindings}`;
    } else if (testNameLower.includes('hba1c')) {
      metrics.hba1c = hba1c ? `${hba1c}%` : '';
      resultString = `Glycated Hemoglobin (HbA1c): ${hba1c || 'N/A'}% (Normal: <5.7%, Prediabetic: 5.7-6.4%). ${generalFindings}`;
    } else if (testNameLower.includes('lipid')) {
      metrics.cholesterol = cholesterol ? `${cholesterol} mg/dL` : '';
      metrics.triglycerides = triglycerides ? `${triglycerides} mg/dL` : '';
      metrics.hdl = hdl ? `${hdl} mg/dL` : '';
      metrics.ldl = ldl ? `${ldl} mg/dL` : '';
      resultString = `Lipid Profile: Total Chol: ${cholesterol || 'N/A'} mg/dL (<200), Trig: ${triglycerides || 'N/A'} mg/dL (<150), HDL: ${hdl || 'N/A'} mg/dL, LDL: ${ldl || 'N/A'} mg/dL. ${generalFindings}`;
    } else if (testNameLower.includes('lft') || testNameLower.includes('liver')) {
      metrics.alt = alt ? `${alt} U/L` : '';
      metrics.ast = ast ? `${ast} U/L` : '';
      metrics.bilirubin = bilirubin ? `${bilirubin} mg/dL` : '';
      resultString = `LFT Panel: ALT/SGPT: ${alt || 'N/A'} U/L (7-56), AST: ${ast || 'N/A'} U/L (10-40), Total Bilirubin: ${bilirubin || 'N/A'} mg/dL (0.2-1.2). ${generalFindings}`;
    } else if (testNameLower.includes('rft') || testNameLower.includes('renal') || testNameLower.includes('kft')) {
      metrics.creatinine = creatinine ? `${creatinine} mg/dL` : '';
      metrics.bun = bun ? `${bun} mg/dL` : '';
      resultString = `RFT Panel: Creatinine: ${creatinine || 'N/A'} mg/dL (0.7-1.3), BUN: ${bun || 'N/A'} mg/dL (7-20). ${generalFindings}`;
    } else {
      resultString = generalFindings || 'Diagnostic examination completed within expected clinical limits.';
      metrics.findings = generalFindings;
    }

    try {
      const orderId = processingReq.orderId || processingReq._id;
      const res = await fetch(`/api/lab-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          findings: resultString.trim(),
          resultMetrics: metrics,
          criticalAlert: isCritical,
          status: 'Completed',
          completedAt: new Date(),
          processedBy: session?.user?.name ? `${session.user.name}, Lab Technologist` : 'Laboratory Technologist',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit lab results');
      }

      setSuccessMsg(`Diagnostic report compiled and finalized for ${processingReq.patientName} (${processingReq.orderId})!`);
      setProcessingReq(null);
      setRefreshKey((k) => k + 1);

      setTimeout(() => {
        setSuccessMsg('');
      }, 5000);
    } catch (err) {
      console.error('Error submitting lab report:', err);
      setErrorMsg(err.message || 'Error releasing diagnostic findings');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Orders for Current Tab & Search
  const filteredRequests = useMemo(() => {
    return orders.filter((req) => {
      let matchesTab = activeTab === 'all';
      if (activeTab === 'Pending') matchesTab = req.status === 'Pending';
      else if (activeTab === 'In Progress') matchesTab = req.status === 'In Progress';
      else if (activeTab === 'Completed') matchesTab = req.status === 'Completed';
      else if (activeTab === 'Rejected') matchesTab = req.status === 'Specimen Rejected' || req.status === 'Recollection Requested';
      else if ((req.status || '').toLowerCase() === activeTab.toLowerCase()) matchesTab = true;

      if (!matchesTab) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const pName = (req.patientName || '').toLowerCase();
      const pId = (req.patientId || '').toLowerCase();
      const ordId = (req.orderId || '').toLowerCase();
      const tName = (req.testName || '').toLowerCase();
      const docName = (req.doctorName || '').toLowerCase();

      return (
        pName.includes(q) ||
        pId.includes(q) ||
        ordId.includes(q) ||
        tName.includes(q) ||
        docName.includes(q)
      );
    });
  }, [orders, activeTab, searchQuery]);

  // Determine which parameter form inputs to display
  const testCategory = useMemo(() => {
    if (!processingReq) return 'general';
    const name = (processingReq.testName || '').toLowerCase();
    if (name.includes('cbc') || name.includes('blood count')) return 'cbc';
    if (name.includes('fbs') || name.includes('sugar') || name.includes('glucose')) return 'glucose';
    if (name.includes('hba1c')) return 'hba1c';
    if (name.includes('lipid')) return 'lipid';
    if (name.includes('lft') || name.includes('liver')) return 'lft';
    if (name.includes('rft') || name.includes('renal') || name.includes('kft')) return 'rft';
    return 'general';
  }, [processingReq]);

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
                  <FlaskConical className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold font-headline tracking-tight">
                    Diagnostic Test Requests &amp; Specimen Processing
                  </h1>
                  <p className="text-sm text-outline">
                    Track pending doctor orders, collect specimens, enter clinical parameters, and release findings.
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
                Refresh Queue
              </button>
            </div>
          </div>

          {/* Alert Banners */}
          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-semibold flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMsg('')}
                className="cursor-pointer p-1 rounded-lg hover:bg-emerald-500/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-semibold flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg('')}
                className="cursor-pointer p-1 rounded-lg hover:bg-rose-500/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Status Tabs Navigation with Live Counters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 p-1 bg-surface-container/40 rounded-2xl border border-outline-variant/20 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('Pending')}
                className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === 'Pending'
                    ? 'bg-surface-container-lowest text-primary shadow-xs font-headline'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                Pending Collection
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black">
                  {stats.pending}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('In Progress')}
                className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === 'In Progress'
                    ? 'bg-surface-container-lowest text-primary shadow-xs font-headline'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-blue-500" />
                In Progress / Analysis
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-500/15 text-blue-600 dark:text-blue-400 font-black">
                  {stats.inProgress}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('Completed')}
                className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === 'Completed'
                    ? 'bg-surface-container-lowest text-primary shadow-xs font-headline'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Completed &amp; Released
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-black">
                  {stats.completed}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('Rejected')}
                className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === 'Rejected'
                    ? 'bg-surface-container-lowest text-primary shadow-xs font-headline'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                <X className="w-3.5 h-3.5 text-rose-500" />
                Specimen Issues
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500/15 text-rose-600 dark:text-rose-400 font-black">
                  {stats.rejected !== undefined ? stats.rejected : orders.filter((o) => o.status === 'Specimen Rejected' || o.status === 'Recollection Requested').length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                  activeTab === 'all'
                    ? 'bg-surface-container-lowest text-primary shadow-xs font-headline'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                <Filter className="w-3.5 h-3.5 text-outline" />
                All Requests
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-surface-container text-outline font-black">
                  {orders.length}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-outline absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient, order ID, or test..."
                className="pl-9 pr-4 py-2 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-64"
              />
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container/40 text-outline text-[11px] font-bold">
                  <tr>
                    <th className="p-3.5">Order ID</th>
                    <th className="p-3.5">Patient Details</th>
                    <th className="p-3.5">Requested Examination</th>
                    <th className="p-3.5">Referring Physician</th>
                    <th className="p-3.5">Specimen Type</th>
                    <th className="p-3.5 text-center">Priority</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {filteredRequests.map((req) => (
                    <tr key={req.orderId || req._id} className="hover:bg-surface-container/30 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-primary">
                        {req.orderId}
                        {req.criticalAlert && (
                          <span className="block mt-0.5 text-[10px] text-rose-500 font-bold flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            CRITICAL
                          </span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-on-surface">{req.patientName}</span>
                        <span className="block text-[10px] text-outline font-mono">{req.patientId}</span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-semibold text-on-surface">{req.testName}</span>
                        <span className="block text-[10px] text-outline">Date: {req.date}</span>
                      </td>

                      <td className="p-3.5">
                        <span className="text-on-surface font-medium">{req.doctorName || 'Dr. Sarah Johnson'}</span>
                        {req.consultationId && (
                          <span className="block text-[10px] text-outline font-mono">{req.consultationId}</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-surface-container/60 text-outline font-medium text-[11px]">
                          {req.specimenType || 'Blood'}
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            req.priority === 'Emergency'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              : req.priority === 'Urgent'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              : 'bg-surface-container text-outline'
                          }`}
                        >
                          {req.priority}
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            req.status === 'Completed'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : req.status === 'In Progress'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : req.status === 'Specimen Rejected'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                              : req.status === 'Recollection Requested'
                              ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}
                          title={req.rejectionReason || ''}
                        >
                          {req.status}
                        </span>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {req.status === 'Pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleCollectSpecimen(req)}
                                className="cursor-pointer px-2.5 py-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-500/20 text-[11px] transition-all flex items-center gap-1"
                              >
                                <Play className="w-3 h-3" />
                                Collect Specimen
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectSpecimen(req)}
                                className="cursor-pointer px-2 py-1.5 rounded-xl border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-[11px] font-semibold transition-all flex items-center gap-1"
                                title="Reject compromised specimen"
                              >
                                <X className="w-3 h-3" />
                                Reject
                              </button>
                            </>
                          )}

                          {req.status === 'In Progress' && (
                            <>
                              <button
                                type="button"
                                onClick={() => openProcessingModal(req)}
                                className="cursor-pointer px-3 py-1.5 rounded-xl bg-primary text-on-primary font-bold hover:opacity-90 text-[11px] transition-all flex items-center gap-1 shadow-xs"
                              >
                                <Activity className="w-3 h-3" />
                                Enter Results
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectSpecimen(req)}
                                className="cursor-pointer px-2 py-1.5 rounded-xl border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-[11px] font-semibold transition-all flex items-center gap-1"
                                title="Reject compromised specimen"
                              >
                                <X className="w-3 h-3" />
                                Reject
                              </button>
                            </>
                          )}

                          {req.status === 'Specimen Rejected' && (
                            <button
                              type="button"
                              onClick={() => handleRequestRecollection(req)}
                              className="cursor-pointer px-2.5 py-1.5 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 hover:bg-purple-500/25 text-[11px] font-bold transition-all flex items-center gap-1"
                              title="Request Recollection"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Order Recollection
                            </button>
                          )}

                          {req.status === 'Pending' && (
                            <button
                              type="button"
                              onClick={() => openProcessingModal(req)}
                              className="cursor-pointer px-2.5 py-1.5 rounded-xl border border-outline-variant/30 text-outline font-semibold hover:bg-surface-container text-[11px] transition-all"
                            >
                              Fast-Track
                            </button>
                          )}

                          {req.status === 'Completed' && (
                            <button
                              type="button"
                              onClick={() => setViewingReq(req)}
                              className="cursor-pointer px-2.5 py-1.5 rounded-xl border border-outline-variant/30 text-outline hover:text-on-surface hover:bg-surface-container text-[11px] font-semibold flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              View Findings
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredRequests.length === 0 && (
                    <tr>
                      <td colSpan="8" className="p-10 text-center text-outline text-xs">
                        {loading
                          ? 'Loading test requests from MongoDB...'
                          : `No test requests found under '${activeTab}'.`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Enter Results & Process Diagnostic Modal */}
        {processingReq && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
            <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl w-full max-w-240 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container/30">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <span className="font-bold text-sm">Diagnostic Parameter Entry</span>
                </div>
                <button
                  type="button"
                  onClick={() => setProcessingReq(null)}
                  className="cursor-pointer p-1 rounded-lg hover:bg-surface-container text-outline"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleProcessSubmit} className="p-6 space-y-4 overflow-y-auto text-xs flex-1">
                {/* Order Summary Pill */}
                <div className="bg-surface-container/30 p-3.5 rounded-xl border border-outline-variant/10 flex justify-between items-center">
                  <div>
                    <span className="font-mono font-bold text-primary mr-2">{processingReq.orderId}</span>
                    <span className="font-bold text-on-surface text-sm">{processingReq.patientName}</span>
                    <p className="text-[10px] text-outline mt-0.5">
                      {processingReq.testName} • Referred by {processingReq.doctorName || 'Dr. Sarah Johnson'}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold text-[10px]">
                    {processingReq.priority}
                  </span>
                </div>

                {/* Dynamic Parameter Forms Based on Test Category */}
                {testCategory === 'cbc' && (
                  <div className="space-y-3 bg-surface-container/20 p-4 rounded-xl border border-outline-variant/10">
                    <span className="text-[11px] font-bold text-outline uppercase tracking-wider block">
                      Complete Blood Count (CBC) Panel
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-outline font-semibold mb-1">
                          Hemoglobin (Hb) [Ref: 13.5 - 17.5 g/dL]
                        </label>
                        <input
                          type="text"
                          value={hb}
                          onChange={(e) => setHb(e.target.value)}
                          placeholder="e.g., 14.2"
                          className="w-full p-2 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-outline font-semibold mb-1">
                          WBC Count [Ref: 4.0 - 11.0 K/µL]
                        </label>
                        <input
                          type="text"
                          value={wbc}
                          onChange={(e) => setWbc(e.target.value)}
                          placeholder="e.g., 7.5"
                          className="w-full p-2 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-outline font-semibold mb-1">
                          Platelets [Ref: 150 - 450 K/µL]
                        </label>
                        <input
                          type="text"
                          value={platelets}
                          onChange={(e) => setPlatelets(e.target.value)}
                          placeholder="e.g., 260"
                          className="w-full p-2 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-outline font-semibold mb-1">
                          RBC Count [Ref: 4.5 - 5.9 M/µL]
                        </label>
                        <input
                          type="text"
                          value={rbc}
                          onChange={(e) => setRbc(e.target.value)}
                          placeholder="e.g., 5.1"
                          className="w-full p-2 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {testCategory === 'glucose' && (
                  <div className="space-y-3 bg-surface-container/20 p-4 rounded-xl border border-outline-variant/10">
                    <span className="text-[11px] font-bold text-outline uppercase tracking-wider block">
                      Blood Glucose Diagnostics
                    </span>
                    <div>
                      <label className="block text-[10px] text-outline font-semibold mb-1">
                        Fasting Blood Glucose [Ref: 70 - 99 mg/dL]
                      </label>
                      <input
                        type="text"
                        value={glucose}
                        onChange={(e) => setGlucose(e.target.value)}
                        placeholder="e.g., 92"
                        className="w-full p-2 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {testCategory === 'hba1c' && (
                  <div className="space-y-3 bg-surface-container/20 p-4 rounded-xl border border-outline-variant/10">
                    <span className="text-[11px] font-bold text-outline uppercase tracking-wider block">
                      Glycated Hemoglobin (HbA1c)
                    </span>
                    <div>
                      <label className="block text-[10px] text-outline font-semibold mb-1">
                        HbA1c Percentage [Ref: &lt;5.7% Normal, 5.7-6.4% Prediabetic]
                      </label>
                      <input
                        type="text"
                        value={hba1c}
                        onChange={(e) => setHba1c(e.target.value)}
                        placeholder="e.g., 5.6"
                        className="w-full p-2 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {testCategory === 'lipid' && (
                  <div className="space-y-3 bg-surface-container/20 p-4 rounded-xl border border-outline-variant/10">
                    <span className="text-[11px] font-bold text-outline uppercase tracking-wider block">
                      Lipid Panel Metrics
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-outline font-semibold mb-1">
                          Total Cholesterol [Ref: &lt;200 mg/dL]
                        </label>
                        <input
                          type="text"
                          value={cholesterol}
                          onChange={(e) => setCholesterol(e.target.value)}
                          placeholder="e.g., 185"
                          className="w-full p-2 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-outline font-semibold mb-1">
                          Triglycerides [Ref: &lt;150 mg/dL]
                        </label>
                        <input
                          type="text"
                          value={triglycerides}
                          onChange={(e) => setTriglycerides(e.target.value)}
                          placeholder="e.g., 130"
                          className="w-full p-2 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-outline font-semibold mb-1">
                          HDL (&quot;Good&quot;) Cholesterol [Ref: &gt;40 mg/dL]
                        </label>
                        <input
                          type="text"
                          value={hdl}
                          onChange={(e) => setHdl(e.target.value)}
                          placeholder="e.g., 52"
                          className="w-full p-2 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-outline font-semibold mb-1">
                          LDL (&quot;Bad&quot;) Cholesterol [Ref: &lt;100 mg/dL]
                        </label>
                        <input
                          type="text"
                          value={ldl}
                          onChange={(e) => setLdl(e.target.value)}
                          placeholder="e.g., 95"
                          className="w-full p-2 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {testCategory === 'lft' && (
                  <div className="space-y-3 bg-surface-container/20 p-4 rounded-xl border border-outline-variant/10">
                    <span className="text-[11px] font-bold text-outline uppercase tracking-wider block">
                      Liver Function Panel (LFT)
                    </span>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] text-outline font-semibold mb-1">
                          ALT / SGPT [Ref: 7-56 U/L]
                        </label>
                        <input
                          type="text"
                          value={alt}
                          onChange={(e) => setAlt(e.target.value)}
                          placeholder="e.g., 28"
                          className="w-full p-2 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-outline font-semibold mb-1">
                          AST / SGOT [Ref: 10-40 U/L]
                        </label>
                        <input
                          type="text"
                          value={ast}
                          onChange={(e) => setAst(e.target.value)}
                          placeholder="e.g., 24"
                          className="w-full p-2 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-outline font-semibold mb-1">
                          Total Bilirubin [0.2-1.2 mg/dL]
                        </label>
                        <input
                          type="text"
                          value={bilirubin}
                          onChange={(e) => setBilirubin(e.target.value)}
                          placeholder="e.g., 0.8"
                          className="w-full p-2 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {testCategory === 'rft' && (
                  <div className="space-y-3 bg-surface-container/20 p-4 rounded-xl border border-outline-variant/10">
                    <span className="text-[11px] font-bold text-outline uppercase tracking-wider block">
                      Renal Function Panel (RFT)
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-outline font-semibold mb-1">
                          Serum Creatinine [Ref: 0.7-1.3 mg/dL]
                        </label>
                        <input
                          type="text"
                          value={creatinine}
                          onChange={(e) => setCreatinine(e.target.value)}
                          placeholder="e.g., 0.95"
                          className="w-full p-2 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-outline font-semibold mb-1">
                          BUN (Urea Nitrogen) [Ref: 7-20 mg/dL]
                        </label>
                        <input
                          type="text"
                          value={bun}
                          onChange={(e) => setBun(e.target.value)}
                          placeholder="e.g., 14"
                          className="w-full p-2 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* General Clinical Findings & Pathologist Impression */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-outline uppercase tracking-wider">
                    Clinical Findings &amp; Pathological Impression
                  </label>
                  <textarea
                    rows={3}
                    value={generalFindings}
                    onChange={(e) => setGeneralFindings(e.target.value)}
                    placeholder="Enter diagnostic summary, microscopic observations, or clinical notes..."
                    className="w-full p-3 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Critical Alert Toggle */}
                <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <span className="font-bold text-xs text-amber-600 dark:text-amber-400 block">
                        Flag as Critical Clinical Alert
                      </span>
                      <span className="text-[10px] text-outline">
                        Highlights report with urgent warning banner in doctor EMR.
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isCritical}
                    onChange={(e) => setIsCritical(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>

                {/* Submit Controls */}
                <div className="pt-2 flex items-center justify-end gap-3 border-t border-outline-variant/10">
                  <button
                    type="button"
                    onClick={() => setProcessingReq(null)}
                    className="cursor-pointer px-4 py-2 border border-outline-variant/30 rounded-xl font-semibold hover:bg-surface-container text-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="cursor-pointer px-5 py-2.5 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Releasing Findings...
                      </>
                    ) : (
                      <>
                        <FileCheck className="w-4 h-4" />
                        Finalize &amp; Release Report
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Released Findings Modal */}
        {viewingReq && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
            <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl w-full max-w-240 shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container/30">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-500" />
                  <span className="font-bold text-sm">Released Diagnostic Findings</span>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingReq(null)}
                  className="cursor-pointer p-1 rounded-lg hover:bg-surface-container text-outline"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div className="flex justify-between items-start border-b border-outline-variant/10 pb-3">
                  <div>
                    <span className="font-mono font-bold text-sm text-primary block">{viewingReq.orderId}</span>
                    <span className="font-bold text-base text-on-surface">{viewingReq.testName}</span>
                    <p className="text-[11px] text-outline mt-0.5">Patient: {viewingReq.patientName} ({viewingReq.patientId})</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">
                    Released
                  </span>
                </div>

                <div className="bg-surface-container/30 p-3 rounded-xl border border-outline-variant/10 space-y-2">
                  <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">
                    Pathological Findings
                  </span>
                  <p className="text-xs text-on-surface whitespace-pre-wrap leading-relaxed">
                    {viewingReq.findings || 'Diagnostic results normal, details uploaded to medical record.'}
                  </p>
                </div>

                {viewingReq.resultMetrics && Object.keys(viewingReq.resultMetrics).length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">
                      Recorded Clinical Metrics
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(viewingReq.resultMetrics).map(([key, val]) => (
                        <div key={key} className="p-2 rounded-lg bg-surface-container/20 border border-outline-variant/10 flex justify-between">
                          <span className="text-outline uppercase text-[10px] font-mono">{key}:</span>
                          <span className="font-bold text-on-surface">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-outline flex justify-between items-center pt-2 border-t border-outline-variant/10">
                  <span>Processed by: {viewingReq.processedBy || session?.user?.name || 'Laboratory Technologist'}</span>
                  <span>Completed: {viewingReq.date}</span>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setViewingReq(null)}
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
