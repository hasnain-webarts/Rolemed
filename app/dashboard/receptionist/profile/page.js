"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  User,
  Mail,
  Phone,
  Shield,
  Building,
  Check,
  Lock,
  Menu,
  Clock,
  RefreshCw,
  Loader2,
  AlertCircle,
  Key,
} from "lucide-react";
import Sidebar from "@/components/Receptionist_Sidebar";
import Footer from "@/components/Footer";

export default function ReceptionistProfile() {
  const { data: session } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [name, setName] = useState("Front Desk Assistant");
  const [email, setEmail] = useState("reception@rolemed.org");
  const [phone, setPhone] = useState("03003028491");
  const [deskStation, setDeskStation] = useState("Main Lobby Entrance • Counter B");
  const [shiftHours, setShiftHours] = useState("Morning Shift (07:00 - 15:00)");
  const [employeeId, setEmployeeId] = useState("EMP-REC-001");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let ignore = false;
    async function loadReceptionistProfile() {
      setLoading(true);
      setErrorMsg("");
      try {
        const res = await fetch("/api/profile?role=receptionist", {
          cache: "no-store",
          headers: { Pragma: "no-cache", "Cache-Control": "no-cache" },
        });
        if (!res.ok) throw new Error("Failed to load receptionist profile from MongoDB");
        const data = await res.json();
        if (!ignore && data.success && data.user) {
          const u = data.user;
          setName(u.name || "Front Desk Assistant");
          setEmail(u.email || session?.user?.email || "reception@rolemed.org");
          setPhone(u.phone || "03003028491");
          setDeskStation(u.deskStation || "Main Lobby Entrance • Counter B");
          setShiftHours(u.shift || "Morning Shift (07:00 - 15:00)");
          setEmployeeId(u.employeeId || "EMP-REC-001");
        }
      } catch (err) {
        if (!ignore) {
          console.error("Error loading receptionist profile:", err);
          setErrorMsg(err.message || "Failed to load front desk profile");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadReceptionistProfile();
    return () => {
      ignore = true;
    };
  }, [session, refreshTrigger]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "receptionist",
          name: name.trim(),
          phone: phone.trim(),
          deskStation: deskStation.trim(),
          shift: shiftHours.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");

      setSuccessMsg("Receptionist profile information saved to MongoDB successfully!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setErrorMsg(err.message || "Error saving receptionist profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setSuccessMsg("");

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match!");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "receptionist",
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");

      setSuccessMsg("Security password updated and active in MongoDB!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setPasswordError(err.message || "Failed to update security credentials");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 overflow-y-auto p-margin no-scrollbar">
        <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-md mb-lg">
          <div className="flex items-center gap-sm">
            <button
              className="cursor-pointer lg:hidden p-xs text-on-surface-variant hover:bg-surface-container rounded-lg"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div>
              <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
                Receptionist Profile &amp; Settings
              </h1>
              <p className="text-body-sm text-on-surface-variant">
                Manage your front-desk contact information, assigned station, shift schedule, and security credentials.
              </p>
            </div>
          </div>
          <button
            onClick={() => setRefreshTrigger((k) => k + 1)}
            disabled={loading}
            className="cursor-pointer self-start sm:self-auto flex items-center gap-2 px-md py-2.5 rounded-xl border border-outline-variant bg-surface hover:bg-surface-container text-body-sm font-semibold text-on-surface transition-all"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            Reload Profile
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
          <div className="col-span-12 lg:col-span-4 glass-card p-margin rounded-[24px] clinical-shadow flex flex-col items-center text-center space-y-md border border-outline-variant/20 h-fit">
            <div className="w-24 h-24 rounded-full bg-primary-container text-on-primary-container border-4 border-primary-fixed flex items-center justify-center font-bold text-2xl clinical-shadow">
              {name ? name.slice(0, 2).toUpperCase() : "RC"}
            </div>
            <div>
              <h3 className="font-bold text-title-sm text-on-surface">{name}</h3>
              <p className="text-body-sm text-primary font-semibold mt-0.5">Patient Services &amp; Admissions</p>
              <p className="text-xs text-outline font-mono">{email}</p>
            </div>

            <div className="w-full pt-4 border-t border-outline-variant/20 text-left space-y-2 text-body-sm">
              <div className="flex justify-between items-center">
                <span className="text-xs text-outline font-semibold">Assigned Station</span>
                <span className="font-bold text-xs text-on-surface">{deskStation}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-outline font-semibold">Employee ID</span>
                <span className="font-bold text-xs text-primary font-mono">{employeeId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-outline font-semibold">Role Tier</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-secondary-container text-secondary">
                  Receptionist Level 2
                </span>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-8 space-y-md">
            <div className="glass-card p-margin rounded-[24px] clinical-shadow border border-outline-variant/20 space-y-md">
              <h3 className="text-title-sm font-bold text-on-surface">Front Desk Information</h3>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  <div>
                    <label className="block text-outline font-bold text-xs mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full p-3 bg-surface-bright border border-outline-variant/40 rounded-xl font-semibold outline-none focus:border-primary text-body-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-outline font-bold text-xs mb-1">Official Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-3 bg-surface-bright border border-outline-variant/40 rounded-xl font-semibold outline-none focus:border-primary text-body-sm font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  <div>
                    <label className="block text-outline font-bold text-xs mb-1">Direct Phone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-3 bg-surface-bright border border-outline-variant/40 rounded-xl font-semibold outline-none focus:border-primary text-body-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-outline font-bold text-xs mb-1">Assigned Station Desk</label>
                    <input
                      type="text"
                      value={deskStation}
                      onChange={(e) => setDeskStation(e.target.value)}
                      className="w-full p-3 bg-surface-bright border border-outline-variant/40 rounded-xl font-semibold outline-none focus:border-primary text-body-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold clinical-shadow hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer text-body-sm flex items-center gap-2"
                  >
                    {savingProfile ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Saving...
                      </>
                    ) : (
                      "Save Profile Changes"
                    )}
                  </button>
                </div>
              </form>
            </div>

            <div className="glass-card p-margin rounded-[24px] clinical-shadow border border-outline-variant/20 space-y-md">
              <h3 className="text-title-sm font-bold text-on-surface">Update Security Password</h3>

              {passwordError && (
                <div className="p-3 bg-error-container text-on-error-container rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={16} className="text-error" /> {passwordError}
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                  <div>
                    <label className="block text-outline font-bold text-xs mb-1">Current Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full p-3 bg-surface-bright border border-outline-variant/40 rounded-xl font-semibold outline-none focus:border-primary text-body-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-outline font-bold text-xs mb-1">New Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Min. 6 chars"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-3 bg-surface-bright border border-outline-variant/40 rounded-xl font-semibold outline-none focus:border-primary text-body-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-outline font-bold text-xs mb-1">Confirm Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Retype password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full p-3 bg-surface-bright border border-outline-variant/40 rounded-xl font-semibold outline-none focus:border-primary text-body-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="px-6 py-2.5 bg-secondary text-on-secondary rounded-xl font-bold clinical-shadow hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer text-body-sm flex items-center gap-2"
                  >
                    {savingPassword ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Updating...
                      </>
                    ) : (
                      "Update Security Password"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <Footer />
      </main>
    </div>
  );
}
