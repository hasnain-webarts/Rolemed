"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/Admin_Sidebar";
import Header from "@/components/Header";
import {
  CreditCard,
  Building2,
  ShieldCheck,
  Coins,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Sliders,
  Check,
  Split,
  Layers,
  HelpCircle,
} from "lucide-react";

export default function AdminBillingRulesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  const [billingMode, setBillingMode] = useState("Centralized");

  // Advanced Dynamic Department Configuration
  const [deptConfig, setDeptConfig] = useState({
    reception: { enabled: true, mode: "merged", isFinal: true },
    pharmacy: { enabled: true, mode: "merged", isFinal: false },
    laboratory: { enabled: true, mode: "separate", isFinal: false },
  });

  const [clearanceGate, setClearanceGate] = useState({
    requirePaymentForMeds: true,
    requirePaymentForLabs: true,
    emergencyBypass: true,
  });

  const [pricingRules, setPricingRules] = useState({
    defaultCurrency: "PKR",
    taxPercentage: 0,
    autoCalculateBedStayCharges: true,
    dailyBedRateGeneralWard: 1500,
    dailyBedRateICU: 8000,
    dailyBedRateEmergency: 2000,
    standardConsultationFee: 1000,
  });

  const showNotice = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const syncStateFromSettings = (settings) => {
    if (!settings) return;
    setBillingMode(settings.billingMode || "Centralized");

    if (settings.departmentBillingConfig && settings.departmentBillingConfig.reception) {
      setDeptConfig({
        reception: {
          enabled: settings.departmentBillingConfig.reception.enabled ?? true,
          mode: settings.departmentBillingConfig.reception.mode || "merged",
          isFinal: Boolean(settings.departmentBillingConfig.reception.isFinal),
        },
        pharmacy: {
          enabled: settings.departmentBillingConfig.pharmacy.enabled ?? true,
          mode: settings.departmentBillingConfig.pharmacy.mode || "merged",
          isFinal: Boolean(settings.departmentBillingConfig.pharmacy.isFinal),
        },
        laboratory: {
          enabled: settings.departmentBillingConfig.laboratory.enabled ?? true,
          mode: settings.departmentBillingConfig.laboratory.mode || "separate",
          isFinal: Boolean(settings.departmentBillingConfig.laboratory.isFinal),
        },
      });
    } else if (settings.enabledBillingDepartments) {
      setDeptConfig({
        reception: { enabled: Boolean(settings.enabledBillingDepartments.reception), mode: "merged", isFinal: true },
        pharmacy: { enabled: Boolean(settings.enabledBillingDepartments.pharmacy), mode: "merged", isFinal: false },
        laboratory: { enabled: Boolean(settings.enabledBillingDepartments.laboratory), mode: "separate", isFinal: false },
      });
    }

    if (settings.clearanceGate) {
      setClearanceGate(settings.clearanceGate);
    }
    if (settings.pricingRules) {
      setPricingRules(settings.pricingRules);
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/billing-rules");
      const data = await res.json();
      if (data.success && data.settings) {
        syncStateFromSettings(data.settings);
      }
    } catch {
      showNotice("error", "Failed to fetch current hospital billing configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetch("/api/admin/billing-rules");
        const data = await res.json();
        if (isMounted && data.success && data.settings) {
          syncStateFromSettings(data.settings);
        }
      } catch {
        if (isMounted) showNotice("error", "Failed to fetch current hospital billing configuration");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleDeptEnabled = (dept) => {
    setDeptConfig((prev) => ({
      ...prev,
      [dept]: { ...prev[dept], enabled: !prev[dept].enabled },
    }));
    setBillingMode("Custom");
  };

  const setDeptMode = (dept, newMode) => {
    setDeptConfig((prev) => {
      const updated = {
        ...prev,
        [dept]: {
          ...prev[dept],
          mode: newMode,
          // If switching to separate, it cannot be final
          isFinal: newMode === "separate" ? false : prev[dept].isFinal,
        },
      };

      // If this department was final and is now separate, reassign final to the first available merged department
      if (prev[dept].isFinal && newMode === "separate") {
        const otherMerged = ["reception", "pharmacy", "laboratory"].find(
          (d) => d !== dept && updated[d].mode === "merged"
        );
        if (otherMerged) {
          updated[otherMerged].isFinal = true;
        }
      }

      // If switching to merged and no department is currently final, make this one final
      const hasFinal = Object.values(updated).some((c) => c.isFinal && c.mode === "merged");
      if (newMode === "merged" && !hasFinal) {
        updated[dept].isFinal = true;
      }

      return updated;
    });
    setBillingMode("Custom");
  };

  const setDeptFinal = (dept, isFinal) => {
    if (!isFinal) {
      // Don't uncheck if it's the only merged desk
      const mergedDepts = Object.keys(deptConfig).filter((d) => deptConfig[d].mode === "merged");
      if (mergedDepts.length <= 1) {
        showNotice("error", "At least one Merged department must be designated as the Final Billing Desk");
        return;
      }
    }

    setDeptConfig((prev) => {
      const updated = { ...prev };
      ["reception", "pharmacy", "laboratory"].forEach((d) => {
        if (d === dept) {
          updated[d] = { ...updated[d], isFinal: isFinal };
        } else if (isFinal) {
          // Exactly one department can be final
          updated[d] = { ...updated[d], isFinal: false };
        }
      });
      return updated;
    });
    setBillingMode("Custom");
  };

  const applyPresetMode = (mode) => {
    setBillingMode(mode);
    if (mode === "Centralized") {
      setDeptConfig({
        reception: { enabled: true, mode: "merged", isFinal: true },
        pharmacy: { enabled: true, mode: "merged", isFinal: false },
        laboratory: { enabled: true, mode: "merged", isFinal: false },
      });
      setClearanceGate((prev) => ({ ...prev, requirePaymentForMeds: true, requirePaymentForLabs: true }));
    } else if (mode === "Decentralized") {
      setDeptConfig({
        reception: { enabled: true, mode: "separate", isFinal: false },
        pharmacy: { enabled: true, mode: "separate", isFinal: false },
        laboratory: { enabled: true, mode: "separate", isFinal: false },
      });
      setClearanceGate((prev) => ({ ...prev, requirePaymentForMeds: true, requirePaymentForLabs: true }));
    } else if (mode === "Hybrid") {
      // Reception handles Bed + OPD + Pharmacy; Laboratory handles its own tests
      setDeptConfig({
        reception: { enabled: true, mode: "merged", isFinal: true },
        pharmacy: { enabled: true, mode: "merged", isFinal: false },
        laboratory: { enabled: true, mode: "separate", isFinal: false },
      });
      setClearanceGate((prev) => ({ ...prev, requirePaymentForMeds: true, requirePaymentForLabs: true }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        billingMode,
        departmentBillingConfig: deptConfig,
        clearanceGate,
        pricingRules,
      };

      const res = await fetch("/api/admin/billing-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showNotice("success", "Hospital billing configuration & department rules saved successfully");
      } else {
        showNotice("error", data.error || "Failed to update hospital billing policy");
      }
    } catch {
      showNotice("error", "Network error updating billing configuration");
    } finally {
      setSaving(false);
    }
  };

  // Human-readable summary of active billing policy
  const getRoutingSummary = () => {
    const finalDept = ["reception", "pharmacy", "laboratory"].find(
      (d) => deptConfig[d].mode === "merged" && deptConfig[d].isFinal
    );
    const mergedDepts = ["reception", "pharmacy", "laboratory"].filter(
      (d) => deptConfig[d].mode === "merged"
    );
    const separateDepts = ["reception", "pharmacy", "laboratory"].filter(
      (d) => deptConfig[d].mode === "separate"
    );

    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

    if (finalDept && mergedDepts.length > 0) {
      const mergedNames = mergedDepts.map(capitalize).join(" and ");
      const sepText =
        separateDepts.length > 0
          ? ` ${separateDepts.map(capitalize).join(" and ")} operate(s) independent separate billing counters.`
          : " All hospital charges are consolidated at this single counter.";
      return (
        <span>
          <strong>{capitalize(finalDept)}</strong> is the designated <strong>Final Billing Desk</strong>,
          consolidating all unpaid charges from <strong>{mergedNames}</strong>.{sepText}
        </span>
      );
    } else {
      return (
        <span>
          All departments operate as <strong>Separate Autonomous Counters</strong>. Each department issues
          and collects invoices for its own services independently.
        </span>
      );
    }
  };

  const departmentMeta = [
    {
      key: "reception",
      name: "Reception Cashier Desk",
      desc: "Inpatient bed stays, nursing accommodation, OPD consultations, and master hospital checkout.",
      color: "border-blue-500",
    },
    {
      key: "pharmacy",
      name: "Pharmacy Dispensary Counter",
      desc: "Prescription medications, direct pharmaceutical sales, and drug dispensing.",
      color: "border-emerald-500",
    },
    {
      key: "laboratory",
      name: "Diagnostic Laboratory Counter",
      desc: "Pathology tests, bloodwork specimens, radiology, and diagnostic order billing.",
      color: "border-purple-500",
    },
  ];

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header onMenuClick={() => setSidebarOpen(true)} title="Billing Rules & Workflow Policy" />

        <main className="p-6 md:p-8 max-w-6xl mx-auto w-full space-y-6">
          {/* Page Title & Save Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <CreditCard className="w-4 h-4" />
                <span>Financial Workflow Configuration</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mt-1">
                Hospital Billing Rules & Departmental Routing
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Configure centralized cashier collection, separate departmental billing counters, clearance gates, and bed stay pricing in PKR.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchSettings}
                disabled={loading}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-700 font-medium text-sm flex items-center gap-2 transition"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                <span>Reload</span>
              </button>

              <button
                onClick={handleSave}
                disabled={saving || loading}
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium text-sm flex items-center gap-2 shadow-sm transition disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save Billing Policy</span>
              </button>
            </div>
          </div>

          {/* Flash Notice */}
          {notification && (
            <div
              className={`p-4 rounded-xl flex items-center gap-3 border text-sm font-medium ${
                notification.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}
            >
              {notification.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
          )}

          {/* Section 1: Billing Architecture Modes (Presets) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  <span>Hospital Billing Architecture Presets</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Quickly apply standard operational templates or fine-tune departmental rules below.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                Active: {billingMode} Mode
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Centralized Mode */}
              <div
                onClick={() => applyPresetMode("Centralized")}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition relative flex flex-col justify-between ${
                  billingMode === "Centralized"
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-base">Centralized Cashier</span>
                    {billingMode === "Centralized" && (
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    All hospital charges (OPD, Inpatient stays, Pharmacy medicines, and Lab tests) are collected at the Main Reception Cashier Desk on a single consolidated invoice.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-primary">
                  <span>1 Consolidated Receipt</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Hybrid Mode */}
              <div
                onClick={() => applyPresetMode("Hybrid")}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition relative flex flex-col justify-between ${
                  billingMode === "Hybrid"
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-base">Hybrid Routing</span>
                    {billingMode === "Hybrid" && (
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Reception handles Consultations, Admissions, and Pharmacy medication invoices. Laboratory maintains its own independent collection counter.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-primary">
                  <span>Merged Rx + Separate Lab</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Decentralized Mode */}
              <div
                onClick={() => applyPresetMode("Decentralized")}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition relative flex flex-col justify-between ${
                  billingMode === "Decentralized"
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-base">Decentralized Counters</span>
                    {billingMode === "Decentralized" && (
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Every department operates its own autonomous cash counter. Reception bills clinic fees, Pharmacy bills drugs at dispensary, and Lab bills tests.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-primary">
                  <span>3 Autonomous Counters</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Department-Level Billing Policy (Merged / Separate / Final) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-primary" />
                  <span>Department Billing Rules & Final Desk Designation</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose between <strong>Separate</strong> or <strong>Merged</strong> billing per department. The department with <strong>Final</strong> checked on consolidates and collects the final bill for all Merged departments.
                </p>
              </div>
              <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200 font-mono">
                Real-Time Routing Engine
              </span>
            </div>

            {/* Department Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {departmentMeta.map((dept) => {
                const config = deptConfig[dept.key] || { enabled: true, mode: "merged", isFinal: false };
                const isMerged = config.mode === "merged";
                const isFinal = Boolean(config.isFinal);

                return (
                  <div
                    key={dept.key}
                    className={`rounded-2xl border p-5 transition flex flex-col justify-between ${
                      config.enabled
                        ? isFinal
                          ? "border-primary bg-primary/[0.02] shadow-sm"
                          : "border-slate-200 bg-white"
                        : "border-slate-200 bg-slate-50/70 opacity-60"
                    }`}
                  >
                    <div>
                      {/* Department Title & Enabled Switch */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-sm text-slate-800 block">
                            {dept.name}
                          </span>
                          <span className="text-[11px] text-slate-500 mt-1 block leading-snug">
                            {dept.desc}
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                          <input
                            type="checkbox"
                            checked={config.enabled}
                            onChange={() => toggleDeptEnabled(dept.key)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>

                      {/* Mode Segmented Toggle: Merged vs Separate */}
                      <div className="mt-5 space-y-2">
                        <label className="text-xs font-semibold text-slate-600 flex items-center justify-between">
                          <span>Billing Mode</span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              isMerged
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {isMerged ? "Combined" : "Autonomous"}
                          </span>
                        </label>

                        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl gap-1 border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setDeptMode(dept.key, "merged")}
                            className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                              isMerged
                                ? "bg-white text-primary shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Merged</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeptMode(dept.key, "separate")}
                            className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                              !isMerged
                                ? "bg-white text-slate-800 shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            <Split className="w-3.5 h-3.5" />
                            <span>Separate</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Final Billing Checkbox Option */}
                    <div className="mt-5 pt-4 border-t border-slate-100">
                      <label
                        className={`flex items-start gap-3 p-3 rounded-xl border transition ${
                          !isMerged
                            ? "bg-slate-50 border-slate-100 cursor-not-allowed opacity-50"
                            : isFinal
                            ? "bg-primary/10 border-primary/30 text-primary cursor-pointer"
                            : "bg-white border-slate-200 hover:bg-slate-50 cursor-pointer"
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={!isMerged}
                          checked={isFinal}
                          onChange={(e) => setDeptFinal(dept.key, e.target.checked)}
                          className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary mt-0.5"
                        />
                        <div className="text-xs">
                          <span className={`font-bold block ${isFinal ? "text-primary" : "text-slate-800"}`}>
                            Final Billing Desk {isFinal && "✓"}
                          </span>
                          <span className="text-[11px] text-slate-500 mt-0.5 block">
                            {!isMerged
                              ? "Disabled in Separate mode"
                              : isFinal
                              ? "Collects final bill for all Merged departments"
                              : "Check to make this the final billing counter"}
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dynamic Real-Time Workflow Summary */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold text-slate-800 block text-xs">Active Routing Summary:</span>
                <p className="mt-0.5">{getRoutingSummary()}</p>
              </div>
            </div>
          </div>

          {/* Section 3: Clinical Clearance Gates */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Clinical Clearance Gates & Settlement Enforcements</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Enforce mandatory financial clearance before dispensing medications or conducting pathology laboratory tests.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <label className="flex items-start justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50/50 cursor-pointer">
                <div>
                  <span className="font-semibold text-sm text-slate-800 block">Pre-Payment for Medications</span>
                  <span className="text-xs text-slate-400 mt-0.5 block">
                    Dispensary requires paid hospital receipt before stock release.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={clearanceGate.requirePaymentForMeds}
                  onChange={(e) =>
                    setClearanceGate({ ...clearanceGate, requirePaymentForMeds: e.target.checked })
                  }
                  className="w-5 h-5 text-primary rounded border-slate-300 focus:ring-primary shrink-0 ml-3"
                />
              </label>

              <label className="flex items-start justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50/50 cursor-pointer">
                <div>
                  <span className="font-semibold text-sm text-slate-800 block">Pre-Payment for Diagnostic Tests</span>
                  <span className="text-xs text-slate-400 mt-0.5 block">
                    Pathology requires paid test slip before specimen draw.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={clearanceGate.requirePaymentForLabs}
                  onChange={(e) =>
                    setClearanceGate({ ...clearanceGate, requirePaymentForLabs: e.target.checked })
                  }
                  className="w-5 h-5 text-primary rounded border-slate-300 focus:ring-primary shrink-0 ml-3"
                />
              </label>

              <label className="flex items-start justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50/50 cursor-pointer">
                <div>
                  <span className="font-semibold text-sm text-slate-800 block">Emergency & ICU Bypass</span>
                  <span className="text-xs text-slate-400 mt-0.5 block">
                    Allow instant fulfillment for critical trauma and emergency cases.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={clearanceGate.emergencyBypass}
                  onChange={(e) =>
                    setClearanceGate({ ...clearanceGate, emergencyBypass: e.target.checked })
                  }
                  className="w-5 h-5 text-primary rounded border-slate-300 focus:ring-primary shrink-0 ml-3"
                />
              </label>
            </div>
          </div>

          {/* Section 4: Inpatient Bed Stay Rates & Consultation Pricing (PKR) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" />
                <span>Hospital Tariff & Inpatient Rates (PKR)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Standard daily bed accrual rates applied during inpatient discharge and centralized billing.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <label className="text-xs font-semibold text-slate-600 block">General Ward (per day)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rs.</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={pricingRules.dailyBedRateGeneralWard}
                    onChange={(e) =>
                      setPricingRules({
                        ...pricingRules,
                        dailyBedRateGeneralWard: Number(e.target.value),
                      })
                    }
                    className="w-full pl-9 pr-3 py-2 bg-white rounded-lg border border-slate-200 text-sm font-bold text-slate-800 focus:ring-primary focus:border-primary"
                  />
                </div>
                <span className="text-[11px] text-slate-400">Standard inpatient beds</span>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <label className="text-xs font-semibold text-slate-600 block">ICU / CCU (per day)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rs.</span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={pricingRules.dailyBedRateICU}
                    onChange={(e) =>
                      setPricingRules({
                        ...pricingRules,
                        dailyBedRateICU: Number(e.target.value),
                      })
                    }
                    className="w-full pl-9 pr-3 py-2 bg-white rounded-lg border border-slate-200 text-sm font-bold text-slate-800 focus:ring-primary focus:border-primary"
                  />
                </div>
                <span className="text-[11px] text-slate-400">Intensive care units</span>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <label className="text-xs font-semibold text-slate-600 block">Emergency Trauma (per day)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rs.</span>
                  <input
                    type="number"
                    min="0"
                    step="200"
                    value={pricingRules.dailyBedRateEmergency}
                    onChange={(e) =>
                      setPricingRules({
                        ...pricingRules,
                        dailyBedRateEmergency: Number(e.target.value),
                      })
                    }
                    className="w-full pl-9 pr-3 py-2 bg-white rounded-lg border border-slate-200 text-sm font-bold text-slate-800 focus:ring-primary focus:border-primary"
                  />
                </div>
                <span className="text-[11px] text-slate-400">Trauma & observation beds</span>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <label className="text-xs font-semibold text-slate-600 block">Standard Consultation Fee</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rs.</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={pricingRules.standardConsultationFee}
                    onChange={(e) =>
                      setPricingRules({
                        ...pricingRules,
                        standardConsultationFee: Number(e.target.value),
                      })
                    }
                    className="w-full pl-9 pr-3 py-2 bg-white rounded-lg border border-slate-200 text-sm font-bold text-slate-800 focus:ring-primary focus:border-primary"
                  />
                </div>
                <span className="text-[11px] text-slate-400">General OPD appointment fee</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
