"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  AlertCircle,
  Save,
  Plus,
  ToggleLeft,
  ToggleRight,
  Check,
  Trash2,
  RefreshCw,
  Loader2,
} from "lucide-react";
import Sidebar from "@/components/Doctor_Sidebar";
import Footer from "@/components/Footer";

export default function Schedule() {
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Weekly hours state
  const [weeklySchedule, setWeeklySchedule] = useState([
    { day: "Monday", active: true, start: "09:00 AM", end: "05:00 PM", slotDuration: "30 mins" },
    { day: "Tuesday", active: true, start: "09:00 AM", end: "05:00 PM", slotDuration: "30 mins" },
    { day: "Wednesday", active: true, start: "09:00 AM", end: "01:00 PM", slotDuration: "30 mins" },
    { day: "Thursday", active: true, start: "09:00 AM", end: "05:00 PM", slotDuration: "30 mins" },
    { day: "Friday", active: true, start: "09:00 AM", end: "05:00 PM", slotDuration: "30 mins" },
    { day: "Saturday", active: false, start: "10:00 AM", end: "02:00 PM", slotDuration: "45 mins" },
    { day: "Sunday", active: false, start: "10:00 AM", end: "02:00 PM", slotDuration: "30 mins" },
  ]);

  // Leave periods list state
  const [leaves, setLeaves] = useState([]);

  // Leave Form inputs
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  // Global on-call status
  const [isOnCall, setIsOnCall] = useState(true);
  const [doctorName, setDoctorName] = useState("Doctor");

  useEffect(() => {
    let ignore = false;
    async function loadSchedule() {
      setLoading(true);
      setErrorMsg("");
      try {
        const res = await fetch("/api/doctor/schedule", {
          cache: "no-store",
          headers: { Pragma: "no-cache", "Cache-Control": "no-cache" },
        });
        if (!res.ok) throw new Error("Failed to load doctor schedule from MongoDB");
        const data = await res.json();
        if (!ignore) {
          if (data.weeklySchedule && data.weeklySchedule.length > 0) {
            setWeeklySchedule(data.weeklySchedule);
          }
          if (data.leaves) {
            setLeaves(data.leaves);
          }
          if (data.isOnCall !== undefined) {
            setIsOnCall(data.isOnCall);
          }
          if (data.doctorName) {
            setDoctorName(data.doctorName);
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error("Error loading doctor schedule:", err);
          setErrorMsg(err.message || "Failed to load consulting schedule");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadSchedule();
    return () => {
      ignore = true;
    };
  }, [refreshTrigger]);

  const handleToggleActive = (index) => {
    setWeeklySchedule((prev) =>
      prev.map((s, i) => (i === index ? { ...s, active: !s.active } : s))
    );
  };

  const handleTimeChange = (index, field, value) => {
    setWeeklySchedule((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    setSavingSchedule(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/doctor/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeklySchedule }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save weekly schedule");

      setSuccessMsg("Consulting hours and schedule slots saved to MongoDB successfully!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setErrorMsg(err.message || "Error saving schedule");
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleToggleOnCall = async () => {
    const nextState = !isOnCall;
    setIsOnCall(nextState);
    try {
      const res = await fetch("/api/doctor/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOnCall: nextState }),
      });
      if (!res.ok) {
        setIsOnCall(!nextState); // revert on failure
        throw new Error("Failed to update on-call status in database");
      }
      setSuccessMsg(
        nextState
          ? "On-Duty Emergency Call Status activated in MongoDB."
          : "Emergency Call Status set to Offline."
      );
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      setErrorMsg(err.message || "Failed to toggle on-call status");
    }
  };

  const handleRequestLeave = async (e) => {
    e.preventDefault();
    if (!leaveStart || !leaveEnd || !leaveReason) return;

    setSubmittingLeave(true);
    setErrorMsg("");
    try {
      const newLeave = {
        id: `LV-${Date.now()}`,
        startDate: leaveStart,
        endDate: leaveEnd,
        reason: leaveReason.trim(),
        status: "Pending Approval",
      };

      const updatedLeaves = [newLeave, ...leaves];

      const res = await fetch("/api/doctor/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaves: updatedLeaves }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record leave request");

      setLeaves(updatedLeaves);
      setLeaveStart("");
      setLeaveEnd("");
      setLeaveReason("");
      setSuccessMsg("Leave application recorded and saved to MongoDB successfully.");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setErrorMsg(err.message || "Error submitting leave");
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleCancelLeave = async (id) => {
    if (!confirm("Are you sure you want to retract this leave request?")) return;

    try {
      const updatedLeaves = leaves.filter((l) => l.id !== id);
      const res = await fetch("/api/doctor/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaves: updatedLeaves }),
      });
      if (!res.ok) throw new Error("Failed to update leaves");

      setLeaves(updatedLeaves);
      setSuccessMsg("Leave request retracted successfully from database.");
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      alert(err.message || "Error retracting leave");
    }
  };

  const timeOptions = [
    "08:00 AM",
    "08:30 AM",
    "09:00 AM",
    "09:30 AM",
    "10:00 AM",
    "10:30 AM",
    "11:00 AM",
    "11:30 AM",
    "12:00 PM",
    "12:30 PM",
    "01:00 PM",
    "01:30 PM",
    "02:00 PM",
    "02:30 PM",
    "03:00 PM",
    "03:30 PM",
    "04:00 PM",
    "04:30 PM",
    "05:00 PM",
    "05:30 PM",
    "06:00 PM",
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background p-margin no-scrollbar">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-md mb-lg">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
              Schedule Availability &amp; Leaves
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              Manage clinical consulting hours, configure appointment slot durations, and record leave periods for Dr. {doctorName}.
            </p>
          </div>
          <button
            onClick={() => setRefreshTrigger((k) => k + 1)}
            disabled={loading}
            className="cursor-pointer self-start sm:self-auto flex items-center gap-2 px-md py-2.5 rounded-xl border border-outline-variant bg-surface hover:bg-surface-container text-body-sm font-semibold text-on-surface transition-all"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            Reload Schedule
          </button>
        </header>

        {successMsg && (
          <div className="mb-lg p-md rounded-2xl bg-secondary-container text-on-secondary-container flex items-center gap-2 clinical-shadow font-semibold text-body-sm transition-all animate-bounce">
            <Check className="w-5 h-5 text-secondary" /> {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="mb-lg p-md rounded-2xl bg-error-container text-on-error-container flex items-center gap-2 font-semibold text-body-sm">
            <AlertCircle className="w-5 h-5 text-error" /> {errorMsg}
          </div>
        )}

        {/* Global On-Call Banner */}
        <div
          className={`p-md rounded-2xl mb-lg border flex flex-col md:flex-row justify-between items-center gap-sm clinical-shadow ${
            isOnCall
              ? "bg-secondary-container/30 border-secondary/20 text-on-secondary-container"
              : "bg-error-container/20 border-error/20 text-on-error-container"
          }`}
        >
          <div className="flex items-center gap-sm text-body-sm">
            <AlertCircle className={isOnCall ? "text-secondary" : "text-error"} size={24} />
            <div>
              <p className="font-bold">Active On-Duty Emergency Call Status (MongoDB)</p>
              <p className="text-[12px] opacity-80">
                {isOnCall
                  ? "You are marked as available for Emergency Call notifications inside the ICU/ER queue."
                  : "You are currently off-call. Emergency alerts will bypass you and reroute to on-duty specialists."}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleOnCall}
            className="cursor-pointer flex items-center gap-1.5 px-4 py-2 bg-surface rounded-xl text-body-sm font-bold border border-outline-variant/30 clinical-shadow transition-colors"
          >
            {isOnCall ? (
              <>
                Active On-Call <ToggleRight className="text-secondary w-6 h-6" />
              </>
            ) : (
              <>
                Offline <ToggleLeft className="text-outline w-6 h-6" />
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-12 gap-gutter mb-lg">
          {/* Consultation Hours Editor */}
          <div className="col-span-12 xl:col-span-7 glass-card p-margin rounded-[24px] clinical-shadow">
            <div className="flex justify-between items-center mb-md border-b border-outline-variant/20 pb-2">
              <h3 className="text-title-sm font-bold text-on-surface flex items-center gap-2">
                <Clock className="text-primary" /> Weekly Consulting Hours (MongoDB)
              </h3>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-sm">
              {weeklySchedule.map((slot, index) => (
                <div
                  key={slot.day}
                  className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors ${
                    slot.active
                      ? "bg-surface-container-lowest border-outline-variant/20"
                      : "bg-surface-container-high/30 border-outline-variant/10 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3 w-36">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(index)}
                      className="cursor-pointer text-primary focus:outline-none"
                    >
                      {slot.active ? (
                        <ToggleRight className="w-6 h-6 text-primary" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-outline" />
                      )}
                    </button>
                    <span
                      className={`font-bold text-body-sm ${
                        slot.active ? "text-on-surface" : "text-outline"
                      }`}
                    >
                      {slot.day}
                    </span>
                  </div>

                  {slot.active ? (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <select
                        value={slot.start}
                        onChange={(e) => handleTimeChange(index, "start", e.target.value)}
                        className="p-1.5 border border-outline-variant/40 rounded-lg bg-surface text-on-surface text-xs focus:outline-none cursor-pointer"
                      >
                        {timeOptions.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <span className="text-outline font-semibold">to</span>
                      <select
                        value={slot.end}
                        onChange={(e) => handleTimeChange(index, "end", e.target.value)}
                        className="p-1.5 border border-outline-variant/40 rounded-lg bg-surface text-on-surface text-xs focus:outline-none cursor-pointer"
                      >
                        {timeOptions.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <select
                        value={slot.slotDuration}
                        onChange={(e) => handleTimeChange(index, "slotDuration", e.target.value)}
                        className="p-1.5 border border-outline-variant/40 rounded-lg bg-surface text-on-surface text-xs focus:outline-none cursor-pointer"
                      >
                        <option value="15 mins">15 mins</option>
                        <option value="20 mins">20 mins</option>
                        <option value="30 mins">30 mins</option>
                        <option value="45 mins">45 mins</option>
                        <option value="60 mins">60 mins</option>
                      </select>
                    </div>
                  ) : (
                    <span className="text-xs text-outline font-semibold italic">
                      Off-duty / Unavailable
                    </span>
                  )}
                </div>
              ))}

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={savingSchedule}
                  className="cursor-pointer flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold clinical-shadow hover:opacity-90 disabled:opacity-50 transition-all text-body-sm"
                >
                  {savingSchedule ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} /> Save Weekly Schedule
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Leave & Absence Management */}
          <div className="col-span-12 xl:col-span-5 space-y-gutter">
            {/* Request Leave Form */}
            <div className="glass-card p-margin rounded-[24px] clinical-shadow">
              <h3 className="text-title-sm font-bold text-on-surface mb-md flex items-center gap-2">
                <Calendar className="text-primary" /> Request Leave / Absence
              </h3>

              <form onSubmit={handleRequestLeave} className="space-y-sm text-body-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                  <div>
                    <label className="block text-outline text-xs mb-1 font-semibold">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={leaveStart}
                      onChange={(e) => setLeaveStart(e.target.value)}
                      className="w-full p-2 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-outline text-xs mb-1 font-semibold">End Date *</label>
                    <input
                      type="date"
                      required
                      value={leaveEnd}
                      onChange={(e) => setLeaveEnd(e.target.value)}
                      className="w-full p-2 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-outline text-xs mb-1 font-semibold">Reason for Absence *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Annual Medical Conference, Personal Leave"
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingLeave}
                  className="cursor-pointer w-full flex items-center justify-center gap-2 py-2.5 bg-secondary text-on-secondary rounded-xl font-bold clinical-shadow hover:opacity-90 disabled:opacity-50 transition-all text-body-sm"
                >
                  {submittingLeave ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <Plus size={16} /> Request Leave (Awaiting Admin Approval)
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Leave History List */}
            <div className="glass-card p-margin rounded-[24px] clinical-shadow">
              <h4 className="text-title-sm font-bold text-on-surface mb-sm">
                Recorded Leave Periods ({leaves.length})
              </h4>
              <div className="space-y-sm max-h-[220px] overflow-y-auto sidebar-scroll pr-1">
                {leaves.length > 0 ? (
                  leaves.map((l) => (
                    <div
                      key={l.id}
                      className="p-3 bg-surface-container-low border border-outline-variant/10 rounded-xl flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <p className="font-bold text-on-surface">{l.reason}</p>
                        <p className="text-outline">
                          {l.startDate} &rarr; {l.endDate}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            l.status === 'Approved'
                              ? 'bg-secondary-container text-on-secondary-container'
                              : l.status === 'Rejected'
                              ? 'bg-error-container text-on-error-container'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {l.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCancelLeave(l.id)}
                          className="cursor-pointer p-1 text-error hover:bg-error-container/20 rounded-lg transition-colors"
                          title="Retract Leave"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-outline italic py-4 text-center">
                    No active or pending leave periods recorded.
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
