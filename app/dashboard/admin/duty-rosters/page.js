"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Sidebar from "@/components/Admin_Sidebar";
import Footer from "@/components/Footer";
import {
  MdAdd,
  MdFilterList,
  MdSearch,
  MdRefresh,
  MdFileDownload,
  MdDeleteOutline,
  MdClose,
  MdCheckCircle,
  MdSchedule,
  MdWbSunny,
  MdNightsStay,
  MdAccessTime,
  MdEventBusy,
} from "react-icons/md";
import { exportToCsv } from "@/lib/csvExport";

const DEPARTMENTS = [
  "All Departments",
  "Cardiology",
  "Emergency",
  "Pediatrics",
  "General Surgery",
  "Pathology",
  "Pharmacy",
  "Radiology",
  "Orthopedics",
  "Administration",
];

const SHIFT_TIMES = {
  Morning: { start: "08:00", end: "16:00" },
  Evening: { start: "16:00", end: "00:00" },
  Night: { start: "00:00", end: "08:00" },
  General: { start: "09:00", end: "17:00" },
  Off: { start: "00:00", end: "00:00" },
};

export default function DutyRosters() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState("rosters"); // 'rosters' | 'leaves'
  const [dutyRosters, setDutyRosters] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [doctorLeaves, setDoctorLeaves] = useState([]);
  const [leavesFilter, setLeavesFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("All Departments");
  const [selectedShift, setSelectedShift] = useState("ALL");
  const [selectedDate, setSelectedDate] = useState("");

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [modalForm, setModalForm] = useState({
    staffId: "",
    staffName: "",
    role: "Doctor",
    department: "Cardiology",
    shift: "Morning",
    date: new Date().toISOString().split("T")[0],
    startTime: "08:00",
    endTime: "16:00",
    notes: "",
  });

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [rostersRes, staffRes, leavesRes] = await Promise.all([
          fetch("/api/admin/duty-rosters", {
            cache: "no-store",
            headers: {
              Pragma: "no-cache",
              "Cache-Control": "no-cache",
            },
          }),
          fetch("/api/admin/staff", { cache: "no-store" }),
          fetch("/api/admin/leaves", { cache: "no-store" }),
        ]);

        if (rostersRes.ok) {
          const data = await rostersRes.json();
          if (!ignore) {
            setDutyRosters(data.dutyRosters || data.rosters || []);
          }
        }
        if (staffRes.ok) {
          const staffData = await staffRes.json();
          if (!ignore) {
            setStaffList(staffData.staff || []);
          }
        }
        if (leavesRes.ok) {
          const leavesData = await leavesRes.json();
          if (!ignore) {
            setDoctorLeaves(leavesData.leaves || []);
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error(err);
          setError(err.message || "Failed to fetch duty rosters and leaves");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [refreshTrigger]);

  const handleReviewLeave = async (doctorId, leaveId, status) => {
    try {
      const res = await fetch("/api/admin/leaves", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId, leaveId, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update leave status");
      if (data.conflictCount > 0) {
        setActionSuccess(`Doctor leave request marked as ${status}! Warning: ${data.conflictCount} scheduled appointment(s) were flagged as "Reschedule Required".`);
      } else {
        setActionSuccess(`Doctor leave request marked as ${status}!`);
      }
      setTimeout(() => setActionSuccess(""), 6000);
      setRefreshTrigger((k) => k + 1);
    } catch (err) {
      alert(err.message || "Error reviewing leave request");
    }
  };

  // Handle staff selection in modal
  const handleStaffSelect = (staffId) => {
    const found = staffList.find((s) => s._id === staffId);
    if (found) {
      setModalForm((prev) => ({
        ...prev,
        staffId: found._id,
        staffName: found.name,
        role: found.role ? found.role.charAt(0).toUpperCase() + found.role.slice(1) : "Staff",
        department: found.department || "General Surgery",
      }));
    } else {
      setModalForm((prev) => ({
        ...prev,
        staffId: "",
        staffName: "",
      }));
    }
  };

  const handleShiftSelect = (shift) => {
    const times = SHIFT_TIMES[shift] || { start: "09:00", end: "17:00" };
    setModalForm((prev) => ({
      ...prev,
      shift,
      startTime: times.start,
      endTime: times.end,
    }));
  };

  // Create Shift Assignment
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!modalForm.staffName || !modalForm.date) {
      alert("Please select staff and assign a date.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/duty-rosters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modalForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign duty");

      setActionSuccess(`Duty successfully assigned to ${modalForm.staffName}!`);
      setTimeout(() => setActionSuccess(""), 3500);
      setIsAddModalOpen(false);
      setModalForm({
        staffId: "",
        staffName: "",
        role: "Doctor",
        department: "Cardiology",
        shift: "Morning",
        date: new Date().toISOString().split("T")[0],
        startTime: "08:00",
        endTime: "16:00",
        notes: "",
      });
      setRefreshTrigger((k) => k + 1);
    } catch (err) {
      alert(err.message || "Failed to create duty assignment");
    } finally {
      setSubmitting(false);
    }
  };

  // Status Toggle
  const handleStatusChange = async (id, status) => {
    try {
      const res = await fetch(`/api/admin/duty-rosters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setDutyRosters((prev) =>
        prev.map((r) => (r._id === id ? { ...r, status } : r))
      );
    } catch (err) {
      alert(err.message || "Error updating shift status");
    }
  };

  // Delete Shift
  const handleDeleteShift = async (id, name) => {
    if (!confirm(`Are you sure you want to remove duty shift for ${name}?`)) return;
    try {
      const res = await fetch(`/api/admin/duty-rosters/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete shift");
      setDutyRosters((prev) => prev.filter((r) => r._id !== id));
      setActionSuccess("Shift entry deleted successfully.");
      setTimeout(() => setActionSuccess(""), 3000);
    } catch (err) {
      alert(err.message || "Error deleting shift");
    }
  };

  // Filtered Roster
  const filteredRosters = useMemo(() => {
    return dutyRosters.filter((roster) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (roster.staffName || "").toLowerCase().includes(q) ||
        (roster.role || "").toLowerCase().includes(q) ||
        (roster.department || "").toLowerCase().includes(q) ||
        (roster.notes || "").toLowerCase().includes(q);

      const matchesDept =
        selectedDept === "All Departments" ||
        roster.department?.toLowerCase() === selectedDept.toLowerCase();

      const matchesShift =
        selectedShift === "ALL" ||
        roster.shift?.toLowerCase() === selectedShift.toLowerCase();

      const matchesDate =
        !selectedDate || roster.date === selectedDate;

      return matchesSearch && matchesDept && matchesShift && matchesDate;
    });
  }, [dutyRosters, searchQuery, selectedDept, selectedShift, selectedDate]);

  // KPI calculations
  const kpis = useMemo(() => {
    let morning = 0;
    let evening = 0;
    let night = 0;
    let leave = 0;

    for (const r of dutyRosters) {
      if (r.shift === "Morning") morning++;
      else if (r.shift === "Evening") evening++;
      else if (r.shift === "Night") night++;
      if (r.status === "Leave" || r.shift === "Off") leave++;
    }
    return { morning, evening, night, leave };
  }, [dutyRosters]);

  const pendingLeavesCount = useMemo(() => {
    return doctorLeaves.filter((l) => l.status === "Pending Approval").length;
  }, [doctorLeaves]);

  const leaveKpis = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    for (const l of doctorLeaves) {
      if (l.status === "Pending Approval") pending++;
      else if (l.status === "Approved") approved++;
      else if (l.status === "Rejected") rejected++;
    }
    return { pending, approved, rejected, total: doctorLeaves.length };
  }, [doctorLeaves]);

  const filteredLeaves = useMemo(() => {
    return doctorLeaves.filter((l) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (l.doctorName || "").toLowerCase().includes(q) ||
        (l.department || "").toLowerCase().includes(q) ||
        (l.reason || "").toLowerCase().includes(q);

      const matchesStatus =
        leavesFilter === "ALL" || l.status?.toLowerCase() === leavesFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [doctorLeaves, searchQuery, leavesFilter]);

  // CSV Export
  const handleExportCSV = () => {
    const columns = [
      { key: "staffName", label: "Staff Name" },
      { key: "role", label: "Designation" },
      { key: "department", label: "Department" },
      { key: "shift", label: "Shift Type" },
      { key: "date", label: "Assigned Date" },
      { key: "startTime", label: "Start Time" },
      { key: "endTime", label: "End Time" },
      { key: "status", label: "Status" },
      { key: "notes", label: "Shift Notes" },
    ];
    exportToCsv("hospital_duty_rosters.csv", columns, filteredRosters);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 overflow-y-auto no-scrollbar">
        <div className="p-margin space-y-md">
          {/* Header Section */}
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
                  Hospital Duty Rosters
                </h1>
                <p className="text-on-surface-variant font-body-sm">
                  Active personnel shift assignments and departmental scheduling across all medical wings.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-sm items-center">
              <button
                onClick={() => setRefreshTrigger((k) => k + 1)}
                disabled={loading}
                className="cursor-pointer px-md py-2.5 bg-surface-container border border-outline-variant text-on-surface font-semibold rounded-lg flex items-center gap-2 hover:bg-surface-container-high transition-all text-xs"
              >
                <MdRefresh size={18} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
              <button
                onClick={handleExportCSV}
                className="cursor-pointer px-md py-2.5 bg-surface-container border border-outline-variant text-on-surface font-semibold rounded-lg flex items-center gap-2 hover:bg-surface-container-high transition-all text-xs"
              >
                <MdFileDownload size={18} />
                Export CSV
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="cursor-pointer px-md py-2.5 bg-primary text-on-primary font-bold rounded-lg flex items-center gap-2 shadow-md hover:opacity-90 active:scale-95 transition-all text-xs"
              >
                <MdAdd size={20} />
                Assign Shift
              </button>
            </div>
          </div>

          {actionSuccess && (
            <div className="p-md rounded-xl bg-secondary-container text-on-secondary-container flex items-center gap-2 font-semibold text-body-sm shadow-sm">
              <MdCheckCircle size={20} className="text-secondary" />
              {actionSuccess}
            </div>
          )}

          {/* Primary Tab Switcher */}
          <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-3">
            <button
              onClick={() => setActiveMainTab("rosters")}
              className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeMainTab === "rosters"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "bg-surface-container text-on-surface hover:bg-surface-container-high"
              }`}
            >
              <MdSchedule size={18} /> Shift Rosters & Schedule ({dutyRosters.length})
            </button>
            <button
              onClick={() => setActiveMainTab("leaves")}
              className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeMainTab === "leaves"
                  ? "bg-primary text-on-primary shadow-sm"
                  : "bg-surface-container text-on-surface hover:bg-surface-container-high"
              }`}
            >
              <MdEventBusy size={18} /> Doctor Leave Approvals
              {pendingLeavesCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-error text-white animate-pulse">
                  {pendingLeavesCount} Pending
                </span>
              )}
            </button>
          </div>

          {activeMainTab === "leaves" ? (
            <div className="space-y-md animate-fade-in">
              {/* Leave Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
                <div className="glass-card p-md rounded-xl shadow-sm border-l-4 border-amber-500 flex items-center justify-between">
                  <div>
                    <span className="font-label-caps text-label-caps text-on-surface-variant block">PENDING REVIEW</span>
                    <span className="font-display-lg text-display-lg text-amber-600 font-black mt-1 block">
                      {leaveKpis.pending}
                    </span>
                    <span className="text-xs text-on-surface-variant">Awaiting approval</span>
                  </div>
                  <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                    <MdSchedule size={28} />
                  </div>
                </div>

                <div className="glass-card p-md rounded-xl shadow-sm border-l-4 border-green-500 flex items-center justify-between">
                  <div>
                    <span className="font-label-caps text-label-caps text-on-surface-variant block">APPROVED LEAVES</span>
                    <span className="font-display-lg text-display-lg text-green-600 font-black mt-1 block">
                      {leaveKpis.approved}
                    </span>
                    <span className="text-xs text-on-surface-variant">Active scheduled leaves</span>
                  </div>
                  <div className="p-3 bg-green-100 text-green-600 rounded-xl">
                    <MdCheckCircle size={28} />
                  </div>
                </div>

                <div className="glass-card p-md rounded-xl shadow-sm border-l-4 border-red-500 flex items-center justify-between">
                  <div>
                    <span className="font-label-caps text-label-caps text-on-surface-variant block">REJECTED LEAVES</span>
                    <span className="font-display-lg text-display-lg text-red-600 font-black mt-1 block">
                      {leaveKpis.rejected}
                    </span>
                    <span className="text-xs text-on-surface-variant">Declined applications</span>
                  </div>
                  <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                    <MdEventBusy size={28} />
                  </div>
                </div>

                <div className="glass-card p-md rounded-xl shadow-sm border-l-4 border-primary flex items-center justify-between">
                  <div>
                    <span className="font-label-caps text-label-caps text-on-surface-variant block">TOTAL RECORDED</span>
                    <span className="font-display-lg text-display-lg text-primary font-black mt-1 block">
                      {leaveKpis.total}
                    </span>
                    <span className="text-xs text-on-surface-variant">Across medical roster</span>
                  </div>
                  <div className="p-3 bg-primary-fixed text-primary rounded-xl">
                    <MdFilterList size={28} />
                  </div>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="glass-card p-md rounded-xl shadow-sm flex flex-col md:flex-row gap-md items-center justify-between">
                <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
                  {["ALL", "Pending Approval", "Approved", "Rejected"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setLeavesFilter(st)}
                      className={`cursor-pointer px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        leavesFilter === st
                          ? "bg-primary text-on-primary shadow-xs"
                          : "bg-surface-container hover:bg-surface-container-high text-on-surface"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
                <div className="relative w-full md:w-80">
                  <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
                  <input
                    type="text"
                    placeholder="Search by doctor or reason..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-surface border border-outline-variant rounded-lg text-xs outline-none"
                  />
                </div>
              </div>

              {/* Leaves Cards Grid */}
              <div className="space-y-sm">
                {filteredLeaves.length > 0 ? (
                  filteredLeaves.map((leave) => (
                    <div
                      key={leave.id}
                      className="glass-card p-md rounded-2xl border border-outline-variant/20 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-on-surface text-body-md">{leave.doctorName}</h4>
                          <span className="text-[11px] font-semibold text-outline px-2 py-0.5 bg-surface-container rounded-md">
                            {leave.department} • {leave.specialization}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              leave.status === "Approved"
                                ? "bg-secondary-container text-on-secondary-container"
                                : leave.status === "Rejected"
                                ? "bg-error-container text-on-error-container"
                                : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {leave.status}
                          </span>
                        </div>
                        <p className="text-body-sm text-on-surface-variant font-medium">
                          Reason: <strong className="text-on-surface">{leave.reason}</strong>
                        </p>
                        <p className="text-xs text-outline font-mono">
                          Duration: {leave.startDate} &rarr; {leave.endDate}
                          {leave.doctorPhone && ` • Phone: ${leave.doctorPhone}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-start md:self-auto">
                        {leave.status === "Pending Approval" ? (
                          <>
                            <button
                              onClick={() => handleReviewLeave(leave.doctorId, leave.id, "Approved")}
                              className="cursor-pointer px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold shadow-sm hover:opacity-90 transition-all flex items-center gap-1"
                            >
                              <MdCheckCircle size={16} /> Approve Leave
                            </button>
                            <button
                              onClick={() => handleReviewLeave(leave.doctorId, leave.id, "Rejected")}
                              className="cursor-pointer px-4 py-2 bg-error text-white rounded-xl text-xs font-bold shadow-sm hover:opacity-90 transition-all flex items-center gap-1"
                            >
                              <MdClose size={16} /> Reject Leave
                            </button>
                          </>
                        ) : leave.status === "Approved" ? (
                          <button
                            onClick={() => handleReviewLeave(leave.doctorId, leave.id, "Rejected")}
                            className="cursor-pointer px-3 py-1.5 border border-error/30 text-error hover:bg-error-container/20 rounded-xl text-xs font-bold transition-all"
                          >
                            Revoke Approval
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReviewLeave(leave.doctorId, leave.id, "Approved")}
                            className="cursor-pointer px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white rounded-xl text-xs font-bold transition-all"
                          >
                            Re-Approve Leave
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="glass-card p-12 text-center text-outline">
                    <MdEventBusy size={36} className="mx-auto mb-2 text-outline-variant" />
                    <p className="font-semibold text-body-sm">No doctor leave requests matching filter.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Shift Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
            <div className="glass-card p-md rounded-xl shadow-sm border-l-4 border-amber-500 flex items-center justify-between">
              <div>
                <span className="font-label-caps text-label-caps text-on-surface-variant block">MORNING SHIFTS</span>
                <span className="font-display-lg text-display-lg text-on-surface font-black mt-1 block">
                  {kpis.morning}
                </span>
                <span className="text-xs text-on-surface-variant">08:00 - 16:00</span>
              </div>
              <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                <MdWbSunny size={28} />
              </div>
            </div>

            <div className="glass-card p-md rounded-xl shadow-sm border-l-4 border-blue-500 flex items-center justify-between">
              <div>
                <span className="font-label-caps text-label-caps text-on-surface-variant block">EVENING SHIFTS</span>
                <span className="font-display-lg text-display-lg text-on-surface font-black mt-1 block">
                  {kpis.evening}
                </span>
                <span className="text-xs text-on-surface-variant">16:00 - 00:00</span>
              </div>
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                <MdAccessTime size={28} />
              </div>
            </div>

            <div className="glass-card p-md rounded-xl shadow-sm border-l-4 border-indigo-600 flex items-center justify-between">
              <div>
                <span className="font-label-caps text-label-caps text-on-surface-variant block">NIGHT SHIFTS</span>
                <span className="font-display-lg text-display-lg text-on-surface font-black mt-1 block">
                  {kpis.night}
                </span>
                <span className="text-xs text-on-surface-variant">00:00 - 08:00</span>
              </div>
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                <MdNightsStay size={28} />
              </div>
            </div>

            <div className="glass-card p-md rounded-xl shadow-sm border-l-4 border-error flex items-center justify-between">
              <div>
                <span className="font-label-caps text-label-caps text-on-surface-variant block">LEAVE / OFF</span>
                <span className="font-display-lg text-display-lg text-error font-black mt-1 block">
                  {kpis.leave}
                </span>
                <span className="text-xs text-on-surface-variant">Off-duty / Leaves</span>
              </div>
              <div className="p-3 bg-error-container text-error rounded-xl">
                <MdEventBusy size={28} />
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="glass-card p-md rounded-xl border border-outline-variant/30 flex flex-wrap gap-sm items-center justify-between">
            <div className="flex flex-wrap items-center gap-sm flex-grow">
              <div className="relative min-w-[220px]">
                <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={20} />
                <input
                  type="text"
                  placeholder="Search staff, role, notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-surface rounded-lg border border-outline-variant text-body-sm outline-none focus:border-primary"
                />
              </div>

              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="px-sm py-2 rounded-lg border border-outline-variant bg-surface text-body-sm outline-none cursor-pointer"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>

              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                className="px-sm py-2 rounded-lg border border-outline-variant bg-surface text-body-sm outline-none cursor-pointer"
              >
                <option value="ALL">All Shifts</option>
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
                <option value="Night">Night</option>
                <option value="General">General</option>
                <option value="Off">Off</option>
              </select>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-sm py-2 rounded-lg border border-outline-variant bg-surface text-body-sm outline-none cursor-pointer"
                title="Filter by assigned date"
              />

              {selectedDate && (
                <button
                  onClick={() => setSelectedDate("")}
                  className="text-xs text-error hover:underline cursor-pointer"
                >
                  Clear Date
                </button>
              )}
            </div>

            <div className="text-xs font-semibold text-on-surface-variant">
              Showing {filteredRosters.length} of {dutyRosters.length} Shifts
            </div>
          </div>

          {/* Rosters Table */}
          <div className="glass-card rounded-xl border border-outline-variant/30 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-high/40">
                  <tr>
                    <th className="px-md py-3 font-label-caps text-label-caps text-on-surface-variant">Staff Member</th>
                    <th className="px-md py-3 font-label-caps text-label-caps text-on-surface-variant">Department</th>
                    <th className="px-md py-3 font-label-caps text-label-caps text-on-surface-variant">Assigned Shift</th>
                    <th className="px-md py-3 font-label-caps text-label-caps text-on-surface-variant">Date &amp; Hours</th>
                    <th className="px-md py-3 font-label-caps text-label-caps text-on-surface-variant">Status</th>
                    <th className="px-md py-3 font-label-caps text-label-caps text-on-surface-variant">Notes</th>
                    <th className="px-md py-3 font-label-caps text-label-caps text-on-surface-variant text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 text-body-sm">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="text-center py-12 text-on-surface-variant">
                        <MdRefresh className="animate-spin inline-block text-primary mb-2" size={28} />
                        <p>Loading duty rosters from database...</p>
                      </td>
                    </tr>
                  ) : filteredRosters.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-12 text-on-surface-variant">
                        No shift assignments match your criteria. Click &quot;Assign Shift&quot; to create one.
                      </td>
                    </tr>
                  ) : (
                    filteredRosters.map((roster) => {
                      let badgeBg = "bg-primary-container text-on-primary-container";
                      if (roster.shift === "Morning") badgeBg = "bg-amber-100 text-amber-800";
                      else if (roster.shift === "Evening") badgeBg = "bg-blue-100 text-blue-800";
                      else if (roster.shift === "Night") badgeBg = "bg-indigo-100 text-indigo-800";
                      else if (roster.shift === "Off") badgeBg = "bg-gray-100 text-gray-700";

                      return (
                        <tr key={roster._id} className="hover:bg-primary-fixed/10 transition-all">
                          <td className="px-md py-3">
                            <span className="font-semibold text-on-surface block">{roster.staffName}</span>
                            <span className="text-xs text-on-surface-variant">{roster.role}</span>
                          </td>
                          <td className="px-md py-3 font-medium text-on-surface">
                            {roster.department}
                          </td>
                          <td className="px-md py-3">
                            <span className={`px-sm py-1 rounded-full text-xs font-bold uppercase tracking-wider ${badgeBg}`}>
                              {roster.shift}
                            </span>
                          </td>
                          <td className="px-md py-3">
                            <span className="font-mono text-xs text-on-surface block">{roster.date}</span>
                            <span className="text-xs text-on-surface-variant">
                              {roster.startTime} - {roster.endTime}
                            </span>
                          </td>
                          <td className="px-md py-3">
                            <select
                              value={roster.status || "Active"}
                              onChange={(e) => handleStatusChange(roster._id, e.target.value)}
                              className="text-xs font-semibold px-2 py-1 rounded border border-outline-variant bg-surface outline-none cursor-pointer"
                            >
                              <option value="Active">Active</option>
                              <option value="Completed">Completed</option>
                              <option value="Cancelled">Cancelled</option>
                              <option value="Leave">Leave</option>
                            </select>
                          </td>
                          <td className="px-md py-3 text-xs text-on-surface-variant max-w-50 truncate">
                            {roster.notes || "—"}
                          </td>
                          <td className="px-md py-3 text-right">
                            <button
                              onClick={() => handleDeleteShift(roster._id, roster.staffName)}
                              className="p-1.5 text-error hover:bg-error-container/20 rounded-lg transition-all cursor-pointer"
                              title="Delete Shift Entry"
                            >
                              <MdDeleteOutline size={18} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
    <Footer />
      </main>

      {/* Assign Shift Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container-highest max-w-240 w-full rounded-2xl p-6 shadow-2xl border border-outline-variant space-y-4">
            <div className="flex justify-between items-center border-b border-outline-variant/20 pb-3">
              <div>
                <h3 className="font-title-lg text-headline-sm font-bold text-primary">
                  Assign Personnel Shift
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Schedule staff duty time and associate department.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 hover:bg-surface-container rounded-lg text-on-surface-variant cursor-pointer"
              >
                <MdClose size={22} />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-3 text-body-sm">
              <div>
                <label className="text-xs font-bold text-on-surface block mb-1">
                  Select Staff Member *
                </label>
                {staffList.length > 0 ? (
                  <select
                    required
                    value={modalForm.staffId}
                    onChange={(e) => handleStaffSelect(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-body-sm outline-none cursor-pointer"
                  >
                    <option value="">-- Choose Staff Member --</option>
                    {staffList.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.role ? s.role.toUpperCase() : "STAFF"} - {s.department || "General"})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="Enter Staff Name"
                    value={modalForm.staffName}
                    onChange={(e) => setModalForm({ ...modalForm, staffName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-body-sm outline-none"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1">
                    Designation / Role
                  </label>
                  <input
                    type="text"
                    value={modalForm.role}
                    onChange={(e) => setModalForm({ ...modalForm, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-body-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1">
                    Department
                  </label>
                  <select
                    value={modalForm.department}
                    onChange={(e) => setModalForm({ ...modalForm, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-body-sm outline-none cursor-pointer"
                  >
                    {DEPARTMENTS.filter((d) => d !== "All Departments").map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1">
                    Shift Type
                  </label>
                  <select
                    value={modalForm.shift}
                    onChange={(e) => handleShiftSelect(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-body-sm outline-none cursor-pointer"
                  >
                    <option value="Morning">Morning (08:00 - 16:00)</option>
                    <option value="Evening">Evening (16:00 - 00:00)</option>
                    <option value="Night">Night (00:00 - 08:00)</option>
                    <option value="General">General (09:00 - 17:00)</option>
                    <option value="Off">Scheduled Off</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={modalForm.date}
                    onChange={(e) => setModalForm({ ...modalForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-body-sm outline-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1">
                    Start Time
                  </label>
                  <input
                    type="text"
                    value={modalForm.startTime}
                    onChange={(e) => setModalForm({ ...modalForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-body-sm outline-none"
                    placeholder="HH:MM"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface block mb-1">
                    End Time
                  </label>
                  <input
                    type="text"
                    value={modalForm.endTime}
                    onChange={(e) => setModalForm({ ...modalForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-body-sm outline-none"
                    placeholder="HH:MM"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-on-surface block mb-1">
                  Shift Notes / Handover Instructions
                </label>
                <textarea
                  rows="2"
                  value={modalForm.notes}
                  onChange={(e) => setModalForm({ ...modalForm, notes: e.target.value })}
                  placeholder="e.g. Lead surgical ward round at 10 AM, ICU primary on-call..."
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface text-body-sm outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-outline-variant rounded-lg text-xs font-semibold hover:bg-surface-container cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Saving..." : "Save Shift Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
