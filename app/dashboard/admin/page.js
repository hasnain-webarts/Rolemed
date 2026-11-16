"use client";

import { useState, useEffect } from 'react';
import {
  Users,
  Stethoscope,
  Calendar,
  FlaskConical,
  RefreshCw,
  TrendingUp,
  Receipt,
  Bed,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Shield,
  Activity,
  Plus,
  Cpu,
} from 'lucide-react';
import { MdOutlineInventory2, MdOutlineSupportAgent } from "react-icons/md";
import Sidebar from '@/components/Admin_Sidebar';
import Footer from '@/components/Footer';
import NotificationBell from '@/components/NotificationBell';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function loadOverview() {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/overview', { cache: 'no-store' });
        const resData = await res.json();
        if (!ignore && resData.success) {
          setData(resData);
        }
      } catch (err) {
        console.error('Error fetching admin overview:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadOverview();
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  const metrics = data?.metrics || {
    totalPatients: 0,
    activeDoctors: 0,
    totalStaff: 0,
    appointmentsToday: 0,
    pendingLabs: 0,
    lowStockMedicines: 0,
    admittedPatients: 0,
    totalHospitalBeds: 50,
    bedOccupancyRate: 0,
  };

  const financials = data?.financials || {
    currency: 'PKR',
    totalHospitalRevenue: 0,
    pharmacyRevenue: 0,
    labRevenue: 0,
    outstandingReceivables: 0,
  };

  const monthlyGrowth = data?.monthlyGrowth || [];
  const recentActivities = data?.recentActivities || [];

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
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold font-headline tracking-tight">
                    Hospital Executive Overview
                  </h1>
                  <p className="text-sm text-outline">
                    Consolidated operational pulse, clinical department capacity, and financial ledger in PKR.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <NotificationBell role="admin" />
              <button
                type="button"
                onClick={() => setRefreshKey((k) => k + 1)}
                disabled={loading}
                className="cursor-pointer px-3.5 py-2 border border-outline-variant/30 rounded-xl text-xs font-semibold hover:bg-surface-container flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh Pulse
              </button>
              <Link
                href="/dashboard/admin/equipments"
                className="cursor-pointer flex items-center gap-1.5 px-3.5 py-2 border border-outline-variant/30 rounded-xl text-xs font-semibold hover:bg-surface-container transition-all"
              >
                <Cpu className="w-3.5 h-3.5 text-primary" />
                Manage Assets &amp; Beds
              </Link>
              <Link
                href="/dashboard/admin/appointments"
                className="cursor-pointer flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-xl font-bold text-xs hover:opacity-90 transition-all shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Schedule Appointment
              </Link>
            </div>
          </div>

          {/* Consolidated Financials Banner in PKR */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/20 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider block mb-1">
                  Consolidated Realized Hospital Revenue (PKR)
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black font-headline text-primary">
                    Rs. {financials.totalHospitalRevenue.toLocaleString()}
                  </span>
                  <span className="text-xs text-outline font-semibold">Realized across Pharmacy &amp; Diagnostics</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-xs">
                <div>
                  <span className="text-outline text-[11px] block">Pharmacy Sales:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    Rs. {financials.pharmacyRevenue.toLocaleString()}
                  </span>
                </div>

                <div>
                  <span className="text-outline text-[11px] block">Diagnostics &amp; Labs:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    Rs. {financials.labRevenue.toLocaleString()}
                  </span>
                </div>

                <div>
                  <span className="text-outline text-[11px] block">Pending Balances:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    Rs. {financials.outstandingReceivables.toLocaleString()}
                  </span>
                </div>

                <Link
                  href="/dashboard/admin/reports"
                  className="px-3.5 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-xs font-bold text-primary hover:bg-surface-container transition-all"
                >
                  View Financial Reports &rarr;
                </Link>
              </div>
            </div>
          </div>

          {/* 6 Key Operational KPIs Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
              <div className="flex justify-between items-center text-outline mb-1.5">
                <span className="text-xs font-semibold">Patients</span>
                <Users className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-2xl font-black font-headline">{metrics.totalPatients}</h3>
              <p className="text-[10px] text-outline mt-0.5">Master patient index</p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
              <div className="flex justify-between items-center text-outline mb-1.5">
                <span className="text-xs font-semibold">Doctors</span>
                <Stethoscope className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-black font-headline text-emerald-600 dark:text-emerald-400">
                {metrics.activeDoctors}
              </h3>
              <p className="text-[10px] text-outline mt-0.5">Active practitioners</p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
              <div className="flex justify-between items-center text-outline mb-1.5">
                <span className="text-xs font-semibold">Appointments</span>
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-2xl font-black font-headline text-blue-600 dark:text-blue-400">
                {metrics.appointmentsToday}
              </h3>
              <p className="text-[10px] text-outline mt-0.5">Scheduled for today</p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
              <div className="flex justify-between items-center text-outline mb-1.5">
                <span className="text-xs font-semibold">Pending Labs</span>
                <FlaskConical className="w-4 h-4 text-amber-500" />
              </div>
              <h3 className="text-2xl font-black font-headline text-amber-600 dark:text-amber-400">
                {metrics.pendingLabs}
              </h3>
              <p className="text-[10px] text-outline mt-0.5">Under analysis</p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
              <div className="flex justify-between items-center text-outline mb-1.5">
                <span className="text-xs font-semibold">Low Stock</span>
                <MdOutlineInventory2 className="w-4 h-4 text-rose-500" />
              </div>
              <h3 className="text-2xl font-black font-headline text-rose-600 dark:text-rose-400">
                {metrics.lowStockMedicines}
              </h3>
              <p className="text-[10px] text-outline mt-0.5">Below reorder level</p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
              <div className="flex justify-between items-center text-outline mb-1.5">
                <span className="text-xs font-semibold">Bed Occupancy</span>
                <Bed className="w-4 h-4 text-purple-500" />
              </div>
              <h3 className="text-2xl font-black font-headline text-purple-600 dark:text-purple-400">
                {metrics.bedOccupancyRate}%
              </h3>
              <p className="text-[10px] text-outline mt-0.5">
                {metrics.admittedPatients} / {metrics.totalHospitalBeds} beds occupied
              </p>
            </div>
          </div>

          {/* Main Grid: Patient Growth Analytics (Left) & Recent Activities Feed (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Patient Growth Analytics */}
            <div className="lg:col-span-8 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/10 pb-3">
                <div>
                  <h2 className="text-base font-bold font-headline flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Patient Growth &amp; Registrations
                  </h2>
                  <p className="text-xs text-outline">
                    Monthly patient intake volume across outpatient and emergency admissions.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold text-xs">
                  YTD Aggregate
                </span>
              </div>

              {/* Bar Chart Visualization */}
              <div className="h-64 w-full flex items-end justify-between gap-3 px-2 pt-6 pb-2">
                {monthlyGrowth.map((bar, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <span className="text-[10px] font-bold text-outline opacity-0 group-hover:opacity-100 transition-opacity">
                      {bar.count}
                    </span>
                    <div
                      style={{ height: bar.height }}
                      className="w-full max-w-[42px] bg-primary/80 hover:bg-primary rounded-t-lg transition-all clinical-shadow"
                    />
                    <span className="text-[11px] text-outline font-semibold uppercase">{bar.month}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Operational Activity Stream */}
            <div className="lg:col-span-4 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-outline-variant/10 pb-3">
                <div>
                  <h2 className="text-base font-bold font-headline flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Operational Stream
                  </h2>
                  <p className="text-xs text-outline">Live cross-department events</p>
                </div>
                <Link href="/dashboard/admin/audit-logs" className="text-xs text-primary font-bold hover:underline">
                  Audit Logs &rarr;
                </Link>
              </div>

              <div className="space-y-3">
                {recentActivities.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 bg-surface-container/20 border border-outline-variant/10 rounded-xl space-y-1 hover:bg-surface-container/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${act.badgeColor}`}>
                        {act.type}
                      </span>
                      <span className="text-[10px] text-outline font-mono">
                        {act.status}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-on-surface">{act.title}</p>
                    <p className="text-[11px] text-outline truncate">{act.detail}</p>
                  </div>
                ))}

                {recentActivities.length === 0 && (
                  <p className="text-xs text-outline italic py-8 text-center">
                    {loading ? 'Loading operational stream...' : 'No activity records found.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </main>
    </div>
  );
}
