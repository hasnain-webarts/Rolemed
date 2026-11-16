"use client";

import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "@/components/Admin_Sidebar";
import Footer from "@/components/Footer";
import {
  MdSearch,
  MdClose,
  MdRefresh,
  MdFileDownload,
  MdOutlineAddBox,
  MdBuild,
  MdHistory,
  MdCheckCircle,
  MdWarning,
  MdErrorOutline,
  MdBed,
  MdFilterList,
} from "react-icons/md";
import {
  Cpu,
  Activity,
  Wrench,
  ShieldCheck,
  AlertTriangle,
  Building,
  Calendar,
  DollarSign,
  Layers,
  ChevronRight,
  ExternalLink,
  Check,
  X,
} from "lucide-react";
import { exportToCsv } from "@/lib/csvExport";

const DEPARTMENTS = [
  "All Departments",
  "ICU",
  "Emergency Room",
  "General Ward A",
  "General Ward B",
  "Operation Theater 1",
  "Operation Theater 2",
  "Dialysis Center",
  "Cardiology",
  "Radiology & Imaging",
  "Pathology Lab",
  "Pediatrics Ward",
  "Maternity Ward",
  "Outpatient Department (OPD)",
];

const CATEGORIES = [
  "All Assets",
  "Biomedical Machinery",
  "Hospital Bed",
  "Diagnostic Imaging",
  "Surgical & OT Equipment",
  "Laboratory Instrument",
  "Life Support & Monitoring",
  "Facility Infrastructure",
];

const STATUSES = ["All Statuses", "Operational", "In Use", "Under Maintenance", "Needs Inspection", "Decommissioned"];

