"use client";

import { useState, useEffect } from 'react';
import { MdOutlineLocalPharmacy } from 'react-icons/md';
import { Pill, Receipt, AlertTriangle, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { IoMdNotificationsOutline } from 'react-icons/io';
import Sidebar from '@/components/Pharmacist_Sidebar';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function PharmacistDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalToday: 0,
    dispensedToday: 0,
    pendingToday: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalFormulations: 0,
  });
  const [recentDispensed, setRecentDispensed] = useState([]);
  const [lowStock, setLowStock] = useState([]);

  useEffect(() => {
    let ignore = false;

    async function loadPharmacistOverview() {
      try {
        setLoading(true);
        const [rxRes, medRes] = await Promise.all([
          fetch('/api/prescriptions', { cache: 'no-store' }),
          fetch('/api/medicines?limit=500', { cache: 'no-store' }),
        ]);

        const rxData = await rxRes.json();
        const medData = await medRes.json();

        if (!ignore) {
          // Process Prescriptions
          if (rxData.success) {
            const list = rxData.prescriptions || [];
            const dispensed = list.filter((r) => r.status === 'Dispensed');
            const pending = list.filter((r) => r.status === 'Pending Dispensation');

            setStats((prev) => ({
              ...prev,
              totalToday: list.length,
              dispensedToday: dispensed.length,
              pendingToday: pending.length,
            }));

            setRecentDispensed(
              dispensed.slice(0, 4).map((r) => ({
                rxId: r.prescriptionId,
                patient: r.patientName,
                date: r.date || 'Today',
                drugsCount: (r.drugs || []).length,
              }))
            );
          }

          // Process Formulary Medicines
          if (medData.success) {
            const meds = medData.medicines || [];
            const summary = medData.summary || {};

            setStats((prev) => ({
              ...prev,
              lowStockCount: summary.lowStockCount || 0,
              outOfStockCount: summary.outOfStockCount || 0,
              totalFormulations: summary.totalFormulations || meds.length,
            }));

            // Filter out items at or below reorderLevel
            const criticalList = meds
              .filter((m) => (m.stockQuantity || 0) <= (m.reorderLevel !== undefined ? m.reorderLevel : 20))
              .map((m) => {
                const qty = m.stockQuantity || 0;
                const minQty = m.reorderLevel !== undefined ? m.reorderLevel : 20;
                let level = 'Low';
                if (qty === 0) level = 'Out of Stock';
                else if (qty <= Math.ceil(minQty / 2)) level = 'Critical';

                return {
                  sku: m.sku,
                  name: m.name,
                  category: m.category,
                  qty,
                  minQty,
                  level,
                };
              });

            setLowStock(criticalList.slice(0, 5));
          }
        }
      } catch (err) {
        console.error('Error fetching pharmacist overview:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadPharmacistOverview();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="flex-1 overflow-y-auto bg-background p-margin no-scrollbar">
        {/* Header */}
        <Header onMenuClick={() => setIsSidebarOpen(true)} />

        {/* KPI Grid */}
        <KpiGrid stats={stats} />

        <div className="grid grid-cols-12 gap-gutter mb-lg">
          {/* Low Stock Warning */}
          <LowStockWidget lowStock={lowStock} loading={loading} />

          {/* Quick Actions and Recent Dispensed */}
          <div className="col-span-12 lg:col-span-4 space-y-gutter">
            <QuickActions />
            <DispensationFeed dispensed={recentDispensed} />
          </div>
        </div>

        <Footer />
      </main>
    </div>
  );
}

// --- Subcomponents ---

function Header({ onMenuClick }) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-md mb-lg">
      <div className="flex items-center gap-sm">
        <button
          className="cursor-pointer lg:hidden p-xs text-on-surface-variant hover:bg-surface-container rounded-lg"
          onClick={onMenuClick}
        >
          <Pill size={24} />
        </button>
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface font-bold">Pharmacy Dashboard</h2>
          <p className="text-body-sm text-on-surface-variant">
            Live hospital formulary inventory, automated stock deductions, and e-prescription dispensations.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-sm">
        <Link
          href="/dashboard/pharmacist/inventory"
          className="cursor-pointer p-sm rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors text-primary border border-outline-variant/30 text-xs font-bold flex items-center gap-1.5"
        >
          <MdOutlineLocalPharmacy size={18} /> Formulary
        </Link>
        <Link
          href="/dashboard/pharmacist/prescriptions"
          className="cursor-pointer flex items-center gap-2 px-md py-sm bg-primary text-on-primary rounded-xl font-bold clinical-shadow hover:opacity-90 transition-all text-body-sm"
        >
          <Pill size={18} />
          Dispense Queue
        </Link>
      </div>
    </header>
  );
}

function KpiGrid({ stats }) {
  const kpis = [
    {
      title: 'Prescriptions in System',
      value: `${stats.totalToday}`,
      subtitle: `${stats.dispensedToday} dispensed, ${stats.pendingToday} pending`,
      icon: <Pill size={24} />,
      iconBg: 'bg-primary-fixed',
      iconColor: 'text-primary',
    },
    {
      title: 'Medicines Low / Out',
      value: `${stats.lowStockCount + stats.outOfStockCount} Items`,
      subtitle: `${stats.outOfStockCount} out of stock, ${stats.lowStockCount} below reorder`,
      icon: <AlertTriangle size={24} />,
      iconBg: 'bg-error-container',
      iconColor: 'text-on-error-container',
    },
    {
      title: 'Dispensation Rate',
      value: stats.totalToday > 0 ? `${Math.round((stats.dispensedToday / stats.totalToday) * 100)}%` : '100%',
      subtitle: 'Order turnaround completion',
      icon: <Receipt size={24} />,
      iconBg: 'bg-tertiary-fixed',
      iconColor: 'text-on-tertiary-fixed-variant',
    },
    {
      title: 'Total Formulations',
      value: `${stats.totalFormulations} Types`,
      subtitle: 'Catalogued pharmaceutical SKUs',
      icon: <MdOutlineLocalPharmacy size={24} />,
      iconBg: 'bg-secondary-container',
      iconColor: 'text-secondary',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mb-lg text-body-sm">
      {kpis.map((kpi, index) => (
        <div key={index} className="glass-card p-md rounded-[16px] clinical-shadow">
          <div className="flex items-center gap-4 mb-sm">
            <div className={`p-3 rounded-xl ${kpi.iconBg} ${kpi.iconColor} flex items-center justify-center shrink-0`}>
              {kpi.icon}
            </div>
            <div>
              <p className="text-outline text-body-sm">{kpi.title}</p>
              <h3 className="text-headline-md font-bold text-on-surface leading-tight">{kpi.value}</h3>
            </div>
          </div>
          <p className="text-body-sm text-outline font-medium">{kpi.subtitle}</p>
        </div>
      ))}
    </div>
  );
}

function LowStockWidget({ lowStock, loading }) {
  return (
    <div className="col-span-12 lg:col-span-8 glass-card rounded-[24px] p-margin clinical-shadow">
      <div className="flex justify-between items-center mb-md">
        <div>
          <h3 className="text-title-sm font-bold text-on-surface">Live Reorder & Low Stock Alerts</h3>
          <p className="text-body-sm text-outline">Formulations at or below threshold reorder levels</p>
        </div>
        <Link
          href="/dashboard/pharmacist/inventory"
          className="text-body-sm font-bold text-primary hover:underline flex items-center gap-1"
        >
          View Full Formulary <ArrowRight size={14} />
        </Link>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center items-center text-outline gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-body-sm">Checking formulary balances...</span>
        </div>
      ) : (
        <div className="space-y-sm">
          {lowStock.length > 0 ? (
            lowStock.map((item, index) => (
              <div
                key={index}
                className="p-md bg-surface-container-low border border-outline-variant/15 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-error/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-error-container text-on-error-container shrink-0">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-outline">{item.sku}</span>
                      <h5 className="font-bold text-on-surface text-body-md">{item.name}</h5>
                    </div>
                    <p className="text-[12px] text-outline mt-0.5 font-medium">
                      Category: {item.category} • Reorder Trigger: {item.minQty} boxes
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between md:justify-end gap-sm w-full md:w-auto">
                  <span className="font-bold text-error bg-error-container/30 px-3 py-1 rounded-md text-[11px] uppercase tracking-wider font-mono">
                    {item.qty} Remaining
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                      item.level === 'Out of Stock'
                        ? 'bg-error text-white'
                        : item.level === 'Critical'
                        ? 'bg-error-container text-on-error-container border border-error/30'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    {item.level}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-outline">
              <CheckCircle2 className="mx-auto w-10 h-10 text-secondary mb-2" />
              <p className="font-bold text-body-sm text-secondary">All stocks adequately balanced.</p>
              <p className="text-xs text-outline">No formulations currently under critical reorder points.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QuickActions() {
  const actions = [
    {
      title: 'Dispense Prescriptions',
      desc: 'Verify e-prescriptions & deduct inventory',
      link: '/dashboard/pharmacist/prescriptions',
      color: 'bg-primary text-on-primary hover:bg-primary/95',
    },
    {
      title: 'Manage Stock Formulary',
      desc: 'Adjust balances, restock & register SKUs',
      link: '/dashboard/pharmacist/inventory',
      color: 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest border border-outline-variant/30',
    },
    {
      title: 'Medicine Billing & Invoicing',
      desc: 'Generate pharmacy invoices & sales receipts',
      link: '/dashboard/pharmacist/billing',
      color: 'bg-secondary text-on-secondary hover:bg-secondary/95',
    },
  ];

  return (
    <div className="glass-card rounded-[24px] p-margin clinical-shadow">
      <h4 className="text-title-sm font-bold text-on-surface mb-md">Quick Actions</h4>
      <div className="flex flex-col gap-sm">
        {actions.map((act, index) => (
          <Link
            key={index}
            href={act.link}
            className={`w-full text-left p-md rounded-2xl clinical-shadow transition-all hover:scale-[1.01] block ${act.color}`}
          >
            <h5 className="font-bold text-body-md">{act.title}</h5>
            <p className="text-[12px] opacity-90">{act.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function DispensationFeed({ dispensed }) {
  return (
    <div className="glass-card rounded-[24px] p-margin clinical-shadow flex flex-col">
      <h4 className="text-title-sm font-bold text-on-surface mb-md">Recent Dispatched Log</h4>
      <div className="space-y-md flex-1">
        {dispensed.length > 0 ? (
          dispensed.map((reg, idx) => (
            <div
              key={idx}
              className="flex gap-4 items-start pb-sm border-b border-outline-variant/10 last:border-0 last:pb-0 text-body-sm"
            >
              <div className="p-2 rounded-xl bg-secondary-container text-secondary shrink-0">
                <CheckCircle2 size={18} />
              </div>
              <div className="overflow-hidden flex-1">
                <div className="flex justify-between items-center">
                  <p className="text-body-sm font-bold text-on-surface truncate">{reg.patient}</p>
                  <span className="text-[10px] text-outline font-semibold">{reg.date}</span>
                </div>
                <p className="text-[12px] text-outline mt-0.5">
                  Rx: <span className="font-mono font-bold text-secondary">{reg.rxId}</span> • {reg.drugsCount} drug items
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-outline italic py-4 text-center">No recent dispensations logged.</p>
        )}
      </div>
    </div>
  );
}
