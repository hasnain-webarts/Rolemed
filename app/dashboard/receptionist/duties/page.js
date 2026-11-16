"use client";

import { useState, useEffect } from "react";
import {
  Search,
  CalendarDays,
  Plus,
  Clock,
  MapPin,
  Trash2,
  Check,
  RefreshCw,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Sidebar from "@/components/Receptionist_Sidebar";
import Footer from "@/components/Footer";

export default function ReceptionistDuties() {
  const [searchQuery, setSearchQuery] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Form State
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [selectedStaffName, setSelectedStaffName] = useState("");
  const [selectedRole, setSelectedRole] = useState("Staff");
  const [location, setLocation] = useState("Emergency Desk (ER)");
  const [shiftDate, setShiftDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [shiftType, setShiftType] = useState("Morning (08:00 - 16:00)");

  // Live data states
  const [staffPool, setStaffPool] = useState([]);
  const [roster, setRoster] = useState([]);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      setLoading(true);
      setErrorMsg("");
      try {
        const [staffRes, rosterRes] = await Promise.all([
          fetch("/api/staff?limit=200", {
            cache: "no-store",
            headers: { Pragma: "no-cache", "Cache-Control": "no-cache" },
          }),
          fetch("/api/admin/duty-rosters", {
            cache: "no-store",
            headers: { Pragma: "no-cache", "Cache-Control": "no-cache" },
          }),
        ]);

        if (staffRes.ok) {
          const staffData = await staffRes.json();
          if (!ignore && staffData.staff) {
            setStaffPool(staffData.staff);
          }
        }

        if (rosterRes.ok) {
          const rosterData = await rosterRes.json();
          if (!ignore) {
            setRoster(rosterData.dutyRosters || rosterData.rosters || []);
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error("Error loading duty rosters data:", err);
          setErrorMsg("Failed to load live staff and duty rosters from database.");
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

  const handleStaffChange = (staffId) => {
    setSelectedStaffId(staffId);
    const staff = staffPool.find((s) => s._id === staffId);
    if (staff) {
      setSelectedStaffName(staff.name);
      setSelectedRole(
        staff.role ? staff.role.charAt(0).toUpperCase() + staff.role.slice(1) : "Staff"
      );
      if (staff.department) {
        setLocation(staff.department);
      }
    } else {
      setSelectedStaffName("");
      setSelectedRole("Staff");
    }
  };

  const handleAssignDuty = async (e) => {
    e.preventDefault();
    if (!selectedStaffId || !shiftDate || !shiftType) {
      alert("Please select a staff member and duty date.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/duty-rosters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: selectedStaffId,
          staffName: selectedStaffName,
          role: selectedRole,
          department: location,
          shift: shiftType,
          date: shiftDate,
          status: "Active",
          notes: `Assigned via Receptionist Floor Command to ${location}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign duty shift");

      setSuccessMsg(`Duty shift scheduled successfully for ${selectedStaffName}!`);
      setTimeout(() => setSuccessMsg(""), 4000);

      // Reset form
      setSelectedStaffId("");
      setSelectedStaffName("");
      setSelectedRole("Staff");
      setLocation("Emergency Desk (ER)");
      setShiftDate(new Date().toISOString().split("T")[0]);
      setShiftType("Morning (08:00 - 16:00)");

      // Trigger reload
      setRefreshTrigger((k) => k + 1);
    } catch (err) {
      setErrorMsg(err.message || "Failed to schedule duty shift assignment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeDuty = async (id, staffName) => {
    if (!confirm(`Are you sure you want to revoke the duty shift assignment for ${staffName}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/duty-rosters/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to revoke duty shift");

      setSuccessMsg(`Duty shift for ${staffName} has been revoked.`);
      setTimeout(() => setSuccessMsg(""), 3500);
      setRefreshTrigger((k) => k + 1);
    } catch (err) {
      alert(err.message || "Error revoking shift");
    }
  };

  const filteredRoster = roster.filter((r) => {
    const q = searchQuery.toLowerCase();
    const nameMatch = (r.staffName || "").toLowerCase().includes(q);
    const locMatch = (r.department || "").toLowerCase().includes(q);
    const roleMatch = (r.role || "").toLowerCase().includes(q);
    const shiftMatch = (r.shift || "").toLowerCase().includes(q);
    const dateMatch = (r.date || "").toLowerCase().includes(q);
    return nameMatch || locMatch || roleMatch || shiftMatch || dateMatch;
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background p-margin no-scrollbar">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-md mb-lg">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
              Staff Duty Rosters
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              Live hospital personnel shift assignments, departmental floor coverage, and schedule coordination.
            </p>
          </div>
          <button
            onClick={() => setRefreshTrigger((k) => k + 1)}
            disabled={loading}
            className="cursor-pointer self-start sm:self-auto flex items-center gap-2 px-md py-2.5 rounded-xl border border-outline-variant bg-surface hover:bg-surface-container text-body-sm font-semibold text-on-surface transition-all"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            Live Sync
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

        <div className="grid grid-cols-12 gap-gutter mb-lg">
          {/* Assign Duty Form */}
          <div className="col-span-12 xl:col-span-5 glass-card p-margin rounded-[24px] clinical-shadow">
            <h3 className="text-title-sm font-bold text-on-surface mb-md flex items-center gap-2">
              <CalendarDays className="text-primary" /> Assign Shift Assignment
            </h3>

            <form onSubmit={handleAssignDuty} className="space-y-md text-body-sm">
              <div>
                <label className="block text-outline mb-1 font-semibold">
                  Select Staff Member *
                </label>
                <select
                  required
                  value={selectedStaffId}
                  onChange={(e) => handleStaffChange(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">-- Choose Hospital Staff Member --</option>
                  {staffPool.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.role ? s.role.toUpperCase() : "STAFF"} - {s.department || "General"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-outline mb-1 font-semibold">Staff Duty Role</label>
                <input
                  type="text"
                  disabled
                  value={selectedRole}
                  className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-high/40 text-body-sm text-outline font-semibold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-outline mb-1 font-semibold">
                  Shift Location / Department *
                </label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="Emergency Desk (ER)">Emergency Desk (ER)</option>
                  <option value="Main Reception Desk">Main Reception Desk</option>
                  <option value="ICU Critical Care">ICU Critical Care</option>
                  <option value="General Ward A">General Ward A</option>
                  <option value="General Ward B">General Ward B</option>
                  <option value="Outpatient Consultation (OPD)">Outpatient Clinic (OPD)</option>
                  <option value="Diagnostic Laboratory">Diagnostic Laboratory</option>
                  <option value="Central Pharmacy">Central Pharmacy</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                <div>
                  <label className="block text-outline mb-1 font-semibold">Duty Date *</label>
                  <input
                    type="date"
                    required
                    value={shiftDate}
                    onChange={(e) => setShiftDate(e.target.value)}
                    className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-outline mb-1 font-semibold">Shift Schedule Type *</label>
                  <select
                    value={shiftType}
                    onChange={(e) => setShiftType(e.target.value)}
                    className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="Morning (08:00 - 16:00)">Morning (08:00 - 16:00)</option>
                    <option value="Evening (16:00 - 00:00)">Evening (16:00 - 00:00)</option>
                    <option value="Night (00:00 - 08:00)">Night (00:00 - 08:00)</option>
                    <option value="Off">Scheduled Off</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="cursor-pointer w-full flex items-center justify-center gap-2 py-3 bg-primary text-on-primary rounded-xl font-bold clinical-shadow hover:opacity-90 disabled:opacity-50 transition-all text-body-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Saving to MongoDB...
                  </>
                ) : (
                  <>
                    <Plus size={18} /> Schedule Duty Assignment
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Weekly Shift Roster Grid */}
          <div className="col-span-12 xl:col-span-7 glass-card p-margin rounded-[24px] clinical-shadow flex flex-col h-[560px]">
            <div className="mb-md flex flex-col md:flex-row justify-between items-center gap-sm">
              <h3 className="text-title-sm font-bold text-on-surface">
                Active Duty Shift Roster (MongoDB)
              </h3>
              <div className="relative w-full md:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4.5 h-4.5" />
                <input
                  type="text"
                  placeholder="Search staff, location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-surface-container border border-outline-variant/30 rounded-xl text-body-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-sm sidebar-scroll pr-1">
              {loading ? (
                <div className="py-20 text-center text-outline flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="font-semibold text-body-sm">Loading live duty schedules from MongoDB...</p>
                </div>
              ) : filteredRoster.length > 0 ? (
                filteredRoster.map((item) => (
                  <div
                    key={item._id}
                    className="p-md bg-surface-container-low border border-outline-variant/10 rounded-2xl clinical-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-body-sm"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-primary font-mono uppercase">
                          {item._id.slice(-6).toUpperCase()}
                        </span>
                        <span className="text-[10px] text-outline font-semibold">
                          Date: {item.date}
                        </span>
                      </div>
                      <h5 className="font-bold text-on-surface text-body-md mb-0.5">
                        {item.staffName}
                      </h5>
                      <span className="text-[10px] bg-secondary-container text-on-secondary-container font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                        {item.role}
                      </span>
                    </div>

                    <div className="flex-1 min-w-[200px]">
                      <p className="text-[12px] text-on-surface-variant font-semibold flex items-center gap-1.5 mb-1">
                        <MapPin size={14} className="text-secondary" /> {item.department}
                      </p>
                      <p className="text-[11px] text-outline font-medium flex items-center gap-1.5">
                        <Clock size={12} /> {item.shift}
                      </p>
                    </div>

                    <button
                      onClick={() => handleRevokeDuty(item._id, item.staffName)}
                      className="cursor-pointer p-2 hover:bg-error-container text-error rounded-xl transition-colors shrink-0 md:self-center"
                      title="Revoke Shift Assignment"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-16 text-center text-outline">
                  <CalendarDays className="mx-auto w-12 h-12 text-outline-variant mb-2" />
                  <p className="font-semibold text-body-sm">
                    No active duty roster entries match your search criteria.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <Footer />
      </main>
    </div>
  );
}