export default function AdminEquipmentsPage() {
  const [equipments, setEquipments] = useState([]);
  const [stats, setStats] = useState({
    totalAssets: 0,
    operational: 0,
    inUse: 0,
    underMaintenance: 0,
    needsInspection: 0,
    decommissioned: 0,
    totalValuationPkr: 0,
    totalBeds: 0,
    operationalBeds: 0,
    overdueMaintenance: 0,
    uptimePercentage: 100,
  });

  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Assets");
  const [selectedDepartment, setSelectedDepartment] = useState("All Departments");
  const [selectedStatus, setSelectedStatus] = useState("All Statuses");
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Modals state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [activeAsset, setActiveAsset] = useState(null);

  // Notifications
  const [feedbackNotice, setFeedbackNotice] = useState("");
  const [errorNotice, setErrorNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State: Register Asset
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("Biomedical Machinery");
  const [formManufacturer, setFormManufacturer] = useState("Siemens Healthineers");
  const [formModel, setFormModel] = useState("");
  const [formSerial, setFormSerial] = useState("");
  const [formDepartment, setFormDepartment] = useState("ICU");
  const [formRoom, setFormRoom] = useState("ICU Bay 1");
  const [formBedNumber, setFormBedNumber] = useState("");
  const [formStatus, setFormStatus] = useState("Operational");
  const [formCondition, setFormCondition] = useState("Excellent");
  const [formPurchaseDate, setFormPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [formPurchaseCost, setFormPurchaseCost] = useState("");
  const [formVendor, setFormVendor] = useState("Siemens Healthcare (Pvt) Ltd - Lahore");
  const [formVendorContact, setFormVendorContact] = useState("042-35870000");
  const [formWarrantyDate, setFormWarrantyDate] = useState("");
  const [formIntervalDays, setFormIntervalDays] = useState("90");
  const [formTechnician, setFormTechnician] = useState("Engr. Hamza Biomedical Lead");
  const [formNotes, setFormNotes] = useState("");

  // Form State: Service Log
  const [serviceType, setServiceType] = useState("Routine Preventive Maintenance");
  const [serviceTechName, setServiceTechName] = useState("Engr. Hamza Biomedical Lead");
  const [serviceVendor, setServiceVendor] = useState("In-House Biomedical Engineering");
  const [serviceDescription, setServiceDescription] = useState("Scheduled quarterly calibration and diagnostic checkout.");
  const [serviceCost, setServiceCost] = useState("0");
  const [serviceParts, setServiceParts] = useState("");
  const [restoreOperational, setRestoreOperational] = useState(true);
  const [nextScheduledDate, setNextScheduledDate] = useState("");

  // Load equipments from API
  useEffect(() => {
    let ignore = false;
    async function fetchAssets() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (selectedCategory !== "All Assets") queryParams.set("category", selectedCategory);
        if (selectedDepartment !== "All Departments") queryParams.set("department", selectedDepartment);
        if (selectedStatus !== "All Statuses") queryParams.set("status", selectedStatus);
        if (overdueOnly) queryParams.set("maintenance", "overdue");
        if (searchQuery.trim()) queryParams.set("search", searchQuery.trim());

        const res = await fetch(`/api/admin/equipments?${queryParams.toString()}`, { cache: "no-store" });
        const data = await res.json();
        if (!ignore && data.success) {
          setEquipments(data.equipments || []);
          if (data.stats) setStats(data.stats);
        }
      } catch (err) {
        console.error("Error loading equipments:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchAssets();
    return () => {
      ignore = true;
    };
  }, [selectedCategory, selectedDepartment, selectedStatus, overdueOnly, searchQuery, refreshKey]);

  // Client-side quick filter
  const filteredEquipments = useMemo(() => {
    return equipments.filter((item) => {
      if (overdueOnly) {
        if (!item.nextMaintenanceDate || new Date(item.nextMaintenanceDate) > new Date()) {
          return false;
        }
      }
      return true;
    });
  }, [equipments, overdueOnly]);

  // Register Asset Submit
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formSerial.trim() || !formPurchaseCost) {
      setErrorNotice("Asset Name, Serial Number, and Purchase Cost in PKR are mandatory.");
      return;
    }

    setIsSubmitting(true);
    setErrorNotice("");
    try {
      const payload = {
        name: formName.trim(),
        category: formCategory,
        manufacturer: formManufacturer.trim(),
        modelNumber: formModel.trim() || "Standard",
        serialNumber: formSerial.trim(),
        department: formDepartment,
        locationRoom: formRoom.trim(),
        bedNumber: formCategory === "Hospital Bed" ? formBedNumber.trim().toUpperCase() : undefined,
        status: formStatus,
        condition: formCondition,
        purchaseDate: formPurchaseDate,
        purchaseCostPkr: parseFloat(formPurchaseCost),
        vendorName: formVendor.trim(),
        vendorContact: formVendorContact.trim(),
        warrantyExpiry: formWarrantyDate ? formWarrantyDate : undefined,
        maintenanceIntervalDays: parseInt(formIntervalDays, 10) || 90,
        assignedTechnician: formTechnician.trim(),
        notes: formNotes.trim(),
      };

      const res = await fetch("/api/admin/equipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to register hospital asset.");
      }

      setFeedbackNotice(`Asset "${data.equipment.assetId} - ${data.equipment.name}" registered successfully.`);
      setIsRegisterModalOpen(false);
      // Reset form
      setFormName("");
      setFormSerial("");
      setFormModel("");
      setFormPurchaseCost("");
      setFormNotes("");
      setRefreshKey((k) => k + 1);
      setTimeout(() => setFeedbackNotice(""), 4000);
    } catch (err) {
      setErrorNotice(err.message || "Failed to submit asset registration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Service Modal
  const openServiceModal = (asset) => {
    setActiveAsset(asset);
    setServiceType("Routine Preventive Maintenance");
    setServiceTechName(asset.assignedTechnician || "Engr. Hamza Biomedical Lead");
    setServiceVendor(asset.vendorName || "In-House Biomedical Engineering");
    setServiceDescription(`Routine servicing and sensor validation for ${asset.name}.`);
    setServiceCost("0");
    setServiceParts("");
    setRestoreOperational(asset.status === "Under Maintenance" || asset.status === "Needs Inspection");

    // Suggest next date 90 days ahead
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + (asset.maintenanceIntervalDays || 90));
    setNextScheduledDate(nextDate.toISOString().split("T")[0]);

    setIsServiceModalOpen(true);
  };

  // Submit Service Log
  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    if (!activeAsset) return;

    setIsSubmitting(true);
    setErrorNotice("");

    try {
      const partsArray = serviceParts
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);

      const payload = {
        newServiceLog: {
          serviceType,
          technicianName: serviceTechName.trim(),
          vendor: serviceVendor.trim(),
          description: serviceDescription.trim(),
          costPkr: parseFloat(serviceCost) || 0,
          partsReplaced: partsArray,
          nextScheduled: nextScheduledDate || undefined,
        },
      };

      if (restoreOperational) {
        payload.status = "Operational";
        payload.condition = "Good";
      }

      const res = await fetch(`/api/admin/equipments/${activeAsset._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to log maintenance record.");
      }

      setFeedbackNotice(`Maintenance record logged for ${activeAsset.assetId}.`);
      setIsServiceModalOpen(false);
      setRefreshKey((k) => k + 1);
      setTimeout(() => setFeedbackNotice(""), 4000);
    } catch (err) {
      setErrorNotice(err.message || "Failed to record service.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Decommission Asset
  const handleDecommission = async (asset) => {
    if (!window.confirm(`Are you sure you want to decommission "${asset.assetId} - ${asset.name}"? This removes it from active operations.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/equipments/${asset._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to decommission asset.");
      }
      setFeedbackNotice(`Asset ${asset.assetId} has been decommissioned.`);
      setRefreshKey((k) => k + 1);
      setTimeout(() => setFeedbackNotice(""), 4000);
    } catch (err) {
      setErrorNotice(err.message || "Failed to decommission asset.");
      setTimeout(() => setErrorNotice(""), 4000);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const columns = [
      { key: "assetId", label: "Asset Tag" },
      { key: "name", label: "Asset Name" },
      { key: "category", label: "Category" },
      { key: "manufacturer", label: "Manufacturer" },
      { key: "modelNumber", label: "Model" },
      { key: "serialNumber", label: "Serial Number" },
      { key: "department", label: "Department" },
      { key: "locationRoom", label: "Room / Bay" },
      { key: "bedNumber", label: "Bed Number" },
      { key: "status", label: "Current Status" },
      { key: "condition", label: "Physical Condition" },
      { key: "purchaseCostPkr", label: "Cost (PKR)" },
      { key: "vendorName", label: "Supplier / Vendor" },
      { key: "lastServicedDate", label: "Last Serviced" },
      { key: "nextMaintenanceDate", label: "Next Scheduled Service" },
      { key: "assignedTechnician", label: "Assigned Biomedical Eng." },
    ];

    exportToCsv("rolemed_hospital_asset_fleet.csv", columns, filteredEquipments);
    setFeedbackNotice(`Exported ${filteredEquipments.length} equipment & asset records.`);
    setTimeout(() => setFeedbackNotice(""), 3500);
  };

  // Status Badge Helper
  const renderStatusBadge = (status) => {
    switch (status) {
      case "Operational":
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Operational</span>;
      case "In Use":
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20">In Use</span>;
      case "Under Maintenance":
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20">Maintenance</span>;
      case "Needs Inspection":
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-orange-500/10 text-orange-600 border border-orange-500/20">Needs Inspect</span>;
      case "Decommissioned":
      default:
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-zinc-500/10 text-zinc-600 border border-zinc-500/20">Decommissioned</span>;
    }
  };

  // Condition Badge Helper
  const renderConditionBadge = (condition) => {
    switch (condition) {
      case "Excellent":
        return <span className="text-[11px] font-semibold text-emerald-600">● Excellent</span>;
      case "Good":
        return <span className="text-[11px] font-semibold text-teal-600">● Good</span>;
      case "Fair":
        return <span className="text-[11px] font-semibold text-amber-600">● Fair</span>;
      case "Requires Service":
      case "Critical / Degraded":
        return <span className="text-[11px] font-bold text-rose-600">▲ Critical</span>;
      default:
        return <span className="text-[11px] text-outline">● {condition}</span>;
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
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-black font-headline tracking-tight text-on-surface">
                    Equipments &amp; Asset Fleet
                  </h1>
                  <p className="text-xs text-outline mt-0.5">
                    Biomedical machinery, life support systems, OT instruments, and hospital bed management.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center flex-wrap gap-2.5">
              <button
                onClick={() => setRefreshKey((k) => k + 1)}
                disabled={loading}
                className="cursor-pointer px-3.5 py-2 border border-outline-variant/30 rounded-xl text-xs font-semibold hover:bg-surface-container flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <MdRefresh className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>

              <button
                onClick={handleExportCsv}
                className="cursor-pointer px-3.5 py-2 border border-outline-variant/30 rounded-xl text-xs font-semibold hover:bg-surface-container flex items-center gap-2 transition-all"
              >
                <MdFileDownload className="w-4 h-4 text-primary" />
                Export CSV
              </button>

              <button
                onClick={() => setIsRegisterModalOpen(true)}
                className="cursor-pointer flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-xl font-bold text-xs hover:opacity-90 transition-all shadow-xs"
              >
                <MdOutlineAddBox className="w-4 h-4" />
                Register Asset / Bed
              </button>
            </div>
          </div>

          {/* Feedback Notices */}
          {feedbackNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 shrink-0" />
              <span>{feedbackNotice}</span>
            </div>
          )}

          {errorNotice && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <X className="w-4 h-4 shrink-0" />
              <span>{errorNotice}</span>
            </div>
          )}

          {/* 4 Top KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Assets & Valuation */}
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
              <div className="flex justify-between items-center text-outline mb-1.5">
                <span className="text-xs font-semibold">Hospital Asset Fleet</span>
                <Cpu className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-2xl font-black font-headline text-on-surface">{stats.totalAssets}</h3>
              <p className="text-[11px] font-bold text-primary mt-1">
                Rs. {(stats.totalValuationPkr || 0).toLocaleString()} Capitalized
              </p>
            </div>

            {/* Card 2: Operational Uptime */}
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
              <div className="flex justify-between items-center text-outline mb-1.5">
                <span className="text-xs font-semibold">Fleet Readiness</span>
                <Activity className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-black font-headline text-emerald-600 dark:text-emerald-400">
                {stats.uptimePercentage}%
              </h3>
              <p className="text-[11px] text-outline mt-1">
                {stats.operational + stats.inUse} of {stats.totalAssets - stats.decommissioned} active units operational
              </p>
            </div>

            {/* Card 3: Maintenance & Overdue */}
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
              <div className="flex justify-between items-center text-outline mb-1.5">
                <span className="text-xs font-semibold">Service Alerts</span>
                <Wrench className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-black font-headline text-amber-600 dark:text-amber-400">
                  {stats.underMaintenance + stats.needsInspection}
                </h3>
                {stats.overdueMaintenance > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-600 border border-rose-500/20">
                    {stats.overdueMaintenance} Overdue
                  </span>
                )}
              </div>
              <p className="text-[11px] text-outline mt-1">Under inspection or scheduled service</p>
            </div>

            {/* Card 4: Ward Bed Fleet */}
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
              <div className="flex justify-between items-center text-outline mb-1.5">
                <span className="text-xs font-semibold">Ward Bed Fleet</span>
                <MdBed className="w-5 h-5 text-purple-500" />
              </div>
              <h3 className="text-2xl font-black font-headline text-purple-600 dark:text-purple-400">
                {stats.operationalBeds} / {stats.totalBeds}
              </h3>
              <p className="text-[11px] text-outline mt-1">ICU, Semi-Fowler &amp; General Ward beds</p>
            </div>
          </div>

          {/* Category Tabs / Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`cursor-pointer px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-primary text-on-primary shadow-xs"
                    : "bg-surface-container-lowest border border-outline-variant/20 text-outline hover:text-on-surface hover:bg-surface-container"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search & Select Filters */}
          <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
              <input
                type="text"
                placeholder="Search tag (EQP-), model, serial, room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-surface-container text-xs text-on-surface border border-outline-variant/20 focus:outline-none focus:border-primary placeholder:text-outline/60"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                >
                  <MdClose className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {/* Department Dropdown */}
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="cursor-pointer px-3 py-2 rounded-xl bg-surface-container text-xs text-on-surface border border-outline-variant/20 focus:outline-none focus:border-primary font-medium"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>

              {/* Status Dropdown */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="cursor-pointer px-3 py-2 rounded-xl bg-surface-container text-xs text-on-surface border border-outline-variant/20 focus:outline-none focus:border-primary font-medium"
              >
                {STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>

              {/* Overdue Checkbox */}
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-outline px-2.5 py-1.5 rounded-xl hover:bg-surface-container transition-all">
                <input
                  type="checkbox"
                  checked={overdueOnly}
                  onChange={(e) => setOverdueOnly(e.target.checked)}
                  className="rounded border-outline-variant text-primary focus:ring-0"
                />
                <span>Overdue Service Only</span>
              </label>
            </div>
          </div>

          {/* Main Equipment Table */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-outline-variant/10 bg-surface-container-low/50 text-[11px] font-bold text-outline uppercase tracking-wider">
                    <th className="py-3 px-4">Asset Tag / Equipment</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Department &amp; Bay</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Condition</th>
                    <th className="py-3 px-4">Next Maintenance</th>
                    <th className="py-3 px-4">Cost (PKR)</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-outline">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <MdRefresh className="w-6 h-6 animate-spin text-primary" />
                          <span>Loading hospital equipment fleet...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredEquipments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-outline">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <Cpu className="w-8 h-8 opacity-40 text-outline mb-1" />
                          <span className="font-bold text-on-surface">No equipment records found</span>
                          <span className="text-[11px]">Try adjusting your search criteria or register a new asset.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredEquipments.map((asset) => {
                      const isOverdue =
                        asset.nextMaintenanceDate &&
                        new Date(asset.nextMaintenanceDate) <= new Date() &&
                        asset.status !== "Decommissioned";

                      return (
                        <tr key={asset._id} className="hover:bg-surface-container/40 transition-colors">
                          {/* Asset Tag & Name */}
                          <td className="py-3 px-4">
                            <div className="flex items-start gap-2.5">
                              <div className="mt-0.5 p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                                {asset.category === "Hospital Bed" ? (
                                  <MdBed className="w-4 h-4" />
                                ) : (
                                  <Cpu className="w-4 h-4" />
                                )}
                              </div>
                              <div>
                                <span className="font-bold text-on-surface block leading-tight">{asset.name}</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="font-mono text-[10px] text-primary font-bold">{asset.assetId}</span>
                                  <span className="text-outline text-[10px]">•</span>
                                  <span className="text-outline text-[10px]">{asset.manufacturer} {asset.modelNumber !== "N/A" ? `(${asset.modelNumber})` : ""}</span>
                                </div>
                                <span className="text-[10px] text-outline font-mono block">S/N: {asset.serialNumber}</span>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-surface-container border border-outline-variant/30 text-on-surface">
                              {asset.category}
                            </span>
                          </td>

                          {/* Department & Bay */}
                          <td className="py-3 px-4">
                            <span className="font-semibold text-on-surface block">{asset.department}</span>
                            <span className="text-outline text-[11px] block">{asset.locationRoom}</span>
                            {asset.bedNumber && (
                              <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-black bg-purple-500/10 text-purple-600 border border-purple-500/20">
                                Bed {asset.bedNumber}
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">{renderStatusBadge(asset.status)}</td>

                          {/* Condition */}
                          <td className="py-3 px-4">{renderConditionBadge(asset.condition)}</td>

                          {/* Next Maintenance */}
                          <td className="py-3 px-4">
                            {asset.nextMaintenanceDate ? (
                              <div>
                                <span className={`font-mono text-[11px] font-bold block ${isOverdue ? "text-rose-600" : "text-on-surface"}`}>
                                  {new Date(asset.nextMaintenanceDate).toISOString().split("T")[0]}
                                </span>
                                {isOverdue ? (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-600">
                                    <AlertTriangle className="w-3 h-3" /> Service Overdue
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-outline">
                                    Interval: {asset.maintenanceIntervalDays || 90}d
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-outline">Unscheduled</span>
                            )}
                          </td>

                          {/* Purchase Cost */}
                          <td className="py-3 px-4 font-mono font-semibold text-on-surface">
                            Rs. {(asset.purchaseCostPkr || 0).toLocaleString()}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Log Service Button */}
                              <button
                                onClick={() => openServiceModal(asset)}
                                title="Log Preventive Maintenance or Repair"
                                className="cursor-pointer p-1.5 rounded-lg border border-outline-variant/30 text-amber-600 hover:bg-amber-500/10 transition-colors"
                              >
                                <Wrench className="w-3.5 h-3.5" />
                              </button>

                              {/* Details Button */}
                              <button
                                onClick={() => {
                                  setActiveAsset(asset);
                                  setIsDetailsModalOpen(true);
                                }}
                                title="View Specifications &amp; Maintenance Logs"
                                className="cursor-pointer p-1.5 rounded-lg border border-outline-variant/30 text-primary hover:bg-primary/10 transition-colors"
                              >
                                <MdHistory className="w-3.5 h-3.5" />
                              </button>

                              {/* Decommission Button */}
                              {asset.status !== "Decommissioned" && (
                                <button
                                  onClick={() => handleDecommission(asset)}
                                  title="Decommission Asset"
                                  className="cursor-pointer p-1.5 rounded-lg border border-outline-variant/30 text-rose-500 hover:bg-rose-500/10 transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary */}
            <div className="p-3 border-t border-outline-variant/10 bg-surface-container-low/30 text-[11px] text-outline flex items-center justify-between">
              <span>Showing {filteredEquipments.length} registered asset(s)</span>
              <span>Values denominated in Pakistani Rupee (PKR)</span>
            </div>
          </div>
        </div>

        {/* MODAL 1: Register New Asset / Bed */}
        {isRegisterModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b border-outline-variant/10 flex items-center justify-between sticky top-0 bg-surface-container-lowest z-10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <MdOutlineAddBox className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold font-headline text-on-surface">Register Hospital Equipment / Bed</h2>
                    <p className="text-[11px] text-outline">Auto-generates sequential asset tag (EQP-XXXX)</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="cursor-pointer p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container"
                >
                  <MdClose className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4 text-xs">
                {/* Row 1: Name & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-outline mb-1">Equipment / Asset Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dräger Evita V300 Ventilator"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-outline mb-1">Category *</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface focus:outline-none focus:border-primary"
                    >
                      {CATEGORIES.filter((c) => c !== "All Assets").map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Manufacturer, Model, Serial */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-semibold text-outline mb-1">Manufacturer *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Siemens Healthineers"
                      value={formManufacturer}
                      onChange={(e) => setFormManufacturer(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-outline mb-1">Model Number</label>
                    <input
                      type="text"
                      placeholder="e.g. Evita-V300"
                      value={formModel}
                      onChange={(e) => setFormModel(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-outline mb-1">Serial Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SN-DRG-88210"
                      value={formSerial}
                      onChange={(e) => setFormSerial(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface focus:outline-none focus:border-primary font-mono"
                    />
                  </div>
                </div>

                {/* Row 3: Department, Room Bay, Bed # (if applicable) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-semibold text-outline mb-1">Department *</label>
                    <select
                      value={formDepartment}
                      onChange={(e) => setFormDepartment(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface focus:outline-none focus:border-primary"
                    >
                      {DEPARTMENTS.filter((d) => d !== "All Departments").map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-outline mb-1">Location Room / Bay *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ICU Bay 4 / Room 201"
                      value={formRoom}
                      onChange={(e) => setFormRoom(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-outline mb-1">
                      Bed Number {formCategory === "Hospital Bed" ? "(Linked to Admissions)" : "(Optional)"}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ICU-04, A-102"
                      value={formBedNumber}
                      onChange={(e) => setFormBedNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface focus:outline-none focus:border-primary uppercase font-mono"
                    />
                  </div>
                </div>

                {/* Row 4: Purchase Date, Cost in PKR, Vendor */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-semibold text-outline mb-1">Purchase Date *</label>
                    <input
                      type="date"
                      required
                      value={formPurchaseDate}
                      onChange={(e) => setFormPurchaseDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-outline mb-1">Purchase Cost (PKR) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline font-bold">Rs.</span>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        required
                        placeholder="2,800,000"
                        value={formPurchaseCost}
                        onChange={(e) => setFormPurchaseCost(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface focus:outline-none focus:border-primary font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-outline mb-1">Supplier / Vendor *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Siemens Healthcare Pakistan"
                      value={formVendor}
                      onChange={(e) => setFormVendor(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Row 5: Initial Status & Condition */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-semibold text-outline mb-1">Operational Status</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface focus:outline-none focus:border-primary"
                    >
                      <option value="Operational">Operational</option>
                      <option value="In Use">In Use</option>
                      <option value="Under Maintenance">Under Maintenance</option>
                      <option value="Needs Inspection">Needs Inspection</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-outline mb-1">Physical Condition</label>
                    <select
                      value={formCondition}
                      onChange={(e) => setFormCondition(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface focus:outline-none focus:border-primary"
                    >
                      <option value="Excellent">Excellent</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Requires Service">Requires Service</option>
                      <option value="Critical / Degraded">Critical / Degraded</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-outline mb-1">Maintenance Cycle (Days)</label>
                    <input
                      type="number"
                      min="15"
                      value={formIntervalDays}
                      onChange={(e) => setFormIntervalDays(e.target.value)}
                      placeholder="90"
                      className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {/* Row 6: Technician & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-outline mb-1">Assigned Biomedical Engineer</label>
                    <input
                      type="text"
                      placeholder="e.g. Engr. Hamza Biomedical Lead"
                      value={formTechnician}
                      onChange={(e) => setFormTechnician(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-outline mb-1">Warranty Expiry Date</label>
                    <input
                      type="date"
                      value={formWarrantyDate}
                      onChange={(e) => setFormWarrantyDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-outline mb-1">Operational Notes / Special Instructions</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Requires pure oxygen feed calibration before surgical shift."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="pt-3 border-t border-outline-variant/10 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsRegisterModalOpen(false)}
                    className="cursor-pointer px-4 py-2 rounded-xl border border-outline-variant/30 text-outline hover:bg-surface-container font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="cursor-pointer px-5 py-2 rounded-xl bg-primary text-on-primary font-bold hover:opacity-90 disabled:opacity-50 transition-all shadow-xs"
                  >
                    {isSubmitting ? "Registering..." : "Save & Register Asset"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: Log Maintenance & Calibration Entry */}
        {isServiceModalOpen && activeAsset && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-xl w-full max-w-240 h-150 overflow-x-hidden">
              <div className="p-5 border-b border-outline-variant/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold font-headline text-on-surface">Log Equipment Service</h2>
                    <p className="text-[11px] text-outline">
                      {activeAsset.assetId} — {activeAsset.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsServiceModalOpen(false)}
                  className="cursor-pointer p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container"
                >
                  <MdClose className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleServiceSubmit} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-outline mb-1">Service Type *</label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface focus:outline-none focus:border-primary"
                  >
                    <option value="Routine Preventive Maintenance">Routine Preventive Maintenance</option>
                    <option value="Corrective Repair">Corrective Repair</option>
                    <option value="Calibration">Calibration &amp; Sensor Checkout</option>
                    <option value="Safety Inspection">Safety Inspection</option>
                    <option value="Emergency Overhaul">Emergency Overhaul</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-outline mb-1">Technician / Engineer *</label>
                    <input
                      type="text"
                      required
                      value={serviceTechName}
                      onChange={(e) => setServiceTechName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-outline mb-1">Servicing Cost (PKR)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline font-bold">Rs.</span>
                      <input
                        type="number"
                        min="0"
                        value={serviceCost}
                        onChange={(e) => setServiceCost(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface focus:outline-none focus:border-primary font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-outline mb-1">Service Description / Work Carried Out *</label>
                  <textarea
                    rows={3}
                    required
                    value={serviceDescription}
                    onChange={(e) => setServiceDescription(e.target.value)}
                    placeholder="Details of calibration, replaced filters, firmware updates, or pressure tests."
                    className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-outline mb-1">Replaced Parts (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. HEPA Filter, O2 Sensor cell, Flow sensor valve"
                    value={serviceParts}
                    onChange={(e) => setServiceParts(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-outline mb-1">Next Scheduled Maintenance Date</label>
                  <input
                    type="date"
                    value={nextScheduledDate}
                    onChange={(e) => setNextScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/20 flex items-center justify-between">
                  <div>
                    <span className="font-semibold block text-on-surface">Mark Fleet Status as Operational</span>
                    <span className="text-[10px] text-outline">Restores machine ready for clinical ward allocation</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={restoreOperational}
                    onChange={(e) => setRestoreOperational(e.target.checked)}
                    className="rounded text-primary focus:ring-0 w-4 h-4"
                  />
                </div>

                <div className="pt-3 border-t border-outline-variant/10 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsServiceModalOpen(false)}
                    className="cursor-pointer px-4 py-2 rounded-xl border border-outline-variant/30 text-outline hover:bg-surface-container font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="cursor-pointer px-5 py-2 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 disabled:opacity-50 transition-all shadow-xs"
                  >
                    {isSubmitting ? "Recording..." : "Save Service Log"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: Asset Details & Maintenance History Timeline */}
        {isDetailsModalOpen && activeAsset && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b border-outline-variant/10 flex items-center justify-between sticky top-0 bg-surface-container-lowest z-10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <MdHistory className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold font-headline text-on-surface">{activeAsset.name}</h2>
                    <p className="text-[11px] text-outline">
                      Asset Tag: <span className="font-mono text-primary font-bold">{activeAsset.assetId}</span> • S/N: {activeAsset.serialNumber}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="cursor-pointer p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container"
                >
                  <MdClose className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5 text-xs">
                {/* Specifications Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-surface-container-low border border-outline-variant/10">
                  <div>
                    <span className="text-[10px] text-outline block">Manufacturer</span>
                    <span className="font-bold text-on-surface">{activeAsset.manufacturer}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-outline block">Model</span>
                    <span className="font-bold text-on-surface">{activeAsset.modelNumber || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-outline block">Department</span>
                    <span className="font-bold text-on-surface">{activeAsset.department}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-outline block">Room / Location</span>
                    <span className="font-bold text-on-surface">{activeAsset.locationRoom}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-outline block">Purchase Valuation</span>
                    <span className="font-bold font-mono text-primary">
                      Rs. {(activeAsset.purchaseCostPkr || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-outline block">Supplier / Vendor</span>
                    <span className="font-semibold text-on-surface">{activeAsset.vendorName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-outline block">Status</span>
                    {renderStatusBadge(activeAsset.status)}
                  </div>
                  <div>
                    <span className="text-[10px] text-outline block">Condition</span>
                    {renderConditionBadge(activeAsset.condition)}
                  </div>
                </div>

                {/* Maintenance Timeline */}
                <div>
                  <h3 className="text-xs font-bold font-headline uppercase tracking-wider text-outline mb-3 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-primary" />
                    Biomedical Servicing &amp; Calibration History ({activeAsset.maintenanceHistory?.length || 0})
                  </h3>

                  {(!activeAsset.maintenanceHistory || activeAsset.maintenanceHistory.length === 0) ? (
                    <div className="p-6 text-center text-outline bg-surface-container/30 rounded-xl border border-outline-variant/10">
                      No maintenance entries recorded yet for this equipment.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeAsset.maintenanceHistory.map((log, idx) => (
                        <div
                          key={log._id || idx}
                          className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/15 flex flex-col gap-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-on-surface">{log.serviceType}</span>
                            <span className="font-mono text-[10px] text-outline">
                              {new Date(log.serviceDate).toISOString().split("T")[0]}
                            </span>
                          </div>
                          <p className="text-[11px] text-outline">{log.description}</p>
                          <div className="flex items-center justify-between text-[10px] text-outline pt-1 border-t border-outline-variant/10">
                            <span>Technician: <strong className="text-on-surface">{log.technicianName}</strong></span>
                            {log.costPkr > 0 && (
                              <span className="font-mono font-bold text-amber-600">
                                Rs. {log.costPkr.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-outline-variant/10 flex justify-end">
                  <button
                    onClick={() => setIsDetailsModalOpen(false)}
                    className="cursor-pointer px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold"
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

