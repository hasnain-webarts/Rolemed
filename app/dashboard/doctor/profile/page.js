"use client";

import { useState, useEffect } from "react";
import {
  User,
  Phone,
  Award,
  Shield,
  Key,
  Save,
  Check,
  Stethoscope,
  Lock,
  Building,
  Info,
  MapPin,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Sidebar from "@/components/Doctor_Sidebar";
import Footer from "@/components/Footer";

export default function DoctorProfile() {
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Editable Doctor details state
  const [name, setName] = useState("Dr. Ayesha Siddiqui");
  const [personalPhone, setPersonalPhone] = useState("03009876543");
  const [consultFee, setConsultFee] = useState("Rs. 2,500");
  const [bio, setBio] = useState(
    "Consultant Cardiologist and Physician at RoleMed Hospital. Specializing in interventional cardiology, cardiovascular diagnostics, hypertension management, and clinical patient care."
  );
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);

  // Official Institutional parameters (Managed by Hospital IT / Administration)
  const [institutionalData, setInstitutionalData] = useState({
    employeeId: "EMP-DOC-001",
    hospitalEmail: "sarah.johnson@rolemed.org",
    clinicalPhone: "0519876543 (Ext. 401)",
    room: "Room 304 (Outpatient Cardiology Wing)",
    specialty: "Cardiology & Clinical Operations",
    license: "PMDC-1200421-PK",
    role: "Chief Medical Officer",
    department: "Department of Cardiovascular Medicine",
    joinedDate: "August 14, 2020",
  });

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let ignore = false;
    async function loadDoctorProfile() {
      setLoading(true);
      setErrorMsg("");
      try {
        const res = await fetch("/api/profile?role=doctor", {
          cache: "no-store",
          headers: { Pragma: "no-cache", "Cache-Control": "no-cache" },
        });
        if (!res.ok) throw new Error("Failed to load physician profile from MongoDB");
        const data = await res.json();
        if (!ignore && data.success && data.user) {
          const u = data.user;
          setName(u.name || "Dr. Ayesha Siddiqui");
          setPersonalPhone(u.phone || "03009876543");
          const fee = u.consultationFee || 2500;
          setConsultFee(`Rs. ${fee.toLocaleString()}`);
          if (u.bio) setBio(u.bio);

          setInstitutionalData((prev) => ({
            ...prev,
            employeeId: u.employeeId || "EMP-DOC-042",
            hospitalEmail: u.email || "doctor@rolemed.org",
            room: u.office || "Chamber Suite 302 (Cardiology Wing)",
            specialty: u.specialization || u.department || "Cardiology & Clinical Operations",
            department: u.department || "Cardiovascular Medicine",
            license: u.licenseNumber || "PMDC-1200421-PK",
          }));
        }
      } catch (err) {
        if (!ignore) {
          console.error("Error loading doctor profile:", err);
          setErrorMsg(err.message || "Failed to load practitioner profile");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadDoctorProfile();
    return () => {
      ignore = true;
    };
  }, [refreshTrigger]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const parsedFee = parseInt(consultFee.replace(/[^0-9]/g, ""), 10) || 2500;

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "doctor",
          name: name.trim(),
          phone: personalPhone.trim(),
          consultationFee: parsedFee,
          bio: bio.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save profile changes");

      setConsultFee(`Rs. ${parsedFee.toLocaleString()}`);
      setSuccessMsg("Practitioner preferences and consultation fee saved to MongoDB successfully!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setErrorMsg(err.message || "Error updating doctor profile");
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
          role: "doctor",
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update security credentials");

      setSuccessMsg("Security credentials updated and active in MongoDB!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setPasswordError(err.message || "Failed to update security password");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background p-margin no-scrollbar">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-md mb-lg">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
              Clinical Profile &amp; Preferences (PKR)
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              Review official institutional credentials and manage your personal practitioner preferences, consultation fee, and security credentials.
            </p>
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
          <div className="mb-lg p-md rounded-2xl bg-secondary-container text-on-secondary-container flex items-center gap-2 clinical-shadow font-semibold text-body-sm transition-all animate-bounce border border-secondary/20">
            <Check className="w-5 h-5 text-secondary shrink-0" /> {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="mb-lg p-md rounded-2xl bg-error-container text-on-error-container flex items-center gap-2 font-semibold text-body-sm">
            <AlertCircle className="w-5 h-5 text-error shrink-0" /> {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-12 gap-gutter mb-lg">
          {/* Card Overview */}
          <div className="col-span-12 lg:col-span-4 glass-card p-margin rounded-[24px] clinical-shadow flex flex-col items-center text-center space-y-md border border-outline-variant/20 self-start">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Doctor Profile Big"
                className="w-32 h-32 rounded-full object-cover border-4 border-primary-fixed clinical-shadow"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBtZDZ50_7mbUAunWgG5wv27gcQnAx1WXclAcGWY-MyUNnJSy2o888KxeCtlKSMNykpc0d7RYpSTLw7uFLAYLvEgvvkrrflFG7D6untiKRdi4d9El4xKPEN6hVyc8htETwm_8hTzDNzQhy0xkYuJXcx6n0gq0A96vd1NBBjCA2xiwbY-ADg0hmV7YL9wdoJYalQxcmuQVKslrNlhK37oQxC6-7rHUyaEeFNfGjyepSYDmtt-fRAinecd6p-bOqaJfuHsR5R1Vo98G0G"
              />
              <div className="absolute bottom-1 right-1 p-2 bg-secondary text-on-secondary rounded-full clinical-shadow">
                <Stethoscope size={16} />
              </div>
            </div>

            <div>
              <h3 className="font-bold text-title-sm text-on-surface">{name}</h3>
              <p className="text-body-sm text-outline mt-0.5">{institutionalData.specialty}</p>
              <span className="inline-block mt-2 text-[11px] font-bold text-primary bg-primary-fixed px-3 py-1 rounded-full uppercase tracking-wider font-mono">
                {institutionalData.employeeId}
              </span>
            </div>

            {/* Badges and Credentials */}
            <div className="w-full space-y-sm pt-4 border-t border-outline-variant/20 text-left text-body-sm text-on-surface-variant">
              <div className="flex items-center gap-3">
                <Award className="text-primary w-5 h-5 shrink-0" />
                <div>
                  <span className="block text-[11px] text-outline font-semibold">License Registration</span>
                  <span className="font-bold text-on-surface text-xs font-mono">{institutionalData.license}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="text-secondary w-5 h-5 shrink-0" />
                <div>
                  <span className="block text-[11px] text-outline font-semibold">Hospital Role</span>
                  <span className="font-bold text-secondary">{institutionalData.role}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="text-[#26A69A] w-5 h-5 shrink-0" />
                <div>
                  <span className="block text-[11px] text-outline font-semibold">Designated Clinic Space</span>
                  <span className="font-bold text-on-surface text-xs">{institutionalData.room}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Building className="text-outline w-5 h-5 shrink-0" />
                <div>
                  <span className="block text-[11px] text-outline font-semibold">Department Wing</span>
                  <span className="font-bold text-on-surface text-xs">{institutionalData.department}</span>
                </div>
              </div>
            </div>

            <div className="w-full p-3 bg-surface-container/40 rounded-xl border border-outline-variant/20 text-left text-xs text-outline space-y-1">
              <p className="font-semibold text-on-surface flex items-center gap-1.5">
                <Lock size={12} className="text-primary" /> Institutional Verification
              </p>
              <p className="leading-relaxed">
                Hospital staff credentials, clinical room allocation, and enterprise email are verified by RoleMed Medical Staff Administration.
              </p>
            </div>
          </div>

          {/* Form Columns */}
          <div className="col-span-12 lg:col-span-8 space-y-gutter">
            {/* LOCKED: Official Hospital Parameters */}
            <div className="glass-card p-margin rounded-[24px] clinical-shadow border border-outline-variant/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-md">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-surface-container text-outline">
                    <Lock size={16} />
                  </div>
                  <div>
                    <h3 className="text-title-sm font-bold text-on-surface">Institutional Credentials</h3>
                    <p className="text-xs text-outline">Official parameters designated by Hospital Administration &amp; IT</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-outline bg-surface-container px-3 py-1 rounded-full uppercase tracking-wider self-start sm:self-auto flex items-center gap-1">
                  <Lock size={12} /> Managed by Hospital
                </span>
              </div>

              <div className="space-y-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                  <div>
                    <label className="block text-body-sm text-outline mb-1 font-semibold flex items-center justify-between">
                      <span>Hospital Domain Email</span>
                      <span className="text-[10px] text-outline flex items-center gap-0.5"><Lock size={10} /> Locked</span>
                    </label>
                    <input
                      type="email"
                      disabled
                      readOnly
                      value={institutionalData.hospitalEmail}
                      className="w-full p-2.5 border border-outline-variant/30 rounded-xl bg-surface-container/60 text-body-sm text-on-surface cursor-not-allowed font-medium select-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-body-sm text-outline mb-1 font-semibold flex items-center justify-between">
                      <span>Clinical Direct Line / Extension</span>
                      <span className="text-[10px] text-outline flex items-center gap-0.5"><Lock size={10} /> Locked</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      readOnly
                      value={institutionalData.clinicalPhone}
                      className="w-full p-2.5 border border-outline-variant/30 rounded-xl bg-surface-container/60 text-body-sm text-on-surface cursor-not-allowed font-medium select-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                  <div>
                    <label className="block text-body-sm text-outline mb-1 font-semibold flex items-center justify-between">
                      <span>Practitioner Room Designation</span>
                      <span className="text-[10px] text-outline flex items-center gap-0.5"><Lock size={10} /> Locked</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      readOnly
                      value={institutionalData.room}
                      className="w-full p-2.5 border border-outline-variant/30 rounded-xl bg-surface-container/60 text-body-sm text-on-surface cursor-not-allowed font-medium select-none"
                    />
                  </div>

                  <div>
                    <label className="block text-body-sm text-outline mb-1 font-semibold flex items-center justify-between">
                      <span>Accredited Clinical Specialty</span>
                      <span className="text-[10px] text-outline flex items-center gap-0.5"><Lock size={10} /> Locked</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      readOnly
                      value={institutionalData.specialty}
                      className="w-full p-2.5 border border-outline-variant/30 rounded-xl bg-surface-container/60 text-body-sm text-on-surface cursor-not-allowed font-medium select-none"
                    />
                  </div>
                </div>

                <div className="p-3 bg-surface-container/30 rounded-xl border border-outline-variant/20 flex items-start gap-2.5 text-xs text-on-surface-variant">
                  <Info size={16} className="text-secondary shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Practitioner room assignments, clinical phone routing, enterprise email accounts, and medical board licenses are governed by Hospital Operations. To request an update, please submit a service ticket to the Medical Staff Office.
                  </p>
                </div>
              </div>
            </div>

            {/* EDITABLE: Practitioner Profile Details */}
            <div className="glass-card p-margin rounded-[24px] clinical-shadow">
              <div className="mb-md">
                <h3 className="text-title-sm font-bold text-on-surface flex items-center gap-2">
                  <User className="text-primary" /> Practitioner Preferences (PKR)
                </h3>
                <p className="text-xs text-outline">
                  Manage your public practitioner bio, consultation fee in Pakistani Rupees, and personal contact
                </p>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-md">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-sm">
                  <div>
                    <label className="block text-body-sm text-outline mb-1 font-semibold">
                      Full Practitioner Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-body-sm text-outline mb-1 font-semibold">
                      Personal / Mobile Phone
                    </label>
                    <input
                      type="text"
                      required
                      value={personalPhone}
                      onChange={(e) => setPersonalPhone(e.target.value)}
                      placeholder="03000000000"
                      className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-body-sm text-outline mb-1 font-semibold">
                      Standard Consultation Fee (PKR)
                    </label>
                    <input
                      type="text"
                      required
                      value={consultFee}
                      onChange={(e) => setConsultFee(e.target.value)}
                      placeholder="Rs. 2,500"
                      className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary font-bold text-secondary font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-body-sm text-outline mb-1 font-semibold">
                    Professional Practitioner Biography
                  </label>
                  <textarea
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary leading-relaxed"
                  ></textarea>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-sm p-3.5 bg-surface-container/20 rounded-xl border border-outline-variant/20">
                  <label className="flex items-center gap-2.5 cursor-pointer text-body-sm text-on-surface">
                    <input
                      type="checkbox"
                      checked={emailAlerts}
                      onChange={(e) => setEmailAlerts(e.target.checked)}
                      className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                    <span>Email notification for new scheduled appointments</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer text-body-sm text-on-surface">
                    <input
                      type="checkbox"
                      checked={smsAlerts}
                      onChange={(e) => setSmsAlerts(e.target.checked)}
                      className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                    <span>SMS alerts for urgent diagnostic lab alerts</span>
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="cursor-pointer flex items-center gap-1.5 px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold clinical-shadow hover:opacity-90 disabled:opacity-50 transition-all text-body-sm"
                  >
                    {savingProfile ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save size={16} /> Save Profile Settings
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Security & Password Credentials */}
            <div className="glass-card p-margin rounded-[24px] clinical-shadow">
              <div className="mb-md">
                <h3 className="text-title-sm font-bold text-on-surface flex items-center gap-2">
                  <Key className="text-primary" /> Security &amp; Password Credentials
                </h3>
                <p className="text-xs text-outline">
                  Update your practitioner password to safeguard HIPAA and clinical patient data.
                </p>
              </div>

              {passwordError && (
                <div className="mb-md p-3 bg-error-container text-on-error-container rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={16} className="text-error" /> {passwordError}
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-sm text-body-sm">
                <div>
                  <label className="block text-outline text-xs mb-1 font-semibold">Current Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                  <div>
                    <label className="block text-outline text-xs mb-1 font-semibold">New Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Min. 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-outline text-xs mb-1 font-semibold">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Retype new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="cursor-pointer flex items-center gap-1.5 px-6 py-2.5 bg-secondary text-on-secondary rounded-xl font-bold clinical-shadow hover:opacity-90 disabled:opacity-50 transition-all text-body-sm"
                  >
                    {savingPassword ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Updating...
                      </>
                    ) : (
                      <>
                        <Key size={16} /> Update Password
                      </>
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
