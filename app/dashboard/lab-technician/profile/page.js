"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  User, 
  Mail, 
  Phone, 
  FlaskConical, 
  Check, 
  Lock, 
  Shield,
  RefreshCw,
  AlertCircle,
  X,
  Award,
} from "lucide-react";
import Sidebar from "@/components/Lab_Technician_Sidebar";
import Footer from "@/components/Footer";

export default function LabTechnicianProfile() {
  const { data: session } = useSession();
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Profile Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [labWing, setLabWing] = useState("");
  const [certifications, setCertifications] = useState("");
  const [department, setDepartment] = useState("");
  const [employeeId, setEmployeeId] = useState("");

  // Password States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Load Profile from MongoDB
  useEffect(() => {
    let ignore = false;
    async function loadProfile() {
      setLoading(true);
      try {
        const userEmail = session?.user?.email || "lab@rolemed.org";
        const res = await fetch(`/api/profile?email=${encodeURIComponent(userEmail)}&role=lab-technician`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (!ignore && data.success && data.user) {
          setName(data.user.name || "Elena Rostova");
          setEmail(data.user.email || "lab@rolemed.org");
          setPhone(data.user.phone || "03005678901");
          setLabWing(data.user.labWing || "Clinical Pathology & Diagnostics Wing");
          setCertifications(data.user.certifications || "MLT, ASCP Certified Specialist in Blood Banking");
          setDepartment(data.user.department || "Clinical Pathology & Diagnostic Lab");
          setEmployeeId(data.user.employeeId || "EMP-LAB-019");
        }
      } catch (err) {
        console.error("Error loading lab profile:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadProfile();
    return () => {
      ignore = true;
    };
  }, [session]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email || session?.user?.email || "lab@rolemed.org",
          role: "lab-technician",
          name,
          phone,
          labWing,
          certifications,
          department,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update profile details");
      }

      setSuccessMsg("Laboratory specialist profile saved to MongoDB successfully!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setErrorMsg(err.message || "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMsg("New password and confirmation do not match!");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters.");
      return;
    }

    setSavingPassword(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email || session?.user?.email || "lab@rolemed.org",
          role: "lab-technician",
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to change password credentials");
      }

      setSuccessMsg("Security credentials updated successfully in MongoDB!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setErrorMsg(err.message || "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="flex bg-background min-h-screen text-on-surface">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <div className="p-6 md:p-8 space-y-6 flex-1">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-outline-variant/10">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <FlaskConical className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold font-headline tracking-tight">
                    Lab Specialist Credentials &amp; Profile
                  </h1>
                  <p className="text-sm text-outline">
                    Manage diagnostic credentials, laboratory wing stations, and secure staff access.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-semibold flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMsg("")}
                className="cursor-pointer p-1 rounded-lg hover:bg-emerald-500/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-semibold flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg("")}
                className="cursor-pointer p-1 rounded-lg hover:bg-rose-500/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Main Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Card: Badge Preview */}
            <div className="lg:col-span-4 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col items-center text-center space-y-4">
              <div className="w-24 h-24 rounded-full bg-primary/10 text-primary border-4 border-primary/20 flex items-center justify-center font-bold text-2xl font-headline">
                {name ? name.slice(0, 2).toUpperCase() : "ER"}
              </div>

              <div>
                <h2 className="text-base font-bold font-headline">{name || "Elena Rostova"}</h2>
                <p className="text-xs text-primary font-semibold mt-0.5">{labWing || "Pathology & Diagnostics"}</p>
                <p className="text-[11px] text-outline font-mono mt-0.5">{email}</p>
              </div>

              <div className="w-full pt-4 border-t border-outline-variant/10 text-left space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-outline font-medium">Employee ID:</span>
                  <span className="font-mono font-bold">{employeeId || "EMP-LAB-019"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-outline font-medium">Department:</span>
                  <span className="font-semibold text-right max-w-[180px] truncate">{department || "Clinical Pathology"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-outline font-medium">Accreditation:</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                    ISO 15189 Verified
                  </span>
                </div>
              </div>
            </div>

            {/* Right Forms: Profile & Security */}
            <div className="lg:col-span-8 space-y-6">
              {/* Profile Details Form */}
              <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm space-y-4">
                <h2 className="text-base font-bold font-headline flex items-center gap-2 border-b border-outline-variant/10 pb-3">
                  <User className="w-4 h-4 text-primary" />
                  Clinical Practitioner Information
                </h2>

                <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-outline mb-1">
                        Full Practitioner Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-outline mb-1">
                        Hospital Domain Email (Read-Only)
                      </label>
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full p-2.5 bg-surface-container/30 border border-outline-variant/20 rounded-xl text-outline cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-outline mb-1">
                        Contact Phone Number
                      </label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="03005678901"
                        className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-outline mb-1">
                        Assigned Laboratory Wing
                      </label>
                      <input
                        type="text"
                        value={labWing}
                        onChange={(e) => setLabWing(e.target.value)}
                        placeholder="Clinical Pathology & Diagnostics Wing"
                        className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-outline mb-1">
                      Professional Certifications &amp; Licenses
                    </label>
                    <input
                      type="text"
                      value={certifications}
                      onChange={(e) => setCertifications(e.target.value)}
                      placeholder="MLT, ASCP Certified Specialist in Blood Banking"
                      className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="cursor-pointer px-5 py-2.5 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                      {savingProfile ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Saving Changes...
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Save Profile Changes
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Password & Security Credentials Form */}
              <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 shadow-sm space-y-4">
                <h2 className="text-base font-bold font-headline flex items-center gap-2 border-b border-outline-variant/10 pb-3">
                  <Lock className="w-4 h-4 text-primary" />
                  Security &amp; Password Management
                </h2>

                <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-outline mb-1">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-outline mb-1">
                        New Password (Min 6 chars)
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-outline mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingPassword}
                      className="cursor-pointer px-5 py-2.5 border border-outline-variant/30 hover:bg-surface-container text-on-surface rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {savingPassword ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Updating Password...
                        </>
                      ) : (
                        <>
                          <Shield className="w-3.5 h-3.5" />
                          Update Password Credentials
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </main>
    </div>
  );
}
