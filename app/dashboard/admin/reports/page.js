"use client";

import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Admin_Sidebar";
import Footer from "@/components/Footer";
import {
  Users,
  FlaskConical,
  Pill,
  CheckCircle2,
  FileText,
  RefreshCw,
  Download,
  AlertCircle,
  Menu,
  Coins,
} from "lucide-react";
import { exportToCsv } from "@/lib/csvExport";

export default function AdminReportsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportNotice, setExportNotice] = useState("");

  const [reportsSummary, setReportsSummary] = useState([]);
  const [departmentPerformance, setDepartmentPerformance] = useState([]);
  const [pharmacySummary, setPharmacySummary] = useState([]);
  const [labTurnaround, setLabTurnaround] = useState([]);
  const [meta, setMeta] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function loadReports() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/reports", {
          cache: "no-store",
          headers: {
            Pragma: "no-cache",
            "Cache-Control": "no-cache",
          },
        });
        if (!res.ok) throw new Error("Failed to load reports data");
        const data = await res.json();
        if (!ignore) {
          setReportsSummary(data.reportsSummary || []);
          setDepartmentPerformance(data.departmentPerformance || []);
          setPharmacySummary(data.pharmacySummary || []);
          setLabTurnaround(data.labTurnaround || []);
          setMeta(data.meta || null);
        }
      } catch (err) {
        if (!ignore) {
          console.error("Error fetching reports:", err);
          setError(err.message || "Failed to load clinical reports");
        }
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
  }, [refreshTrigger]);

  const handleExport = (reportName) => {
    let columns = [];
    let rows = [];
    let fileName = "hospital_report.csv";

    if (reportName.includes("Department") || reportName.includes("Master")) {
      columns = [
        { key: "department", label: "Department Wing" },
        { key: "admissions", label: "Patient Admissions" },
        { key: "bedOccupancy", label: "Bed Occupancy Rate" },
        { key: "revenue", label: "Gross Revenue (PKR)" },
        { key: "trend", label: "Quarterly Trend" },
      ];
      rows = departmentPerformance;
      fileName = "department_occupancy_revenue_report_pkr.csv";
    } else if (reportName.includes("Laboratory")) {
      columns = [
        { key: "test", label: "Diagnostic Panel" },
        { key: "avgTime", label: "Average Turnaround Time" },
        { key: "benchmark", label: "Hospital Target" },
      ];
      rows = labTurnaround;
      fileName = "laboratory_turnaround_audit.csv";
    } else {
      columns = [
        { key: "metric", label: "Pharmacy Metric" },
        { key: "value", label: "Report Value (PKR)" },
      ];
      rows = pharmacySummary;
      fileName = "pharmacy_dispensing_ledger_pkr.csv";
    }

    exportToCsv(fileName, columns, rows);
    setExportNotice(`Report "${reportName}" exported to ${fileName} successfully!`);
    setTimeout(() => setExportNotice(""), 3500);
  };

  const getSummaryIcon = (index) => {
    switch (index) {
      case 0:
        return <Users size={24} className="text-primary" />;
      case 1:
        return <Coins size={24} className="text-secondary" />;
      case 2:
        return <FlaskConical size={24} className="text-tertiary" />;
      case 3:
      default:
        return <Pill size={24} className="text-primary-container" />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 overflow-y-auto p-margin no-scrollbar">
        <main>
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-md mb-lg">
            <div className="flex items-center gap-sm">
              <button
                className="cursor-pointer lg:hidden p-xs text-on-surface-variant hover:bg-surface-container rounded-lg"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu size={24} />
              </button>
              <div>
                <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
                  Analytics &amp; Operational Reports (PKR)
                </h1>
                <p className="text-body-sm text-on-surface-variant">
                  Comprehensive clinical statistics, financial metrics in Pakistani Rupees, and departmental utilization.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-sm">
              <button
                onClick={() => setRefreshTrigger((k) => k + 1)}
                disabled={loading}
                className="cursor-pointer flex items-center gap-2 px-md py-2.5 rounded-xl border border-outline-variant bg-surface hover:bg-surface-container-high text-body-sm font-semibold text-on-surface transition-all"
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                Refresh Data
              </button>
              <button
                onClick={() => handleExport("Master Hospital Audit (PKR)")}
                className="cursor-pointer flex items-center gap-2 px-md py-2.5 rounded-xl bg-primary text-on-primary font-semibold text-body-sm shadow-md hover:bg-primary/90 transition-all"
              >
                <Download size={18} />
                Export Master Report (PKR)
              </button>
            </div>
          </header>

          {/* Export Notification Toast */}
          {exportNotice && (
            <div className="mb-lg p-md rounded-2xl bg-secondary-container text-on-secondary-container flex items-center gap-2 clinical-shadow font-semibold text-body-sm animate-pulse">
              <CheckCircle2 className="w-5 h-5 text-secondary" /> {exportNotice}
            </div>
          )}

          {error && (
            <div className="mb-lg p-md rounded-2xl bg-error-container text-on-error-container flex items-center gap-2 font-semibold text-body-sm">
              <AlertCircle className="w-5 h-5 text-error" /> {error}
            </div>
          )}

          {/* Currency Standard Banner */}
          <div className="mb-lg p-md bg-secondary/10 border border-secondary/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-on-surface text-body-sm">
              <Coins className="text-secondary" size={20} />
              <span>
                <strong>Official Hospital Ledger Standard:</strong> All financial statements, pharmacy revenues, and diagnostic invoicing are computed strictly in <strong>Pakistani Rupees (PKR / Rs.)</strong>.
              </span>
            </div>
            {meta && (
              <span className="text-xs font-mono text-on-surface-variant hidden md:inline">
                Last Synced: {new Date(meta.generatedAt).toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* Executive KPI Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mb-xl">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass-card p-md rounded-2xl animate-pulse space-y-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-container-high"></div>
                  <div className="h-6 w-24 bg-surface-container-high rounded"></div>
                  <div className="h-4 w-16 bg-surface-container-high rounded"></div>
                </div>
              ))
            ) : (
              reportsSummary.map((item, idx) => (
                <div
                  key={idx}
                  className="glass-card p-md rounded-2xl flex flex-col justify-between clinical-shadow border border-outline-variant/30 hover:border-primary/50 transition-all"
                >
                  <div className="flex justify-between items-start mb-sm">
                    <span className={`p-2 rounded-xl ${item.bg || "bg-surface-container-high"}`}>
                      {getSummaryIcon(idx)}
                    </span>
                    <span className="font-semibold text-xs text-secondary bg-secondary-container/30 px-2 py-0.5 rounded-full">
                      {item.change}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-label-caps text-label-caps text-on-surface-variant font-bold">
                      {item.title}
                    </h3>
                    <p className="font-display-lg text-display-lg font-black text-on-surface mt-xs">
                      {item.value}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Department Performance Table */}
          <div className="glass-card rounded-2xl border border-outline-variant/30 overflow-hidden clinical-shadow mb-xl">
            <div className="p-md flex flex-col md:flex-row justify-between items-start md:items-center gap-md border-b border-outline-variant/20 bg-surface-container-low/40">
              <div>
                <h2 className="font-title-lg text-title-lg font-bold text-on-surface">
                  Department Utilization &amp; Revenue Ledger (PKR)
                </h2>
                <p className="text-body-sm text-on-surface-variant">
                  Bed capacity allocations, inpatient volumes, and department turnover.
                </p>
              </div>
              <button
                onClick={() => handleExport("Department Performance")}
                className="cursor-pointer flex items-center gap-1.5 px-sm py-1.5 rounded-lg border border-outline-variant hover:bg-surface-container text-body-sm font-semibold text-on-surface"
              >
                <Download size={16} />
                Export Section CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-high/40 text-on-surface-variant">
                  <tr>
                    <th className="px-md py-3 font-label-caps text-label-caps">Department Wing</th>
                    <th className="px-md py-3 font-label-caps text-label-caps">Admissions</th>
                    <th className="px-md py-3 font-label-caps text-label-caps">Bed Occupancy</th>
                    <th className="px-md py-3 font-label-caps text-label-caps">Realized / Est. Revenue (PKR)</th>
                    <th className="px-md py-3 font-label-caps text-label-caps">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 text-body-sm">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="text-center py-8 text-on-surface-variant">
                        <RefreshCw className="animate-spin inline-block text-primary mb-2" size={24} />
                        <p>Calculating live department metrics in PKR...</p>
                      </td>
                    </tr>
                  ) : (
                    departmentPerformance.map((dept, index) => (
                      <tr key={index} className="hover:bg-primary-fixed/10 transition-colors">
                        <td className="px-md py-3.5 font-bold text-on-surface">
                          {dept.department}
                        </td>
                        <td className="px-md py-3.5 text-on-surface-variant">
                          {dept.admissions} patients
                        </td>
                        <td className="px-md py-3.5 font-semibold text-primary">
                          {dept.bedOccupancy}
                        </td>
                        <td className="px-md py-3.5 font-mono font-bold text-secondary">
                          {dept.revenue}
                        </td>
                        <td className="px-md py-3.5 font-semibold text-secondary">
                          {dept.trend}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Specialized Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter mb-xl">
            {/* Pharmacy Report Card */}
            <div className="glass-card p-md rounded-2xl border border-outline-variant/30 clinical-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-sm mb-md border-b border-outline-variant/20">
                  <div className="flex items-center gap-2">
                    <Pill className="text-primary" size={22} />
                    <h3 className="font-title-sm text-title-sm font-bold text-on-surface">
                      Pharmacy Dispensing Ledger (PKR)
                    </h3>
                  </div>
                  <button
                    onClick={() => handleExport("Pharmacy Dispensing Ledger")}
                    className="cursor-pointer text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <Download size={14} /> Export
                  </button>
                </div>
                <div className="space-y-sm">
                  {loading ? (
                    <p className="text-xs text-on-surface-variant">Loading pharmacy ledger...</p>
                  ) : (
                    pharmacySummary.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b border-outline-variant/10">
                        <span className="text-body-sm text-on-surface-variant font-medium">
                          {item.metric}
                        </span>
                        <span className="font-bold text-body-sm text-on-surface font-mono">
                          {item.value}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="mt-md pt-sm border-t border-outline-variant/20 flex justify-between items-center text-xs text-on-surface-variant">
                <span>Audited under RoleMed Formulary Policy</span>
                <FileText size={16} />
              </div>
            </div>

            {/* Laboratory Diagnostic Audit */}
            <div className="glass-card p-md rounded-2xl border border-outline-variant/30 clinical-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-sm mb-md border-b border-outline-variant/20">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="text-tertiary" size={22} />
                    <h3 className="font-title-sm text-title-sm font-bold text-on-surface">
                      Diagnostic Turnaround Audit
                    </h3>
                  </div>
                  <button
                    onClick={() => handleExport("Laboratory Turnaround Audit")}
                    className="cursor-pointer text-xs font-bold text-tertiary hover:underline flex items-center gap-1"
                  >
                    <Download size={14} /> Export
                  </button>
                </div>
                <div className="space-y-sm">
                  {loading ? (
                    <p className="text-xs text-on-surface-variant">Loading laboratory turnaround audit...</p>
                  ) : (
                    labTurnaround.map((panel, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b border-outline-variant/10">
                        <div>
                          <span className="text-body-sm font-bold text-on-surface block">
                            {panel.test}
                          </span>
                          <span className="text-xs text-on-surface-variant">
                            Benchmark: {panel.benchmark}
                          </span>
                        </div>
                        <span className="px-sm py-1 bg-secondary-container/40 text-secondary font-bold text-xs rounded-lg">
                          {panel.avgTime}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="mt-md pt-sm border-t border-outline-variant/20 flex justify-between items-center text-xs text-on-surface-variant">
                <span>Quality Assurance Verified</span>
                <CheckCircle2 size={16} className="text-secondary" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
