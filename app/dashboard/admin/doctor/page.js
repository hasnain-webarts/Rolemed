"use client";

import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "@/components/Admin_Sidebar";
import Footer from "@/components/Footer";
import { 
  MdGroups, 
  MdDomain, 
  MdOutlineVisibility, 
  MdClose 
} from "react-icons/md";
import { IoIosAdd, IoIosSearch } from "react-icons/io";
import { CheckCircle2, Mail, Phone, MapPin, Clock, Stethoscope, Check, AlertCircle, X, RefreshCw } from "lucide-react";

export default function DoctorManagementPage() {
  const [doctorsList, setDoctorsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [formVisibility, setFormVisibility] = useState(false);
  const [viewingDoctor, setViewingDoctor] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [feedbackNotice, setFeedbackNotice] = useState("");
  const [errorNotice, setErrorNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Doctor Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("Cardiology & Clinical Operations");
  const [specialization, setSpecialization] = useState("Cardiology");
  const [qualifications, setQualifications] = useState("MBBS, FCPS (Cardiology)");
  const [experienceYears, setExperienceYears] = useState("10");
  const [office, setOffice] = useState("Chamber Suite 302, OPD Wing B");
  const [shift, setShift] = useState("Morning (08:00 - 16:00)");

  // Load doctors from MongoDB
  useEffect(() => {
    let ignore = false;
    async function loadDoctors() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/staff?role=doctor&limit=150", { cache: "no-store" });
        const data = await res.json();
        if (!ignore && data.success) {
          setDoctorsList(data.staff || []);
        }
      } catch (err) {
        console.error("Error loading doctors:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadDoctors();
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  const filteredDoctors = useMemo(() => {
    if (!searchQuery.trim()) return doctorsList;
    const q = searchQuery.toLowerCase().trim();
    return doctorsList.filter((doc) => {
      const dName = (doc.name || "").toLowerCase();
      const dDept = (doc.department || "").toLowerCase();
      const dSpec = (doc.specialization || "").toLowerCase();
      const dId = (doc.employeeId || "").toLowerCase();
      return dName.includes(q) || dDept.includes(q) || dSpec.includes(q) || dId.includes(q);
    });
  }, [doctorsList, searchQuery]);

  const handleAddDoctor = async (e) => {
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
          role: "doctor",
          department: department.trim(),
          specialization: specialization.trim(),
          qualifications: qualifications.trim(),
          experienceYears: Number(experienceYears) || 5,
          phone: phone.trim() || "03000000000",
          office: office.trim(),
          shift,
          password: "password123",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to register doctor");
      }

      setFeedbackNotice(`Practitioner ${data.staff.name} successfully registered with ID ${data.staff.employeeId}!`);
      setFormVisibility(false);
      setName("");
      setEmail("");
      setPhone("");
      setRefreshKey((k) => k + 1);
      setTimeout(() => setFeedbackNotice(""), 4000);
    } catch (err) {
      setErrorNotice(err.message || "Error creating doctor record.");
    } finally {
      setIsSubmitting(false);
    }
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
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold font-headline tracking-tight">
                    Medical Practitioners &amp; Doctor Roster
                  </h1>
                  <p className="text-sm text-outline">
                    Physician credentials, consultation chambers, clinical specialties, and active appointment schedules.
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
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>

              <button
                type="button"
                onClick={() => setFormVisibility(true)}
                className="cursor-pointer flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-xl font-bold text-xs hover:opacity-90 transition-all shadow-xs"
              >
                <IoIosAdd size={18} />
                Register New Doctor
              </button>
            </div>
          </div>

          {/* Alert Banners */}
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

          {/* Search Bar */}
          <div className="flex justify-between items-center gap-4">
            <div className="relative w-full max-w-sm">
              <IoIosSearch className="w-4 h-4 text-outline absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search doctors by name, specialty, or department..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <span className="text-xs text-outline font-semibold">
              Showing {filteredDoctors.length} Doctors
            </span>
          </div>

          {/* Doctors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDoctors.map((doc) => (
              <div
                key={doc.employeeId || doc._id}
                className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/10 shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[11px] font-bold text-primary block">
                        {doc.employeeId || "EMP-DOC"}
                      </span>
                      <h3 className="font-bold text-base text-on-surface mt-0.5">{doc.name}</h3>
                      <p className="text-xs text-primary font-semibold">
                        {doc.specialization || doc.department || "Consultant"}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                      Active
                    </span>
                  </div>

                  <div className="bg-surface-container/30 p-3 rounded-xl border border-outline-variant/10 text-xs space-y-1.5">
                    <div className="flex items-center gap-2 text-outline">
                      <MdDomain className="w-3.5 h-3.5 shrink-0 text-primary" />
                      <span className="truncate">{doc.department || "General Practice"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-outline">
                      <Clock className="w-3.5 h-3.5 shrink-0 text-primary" />
                      <span className="truncate">{doc.shift || "Morning (08:00 - 16:00)"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-outline">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
                      <span className="truncate">{doc.office || "Chamber Suite 302"}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-outline flex items-center justify-between">
                    <span>Qualifications:</span>
                    <span className="font-semibold text-on-surface">{doc.qualifications || "MBBS"}</span>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-outline-variant/10 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-outline">{doc.email}</span>
                  <button
                    type="button"
                    onClick={() => setViewingDoctor(doc)}
                    className="cursor-pointer px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-on-primary font-bold text-xs transition-all flex items-center gap-1"
                  >
                    <MdOutlineVisibility className="w-3.5 h-3.5" />
                    Details
                  </button>
                </div>
              </div>
            ))}

            {filteredDoctors.length === 0 && (
              <div className="col-span-full py-16 text-center text-outline text-xs bg-surface-container-lowest rounded-2xl border border-outline-variant/10">
                {loading ? "Loading doctors from MongoDB..." : "No doctors found matching criteria."}
              </div>
            )}
          </div>
        </div>

        {/* Register Doctor Modal */}
        {formVisibility && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
            <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl w-full max-w-240 shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container/30">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-primary" />
                  <span className="font-bold text-sm">Register Medical Practitioner</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormVisibility(false)}
                  className="cursor-pointer p-1 rounded-lg hover:bg-surface-container text-outline"
                >
                  <MdClose className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddDoctor} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-outline mb-1">
                    Doctor Full Name (with Title)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g., Dr. Ayesha Khan"
                    className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-outline mb-1">
                      Clinical Department
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      required
                      placeholder="e.g., Cardiology"
                      className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-outline mb-1">
                      Clinical Specialization
                    </label>
                    <input
                      type="text"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      placeholder="e.g., Interventional Cardiology"
                      className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-outline mb-1">
                      Official Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="doctor.name@rolemed.org"
                      className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-outline mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="03009876543"
                      className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-outline mb-1">
                      Qualifications
                    </label>
                    <input
                      type="text"
                      value={qualifications}
                      onChange={(e) => setQualifications(e.target.value)}
                      placeholder="MBBS, FCPS"
                      className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-outline mb-1">
                      Office / Chamber Location
                    </label>
                    <input
                      type="text"
                      value={office}
                      onChange={(e) => setOffice(e.target.value)}
                      placeholder="Chamber Suite 302, OPD Wing B"
                      className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-outline-variant/10">
                  <button
                    type="button"
                    onClick={() => setFormVisibility(false)}
                    className="cursor-pointer px-4 py-2 border border-outline-variant/30 rounded-xl font-semibold hover:bg-surface-container text-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="cursor-pointer px-5 py-2 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting ? "Registering..." : "Register Doctor"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Doctor Details Modal */}
        {viewingDoctor && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
            <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl w-full max-w-240 shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container/30">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-primary" />
                  <span className="font-bold text-sm">Practitioner Profile</span>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingDoctor(null)}
                  className="cursor-pointer p-1 rounded-lg hover:bg-surface-container text-outline"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div className="text-center space-y-1 pb-3 border-b border-outline-variant/10">
                  <div className="w-16 h-16 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center text-xl font-bold">
                    {viewingDoctor.name?.slice(0, 2).toUpperCase()}
                  </div>
                  <h3 className="font-bold text-base text-on-surface">{viewingDoctor.name}</h3>
                  <p className="text-xs text-primary font-semibold">{viewingDoctor.specialization || viewingDoctor.department}</p>
                  <span className="font-mono text-[10px] text-outline block">{viewingDoctor.employeeId}</span>
                </div>

                <div className="space-y-2 bg-surface-container/30 p-3 rounded-xl border border-outline-variant/10">
                  <div className="flex justify-between">
                    <span className="text-outline">Qualifications:</span>
                    <span className="font-semibold text-on-surface">{viewingDoctor.qualifications || "MBBS"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-outline">Experience:</span>
                    <span className="font-semibold text-on-surface">{viewingDoctor.experienceYears || 5} Years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-outline">Office Chamber:</span>
                    <span className="font-semibold text-on-surface">{viewingDoctor.office || "Chamber Suite 302"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-outline">Shift Hours:</span>
                    <span className="font-semibold text-on-surface">{viewingDoctor.shift || "Morning"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-outline">Phone:</span>
                    <span className="font-semibold text-on-surface">{viewingDoctor.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-outline">Email:</span>
                    <span className="font-semibold text-on-surface font-mono">{viewingDoctor.email}</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setViewingDoctor(null)}
                    className="cursor-pointer px-4 py-2 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <Footer />
      </main>
    </div>
  );
}
