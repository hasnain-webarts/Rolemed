"use client";

import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "@/components/Admin_Sidebar";
import Footer from "@/components/Footer";
import { 
  MdGroup, 
  MdOutlinePersonAddAlt, 
  MdFileDownload, 
  MdMoreVert, 
  MdSearch,
  MdClose,
  MdRefresh
} from "react-icons/md";
import { CheckCircle2, User, Mail, Phone, Building, Check, X, AlertCircle } from "lucide-react";
import { exportToCsv } from "@/lib/csvExport";

const categories = ["All Staff", "Doctors", "Pharmacists", "Lab Techs", "Receptionists"];

export default function StaffPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Staff");
  const [staffData, setStaffData] = useState([]);
  const [counts, setCounts] = useState({ all: 0, doctors: 0, nurses: 0, receptionists: 0, pharmacists: 0, labTechs: 0, active: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState("");
  const [errorNotice, setErrorNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Staff form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("doctor");
  const [dept, setDept] = useState("Cardiology & Clinical Operations");
  const [shift, setShift] = useState("Morning (08:00 - 16:00)");
  const [password, setPassword] = useState("password123");

  // Fetch live staff from MongoDB
  useEffect(() => {
    let ignore = false;
    async function loadStaff() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/staff?limit=200", { cache: "no-store" });
        const data = await res.json();
        if (!ignore && data.success) {
          setStaffData(data.staff || []);
          if (data.counts) setCounts(data.counts);
        }
      } catch (err) {
        console.error("Error loading staff:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadStaff();
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  // Filter staff by category and search query
  const filteredStaff = useMemo(() => {
    return staffData.filter((staff) => {
      let roleMatch = true;
      if (activeCategory === "Doctors") roleMatch = staff.role === "doctor";
      else if (activeCategory === "Pharmacists") roleMatch = staff.role === "pharmacist";
      else if (activeCategory === "Lab Techs") roleMatch = staff.role === "lab-technician";
      else if (activeCategory === "Receptionists") roleMatch = staff.role === "receptionist";

      if (!roleMatch) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const sName = (staff.name || "").toLowerCase();
      const sRole = (staff.role || "").toLowerCase();
      const sId = (staff.employeeId || "").toLowerCase();
      const sDept = (staff.department || "").toLowerCase();

      return sName.includes(q) || sRole.includes(q) || sId.includes(q) || sDept.includes(q);
    });
  }, [staffData, activeCategory, searchQuery]);

  // Onboard New Staff Handler
  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setIsSubmitting(true);
    setErrorNotice("");

    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          department: dept.trim(),
          phone: phone.trim() || "03000000000",
          shift,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to onboard staff");
      }

      setFeedbackNotice(`Staff member ${data.staff.name} onboarded! Assigned ID: ${data.staff.employeeId}`);
      setIsOnboardModalOpen(false);
      setName("");
      setEmail("");
      setPhone("");
      setRefreshKey((k) => k + 1);
      setTimeout(() => setFeedbackNotice(""), 4000);
    } catch (err) {
      setErrorNotice(err.message || "Error creating staff record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Staff Active Status
  const handleToggleStatus = async (staff) => {
    try {
      const newStatus = staff.isActive === false ? true : false;
      const res = await fetch(`/api/admin/staff/${staff.employeeId || staff._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update status");
      }

      setFeedbackNotice(`Staff ${staff.name} status updated to ${newStatus ? "Active" : "Inactive"}.`);
      setRefreshKey((k) => k + 1);
      setTimeout(() => setFeedbackNotice(""), 3000);
    } catch (err) {
      setErrorNotice(err.message || "Failed to update status");
      setTimeout(() => setErrorNotice(""), 4000);
    }
  };

  // Export CSV
  const handleExportStaff = () => {
    const columns = [
      { key: "employeeId", label: "Staff ID" },
      { key: "name", label: "Full Name" },
      { key: "role", label: "Role" },
      { key: "department", label: "Department Wing" },
      { key: "shift", label: "Shift Schedule" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone Number" },
      { key: "isActive", label: "Active Status" },
    ];
    exportToCsv("rolemed_staff_directory.csv", columns, filteredStaff);
    setFeedbackNotice(`Staff directory (${filteredStaff.length} records) exported to CSV successfully!`);
    setTimeout(() => setFeedbackNotice(""), 3500);
  };

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
                  <MdGroup className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold font-headline tracking-tight">
                    Hospital Staff &amp; Practitioner Directory
                  </h1>
                  <p className="text-sm text-outline">
                    Comprehensive human resource administration, credential verification, and live account states.
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
                <MdRefresh className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>

              <button
                type="button"
                onClick={handleExportStaff}
                className="cursor-pointer px-3.5 py-2 border border-outline-variant/30 rounded-xl text-xs font-semibold hover:bg-surface-container flex items-center gap-1.5 transition-all text-outline hover:text-on-surface"
              >
                <MdFileDownload className="w-4 h-4" />
                Export CSV
              </button>

              <button
                type="button"
                onClick={() => setIsOnboardModalOpen(true)}
                className="cursor-pointer flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-xl font-bold text-xs hover:opacity-90 transition-all shadow-xs"
              >
                <MdOutlinePersonAddAlt className="w-4 h-4" />
                Onboard New Staff
              </button>
            </div>
          </div>

          {/* Feedback Notices */}
          {feedbackNotice && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-semibold flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{feedbackNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackNotice("")}
                className="cursor-pointer p-1 rounded-lg hover:bg-emerald-500/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {errorNotice && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-semibold flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorNotice("")}
                className="cursor-pointer p-1 rounded-lg hover:bg-rose-500/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 p-1 bg-surface-container/40 rounded-2xl border border-outline-variant/20 overflow-x-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    activeCategory === cat
                      ? "bg-surface-container-lowest text-primary shadow-xs font-headline"
                      : "text-outline hover:text-on-surface"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative">
              <MdSearch className="w-4 h-4 text-outline absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, ID, department..."
                className="pl-9 pr-4 py-2 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-72"
              />
            </div>
          </div>

          {/* Staff Table */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container/40 text-outline text-[11px] font-bold">
                  <tr>
                    <th className="p-3.5">Staff ID</th>
                    <th className="p-3.5">Practitioner Name</th>
                    <th className="p-3.5">Designated Role</th>
                    <th className="p-3.5">Department Wing</th>
                    <th className="p-3.5">Shift Schedule</th>
                    <th className="p-3.5">Contact Email &amp; Phone</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {filteredStaff.map((staff) => (
                    <tr key={staff.employeeId || staff._id} className="hover:bg-surface-container/30 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-primary">
                        {staff.employeeId || "EMP-STF"}
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-on-surface block">{staff.name}</span>
                        {staff.specialization && (
                          <span className="text-[10px] text-outline">{staff.specialization}</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary capitalize">
                          {staff.role}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium text-on-surface">
                        {staff.department || "General Operations"}
                      </td>
                      <td className="p-3.5 text-outline">
                        {staff.shift || "Morning (08:00 - 16:00)"}
                      </td>
                      <td className="p-3.5">
                        <span className="text-on-surface font-medium block">{staff.email}</span>
                        <span className="text-[10px] text-outline font-mono">{staff.phone || "03000000000"}</span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            staff.isActive !== false
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {staff.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(staff)}
                          className="cursor-pointer px-2.5 py-1 rounded-lg border border-outline-variant/20 hover:bg-surface-container text-[11px] font-semibold text-outline hover:text-on-surface transition-all"
                        >
                          {staff.isActive !== false ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredStaff.length === 0 && (
                    <tr>
                      <td colSpan="8" className="p-10 text-center text-outline text-xs">
                        {loading ? "Loading staff directory from MongoDB..." : "No staff members found matching criteria."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Onboard New Staff Modal */}
        {isOnboardModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
            <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl w-full max-w-240 shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container/30">
                <div className="flex items-center gap-2">
                  <MdOutlinePersonAddAlt className="w-5 h-5 text-primary" />
                  <span className="font-bold text-sm">Onboard New Hospital Staff</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOnboardModalOpen(false)}
                  className="cursor-pointer p-1 rounded-lg hover:bg-surface-container text-outline"
                >
                  <MdClose className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleOnboardSubmit} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-outline mb-1">
                    Full Staff / Practitioner Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g., Dr. Hamza Malik"
                    className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-outline mb-1">
                      Hospital Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none"
                    >
                      <option value="doctor">Doctor / Physician</option>
                      <option value="pharmacist">Pharmacist</option>
                      <option value="lab-technician">Lab Technician</option>
                      <option value="receptionist">Receptionist / Front Desk</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-outline mb-1">
                      Assigned Department
                    </label>
                    <input
                      type="text"
                      value={dept}
                      onChange={(e) => setDept(e.target.value)}
                      placeholder="e.g., Cardiology"
                      className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-outline mb-1">
                      Hospital Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="name@rolemed.org"
                      className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-outline mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="03001234567"
                      className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-outline mb-1">
                      Shift Schedule
                    </label>
                    <select
                      value={shift}
                      onChange={(e) => setShift(e.target.value)}
                      className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none"
                    >
                      <option value="Morning (08:00 - 16:00)">Morning (08:00 - 16:00)</option>
                      <option value="Evening (16:00 - 00:00)">Evening (16:00 - 00:00)</option>
                      <option value="Night (00:00 - 08:00)">Night (00:00 - 08:00)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-outline mb-1">
                      Initial Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-outline-variant/10">
                  <button
                    type="button"
                    onClick={() => setIsOnboardModalOpen(false)}
                    className="cursor-pointer px-4 py-2 border border-outline-variant/30 rounded-xl font-semibold hover:bg-surface-container text-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="cursor-pointer px-5 py-2 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting ? "Onboarding..." : "Register Staff Member"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <Footer />
      </main>
    </div>
  );
}
