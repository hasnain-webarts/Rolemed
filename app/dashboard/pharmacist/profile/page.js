"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { 
  Check, 
  Menu,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Sidebar from "@/components/Pharmacist_Sidebar";
import Footer from "@/components/Footer";

export default function PharmacistProfile() {
  const { data: session } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dispensaryWing, setDispensaryWing] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      try {
        setLoading(true);
        setErrorMsg("");

        const userEmail = session?.user?.email || "";
        const res = await fetch(`/api/profile?email=${encodeURIComponent(userEmail)}`, {
          cache: "no-store",
        });

        const data = await res.json();

        if (!ignore && data.success && data.user) {
          setName(data.user.name || "Chief Pharmacist");
          setEmail(data.user.email || "pharmacist@rolemed.org");
          setPhone(data.user.phone || "03001234567");
          setDispensaryWing(data.user.dispensaryWing || "Central Inpatient & Outpatient Dispensary");
          setLicenseNumber(data.user.licenseNumber || "RPh-882194-STATE");
        }
      } catch (err) {
        if (!ignore) {
          setErrorMsg(err.message || "Failed to load clinical staff profile");
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
  }, [session?.user?.email]);

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
          email,
          name,
          phone,
          dispensaryWing,
          licenseNumber,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update profile");
      }

      setSuccessMsg("Pharmacist clinical profile updated and saved to database!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setErrorMsg(err.message || "Error updating pharmacist profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMsg("New passwords do not match!");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters.");
      return;
    }

    setSavingPassword(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update password");
      }

      setSuccessMsg("Security credentials updated successfully in database!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setErrorMsg(err.message || "Error updating security credentials");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 overflow-y-auto p-margin no-scrollbar">
        <header className="flex items-center justify-between gap-md mb-lg">
          <div className="flex items-center gap-sm">
            <button
              className="cursor-pointer lg:hidden p-xs text-on-surface-variant hover:bg-surface-container rounded-lg"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div>
              <h1 className="font-headline-md text-headline-md font-bold text-on-surface">Pharmacist Profile</h1>
              <p className="text-body-sm text-on-surface-variant">Manage your dispensary station, pharmaceutical licensure, and security credentials.</p>
            </div>
          </div>
        </header>

        {errorMsg && (
          <div className="mb-md p-4 rounded-2xl bg-error-container text-on-error-container flex items-center gap-2 border border-error/30 text-body-sm font-semibold">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-lg p-md rounded-2xl bg-secondary-container text-on-secondary-container flex items-center gap-2 clinical-shadow font-semibold text-body-sm transition-all animate-bounce">
            <Check className="w-5 h-5 text-secondary" /> {successMsg}
          </div>
        )}

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-outline gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-body-sm font-semibold">Synchronizing pharmacist profile with hospital server...</span>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-gutter mb-lg">
            <div className="col-span-12 lg:col-span-4 glass-card p-margin rounded-[24px] clinical-shadow flex flex-col items-center text-center space-y-md border border-outline-variant/20 h-fit">
              <div className="w-24 h-24 rounded-full bg-primary-container text-on-primary-container border-4 border-primary-fixed flex items-center justify-center font-bold text-2xl clinical-shadow">
                {(name || "CP").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-title-sm text-on-surface">{name || "Chief Pharmacist"}</h3>
                <p className="text-body-sm text-primary font-semibold mt-0.5">{dispensaryWing || "Dispensary Station"}</p>
                <p className="text-xs text-outline">{email}</p>
              </div>

              <div className="w-full pt-4 border-t border-outline-variant/20 text-left space-y-2 text-body-sm">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-outline font-semibold">License Registration</span>
                  <span className="font-bold text-xs text-on-surface">{licenseNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-outline font-semibold">Formulary Clearance</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-secondary-container text-secondary">Schedule II-V Certified</span>
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-8 space-y-md">
              <div className="glass-card p-margin rounded-[24px] clinical-shadow border border-outline-variant/20 space-y-md">
                <h3 className="text-title-sm font-bold text-on-surface">Pharmacy Staff Details</h3>
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
                        readOnly
                        value={email}
                        className="w-full p-3 bg-surface-container-low border border-outline-variant/20 rounded-xl font-semibold outline-none text-body-sm cursor-not-allowed opacity-80"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                    <div>
                      <label className="block text-outline font-bold text-xs mb-1">Contact Phone</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full p-3 bg-surface-bright border border-outline-variant/40 rounded-xl font-semibold outline-none focus:border-primary text-body-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-outline font-bold text-xs mb-1">Dispensary Wing / Unit</label>
                      <input
                        type="text"
                        value={dispensaryWing}
                        onChange={(e) => setDispensaryWing(e.target.value)}
                        className="w-full p-3 bg-surface-bright border border-outline-variant/40 rounded-xl font-semibold outline-none focus:border-primary text-body-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                    <div>
                      <label className="block text-outline font-bold text-xs mb-1">License Registration Number</label>
                      <input
                        type="text"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        className="w-full p-3 bg-surface-bright border border-outline-variant/40 rounded-xl font-semibold outline-none focus:border-primary text-body-sm"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold clinical-shadow hover:opacity-90 transition-all cursor-pointer text-body-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      {savingProfile ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Profile Changes"
                      )}
                    </button>
                  </div>
                </form>
              </div>

              <div className="glass-card p-margin rounded-[24px] clinical-shadow border border-outline-variant/20 space-y-md">
                <h3 className="text-title-sm font-bold text-on-surface">Security &amp; Password Management</h3>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                    <div>
                      <label className="block text-outline font-bold text-xs mb-1">Current Password</label>
                      <input
                        type="password"
                        required
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
                      className="px-6 py-2.5 bg-secondary text-on-secondary rounded-xl font-bold clinical-shadow hover:opacity-90 transition-all cursor-pointer text-body-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      {savingPassword ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Update Password"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        <Footer />
      </main>
    </div>
  );
}
