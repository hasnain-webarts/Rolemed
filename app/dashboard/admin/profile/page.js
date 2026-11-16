"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Shield,
  Key,
  Building,
  Check,
  Lock,
  FileText,
  AlertCircle,
  Menu,
  Clock,
  RefreshCw,
} from "lucide-react";
import Sidebar from "@/components/Admin_Sidebar";
import Footer from "@/components/Footer";

export default function AdminProfile() {
  const { data: session } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile details state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("Executive Hospital Administration");
  const [office, setOffice] = useState("Suite 501, Executive Tower");
  const [employeeId, setEmployeeId] = useState("EMP-ADM-01");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Security password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    let ignore = false;
    async function loadProfile() {
      setLoading(true);
      setErrorMsg("");
      try {
        const res = await fetch("/api/profile?role=admin", {
          cache: "no-store",
          headers: {
            Pragma: "no-cache",
            "Cache-Control": "no-cache",
          },
        });
        if (!res.ok) throw new Error("Failed to load admin profile from database");
        const data = await res.json();
        if (!ignore && data.user) {
          setName(data.user.name || "Hospital Administrator");
          setEmail(data.user.email || session?.user?.email || "admin@rolemed.org");
          setPhone(data.user.phone || "03001234567");
          setDepartment(data.user.department || "Executive Hospital Administration");
          setOffice(data.user.office || "Suite 501, Executive Tower");
          setEmployeeId(data.user.employeeId || "EMP-ADM-01");
        }
      } catch (err) {
        if (!ignore) {
          console.error("Error fetching admin profile:", err);
          setErrorMsg(err.message || "Could not retrieve profile information");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      ignore = true;
    };
  }, [session, refreshTrigger]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "admin",
          email,
          name,
          phone,
          department,
          office,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");

      setSuccessMsg("Administrator profile information saved to MongoDB successfully!");
      setTimeout(() => setSuccessMsg(""), 4500);
    } catch (err) {
      setErrorMsg(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
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
      setPasswordError("New passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "admin",
          email,
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password");

      setSuccessMsg("Security credentials updated successfully! New password is now active in database.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccessMsg(""), 4500);
    } catch (err) {
      setPasswordError(err.message || "Failed to update security credentials");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 overflow-y-auto p-margin no-scrollbar">
        {/* Header */}
        <header className="flex items-center justify-between gap-md mb-lg">
          <div className="flex items-center gap-sm">
            <button
              className="cursor-pointer lg:hidden p-xs text-on-surface-variant hover:bg-surface-container rounded-lg"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div>
              <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
                Administrator Profile &amp; Settings
              </h1>
              <p className="text-body-sm text-on-surface-variant">
                Manage your executive administrative credentials, facility office, and security parameters.
              </p>
            </div>
          </div>
          <button
            onClick={() => setRefreshTrigger((k) => k + 1)}
            disabled={loading}
            className="cursor-pointer flex items-center gap-2 px-md py-2.5 rounded-xl border border-outline-variant bg-surface hover:bg-surface-container text-body-sm font-semibold text-on-surface transition-all"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            Reload Profile
          </button>
        </header>

        {successMsg && (
          <div className="mb-lg p-md rounded-2xl bg-secondary-container text-on-secondary-container flex items-center gap-2 clinical-shadow font-semibold text-body-sm transition-all">
            <Check className="w-5 h-5 text-secondary" /> {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="mb-lg p-md rounded-2xl bg-error-container text-on-error-container flex items-center gap-2 font-semibold text-body-sm">
            <AlertCircle className="w-5 h-5 text-error" /> {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-12 gap-gutter mb-lg">
          {/* Admin Identity Card */}
          <div className="col-span-12 lg:col-span-4 glass-card p-margin rounded-[24px] clinical-shadow flex flex-col items-center text-center space-y-md border border-outline-variant/20 h-fit">
            <div className="relative">
              <div className="w-28 h-28 rounded-full bg-primary-container text-on-primary-container border-4 border-primary-fixed flex items-center justify-center font-bold text-3xl clinical-shadow">
                {name ? name.slice(0, 2).toUpperCase() : "AD"}
              </div>
              <div className="absolute bottom-1 right-1 p-2 bg-secondary text-on-secondary rounded-full clinical-shadow">
                <Shield size={16} />
              </div>
            </div>

            <div>
              <h3 className="font-bold text-title-sm text-on-surface">{name || "Administrator"}</h3>
              <p className="text-body-sm text-primary font-semibold mt-0.5">{department}</p>
              <p className="text-xs text-outline mt-0.5 font-mono">{email}</p>
            </div>

            <div className="w-full pt-4 border-t border-outline-variant/20 text-left space-y-3 text-body-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-outline font-semibold">Access Level</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-container text-on-primary-container">
                  Super Administrator
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-outline font-semibold">Security Clearance</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary-container text-secondary">
                  Level 5 (HIPAA)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-outline font-semibold">Employee ID</span>
                <span className="font-bold text-on-surface text-xs font-mono">{employeeId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-outline font-semibold">Facility Office</span>
                <span className="font-bold text-on-surface text-xs">{office}</span>
              </div>
            </div>

            {/* Quick Links */}
            <div className="w-full pt-4 border-t border-outline-variant/20">
              <Link
                href="/dashboard/admin/audit-logs"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-surface-container hover:bg-surface-container-high rounded-xl text-body-sm font-bold text-on-surface transition-all"
              >
                <FileText size={16} className="text-primary" /> View Security Audit Trail
              </Link>
            </div>
          </div>

          {/* Settings Tabs & Forms */}
          <div className="col-span-12 lg:col-span-8 space-y-md">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-outline-variant/30 pb-sm">
              <button
                onClick={() => setActiveTab("general")}
                className={`px-4 py-2 rounded-xl text-body-sm font-bold transition-all cursor-pointer ${
                  activeTab === "general"
                    ? "bg-primary text-on-primary clinical-shadow"
                    : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                Personal &amp; Contact Info
              </button>
              <button
                onClick={() => setActiveTab("security")}
                className={`px-4 py-2 rounded-xl text-body-sm font-bold transition-all cursor-pointer ${
                  activeTab === "security"
                    ? "bg-primary text-on-primary clinical-shadow"
                    : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                Security &amp; Password
              </button>
              <button
                onClick={() => setActiveTab("privileges")}
                className={`px-4 py-2 rounded-xl text-body-sm font-bold transition-all cursor-pointer ${
                  activeTab === "privileges"
                    ? "bg-primary text-on-primary clinical-shadow"
                    : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                Role Permissions
              </button>
            </div>

            {/* General Profile Tab */}
            {activeTab === "general" && (
              <div className="glass-card p-margin rounded-[24px] clinical-shadow border border-outline-variant/20 space-y-md">
                <div>
                  <h3 className="text-title-sm font-bold text-on-surface">Administrative Details</h3>
                  <p className="text-xs text-outline">Manage your primary contact and organizational credentials.</p>
                </div>

                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                    <div>
                      <label className="block text-outline font-bold text-xs mb-1">Full Administrator Name</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-3 bg-surface-bright border border-outline-variant/40 rounded-xl font-semibold outline-none focus:border-primary text-body-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-outline font-bold text-xs mb-1">Official Email Address</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 bg-surface-bright border border-outline-variant/40 rounded-xl font-semibold outline-none focus:border-primary text-body-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                    <div>
                      <label className="block text-outline font-bold text-xs mb-1">Emergency Phone Contact</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full p-3 bg-surface-bright border border-outline-variant/40 rounded-xl font-semibold outline-none focus:border-primary text-body-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-outline font-bold text-xs mb-1">Facility Office / Suite</label>
                      <input
                        type="text"
                        value={office}
                        onChange={(e) => setOffice(e.target.value)}
                        className="w-full p-3 bg-surface-bright border border-outline-variant/40 rounded-xl font-semibold outline-none focus:border-primary text-body-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-outline font-bold text-xs mb-1">Department Wing</label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full p-3 bg-surface-bright border border-outline-variant/40 rounded-xl font-semibold outline-none focus:border-primary text-body-sm"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold clinical-shadow hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer text-body-sm"
                    >
                      {saving ? "Saving to Database..." : "Save Profile Updates"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="glass-card p-margin rounded-[24px] clinical-shadow border border-outline-variant/20 space-y-md">
                <div>
                  <h3 className="text-title-sm font-bold text-on-surface">Password &amp; Security Credentials</h3>
                  <p className="text-xs text-outline">Ensure your administrator account meets clinical security standards.</p>
                </div>

                {passwordError && (
                  <div className="p-3 bg-error-container text-on-error-container rounded-xl text-xs font-bold flex items-center gap-2">
                    <AlertCircle size={16} className="text-error" /> {passwordError}
                  </div>
                )}

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                    <div>
                      <label className="block text-outline font-bold text-xs mb-1">New Password</label>
                      <input
                        type="password"
                        required
                        placeholder="Min. 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full p-3 bg-surface-bright border border-outline-variant/40 rounded-xl font-semibold outline-none focus:border-primary text-body-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-outline font-bold text-xs mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        required
                        placeholder="Retype new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full p-3 bg-surface-bright border border-outline-variant/40 rounded-xl font-semibold outline-none focus:border-primary text-body-sm"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/20 space-y-2 text-xs text-on-surface-variant">
                    <div className="flex items-center gap-2 font-semibold">
                      <Lock size={16} className="text-secondary" /> Two-Factor Authentication: <span className="text-secondary font-bold">Enforced (TOTP App)</span>
                    </div>
                    <div className="flex items-center gap-2 font-semibold">
                      <Clock size={16} className="text-primary" /> Session Timeout: <span className="text-primary font-bold">15 Minutes of Inactivity</span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold clinical-shadow hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer text-body-sm"
                    >
                      {saving ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Role Privileges Tab */}
            {activeTab === "privileges" && (
              <div className="glass-card p-margin rounded-[24px] clinical-shadow border border-outline-variant/20 space-y-md">
                <div>
                  <h3 className="text-title-sm font-bold text-on-surface">Superadmin System Permissions</h3>
                  <p className="text-xs text-outline">Active Role-Based Access Control (RBAC) privileges granted to your session.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { label: "Manage Medical Staff & Roster", status: "Full Access", desc: "Add, edit, and deactivate physician and clinical nurse profiles" },
                    { label: "Hospital Financial & Billing", status: "Full Access", desc: "View revenue metrics, export invoices, and review department ledgers" },
                    { label: "HIPAA Security Audit Trail", status: "Read / Export", desc: "Inspect cryptographically stamped audit logs for patient access" },
                    { label: "Laboratory Diagnostics Oversight", status: "Full Access", desc: "Audit lab test turnarounds, test catalogs, and results queue" },
                    { label: "Pharmacy Stock & Formularies", status: "Full Access", desc: "Procurement threshold overrides and supplier directory access" },
                    { label: "Patient Admission & Queue Management", status: "Full Access", desc: "Emergency bed assignments and clinical record management" },
                  ].map((perm, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-on-surface">{perm.label}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary-container text-secondary">
                          {perm.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-outline">{perm.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <Footer />
      </main>
    </div>
  );
}
