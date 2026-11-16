"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Sidebar from "@/components/Admin_Sidebar";
import Footer from "@/components/Footer";
import {
  MdPendingActions,
  MdScience,
  MdAssignmentTurnedIn,
  MdNotificationImportant,
  MdSearch,
  MdFilterList,
  MdCheckCircle,
  MdColorize,
  MdChevronLeft,
  MdChevronRight,
  MdSchedule,
  MdFileDownload,
  MdRefresh,
  MdClose,
  MdVisibility,
} from "react-icons/md";
import { exportToCsv } from "@/lib/csvExport";

export default function Laboratory() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [labOrders, setLabOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const itemsPerPage = 8;

  useEffect(() => {
    let ignore = false;
    async function loadOrders() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/lab-orders?limit=200", {
          cache: "no-store",
          headers: {
            Pragma: "no-cache",
            "Cache-Control": "no-cache",
          },
        });
        if (!res.ok) throw new Error("Failed to load laboratory orders from database");
        const data = await res.json();
        if (!ignore) {
          setLabOrders(data.labOrders || []);
        }
      } catch (err) {
        if (!ignore) {
          console.error("Error fetching lab orders:", err);
          setError(err.message || "An error occurred while fetching lab data");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadOrders();
    return () => {
      ignore = true;
    };
  }, [refreshTrigger]);

  // KPI Calculations
  const metrics = useMemo(() => {
    const total = labOrders.length;
    const pending = labOrders.filter(
      (o) => o.status === "Pending" || o.status === "In Progress"
    ).length;
    const completed = labOrders.filter((o) => o.status === "Completed").length;
    const urgent = labOrders.filter(
      (o) => (o.priority || "").toUpperCase() === "URGENT" || (o.priority || "").toUpperCase() === "STAT"
    ).length;

    return { total, pending, completed, urgent };
  }, [labOrders]);

  // Filtering
  const filteredRecords = useMemo(() => {
    return labOrders.filter((record) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        (record.patientId || "").toLowerCase().includes(q) ||
        (record.patientName || "").toLowerCase().includes(q) ||
        (record.testName || "").toLowerCase().includes(q) ||
        (record.doctorName || "").toLowerCase().includes(q) ||
        (record.orderId || "").toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "ALL" ||
        record.status?.toLowerCase() === statusFilter.toLowerCase();

      const matchesPriority =
        priorityFilter === "ALL" ||
        (record.priority || "NORMAL").toUpperCase() === priorityFilter.toUpperCase();

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [labOrders, searchTerm, statusFilter, priorityFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  const handleExportLabQueue = () => {
    const columns = [
      { key: "orderId", label: "Order ID" },
      { key: "patientId", label: "Patient Code" },
      { key: "patientName", label: "Patient Name" },
      { key: "testName", label: "Diagnostic Test" },
      { key: "doctorName", label: "Ordering Physician" },
      { key: "priority", label: "Priority" },
      { key: "status", label: "Status" },
      { key: "findings", label: "Findings" },
      { key: "createdAt", label: "Order Date" },
    ];
    exportToCsv("laboratory_active_queue.csv", columns, filteredRecords);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <main className="p-margin space-y-lg">
          {/* Header Section */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-md">
            <div className="flex items-center gap-sm">
              <button
                className="cursor-pointer lg:hidden p-xs text-on-surface-variant hover:bg-surface-container rounded-lg"
                onClick={() => setIsSidebarOpen(true)}
              >
                <MdSchedule size={24} />
              </button>
              <div>
                <h1 className="font-headline-md text-headline-md text-primary mb-xs">
                  Lab Command Center
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
                  Real-time diagnostics tracking and clinical specimen processing for the central laboratory unit.
                </p>
              </div>
            </div>
            <div className="flex gap-sm items-center">
              <button
                onClick={() => setRefreshTrigger((k) => k + 1)}
                disabled={loading}
                className="cursor-pointer flex items-center gap-xs px-md py-2 bg-surface-container border border-outline-variant text-on-surface hover:bg-surface-container-high rounded-lg text-body-sm transition-all"
                title="Refresh Live Diagnostics"
              >
                <MdRefresh size={18} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
              <div className="flex items-center gap-xs px-sm py-2 bg-surface-container rounded-lg border border-outline-variant/50">
                <span className="text-secondary">
                  <MdSchedule size={20} />
                </span>
                <span className="font-label-caps text-label-caps text-secondary font-bold">
                  DATABASE LIVE
                </span>
              </div>
            </div>
          </header>

          {/* KPI Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {/* Pending Tests */}
            <div className="glass-card custom-shadow p-md rounded-xl flex flex-col justify-between border-l-4 border-primary">
              <div className="flex justify-between items-start mb-sm">
                <span className="material-symbols-outlined text-primary bg-primary-fixed p-2 rounded-lg">
                  <MdPendingActions size={24} />
                </span>
                <span className="text-primary font-bold font-body-sm text-body-sm">
                  Active Queue
                </span>
              </div>
              <div>
                <h3 className="font-label-caps text-label-caps text-on-surface-variant opacity-70">
                  PENDING / IN PROCESS
                </h3>
                <p className="font-display-lg text-display-lg text-on-surface mt-xs font-black">
                  {loading ? "..." : metrics.pending}
                </p>
              </div>
            </div>

            {/* Total Tests */}
            <div className="glass-card custom-shadow p-md rounded-xl flex flex-col justify-between border-l-4 border-secondary">
              <div className="flex justify-between items-start mb-sm">
                <span className="material-symbols-outlined text-secondary bg-secondary-container p-2 rounded-lg">
                  <MdScience size={24} />
                </span>
                <span className="text-secondary font-bold font-body-sm text-body-sm">
                  Total Orders
                </span>
              </div>
              <div>
                <h3 className="font-label-caps text-label-caps text-on-surface-variant opacity-70">
                  ALL LAB TESTS
                </h3>
                <p className="font-display-lg text-display-lg text-on-surface mt-xs font-black">
                  {loading ? "..." : metrics.total}
                </p>
              </div>
            </div>

            {/* Completed Reports */}
            <div className="glass-card custom-shadow p-md rounded-xl flex flex-col justify-between border-l-4 border-tertiary">
              <div className="flex justify-between items-start mb-sm">
                <span className="material-symbols-outlined text-tertiary bg-tertiary-fixed p-2 rounded-lg">
                  <MdAssignmentTurnedIn size={24} />
                </span>
                <span className="text-tertiary font-bold font-body-sm text-body-sm">
                  Certified
                </span>
              </div>
              <div>
                <h3 className="font-label-caps text-label-caps text-on-surface-variant opacity-70">
                  COMPLETED REPORTS
                </h3>
                <p className="font-display-lg text-display-lg text-on-surface mt-xs font-black">
                  {loading ? "..." : metrics.completed}
                </p>
              </div>
            </div>

            {/* Urgent Flags */}
            <div className="glass-card custom-shadow p-md rounded-xl flex flex-col justify-between border-l-4 border-error">
              <div className="flex justify-between items-start mb-sm">
                <span className="material-symbols-outlined text-error bg-error-container p-2 rounded-lg">
                  <MdNotificationImportant size={24} />
                </span>
                <span className="text-error font-bold font-body-sm text-body-sm animate-pulse">
                  High Priority
                </span>
              </div>
              <div>
                <h3 className="font-label-caps text-label-caps text-on-surface-variant opacity-70">
                  URGENT / STAT
                </h3>
                <p className="font-display-lg text-display-lg text-error mt-xs font-black">
                  {loading ? "..." : metrics.urgent}
                </p>
              </div>
            </div>
          </div>

          {/* Main Content Area: Test Queue */}
          <div className="glass-card custom-shadow rounded-xl overflow-hidden border border-outline-variant/30">
            <div className="p-md flex flex-col md:flex-row justify-between items-start md:items-center gap-md border-b border-outline-variant/20 bg-surface-container-low/50">
              <div>
                <h2 className="font-headline-md text-headline-md text-primary">
                  Active Laboratory Diagnostics
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Live tracking of clinical specimen processing stages connected to MongoDB.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-sm w-full md:w-auto">
                <div className="relative flex-grow md:flex-grow-0">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">
                    <MdSearch size={20} />
                  </span>
                  <input
                    className="w-full md:w-60 pl-10 pr-4 py-2 rounded-lg border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none text-body-sm"
                    placeholder="Search Patient, Test, Doctor..."
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>

                {/* Status Selector */}
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-sm py-2 rounded-lg border border-outline-variant bg-surface text-body-sm outline-none cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>

                {/* Priority Selector */}
                <select
                  value={priorityFilter}
                  onChange={(e) => {
                    setPriorityFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-sm py-2 rounded-lg border border-outline-variant bg-surface text-body-sm outline-none cursor-pointer"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="NORMAL">Normal</option>
                  <option value="URGENT">Urgent</option>
                  <option value="STAT">STAT</option>
                </select>

                <button
                  onClick={handleExportLabQueue}
                  className="cursor-pointer flex items-center gap-xs px-md py-2 border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container rounded-lg font-body-sm text-body-sm transition-all"
                  title="Download Laboratory Queue CSV"
                >
                  <MdFileDownload size={18} />
                  Export CSV
                </button>
              </div>
            </div>

            {error && (
              <div className="p-md bg-error-container/40 text-on-error-container text-body-sm border-b border-error/20 flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={() => setRefreshTrigger((k) => k + 1)}
                  className="underline hover:no-underline font-semibold cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-high/30">
                  <tr>
                    <th className="px-md py-3 font-label-caps text-label-caps text-on-surface-variant">
                      Patient Details
                    </th>
                    <th className="px-md py-3 font-label-caps text-label-caps text-on-surface-variant">
                      Diagnostic Test
                    </th>
                    <th className="px-md py-3 font-label-caps text-label-caps text-on-surface-variant">
                      Ordering Doctor
                    </th>
                    <th className="px-md py-3 font-label-caps text-label-caps text-on-surface-variant">
                      Priority
                    </th>
                    <th className="px-md py-3 font-label-caps text-label-caps text-on-surface-variant">
                      Status
                    </th>
                    <th className="px-md py-3 font-label-caps text-label-caps text-on-surface-variant text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-on-surface-variant">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <MdRefresh className="animate-spin text-primary" size={28} />
                          <p className="text-body-sm">Loading live diagnostic queue from MongoDB...</p>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-on-surface-variant">
                        No laboratory orders match your criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((record) => {
                      const isUrgent =
                        (record.priority || "").toUpperCase() === "URGENT" ||
                        (record.priority || "").toUpperCase() === "STAT";
                      const initials = (record.patientName || "PT")
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();

                      return (
                        <tr
                          key={record._id || record.orderId}
                          className="hover:bg-primary-fixed/10 transition-all duration-100"
                        >
                          <td className="px-md py-3">
                            <div className="flex items-center gap-sm">
                              <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center font-bold text-primary text-xs">
                                {initials}
                              </div>
                              <div>
                                <span className="font-body-md text-body-md text-on-surface font-semibold block">
                                  {record.patientName || "Unknown Patient"}
                                </span>
                                <span className="text-xs text-on-surface-variant">
                                  {record.patientId || record.orderId}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-md py-3">
                            <span className="font-body-md text-body-md font-medium text-on-surface">
                              {record.testName}
                            </span>
                            {record.category && (
                              <span className="block text-xs text-on-surface-variant">
                                {record.category}
                              </span>
                            )}
                          </td>
                          <td className="px-md py-3 font-body-md text-body-md text-on-surface-variant">
                            {record.doctorName || "Staff Physician"}
                          </td>
                          <td className="px-md py-3">
                            <span
                              className={`px-sm py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                isUrgent
                                  ? "bg-error-container text-on-error-container"
                                  : "bg-surface-variant text-on-surface-variant"
                              }`}
                            >
                              {record.priority || "NORMAL"}
                            </span>
                          </td>
                          <td className="px-md py-3">
                            <div className="flex items-center gap-xs">
                              {record.status === "Pending" && (
                                <>
                                  <span className="material-symbols-outlined text-outline text-sm">
                                    <MdColorize size={18} />
                                  </span>
                                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                                    Pending Collection
                                  </span>
                                </>
                              )}
                              {record.status === "In Progress" && (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                                  <span className="font-body-sm text-body-sm text-primary font-semibold">
                                    Processing
                                  </span>
                                </>
                              )}
                              {record.status === "Completed" && (
                                <>
                                  <span className="text-secondary text-sm">
                                    <MdCheckCircle size={18} />
                                  </span>
                                  <span className="font-body-sm text-body-sm text-secondary font-semibold">
                                    Result Ready
                                  </span>
                                </>
                              )}
                              {record.status === "Cancelled" && (
                                <span className="font-body-sm text-body-sm text-error font-semibold">
                                  Cancelled
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-md py-3 text-right">
                            <button
                              onClick={() => setSelectedOrder(record)}
                              className="px-sm py-1.5 bg-outline-variant/20 hover:bg-primary-container hover:text-on-primary-container rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1 cursor-pointer"
                            >
                              <MdVisibility size={14} />
                              Details
                            </button>
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
                Showing {filteredRecords.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{" "}
                {Math.min(currentPage * itemsPerPage, filteredRecords.length)} of {filteredRecords.length} records
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
        </main>
        <Footer />
      </div>

      {/* Lab Order Inspection Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container-highest max-w-240 w-full rounded-2xl p-6 shadow-2xl border border-outline-variant space-y-4">
            <div className="flex justify-between items-start border-b border-outline-variant/20 pb-3">
              <div>
                <h3 className="font-title-lg text-headline-sm font-bold text-primary">
                  Diagnostic Order Details
                </h3>
                <p className="text-xs text-on-surface-variant font-mono">
                  {selectedOrder.orderId || selectedOrder._id}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 hover:bg-surface-container rounded-lg text-on-surface-variant"
              >
                <MdClose size={22} />
              </button>
            </div>

            <div className="space-y-3 text-body-sm">
              <div className="grid grid-cols-2 gap-2 bg-surface-container-low p-3 rounded-xl border border-outline-variant/20">
                <div>
                  <span className="text-xs text-on-surface-variant block">Patient Name</span>
                  <span className="font-semibold text-on-surface">{selectedOrder.patientName || "N/A"}</span>
                </div>
                <div>
                  <span className="text-xs text-on-surface-variant block">Patient ID</span>
                  <span className="font-semibold text-on-surface">{selectedOrder.patientId || "N/A"}</span>
                </div>
                <div>
                  <span className="text-xs text-on-surface-variant block">Ordered Test</span>
                  <span className="font-semibold text-primary">{selectedOrder.testName || "N/A"}</span>
                </div>
                <div>
                  <span className="text-xs text-on-surface-variant block">Ordering Doctor</span>
                  <span className="font-semibold text-on-surface">{selectedOrder.doctorName || "N/A"}</span>
                </div>
                <div>
                  <span className="text-xs text-on-surface-variant block">Priority</span>
                  <span className="font-semibold text-on-surface">{selectedOrder.priority || "NORMAL"}</span>
                </div>
                <div>
                  <span className="text-xs text-on-surface-variant block">Current Status</span>
                  <span className="font-semibold text-secondary">{selectedOrder.status || "Pending"}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                  Clinical Findings / Results
                </span>
                <div className="bg-surface p-3 rounded-lg border border-outline-variant/20 text-xs text-on-surface min-h-[60px] whitespace-pre-wrap">
                  {selectedOrder.findings || "No preliminary findings entered yet."}
                </div>
              </div>

              {selectedOrder.createdAt && (
                <div className="text-xs text-on-surface-variant">
                  Created at: {new Date(selectedOrder.createdAt).toLocaleString()}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-outline-variant/20">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold hover:opacity-90 cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
