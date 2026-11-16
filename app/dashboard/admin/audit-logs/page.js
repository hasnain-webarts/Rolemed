"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Sidebar from "@/components/Admin_Sidebar";
import Footer from "@/components/Footer";
import {
  MdCalendarMonth,
  MdCalendarToday,
  MdDownload,
  MdGroups,
  MdHistory,
  MdInventory2,
  MdMedication,
  MdPerson,
  MdPolicy,
  MdRefresh,
  MdSecurity,
  MdTrendingUp,
  MdVerifiedUser,
  MdSearch,
  MdWarning,
  MdCheckCircle,
  MdChevronLeft,
  MdChevronRight,
  MdFilterList,
} from "react-icons/md";
import { exportToCsv } from "@/lib/csvExport";

const MODULES = [
  "All Modules",
  "Patients",
  "Pharmacy",
  "Laboratory",
  "Appointments",
  "Staff",
  "Schedules",
  "Billing",
  "System",
];

const ACTION_TABS = [
  "ALL",
  "CREATE",
  "UPDATE",
  "DELETE",
  "BILLING",
  "DISPENSE",
  "LOGIN",
  "SYSTEM",
];

export default function AuditLogs() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [actionCounts, setActionCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("ALL");
  const [selectedModule, setSelectedModule] = useState("All Modules");
  const [alertOnly, setAlertOnly] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    let ignore = false;
    async function loadLogs() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (activeCategoryFilter !== "ALL") params.set("action", activeCategoryFilter);
        if (selectedModule !== "All Modules") params.set("module", selectedModule);
        if (alertOnly) params.set("alert", "true");
        if (searchQuery.trim()) params.set("search", searchQuery.trim());

        const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
          cache: "no-store",
          headers: {
            Pragma: "no-cache",
            "Cache-Control": "no-cache",
          },
        });
        if (!res.ok) throw new Error("Failed to load audit logs");
        const data = await res.json();
        if (!ignore) {
          setLogs(data.auditLogs || []);
          setActionCounts(data.actionCounts || {});
        }
      } catch (err) {
        if (!ignore) {
          console.error("Error fetching audit trail:", err);
          setError(err.message || "Failed to load audit events");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadLogs();
    return () => {
      ignore = true;
    };
  }, [activeCategoryFilter, selectedModule, alertOnly, searchQuery, refreshTrigger]);

  // Pagination
  const totalPages = Math.ceil(logs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return logs.slice(start, start + itemsPerPage);
  }, [logs, currentPage, itemsPerPage]);

  const handleExportCSV = () => {
    const columns = [
      { key: "timestamp", label: "Timestamp" },
      { key: "userName", label: "User Name" },
      { key: "userRole", label: "Role" },
      { key: "action", label: "Action Type" },
      { key: "module", label: "Target Module" },
      { key: "description", label: "Audit Description" },
      { key: "ipAddress", label: "Origin IP" },
      { key: "alert", label: "Security Alert" },
    ];
    exportToCsv("system_audit_trail.csv", columns, logs);
  };

  const getModuleIcon = (module) => {
    switch (module?.toLowerCase()) {
      case "patients":
        return <MdGroups size={20} className="text-blue-500" />;
      case "pharmacy":
        return <MdMedication size={20} className="text-emerald-500" />;
      case "laboratory":
        return <MdInventory2 size={20} className="text-purple-500" />;
      case "schedules":
      case "appointments":
        return <MdCalendarMonth size={20} className="text-amber-500" />;
      case "staff":
        return <MdPerson size={20} className="text-cyan-500" />;
      default:
        return <MdPolicy size={20} className="text-primary" />;
    }
  };

  const getActionBadge = (action, isAlert) => {
    if (isAlert) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-error-container text-error flex items-center gap-1 w-fit">
          <MdWarning size={12} /> ALERT
        </span>
      );
    }
    switch (action) {
      case "CREATE":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">CREATE</span>;
      case "UPDATE":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">UPDATE</span>;
      case "DELETE":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">DELETE</span>;
      case "BILLING":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">BILLING</span>;
      case "DISPENSE":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">DISPENSE</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-800">{action}</span>;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 overflow-y-auto no-scrollbar">
        <div className="p-margin space-y-md">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md">
            <div className="flex items-center gap-sm">
              <button
                className="cursor-pointer lg:hidden p-xs text-on-surface-variant hover:bg-surface-container rounded-lg"
                onClick={() => setIsSidebarOpen(true)}
              >
                <MdFilterList size={24} />
              </button>
              <div>
                <h1 className="font-display-lg text-headline-md text-primary font-black tracking-tight">
                  Security &amp; Audit Trail
                </h1>
                <p className="text-on-surface-variant font-body-sm">
                  Immutable chronological ledger of system events, role permissions, and clinical transactions.
                </p>
              </div>
            </div>
            <div className="flex gap-sm items-center">
              <button
                onClick={() => setRefreshTrigger((k) => k + 1)}
                disabled={loading}
                className="cursor-pointer px-md py-2.5 bg-surface-container border border-outline-variant text-on-surface font-semibold rounded-lg flex items-center gap-2 hover:bg-surface-container-high transition-all text-xs"
              >
                <MdRefresh size={18} className={loading ? "animate-spin" : ""} />
                Live Refresh
              </button>
              <button
                onClick={handleExportCSV}
                className="cursor-pointer px-md py-2.5 bg-primary text-on-primary font-bold rounded-lg flex items-center gap-2 shadow-md hover:opacity-90 active:scale-95 transition-all text-xs"
              >
                <MdDownload size={18} />
                Export Audit Log
              </button>
            </div>
          </div>

          {/* KPI Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
            <div className="glass-card p-md rounded-xl shadow-sm border-l-4 border-primary">
              <div className="flex justify-between items-center text-on-surface-variant mb-1">
                <span className="font-label-caps text-label-caps">TOTAL LOG EVENTS</span>
                <MdHistory size={22} className="text-primary" />
              </div>
              <div className="font-display-lg text-display-lg text-on-surface font-black">
                {logs.length}
              </div>
              <span className="text-xs text-on-surface-variant">Archived in MongoDB</span>
            </div>

            <div className="glass-card p-md rounded-xl shadow-sm border-l-4 border-emerald-500">
              <div className="flex justify-between items-center text-on-surface-variant mb-1">
                <span className="font-label-caps text-label-caps">CREATION RECORDS</span>
                <MdVerifiedUser size={22} className="text-emerald-500" />
              </div>
              <div className="font-display-lg text-display-lg text-on-surface font-black">
                {actionCounts["CREATE"] || 0}
              </div>
              <span className="text-xs text-emerald-600 font-semibold">Entity Onboarding</span>
            </div>

            <div className="glass-card p-md rounded-xl shadow-sm border-l-4 border-blue-500">
              <div className="flex justify-between items-center text-on-surface-variant mb-1">
                <span className="font-label-caps text-label-caps">MODIFICATIONS</span>
                <MdSecurity size={22} className="text-blue-500" />
              </div>
              <div className="font-display-lg text-display-lg text-on-surface font-black">
                {actionCounts["UPDATE"] || 0}
              </div>
              <span className="text-xs text-blue-600 font-semibold">Clinical Updates</span>
            </div>

            <div className="glass-card p-md rounded-xl shadow-sm border-l-4 border-error">
              <div className="flex justify-between items-center text-on-surface-variant mb-1">
                <span className="font-label-caps text-label-caps">SECURITY ALERTS</span>
                <MdWarning size={22} className="text-error" />
              </div>
              <div className="font-display-lg text-display-lg text-error font-black">
                {logs.filter((l) => l.alert).length}
              </div>
              <span className="text-xs text-error font-semibold">Flagged Events</span>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 border-b border-outline-variant/30 overflow-x-auto pb-1 no-scrollbar">
            {ACTION_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveCategoryFilter(tab);
                  setCurrentPage(1);
                }}
                className={`cursor-pointer px-md py-2 rounded-lg font-label-caps text-xs font-bold transition-all whitespace-nowrap ${
                  activeCategoryFilter === tab
                    ? "bg-primary text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search & Filter Bar */}
          <div className="glass-card p-md rounded-xl border border-outline-variant/30 flex flex-wrap gap-sm items-center justify-between">
            <div className="flex flex-wrap items-center gap-sm flex-grow">
              <div className="relative min-w-[240px]">
                <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={20} />
                <input
                  type="text"
                  placeholder="Search user, action, IP, notes..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-surface rounded-lg border border-outline-variant text-body-sm outline-none focus:border-primary"
                />
              </div>

              <select
                value={selectedModule}
                onChange={(e) => {
                  setSelectedModule(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-sm py-2 rounded-lg border border-outline-variant bg-surface text-body-sm outline-none cursor-pointer"
              >
                {MODULES.map((mod) => (
                  <option key={mod} value={mod}>
                    {mod}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-on-surface px-2">
                <input
                  type="checkbox"
                  checked={alertOnly}
                  onChange={(e) => {
                    setAlertOnly(e.target.checked);
                    setCurrentPage(1);
                  }}
                  className="w-4 h-4 rounded text-error accent-error cursor-pointer"
                />
                High Alert Only
              </label>
            </div>

            <div className="text-xs font-semibold text-on-surface-variant">
              Showing {logs.length} Logged Events
            </div>
          </div>

          {/* Table */}
          <div className="glass-card rounded-xl border border-outline-variant/30 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-high/40">
                  <tr>
                    <th className="px-md py-3 font-label-caps text-label-caps text-on-surface-variant">Timestamp</th>
                    <th className="px-md py-3 font-label-caps text-label-caps text-on-surface-variant">Responsible User</th>
                    <th className="px-md py-3 font-label-caps text-label-caps text-on-surface-variant">Action Type</th>
                    <th className="px-md py-3 font-label-caps text-label-caps text-on-surface-variant">Module</th>
                    <th className="px-md py-3 font-label-caps text-label-caps text-on-surface-variant">Event Description</th>
                    <th className="px-md py-3 font-label-caps text-label-caps text-on-surface-variant text-right">Origin IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 text-body-sm">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-on-surface-variant">
                        <MdRefresh className="animate-spin inline-block text-primary mb-2" size={28} />
                        <p>Querying immutable audit logs from database...</p>
                      </td>
                    </tr>
                  ) : paginatedLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-on-surface-variant">
                        No audit events match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((log) => {
                      const dateObj = new Date(log.timestamp || log.createdAt);
                      const dateStr = dateObj.toLocaleDateString();
                      const timeStr = dateObj.toLocaleTimeString();

                      return (
                        <tr
                          key={log._id}
                          className={`hover:bg-primary-fixed/10 transition-all ${
                            log.alert ? "bg-error-container/10" : ""
                          }`}
                        >
                          <td className="px-md py-3">
                            <span className="font-mono text-xs text-on-surface block font-semibold">{dateStr}</span>
                            <span className="font-mono text-xs text-on-surface-variant">{timeStr}</span>
                          </td>
                          <td className="px-md py-3">
                            <span className="font-semibold text-on-surface block">
                              {log.userName || "System Automated"}
                            </span>
                            <span className="text-xs text-on-surface-variant uppercase font-mono">
                              {log.userRole || "System"}
                            </span>
                          </td>
                          <td className="px-md py-3">
                            {getActionBadge(log.action, log.alert)}
                          </td>
                          <td className="px-md py-3">
                            <div className="flex items-center gap-1.5 font-medium text-on-surface">
                              {getModuleIcon(log.module)}
                              <span>{log.module}</span>
                            </div>
                          </td>
                          <td className="px-md py-3 text-xs text-on-surface max-w-sm">
                            <span className="font-medium">{log.description}</span>
                            {log.details && (
                              <span className="block text-on-surface-variant text-[11px] font-mono mt-0.5">
                                {typeof log.details === "object" ? JSON.stringify(log.details) : log.details}
                              </span>
                            )}
                          </td>
                          <td className="px-md py-3 text-right font-mono text-xs text-on-surface-variant">
                            {log.ipAddress || "127.0.0.1"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-md bg-surface-container-low/30 border-t border-outline-variant/10 flex justify-between items-center">
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Showing {logs.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{" "}
                {Math.min(currentPage * itemsPerPage, logs.length)} of {logs.length} events
              </span>
              <div className="flex items-center gap-xs">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="cursor-pointer p-2 rounded-lg border border-outline-variant/50 hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <MdChevronLeft size={20} />
                </button>
                <span className="px-sm text-xs font-bold text-on-surface">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="cursor-pointer p-2 rounded-lg border border-outline-variant/50 hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <MdChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    </div>
  );
}
