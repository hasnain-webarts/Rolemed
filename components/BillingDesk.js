"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Header from "@/components/Header";
import PatientDossierPrintModal from "@/components/PatientDossierPrintModal";
import {
  CreditCard,
  Search,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Bed,
  Calendar,
  Pill,
  FlaskConical,
  Printer,
  X,
  RefreshCw,
  Coins,
  ArrowRight,
  User,
  Phone,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Split,
  ChevronRight,
  FileText,
  Sparkles,
  Users,
} from "lucide-react";

const formatDoctorName = (docName) => {
  if (!docName) return "Doctor";
  const trimmed = docName.trim();
  return trimmed.startsWith("Dr.") || trimmed.startsWith("Dr ") ? trimmed : `Dr. ${trimmed}`;
};

export default function BillingDesk({
  department = "Reception",
  SidebarComponent,
  portalTitle = "Hospital Billing & Cashier Desk",
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [patientData, setPatientData] = useState(null);
  const [chargesData, setChargesData] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [activeReceipt, setActiveReceipt] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // Unpaid Patients Queue State
  const [unpaidQueue, setUnpaidQueue] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [queueTab, setQueueTab] = useState("all"); // 'all' | 'inpatient' | 'consultation' | 'pharmacy' | 'laboratory'

  // Department configuration state
  const [isDeptBillingEnabled, setIsDeptBillingEnabled] = useState(true);
  const [deskConfig, setDeskConfig] = useState({ mode: "merged", isFinal: department.toLowerCase() === "reception" });
  const [activeDesksList, setActiveDesksList] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Universal Dossier Print Modal State
  const [dossierModalOpen, setDossierModalOpen] = useState(false);
  const [dossierPatientId, setDossierPatientId] = useState(null);
  const [dossierPreset, setDossierPreset] = useState("discharge_billing");

  const showNotice = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Load Batch Unpaid Queue for this Department Desk
  const fetchUnpaidQueue = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/billing/pending-charges?department=${encodeURIComponent(department)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.patients)) {
        setUnpaidQueue(data.patients);
        if (data.deskConfig) {
          setDeskConfig(data.deskConfig);
        }
      }
    } catch {
      // Non-blocking
    } finally {
      setLoadingQueue(false);
    }
  }, [department]);

  const handleManualRefreshQueue = () => {
    setLoadingQueue(true);
    fetchUnpaidQueue();
  };

  // Load Department Config, Recent Invoices & Unpaid Queue
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const [configRes, invoicesRes, queueRes] = await Promise.all([
          fetch("/api/admin/billing-rules", { cache: "no-store" }),
          fetch("/api/billing/invoices?limit=8", { cache: "no-store" }),
          fetch(`/api/billing/pending-charges?department=${encodeURIComponent(department)}`, { cache: "no-store" }),
        ]);

        const [configData, invoicesData, queueData] = await Promise.all([
          configRes.json(),
          invoicesRes.json(),
          queueRes.json(),
        ]);

        if (!isMounted) return;

        if (configData.success && configData.settings) {
          const depts = configData.settings.departmentBillingConfig || configData.settings.enabledBillingDepartments;
          const key = department.toLowerCase();
          const currentDept = configData.settings.departmentBillingConfig?.[key];

          if (currentDept) {
            setIsDeptBillingEnabled(Boolean(currentDept.enabled));
            setDeskConfig(currentDept);
          } else if (depts) {
            setIsDeptBillingEnabled(Boolean(depts[key]));
          }

          const activeList = [];
          if (configData.settings.departmentBillingConfig) {
            const dbc = configData.settings.departmentBillingConfig;
            if (dbc.reception?.enabled) activeList.push(`Reception (${dbc.reception.mode}${dbc.reception.isFinal ? " • Final" : ""})`);
            if (dbc.pharmacy?.enabled) activeList.push(`Pharmacy (${dbc.pharmacy.mode}${dbc.pharmacy.isFinal ? " • Final" : ""})`);
            if (dbc.laboratory?.enabled) activeList.push(`Laboratory (${dbc.laboratory.mode}${dbc.laboratory.isFinal ? " • Final" : ""})`);
          } else if (depts) {
            if (depts.reception) activeList.push("Reception Desk");
            if (depts.pharmacy) activeList.push("Pharmacy Counter");
            if (depts.laboratory) activeList.push("Diagnostic Lab");
          }
          setActiveDesksList(activeList);
        }

        if (invoicesData.success && Array.isArray(invoicesData.invoices)) {
          setRecentInvoices(invoicesData.invoices);
        }

        if (queueData.success && Array.isArray(queueData.patients)) {
          setUnpaidQueue(queueData.patients);
          if (queueData.deskConfig) {
            setDeskConfig(queueData.deskConfig);
          }
        }
      } catch (err) {
        console.warn("Failed to load initial billing desk data:", err);
      } finally {
        if (isMounted) {
          setLoadingConfig(false);
          setLoadingRecent(false);
          setLoadingQueue(false);
        }
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [department]);

  // Single Patient Pending Charges Lookup
  const handleSearchPatient = async (targetId = null) => {
    const query = typeof targetId === "string" ? targetId : searchQuery;
    if (!query.trim()) return;

    setSearching(true);
    setPatientData(null);
    setChargesData(null);
    setSelectedItems([]);

    try {
      const res = await fetch(
        `/api/billing/pending-charges?patientId=${encodeURIComponent(
          query.trim()
        )}&department=${encodeURIComponent(department)}`,
        { cache: "no-store" }
      );
      const data = await res.json();

      if (res.ok && data.success) {
        setPatientData(data.patient);
        setChargesData(data.charges);

        // Pre-select all available pending items into billing cart
        const items = [];
        if (data.charges.admission) {
          items.push({
            id: `adm-${data.charges.admission.admissionId}`,
            department: "Reception",
            itemType: "Bed Stay",
            itemName: `Inpatient Stay: ${data.charges.admission.ward} (Bed ${data.charges.admission.bedNumber}) - ${data.charges.admission.stayDays} Day(s)`,
            quantity: data.charges.admission.stayDays,
            unitPrice: data.charges.admission.dailyRate,
            totalPrice: data.charges.admission.totalCharge,
            referenceId: data.charges.admission.admissionId,
          });
        }

        (data.charges.appointments || []).forEach((apt) => {
          items.push({
            id: `apt-${apt.appointmentId}`,
            department: "Reception",
            itemType: "Consultation",
            itemName: `Doctor Consultation: ${apt.doctorName} (${apt.department})`,
            quantity: 1,
            unitPrice: apt.fee,
            totalPrice: apt.fee,
            referenceId: apt.appointmentId,
          });
        });

        (data.charges.prescriptions || []).forEach((rx) => {
          if (Array.isArray(rx.drugs) && rx.drugs.length > 0) {
            rx.drugs.forEach((drug, dIdx) => {
              const lineQty = Number(drug.qtyNeeded) || 1;
              const unitPr = Number(drug.unitPrice) || (Number(drug.totalPrice) / lineQty) || 0;
              const lineTotal = Number(drug.totalPrice) || (unitPr * lineQty);
              items.push({
                id: `rx-${rx.prescriptionId}-d-${dIdx}`,
                department: "Pharmacy",
                itemType: "Medication",
                itemName: `${drug.name}${drug.dosage ? ` (${drug.dosage})` : ""} - ${formatDoctorName(rx.doctorName)}`,
                quantity: lineQty,
                unitPrice: unitPr,
                totalPrice: lineTotal,
                referenceId: rx.prescriptionId,
              });
            });
          } else {
            items.push({
              id: `rx-${rx.prescriptionId}`,
              department: "Pharmacy",
              itemType: "Medication",
              itemName: `Prescription: ${rx.drugCount || 1} Meds by ${rx.doctorName}`,
              quantity: 1,
              unitPrice: rx.totalAmount,
              totalPrice: rx.totalAmount,
              referenceId: rx.prescriptionId,
            });
          }
        });

        (data.charges.labOrders || []).forEach((lab) => {
          items.push({
            id: `lab-${lab.orderId}`,
            department: "Laboratory",
            itemType: "Diagnostic Test",
            itemName: `Diagnostic Lab: ${lab.testName} (${lab.priority})`,
            quantity: 1,
            unitPrice: lab.fee,
            totalPrice: lab.fee,
            referenceId: lab.orderId,
          });
        });

        setSelectedItems(items);
      } else {
        showNotice("error", data.error || "No patient found with the provided identifier");
      }
    } catch {
      showNotice("error", "Failed to query patient pending charges");
    } finally {
      setSearching(false);
    }
  };

  // Select patient card from Unpaid Queue
  const handleSelectPatientCard = (patient) => {
    setSearchQuery(patient.patientId);
    handleSearchPatient(patient.patientId);
  };

  // Open Universal Dossier Modal
  const openDossierPrint = (pId, preset = "discharge_billing") => {
    setDossierPatientId(pId);
    setDossierPreset(preset);
    setDossierModalOpen(true);
  };

  const toggleItemSelection = (item) => {
    const exists = selectedItems.some((i) => i.id === item.id);
    if (exists) {
      setSelectedItems(selectedItems.filter((i) => i.id !== item.id));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const selectAllItems = () => {
    if (!chargesData) return;
    const items = [];
    if (chargesData.admission) {
      items.push({
        id: `adm-${chargesData.admission.admissionId}`,
        department: "Reception",
        itemType: "Bed Stay",
        itemName: `Inpatient Stay: ${chargesData.admission.ward} (Bed ${chargesData.admission.bedNumber}) - ${chargesData.admission.stayDays} Day(s)`,
        quantity: chargesData.admission.stayDays,
        unitPrice: chargesData.admission.dailyRate,
        totalPrice: chargesData.admission.totalCharge,
        referenceId: chargesData.admission.admissionId,
      });
    }
    (chargesData.appointments || []).forEach((apt) => {
      items.push({
        id: `apt-${apt.appointmentId}`,
        department: "Reception",
        itemType: "Consultation",
        itemName: `Doctor Consultation: ${apt.doctorName} (${apt.department})`,
        quantity: 1,
        unitPrice: apt.fee,
        totalPrice: apt.fee,
        referenceId: apt.appointmentId,
      });
    });
    (chargesData.prescriptions || []).forEach((rx) => {
      if (Array.isArray(rx.drugs) && rx.drugs.length > 0) {
        rx.drugs.forEach((drug, dIdx) => {
          const lineQty = Number(drug.qtyNeeded) || 1;
          const unitPr = Number(drug.unitPrice) || (Number(drug.totalPrice) / lineQty) || 0;
          const lineTotal = Number(drug.totalPrice) || (unitPr * lineQty);
          items.push({
            id: `rx-${rx.prescriptionId}-d-${dIdx}`,
            department: "Pharmacy",
            itemType: "Medication",
            itemName: `${drug.name}${drug.dosage ? ` (${drug.dosage})` : ""} - ${formatDoctorName(rx.doctorName)}`,
            quantity: lineQty,
            unitPrice: unitPr,
            totalPrice: lineTotal,
            referenceId: rx.prescriptionId,
          });
        });
      } else {
        items.push({
          id: `rx-${rx.prescriptionId}`,
          department: "Pharmacy",
          itemType: "Medication",
          itemName: `Prescription: ${rx.drugCount || 1} Meds by ${rx.doctorName}`,
          quantity: 1,
          unitPrice: rx.totalAmount,
          totalPrice: rx.totalAmount,
          referenceId: rx.prescriptionId,
        });
      }
    });
    (chargesData.labOrders || []).forEach((lab) => {
      items.push({
        id: `lab-${lab.orderId}`,
        department: "Laboratory",
        itemType: "Diagnostic Test",
        itemName: `Diagnostic Lab: ${lab.testName} (${lab.priority})`,
        quantity: 1,
        unitPrice: lab.fee,
        totalPrice: lab.fee,
        referenceId: lab.orderId,
      });
    });
    setSelectedItems(items);
  };

  const isItemSelected = (id) => selectedItems.some((i) => i.id === id);

  const cartSubtotal = selectedItems.reduce((s, it) => s + (Number(it.totalPrice) || 0), 0);
  const cartNetTotal = Math.max(0, cartSubtotal - Number(discount || 0));

  // Submit Invoice Payment
  const handleCheckout = async () => {
    if (!patientData) {
      showNotice("error", "Please select a patient before collecting payment");
      return;
    }

    if (selectedItems.length === 0) {
      showNotice("error", "No billable line items selected");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        patientId: patientData.patientId,
        patientName: patientData.name,
        patientPhone: patientData.phone || "",
        issuedDepartment: department,
        items: selectedItems.map(
          ({ department: d, itemType, itemName, quantity, unitPrice, totalPrice, referenceId }) => ({
            department: d,
            itemType,
            itemName,
            quantity,
            unitPrice,
            totalPrice,
            referenceId,
          })
        ),
        discount: Number(discount || 0),
        paymentMethod,
        paymentStatus: "Paid",
        notes: notes.trim(),
      };

      const res = await fetch("/api/billing/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showNotice("success", `Invoice ${data.invoice.invoiceId} successfully issued and settled`);
        setActiveReceipt(data.invoice);
        // Refresh queue and patient charges
        fetchUnpaidQueue();
        handleSearchPatient(patientData.patientId);

        // Reload recent invoices
        fetch("/api/billing/invoices?limit=8", { cache: "no-store" })
          .then((r) => r.json())
          .then((d) => d.success && setRecentInvoices(d.invoices || []))
          .catch(() => {});
      } else {
        showNotice("error", data.error || "Failed to process hospital invoice payment");
      }
    } catch {
      showNotice("error", "Network error during checkout payment processing");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Unpaid Queue
  const filteredQueue = useMemo(() => {
    return unpaidQueue.filter((p) => {
      // Tab filter
      if (queueTab === "inpatient" && !p.isAdmitted) return false;
      if (queueTab === "consultation" && p.consultationCharges <= 0) return false;
      if (queueTab === "pharmacy" && p.prescriptionCharges <= 0) return false;
      if (queueTab === "laboratory" && p.labCharges <= 0) return false;

      // Text search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const name = (p.name || "").toLowerCase();
      const pid = (p.patientId || "").toLowerCase();
      const phone = (p.phone || "").toLowerCase();
      const ward = (p.ward || "").toLowerCase();

      return name.includes(q) || pid.includes(q) || phone.includes(q) || ward.includes(q);
    });
  }, [unpaidQueue, queueTab, searchQuery]);

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      {SidebarComponent && (
        <SidebarComponent isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header onMenuClick={() => setSidebarOpen(true)} title={portalTitle} />

        <main className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Department Status Warning if Disabled */}
          {!loadingConfig && !isDeptBillingEnabled && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 shadow-sm flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-bold block">
                  {department} Billing Counter is Currently Disabled
                </span>
                <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                  In accordance with the active Hospital Billing Policy set in Admin Dashboard, cash collection for <strong>{department}</strong> is currently deactivated.
                </p>
                {activeDesksList.length > 0 && (
                  <p className="mt-2 text-xs font-semibold text-amber-900">
                    Active collection counter(s): {activeDesksList.join(", ")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Top Bar Banner with Search Form & Routing Indicator */}
          <div className="w-full bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-primary font-bold text-xs uppercase tracking-wider">
                  <Receipt className="w-4 h-4" />
                  <span>{department} Billing Counter</span>
                </span>

                {/* Desk Policy Badge */}
                {deskConfig.mode === "merged" && deskConfig.isFinal ? (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    <span>Final Billing Desk (Consolidated)</span>
                  </span>
                ) : deskConfig.mode === "merged" ? (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                    Merged Department Counter
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                    Autonomous Counter (Separate)
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-bold text-slate-800 mt-1">
                Patient Hospital Billing &amp; Fee Settlement
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Select patients with outstanding balances below or search by ID to finalize payment and generate official dossiers.
              </p>
            </div>

            {/* Direct Patient Lookup Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearchPatient();
              }}
              className="flex items-center gap-2 w-full max-w-[420px]"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Patient ID (PAT-001) or Phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-primary focus:border-primary"
                />
              </div>
              <button
                type="submit"
                disabled={searching || !searchQuery.trim()}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 transition disabled:opacity-50 shrink-0"
              >
                {searching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Lookup</span>
              </button>
            </form>
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

          {/* Main 2-Column Work Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Unpaid Patients Queue Cards OR Selected Patient Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* SECTION: Live Unpaid Patients Queue */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      <span>Unpaid Patients Queue</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                        {unpaidQueue.length} Pending
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Patients with unbilled bed stay accruals, consultations, prescriptions, or laboratory tests.
                    </p>
                  </div>

                  <button
                    onClick={handleManualRefreshQueue}
                    disabled={loadingQueue}
                    className="text-xs text-primary hover:underline flex items-center gap-1 self-start sm:self-auto"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingQueue ? "animate-spin" : ""}`} />
                    <span>Refresh Queue</span>
                  </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-semibold text-slate-600">
                  <button
                    type="button"
                    onClick={() => setQueueTab("all")}
                    className={`px-3 py-1.5 rounded-xl transition ${
                      queueTab === "all"
                        ? "bg-primary text-white"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    All Pending ({unpaidQueue.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQueueTab("inpatient")}
                    className={`px-3 py-1.5 rounded-xl transition ${
                      queueTab === "inpatient"
                        ? "bg-primary text-white"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    Inpatients ({unpaidQueue.filter((p) => p.isAdmitted).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQueueTab("consultation")}
                    className={`px-3 py-1.5 rounded-xl transition ${
                      queueTab === "consultation"
                        ? "bg-primary text-white"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    Consultations ({unpaidQueue.filter((p) => p.consultationCharges > 0).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQueueTab("pharmacy")}
                    className={`px-3 py-1.5 rounded-xl transition ${
                      queueTab === "pharmacy"
                        ? "bg-primary text-white"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    Pharmacy Rx ({unpaidQueue.filter((p) => p.prescriptionCharges > 0).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQueueTab("laboratory")}
                    className={`px-3 py-1.5 rounded-xl transition ${
                      queueTab === "laboratory"
                        ? "bg-primary text-white"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    Diagnostics ({unpaidQueue.filter((p) => p.labCharges > 0).length})
                  </button>
                </div>

                {/* Queue Cards Grid */}
                {loadingQueue ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" />
                    <p className="text-xs">Scanning clinical charges for unpaid patients...</p>
                  </div>
                ) : filteredQueue.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700">No Unpaid Patients in this Filter</p>
                    <p className="text-xs text-slate-400">All clinical encounters in this category are fully settled.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                    {filteredQueue.map((pat) => {
                      const isSelected = patientData?.patientId === pat.patientId;

                      return (
                        <div
                          key={pat.patientId}
                          onClick={() => handleSelectPatientCard(pat)}
                          className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between space-y-3 ${
                            isSelected
                              ? "border-primary bg-primary/[0.04] shadow-sm ring-1 ring-primary"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-sm shrink-0">
                                  {pat.name.charAt(0)}
                                </div>
                                <div>
                                  <span className="font-bold text-slate-800 text-sm block leading-snug">
                                    {pat.name}
                                  </span>
                                  <span className="text-[11px] font-mono font-semibold text-slate-400">
                                    {pat.patientId} • {pat.age ? `${pat.age}y` : ""} {pat.gender || ""}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                  Unpaid
                                </span>
                                <span className="text-sm font-black text-primary">
                                  Rs. {pat.totalUnpaid}
                                </span>
                              </div>
                            </div>

                            {/* Badges */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                              {pat.isAdmitted && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                                  Ward: {pat.ward || "IPD"} (Bed {pat.bedNumber || "-"})
                                </span>
                              )}
                              {pat.consultationCharges > 0 && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  OPD: Rs. {pat.consultationCharges}
                                </span>
                              )}
                              {pat.prescriptionCharges > 0 && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                                  Rx: Rs. {pat.prescriptionCharges}
                                </span>
                              )}
                              {pat.labCharges > 0 && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                                  Lab: Rs. {pat.labCharges}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <span>{pat.phone || "No phone"}</span>
                            </span>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDossierPrint(pat.patientId, "discharge_billing");
                                }}
                                className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition"
                                title="Print Clinical Dossier"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-[11px] font-bold text-primary flex items-center">
                                <span>Select</span>
                                <ChevronRight className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Patient Line Items & Detailed Breakdown */}
              {patientData ? (
                <>
                  {/* Selected Patient Banner */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                        {patientData.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-slate-800">{patientData.name}</h2>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {patientData.patientId}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {patientData.gender}, {patientData.age} yrs
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            {patientData.phone || "No phone"}
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-rose-600">
                            Blood: {patientData.bloodGroup || "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openDossierPrint(patientData.patientId, "all")}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Dossier</span>
                      </button>

                      <button
                        type="button"
                        onClick={selectAllItems}
                        className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold transition"
                      >
                        Select All Items
                      </button>
                    </div>
                  </div>

                  {/* Charges Breakdown by Clinical Department */}
                  <div className="space-y-4">
                    {/* 1. Inpatient Bed Stay */}
                    {chargesData?.admission && (
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                            <Bed className="w-4 h-4 text-primary" />
                            <span>Inpatient Stay &amp; Ward Accommodation</span>
                          </div>
                          <span className="text-xs font-bold text-primary">
                            Rs. {chargesData.admission.totalCharge}
                          </span>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-sm">
                                {chargesData.admission.ward} (Bed {chargesData.admission.bedNumber})
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                                {chargesData.admission.admissionId}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500 text-[11px]">
                              <span>Attending: <strong className="text-slate-700">{chargesData.admission.doctorName}</strong></span>
                              <span>•</span>
                              <span>Duration: <strong className="text-slate-700">{chargesData.admission.stayDays} Day(s)</strong></span>
                              <span>•</span>
                              <span>Room Rate: <strong className="text-slate-700">Rs. {chargesData.admission.dailyRate} / day</strong></span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              toggleItemSelection({
                                id: `adm-${chargesData.admission.admissionId}`,
                                department: "Reception",
                                itemType: "Bed Stay",
                                itemName: `Inpatient Stay: ${chargesData.admission.ward} (Bed ${chargesData.admission.bedNumber}) - ${chargesData.admission.stayDays} Day(s) @ Rs. ${chargesData.admission.dailyRate}/day`,
                                quantity: chargesData.admission.stayDays,
                                unitPrice: chargesData.admission.dailyRate,
                                totalPrice: chargesData.admission.totalCharge,
                                referenceId: chargesData.admission.admissionId,
                              })
                            }
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition self-start sm:self-auto shrink-0 ${
                              isItemSelected(`adm-${chargesData.admission.admissionId}`)
                                ? "bg-primary text-white"
                                : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {isItemSelected(`adm-${chargesData.admission.admissionId}`)
                              ? "Selected"
                              : "Add Bed Stay"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 2. Doctor Consultation Appointments */}
                    {chargesData?.appointments?.length > 0 && (
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                            <Calendar className="w-4 h-4 text-emerald-600" />
                            <span>Doctor Consultations &amp; OPD Visits ({chargesData.appointments.length})</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {chargesData.appointments.map((apt) => (
                            <div
                              key={apt.appointmentId}
                              className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-800 text-sm">
                                    {apt.doctorName}
                                  </span>
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                    {apt.department}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-2 text-slate-500 text-[11px]">
                                  <span>Ref: <strong className="font-mono text-slate-700">{apt.appointmentId}</strong></span>
                                  <span>•</span>
                                  <span>Date: <strong className="text-slate-700">{apt.date}</strong>{apt.time ? ` at ${apt.time}` : ""}</span>
                                  <span>•</span>
                                  <span>Fee: <strong className="text-emerald-700 font-bold">Rs. {apt.fee}</strong></span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  toggleItemSelection({
                                    id: `apt-${apt.appointmentId}`,
                                    department: "Reception",
                                    itemType: "Consultation",
                                    itemName: `Doctor Consultation: ${apt.doctorName} (${apt.department}) - Ref: ${apt.appointmentId}`,
                                    quantity: 1,
                                    unitPrice: apt.fee,
                                    totalPrice: apt.fee,
                                    referenceId: apt.appointmentId,
                                  })
                                }
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition self-start sm:self-auto shrink-0 ${
                                  isItemSelected(`apt-${apt.appointmentId}`)
                                    ? "bg-primary text-white"
                                    : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                {isItemSelected(`apt-${apt.appointmentId}`) ? "Selected" : "Add Consultation"}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 3. Pharmacy Prescriptions & Itemized Medication List */}
                    {chargesData?.prescriptions?.length > 0 && (
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                            <Pill className="w-4 h-4 text-amber-600" />
                            <span>Pharmacy Prescriptions ({chargesData.prescriptions.length})</span>
                          </div>
                          <span className="text-xs text-slate-400">Itemized drug dispensation breakdown</span>
                        </div>

                        <div className="space-y-3">
                          {chargesData.prescriptions.map((rx) => {
                            const rxDrugItems = (rx.drugs || []).map((drug, dIdx) => {
                              const lineQty = Number(drug.qtyNeeded) || 1;
                              const unitPr = Number(drug.unitPrice) || (Number(drug.totalPrice) / lineQty) || 0;
                              const lineTotal = Number(drug.totalPrice) || (unitPr * lineQty);
                              return {
                                id: `rx-${rx.prescriptionId}-d-${dIdx}`,
                                department: "Pharmacy",
                                itemType: "Medication",
                                itemName: `${drug.name}${drug.dosage ? ` (${drug.dosage})` : ""} - ${formatDoctorName(rx.doctorName)}`,
                                quantity: lineQty,
                                unitPrice: unitPr,
                                totalPrice: lineTotal,
                                referenceId: rx.prescriptionId,
                              };
                            });

                            const allRxDrugsSelected = rxDrugItems.length > 0
                              ? rxDrugItems.every((it) => isItemSelected(it.id))
                              : isItemSelected(`rx-${rx.prescriptionId}`);

                            return (
                              <div
                                key={rx.prescriptionId}
                                className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 text-xs space-y-3"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-800 text-sm">
                                        Prescription by {rx.doctorName}
                                      </span>
                                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                        {rx.consultationId || "Rx-Order"}
                                      </span>
                                    </div>
                                    <span className="text-slate-500 text-[11px]">
                                      {rx.drugCount || (rx.drugs?.length || 0)} prescribed medication(s) • Total:{" "}
                                      <strong className="text-slate-800 font-bold">Rs. {rx.totalAmount}</strong>
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (rxDrugItems.length > 0) {
                                        if (allRxDrugsSelected) {
                                          const removeIds = new Set(rxDrugItems.map((i) => i.id));
                                          setSelectedItems(selectedItems.filter((i) => !removeIds.has(i.id)));
                                        } else {
                                          const existingMap = new Map(selectedItems.map((i) => [i.id, i]));
                                          rxDrugItems.forEach((i) => existingMap.set(i.id, i));
                                          setSelectedItems(Array.from(existingMap.values()));
                                        }
                                      } else {
                                        toggleItemSelection({
                                          id: `rx-${rx.prescriptionId}`,
                                          department: "Pharmacy",
                                          itemType: "Medication",
                                          itemName: `Pharmacy Prescription: ${rx.doctorName}`,
                                          quantity: 1,
                                          unitPrice: rx.totalAmount,
                                          totalPrice: rx.totalAmount,
                                          referenceId: rx.prescriptionId,
                                        });
                                      }
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition self-start sm:self-auto ${
                                      allRxDrugsSelected
                                        ? "bg-primary text-white"
                                        : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                                    }`}
                                  >
                                    {allRxDrugsSelected ? "All Drugs Selected" : "Add All Drugs"}
                                  </button>
                                </div>

                                {/* Itemized Medications Table */}
                                {rx.drugs?.length > 0 ? (
                                  <div className="bg-white rounded-lg border border-slate-200/80 overflow-hidden">
                                    <table className="w-full text-left text-[11px]">
                                      <thead className="bg-slate-100/70 text-slate-600 border-b border-slate-200 font-semibold">
                                        <tr>
                                          <th className="p-2 w-7 text-center">✓</th>
                                          <th className="p-2">Medication Name</th>
                                          <th className="p-2">Dosage &amp; Instructions</th>
                                          <th className="p-2 text-center">Qty</th>
                                          <th className="p-2 text-right">Unit Price</th>
                                          <th className="p-2 text-right">Total (PKR)</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 text-slate-700">
                                        {rx.drugs.map((drug, dIdx) => {
                                          const drugItemId = `rx-${rx.prescriptionId}-d-${dIdx}`;
                                          const drugSelected = isItemSelected(drugItemId);
                                          const lineQty = Number(drug.qtyNeeded) || 1;
                                          const unitPr = Number(drug.unitPrice) || (Number(drug.totalPrice) / lineQty) || 0;
                                          const lineTotal = Number(drug.totalPrice) || (unitPr * lineQty);

                                          return (
                                            <tr key={dIdx} className={drugSelected ? "bg-primary/[0.03]" : "hover:bg-slate-50/50"}>
                                              <td className="p-2 text-center">
                                                <input
                                                  type="checkbox"
                                                  checked={drugSelected}
                                                  onChange={() =>
                                                    toggleItemSelection({
                                                      id: drugItemId,
                                                      department: "Pharmacy",
                                                      itemType: "Medication",
                                                      itemName: `${drug.name}${drug.dosage ? ` (${drug.dosage})` : ""} - ${formatDoctorName(rx.doctorName)}`,
                                                      quantity: lineQty,
                                                      unitPrice: unitPr,
                                                      totalPrice: lineTotal,
                                                      referenceId: rx.prescriptionId,
                                                    })
                                                  }
                                                  className="w-3.5 h-3.5 text-primary rounded border-slate-300 focus:ring-primary cursor-pointer"
                                                />
                                              </td>
                                              <td className="p-2 font-bold text-slate-800">{drug.name}</td>
                                              <td className="p-2 text-slate-500">
                                                {drug.dosage || "Standard dose"} {drug.instructions ? `• ${drug.instructions}` : ""}
                                              </td>
                                              <td className="p-2 text-center font-semibold text-slate-700">{lineQty}</td>
                                              <td className="p-2 text-right text-slate-600">Rs. {unitPr}</td>
                                              <td className="p-2 text-right font-bold text-slate-800">Rs. {lineTotal}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-slate-500 italic">No individual drug itemization recorded.</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 4. Diagnostic Lab Tests */}
                    {chargesData?.labOrders?.length > 0 && (
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                            <FlaskConical className="w-4 h-4 text-purple-600" />
                            <span>Diagnostic Laboratory Tests ({chargesData.labOrders.length})</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {chargesData.labOrders.map((lab) => (
                            <div
                              key={lab.orderId}
                              className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-800 text-sm">
                                    {lab.testName}
                                  </span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    lab.priority === "Emergency" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"
                                  }`}>
                                    {lab.priority || "Routine"} Priority
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-2 text-slate-500 text-[11px]">
                                  <span>Order Ref: <strong className="font-mono text-slate-700">{lab.orderId}</strong></span>
                                  <span>•</span>
                                  <span>Pathologist: <strong className="text-slate-700">{lab.doctorName || "Laboratory"}</strong></span>
                                  <span>•</span>
                                  <span>Panel Fee: <strong className="text-purple-700 font-bold">Rs. {lab.fee}</strong></span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  toggleItemSelection({
                                    id: `lab-${lab.orderId}`,
                                    department: "Laboratory",
                                    itemType: "Diagnostic Test",
                                    itemName: `Diagnostic Lab: ${lab.testName} (${lab.priority || "Routine"}) - Ref: ${lab.orderId}`,
                                    quantity: 1,
                                    unitPrice: lab.fee,
                                    totalPrice: lab.fee,
                                    referenceId: lab.orderId,
                                  })
                                }
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition self-start sm:self-auto shrink-0 ${
                                  isItemSelected(`lab-${lab.orderId}`)
                                    ? "bg-primary text-white"
                                    : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                {isItemSelected(`lab-${lab.orderId}`) ? "Selected" : "Add Lab Test"}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No charges detected */}
                    {!chargesData?.admission &&
                      (!chargesData?.appointments || chargesData.appointments.length === 0) &&
                      (!chargesData?.prescriptions || chargesData.prescriptions.length === 0) &&
                      (!chargesData?.labOrders || chargesData.labOrders.length === 0) && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm space-y-2">
                          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                          <h3 className="font-bold text-slate-800 text-base">All Charges Settled</h3>
                          <p className="text-xs text-slate-500 max-w-[420px] mx-auto leading-relaxed">
                            This patient currently has no unbilled admissions, consultations, pending prescriptions, or diagnostic tests.
                          </p>
                        </div>
                      )}
                  </div>
                </>
              ) : (
                /* Prompt to select card */
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">No Patient Selected</h3>
                  <p className="text-xs text-slate-500 max-w-[420px] mx-auto leading-relaxed">
                    Click any patient card in the Unpaid Queue above, or type an ID/phone into the lookup bar to load itemized checkout charges.
                  </p>
                </div>
              )}

              {/* Recent Invoices Ledger */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-primary" />
                    <span>Recent Hospital Invoices</span>
                  </h3>
                  <button
                    onClick={() => {
                      setLoadingRecent(true);
                      fetch("/api/billing/invoices?limit=8", { cache: "no-store" })
                        .then((r) => r.json())
                        .then((d) => d.success && setRecentInvoices(d.invoices || []))
                        .finally(() => setLoadingRecent(false));
                    }}
                    disabled={loadingRecent}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingRecent ? "animate-spin" : ""}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-400 uppercase font-semibold text-[10px] border-y border-slate-100">
                      <tr>
                        <th className="py-2.5 px-3">Invoice #</th>
                        <th className="py-2.5 px-3">Patient</th>
                        <th className="py-2.5 px-3">Items</th>
                        <th className="py-2.5 px-3">Total</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentInvoices.map((inv) => (
                        <tr key={inv._id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-bold text-primary">{inv.invoiceId}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-800 block">{inv.patientName}</span>
                            <span className="text-[11px] text-slate-400">{inv.patientId}</span>
                          </td>
                          <td className="py-2.5 px-3">{inv.items?.length || 0} items</td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">Rs. {inv.totalAmount}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                inv.paymentStatus === "Paid"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {inv.paymentStatus}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setActiveReceipt(inv)}
                                className="p-1 hover:bg-slate-100 rounded text-slate-600 transition"
                                title="Print Thermal Receipt"
                              >
                                <Receipt className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openDossierPrint(inv.patientId, "discharge_billing")}
                                className="p-1 hover:bg-slate-100 rounded text-primary transition"
                                title="Print Complete Dossier"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {recentInvoices.length === 0 && (
                        <tr>
                          <td colSpan="6" className="py-6 text-center text-slate-400">
                            No recent invoices recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column: Checkout Cart & Payment Collection */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5 sticky top-6">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <span>Consolidated Invoice Cart</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedItems.length} billable service item(s) selected
                  </p>
                </div>

                {/* Selected Items List */}
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {selectedItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 flex items-start justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              item.department === "Pharmacy"
                                ? "bg-emerald-100 text-emerald-800"
                                : item.department === "Laboratory"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {item.department}
                          </span>
                          {item.itemType && (
                            <span className="text-[10px] text-slate-400 capitalize">{item.itemType}</span>
                          )}
                        </div>
                        <span className="font-semibold text-slate-800 block text-xs leading-snug">
                          {item.itemName}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Qty: <span className="font-mono font-medium text-slate-600">{item.quantity}</span>
                          {item.quantity > 1 && item.unitPrice ? (
                            <span> • Rate: Rs. {item.unitPrice}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-slate-900 block font-mono">
                          Rs. {item.totalPrice}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleItemSelection(item)}
                          className="text-[10px] text-rose-500 hover:text-rose-700 font-medium hover:underline mt-1 inline-block"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}

                  {selectedItems.length === 0 && (
                    <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      Select pending charges from the left column to add them to this bill.
                    </div>
                  )}
                </div>

                {/* Totals Calculation */}
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Subtotal</span>
                    <span className="font-semibold text-slate-800">Rs. {cartSubtotal}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Discount (Rs.)</span>
                    <input
                      type="number"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                      className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-right text-xs font-semibold focus:ring-primary focus:border-primary"
                    />
                  </div>

                  <div className="flex items-center justify-between text-base font-bold text-slate-800 pt-2 border-t border-slate-100">
                    <span>Net Payable (PKR)</span>
                    <span className="text-primary text-xl">Rs. {cartNetTotal}</span>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-primary focus:border-primary"
                  >
                    <option value="Cash">Cash Counter</option>
                    <option value="Credit/Debit Card">Credit / Debit Card</option>
                    <option value="JazzCash">JazzCash Mobile Wallet</option>
                    <option value="EasyPaisa">EasyPaisa Mobile Wallet</option>
                    <option value="Bank Transfer">Direct Bank Transfer</option>
                    <option value="Insurance">Health Insurance TPA</option>
                  </select>
                </div>

                {/* Internal Cashier Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">Remarks / Notes</label>
                  <input
                    type="text"
                    placeholder="Optional transaction reference or note..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-primary focus:border-primary"
                  />
                </div>

                {/* Submit Payment Button */}
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={submitting || !patientData || selectedItems.length === 0}
                  className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {submitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>Collect Payment &amp; Issue Invoice</span>
                </button>

                {/* Print Dossier Quick Action if Patient Selected */}
                {patientData && (
                  <button
                    type="button"
                    onClick={() => openDossierPrint(patientData.patientId, "discharge_billing")}
                    className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <Printer className="w-4 h-4 text-primary" />
                    <span>Print Medical &amp; Billing Dossier</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Printable Invoice / Thermal Receipt Modal */}
      {activeReceipt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[660px] p-6 shadow-2xl border border-slate-200 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-primary font-bold text-base">
                <Receipt className="w-5 h-5" />
                <span>Hospital Invoice Receipt</span>
              </div>
              <button
                onClick={() => setActiveReceipt(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Receipt Area */}
            <div id="printable-receipt" className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4 text-xs">
              <div className="text-center border-b border-dashed border-slate-300 pb-3">
                <h2 className="text-base font-bold text-slate-800 tracking-tight">ROLEMED HEALTHCARE SYSTEM</h2>
                <p className="text-[11px] text-slate-500">Civil Lines / Medical Complex, Sialkot, Pakistan</p>
                <p className="text-[11px] font-semibold text-primary mt-1">Invoice #{activeReceipt.invoiceId}</p>
                <p className="text-[10px] text-slate-400">
                  {activeReceipt.createdAt ? new Date(activeReceipt.createdAt).toLocaleString() : ""}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 border-b border-dashed border-slate-300 pb-3">
                <div>
                  <span className="text-slate-400 block text-[10px]">PATIENT NAME</span>
                  <span className="font-bold text-slate-800">{activeReceipt.patientName}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">PATIENT ID</span>
                  <span className="font-bold text-slate-800">{activeReceipt.patientId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">PAYMENT METHOD</span>
                  <span className="font-semibold text-slate-700">{activeReceipt.paymentMethod}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">CASHIER</span>
                  <span className="font-semibold text-slate-700">{activeReceipt.collectedBy || "Authorized"}</span>
                </div>
              </div>

              {/* Itemized Charges Table */}
              <div className="border-b border-dashed border-slate-300 pb-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-1 px-1">Dept</th>
                        <th className="py-1 px-1">Description</th>
                        <th className="py-1 px-1 text-center">Qty</th>
                        <th className="py-1 px-1 text-right">Rate</th>
                        <th className="py-1 px-1 text-right">Amount (PKR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60">
                      {(activeReceipt.items || []).map((it, idx) => {
                        const title = it.itemName || it.name || "Clinical Service";
                        const dept = it.department || "General";
                        const qty = Number(it.quantity) || 1;
                        const unitRate = Number(it.unitPrice) || (Number(it.totalPrice) / qty) || 0;
                        const total = Number(it.totalPrice) || (unitRate * qty);

                        return (
                          <tr key={idx} className="text-slate-700">
                            <td className="py-1.5 px-1 align-top">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                  dept === "Pharmacy"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : dept === "Laboratory"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {dept}
                              </span>
                            </td>
                            <td className="py-1.5 px-1 align-top">
                              <span className="font-semibold text-slate-800 block leading-tight">
                                {title}
                              </span>
                              {it.referenceId && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  Ref: {it.referenceId}
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-1 align-top text-center font-mono text-slate-600">
                              {qty}
                            </td>
                            <td className="py-1.5 px-1 align-top text-right font-mono text-slate-600 whitespace-nowrap">
                              Rs. {unitRate}
                            </td>
                            <td className="py-1.5 px-1 align-top text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                              Rs. {total}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Settlement Totals */}
              <div className="space-y-1 pt-1 text-right">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span>Rs. {activeReceipt.subtotal}</span>
                </div>
                {activeReceipt.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>- Rs. {activeReceipt.discount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-slate-800 pt-1 border-t border-slate-200">
                  <span>Total Paid:</span>
                  <span className="text-primary font-bold">Rs. {activeReceipt.totalAmount}</span>
                </div>
              </div>

              <div className="text-center pt-2 text-[10px] text-slate-400">
                <p>Thank you for choosing RoleMed Healthcare.</p>
                <p>Computer generated tax invoice • No signature required.</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                onClick={() => openDossierPrint(activeReceipt.patientId, "discharge_billing")}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition"
              >
                <Printer className="w-4 h-4 text-primary" />
                <span>Print Clearance Dossier</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveReceipt(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition"
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Universal Clinical & Billing Dossier Print Modal */}
      <PatientDossierPrintModal
        isOpen={dossierModalOpen}
        patientId={dossierPatientId}
        onClose={() => setDossierModalOpen(false)}
        initialPreset={dossierPreset}
      />
    </div>
  );
}
