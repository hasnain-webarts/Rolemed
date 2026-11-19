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
  Layers,
  ArrowRight,
  Sliders,
  DollarSign,
  ShieldAlert,
} from "lucide-react";

export default function AdminBillingRulesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  const [billingMode, setBillingMode] = useState("Centralized");
  const [departments, setDepartments] = useState({
    reception: true,
    pharmacy: false,
    laboratory: false,
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

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/billing-rules");
      const data = await res.json();
      if (data.success && data.settings) {
        setBillingMode(data.settings.billingMode || "Centralized");
        setDepartments(
          data.settings.enabledBillingDepartments || {
            reception: true,
            pharmacy: false,
            laboratory: false,
          }
        );
        setClearanceGate(
          data.settings.clearanceGate || {
            requirePaymentForMeds: true,
            requirePaymentForLabs: true,
            emergencyBypass: true,
          }
        );
        setPricingRules(
          data.settings.pricingRules || {
            defaultCurrency: "PKR",
            taxPercentage: 0,
            autoCalculateBedStayCharges: true,
            dailyBedRateGeneralWard: 1500,
            dailyBedRateICU: 8000,
            dailyBedRateEmergency: 2000,
            standardConsultationFee: 1000,
          }
        );
      }
    } catch {
      showNotice("error", "Failed to fetch current hospital billing configuration");
    } finally {
      setLoading(false);
    }
  };

  const showNotice = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const applyPresetMode = (mode) => {
    setBillingMode(mode);
    if (mode === "Centralized") {
      setDepartments({ reception: true, pharmacy: false, laboratory: false });
      setClearanceGate((prev) => ({ ...prev, requirePaymentForMeds: true, requirePaymentForLabs: true }));
    } else if (mode === "Decentralized") {
      setDepartments({ reception: true, pharmacy: true, laboratory: true });
      setClearanceGate((prev) => ({ ...prev, requirePaymentForMeds: true, requirePaymentForLabs: true }));
    } else if (mode === "Hybrid") {
      // Reception handles OPD + Pharmacy; Laboratory handles its own tests
      setDepartments({ reception: true, pharmacy: false, laboratory: true });
      setClearanceGate((prev) => ({ ...prev, requirePaymentForMeds: true, requirePaymentForLabs: true }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        billingMode,
        enabledBillingDepartments: departments,
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

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header onMenuClick={() => setSidebarOpen(true)} title="Billing Rules & Workflow Policy" />

        <main className="p-6 md:p-8 max-w-6xl mx-auto w-full space-y-6">
          {/* Page Title & Actions */}
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

          {/* Section 1: Billing Architecture Modes */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  <span>Hospital Billing Architecture</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Select how patient charges from Reception, Pharmacy, and Diagnostics are consolidated or separated.
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
                    All hospital charges (OPD consultations, Inpatient bed stays, Pharmacy medicines, and Lab tests) are collected at the Main Reception Cashier Desk on a single consolidated invoice.
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
                    Reception handles Consultations, Admissions, and Pharmacy medication invoices. Laboratory pathology maintains its own independent collection counter and diagnostic reports.
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
                    Every department operates its own autonomous cash counter. Reception bills clinic fees, Pharmacy bills drugs directly at the dispensary, and Laboratory bills diagnostic tests.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-primary">
                  <span>3 Departmental Counters</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Department Collection Switches & Clearance Gates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Department Collection Toggles */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary" />
                  <span>Enabled Billing Desks</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Activate or deactivate cash collection permissions per department.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50/50 cursor-pointer">
                  <div>
                    <span className="font-semibold text-sm text-slate-800 block">Reception Cashier Desk</span>
                    <span className="text-xs text-slate-400">Consolidated inpatient, outpatient, and master bills</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={departments.reception}
                    onChange={(e) => {
                      setDepartments({ ...departments, reception: e.target.checked });
                      setBillingMode("Custom");
                    }}
                    className="w-5 h-5 text-primary rounded border-slate-300 focus:ring-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50/50 cursor-pointer">
                  <div>
                    <span className="font-semibold text-sm text-slate-800 block">Pharmacy Dispensary Counter</span>
                    <span className="text-xs text-slate-400">Direct medication sales and prescription invoices</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={departments.pharmacy}
                    onChange={(e) => {
                      setDepartments({ ...departments, pharmacy: e.target.checked });
                      setBillingMode("Custom");
                    }}
                    className="w-5 h-5 text-primary rounded border-slate-300 focus:ring-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50/50 cursor-pointer">
                  <div>
                    <span className="font-semibold text-sm text-slate-800 block">Diagnostic Laboratory Counter</span>
                    <span className="text-xs text-slate-400">Test specimen intake and pathology test invoices</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={departments.laboratory}
                    onChange={(e) => {
                      setDepartments({ ...departments, laboratory: e.target.checked });
                      setBillingMode("Custom");
                    }}
                    className="w-5 h-5 text-primary rounded border-slate-300 focus:ring-primary"
                  />
                </label>
              </div>
            </div>

            {/* Clearance Gates & Dispensary Rules */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Clinical Clearance Gates</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enforce financial clearance before dispensing items or processing tests.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50/50 cursor-pointer">
                  <div>
                    <span className="font-semibold text-sm text-slate-800 block">Pre-Payment for Medications</span>
                    <span className="text-xs text-slate-400">Pharmacy requires paid invoice before stock release</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={clearanceGate.requirePaymentForMeds}
                    onChange={(e) =>
                      setClearanceGate({ ...clearanceGate, requirePaymentForMeds: e.target.checked })
                    }
                    className="w-5 h-5 text-primary rounded border-slate-300 focus:ring-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50/50 cursor-pointer">
                  <div>
                    <span className="font-semibold text-sm text-slate-800 block">Pre-Payment for Diagnostic Tests</span>
                    <span className="text-xs text-slate-400">Lab requires paid invoice before test sample collection</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={clearanceGate.requirePaymentForLabs}
                    onChange={(e) =>
                      setClearanceGate({ ...clearanceGate, requirePaymentForLabs: e.target.checked })
                    }
                    className="w-5 h-5 text-primary rounded border-slate-300 focus:ring-primary"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50/50 cursor-pointer">
                  <div>
                    <span className="font-semibold text-sm text-slate-800 block">Emergency & ICU Bypass</span>
                    <span className="text-xs text-slate-400">Allow instant fulfillment for critical emergency patients</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={clearanceGate.emergencyBypass}
                    onChange={(e) =>
                      setClearanceGate({ ...clearanceGate, emergencyBypass: e.target.checked })
                    }
                    className="w-5 h-5 text-primary rounded border-slate-300 focus:ring-primary"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Section 3: Inpatient Bed Stay Rates & Consultation Pricing */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" />
                <span>Hospital Tariff & Daily Inpatient Rates (PKR)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Standard daily bed accrual rates applied during patient discharge and centralized billing.
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
