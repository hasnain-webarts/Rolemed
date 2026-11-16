"use client";

import { useState, useEffect } from 'react';
import {
  FlaskConical,
  FileText,
  Receipt,
  AlertTriangle,
  ArrowRight,
  Play,
  CheckCircle2,
  Clock,
  Activity,
  DollarSign,
  RefreshCw,
} from 'lucide-react';
import Sidebar from '@/components/Lab_Technician_Sidebar';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function LabTechnicianDashboard() {
  const [requests, setRequests] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [stats, setStats] = useState({
    pending: 0,
    inProgress: 0,
    completed: 0,
    critical: 0,
    revenuePKR: 0,
  });

  useEffect(() => {
    let ignore = false;
    async function loadLabOverview() {
      setLoading(true);
      try {
        const [ordersRes, invoicesRes] = await Promise.all([
          fetch('/api/lab-orders?limit=100', { cache: 'no-store' }),
          fetch('/api/lab/invoices?limit=100', { cache: 'no-store' }),
        ]);

        const [ordersData, invoicesData] = await Promise.all([
          ordersRes.json(),
          invoicesRes.json(),
        ]);

        if (!ignore) {
          let pendingCount = 0;
          let inProgCount = 0;
          let compCount = 0;
          let critCount = 0;

          if (ordersData.success) {
            const list = ordersData.labOrders || [];

            for (const item of list) {
              if (item.status === 'Pending') pendingCount++;
              else if (item.status === 'In Progress') inProgCount++;
              else if (item.status === 'Completed') compCount++;

              if (item.criticalAlert || item.priority === 'Emergency') critCount++;
            }

            const pendingItems = list.filter((l) => l.status === 'Pending' || l.status === 'In Progress');
            const completedItems = list.filter((l) => l.status === 'Completed');

            setRequests(
              pendingItems.slice(0, 5).map((p) => ({
                id: p.orderId,
                patient: p.patientName,
                doctor: p.doctorName || 'Dr. Sarah Johnson',
                test: p.testName,
                time: p.date,
                status: p.status,
                priority: p.priority,
                critical: p.criticalAlert,
              }))
            );

            setRecentReports(
              completedItems.slice(0, 4).map((c) => ({
                id: c.orderId,
                patient: c.patientName,
                doctor: c.doctorName || 'Attending Physician',
                test: c.testName,
                date: c.date,
                status: 'Released to EMR',
              }))
            );
          }

          let totalRev = 0;
          if (invoicesData.success && invoicesData.summary) {
            totalRev = invoicesData.summary.totalRevenue || 0;
          }

          setStats({
            pending: pendingCount,
            inProgress: inProgCount,
            completed: compCount,
            critical: critCount,
            revenuePKR: totalRev,
          });
        }
      } catch (err) {
        console.error('Error loading lab overview:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadLabOverview();
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

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
                  <FlaskConical className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold font-headline tracking-tight">
                    Laboratory Diagnostic Operations
                  </h1>
                  <p className="text-sm text-outline">
                    Specimen intake queue, clinical findings entry, and diagnostic revenue ledger in PKR.
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
                Refresh Overview
              </button>
              <Link
                href="/dashboard/lab-technician/test-requests"
                className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl font-bold text-xs hover:opacity-90 transition-all shadow-xs"
              >
                <FlaskConical className="w-4 h-4" />
                Processing Queue
              </Link>
            </div>
          </div>

          {/* KPI Cards Grid in PKR */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
              <div className="flex items-center justify-between text-outline mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Pending Orders</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-black font-headline text-amber-600 dark:text-amber-400">
                {stats.pending}
              </p>
              <p className="text-[11px] text-outline mt-0.5">Awaiting specimen collection</p>
            </div>

            <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
              <div className="flex items-center justify-between text-outline mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">In Progress</span>
                <Activity className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-black font-headline text-blue-600 dark:text-blue-400">
                {stats.inProgress}
              </p>
              <p className="text-[11px] text-outline mt-0.5">Specimens under analyzer</p>
            </div>

            <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
              <div className="flex items-center justify-between text-outline mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Completed Reports</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-black font-headline text-emerald-600 dark:text-emerald-400">
                {stats.completed}
              </p>
              <p className="text-[11px] text-outline mt-0.5">Dispatched to doctor chart</p>
            </div>

            <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
              <div className="flex items-center justify-between text-outline mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Lab Sales (PKR)</span>
                <span className="font-bold text-xs text-emerald-600">Rs.</span>
              </div>
              <p className="text-2xl font-black font-headline text-emerald-600 dark:text-emerald-400">
                Rs. {stats.revenuePKR.toLocaleString()}
              </p>
              <p className="text-[11px] text-outline mt-0.5">Realized diagnostic billing</p>
            </div>
          </div>

          {/* Active Queue Status & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Live Laboratory Queue */}
            <div className="lg:col-span-8 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-outline-variant/10 pb-3">
                <div>
                  <h2 className="text-base font-bold font-headline">Live Laboratory Queue</h2>
                  <p className="text-xs text-outline">Recent incoming diagnostic orders awaiting processing</p>
                </div>
                <Link
                  href="/dashboard/lab-technician/test-requests"
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  View Full Queue <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-3">
                {requests.length > 0 ? (
                  requests.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-surface-container/20 border border-outline-variant/10 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-surface-container/30 transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                          <FlaskConical className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-mono font-bold text-primary">{item.id}</span>
                            <span className="text-[10px] text-outline font-semibold">({item.status})</span>
                            {item.critical && (
                              <span className="text-[10px] bg-rose-500/10 text-rose-600 font-bold px-1.5 py-0.5 rounded">
                                Critical
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-sm text-on-surface">{item.patient}</h3>
                          <p className="text-xs text-outline">
                            Test: <span className="font-semibold text-primary">{item.test}</span> • Dr. {item.doctor}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            item.priority === 'Urgent' || item.priority === 'Emergency'
                              ? 'bg-rose-500/10 text-rose-600'
                              : 'bg-surface-container text-outline'
                          }`}
                        >
                          {item.priority}
                        </span>
                        <Link
                          href="/dashboard/lab-technician/test-requests"
                          className="cursor-pointer text-xs font-bold bg-primary text-on-primary px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:opacity-90 transition-all shadow-xs"
                        >
                          <Play className="w-3 h-3" /> Process
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-outline italic py-8 text-center">
                    {loading ? 'Loading queue...' : 'No pending laboratory orders found.'}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Actions & Recent Released Reports */}
            <div className="lg:col-span-4 space-y-6">
              {/* Quick Actions */}
              <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm space-y-3">
                <h2 className="text-base font-bold font-headline">Quick Actions</h2>
                <div className="space-y-2.5">
                  <Link
                    href="/dashboard/lab-technician/test-requests"
                    className="block p-3.5 rounded-xl bg-primary text-on-primary font-bold hover:opacity-90 transition-all shadow-xs"
                  >
                    <span className="block text-xs">Process Test Requests</span>
                    <span className="block text-[11px] font-normal opacity-90 mt-0.5">
                      Specimen collection &amp; parameters
                    </span>
                  </Link>

                  <Link
                    href="/dashboard/lab-technician/billing"
                    className="block p-3.5 rounded-xl bg-surface-container/50 hover:bg-surface-container text-on-surface border border-outline-variant/20 transition-all"
                  >
                    <span className="block text-xs font-bold text-primary">Diagnostic Invoices (PKR)</span>
                    <span className="block text-[11px] text-outline mt-0.5">
                      Issue billings &amp; import doctor orders
                    </span>
                  </Link>

                  <Link
                    href="/dashboard/lab-technician/reports"
                    className="block p-3.5 rounded-xl bg-surface-container/50 hover:bg-surface-container text-on-surface border border-outline-variant/20 transition-all"
                  >
                    <span className="block text-xs font-bold">Pathology Archives</span>
                    <span className="block text-[11px] text-outline mt-0.5">
                      Search published laboratory reports
                    </span>
                  </Link>
                </div>
              </div>

              {/* Recent Reports */}
              <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm space-y-3">
                <h2 className="text-base font-bold font-headline">Recent Released Reports</h2>
                <div className="space-y-3">
                  {recentReports.length > 0 ? (
                    recentReports.map((rep, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 pb-3 border-b border-outline-variant/10 last:border-0 last:pb-0 text-xs"
                      >
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0 mt-0.5">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div className="flex-1 truncate">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-on-surface truncate">{rep.patient}</span>
                            <span className="text-[10px] text-outline">{rep.date}</span>
                          </div>
                          <p className="text-[11px] text-outline truncate mt-0.5">
                            {rep.test} • <span className="font-mono text-primary font-bold">{rep.id}</span>
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-outline italic py-4 text-center">No reports released today.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </main>
    </div>
  );
}
