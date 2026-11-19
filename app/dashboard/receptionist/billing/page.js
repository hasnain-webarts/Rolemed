"use client";

import { useState, useEffect } from "react";
import ReceptionistSidebar from "@/components/Receptionist_Sidebar";
import Header from "@/components/Header";
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
  Clock,
  ShieldCheck,
} from "lucide-react";

export default function ReceptionistBillingPage() {
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

  const showNotice = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchRecentInvoices = async () => {
    setLoadingRecent(true);
    try {
      const res = await fetch("/api/billing/invoices?limit=8");
      const data = await res.json();
      if (data.success) {
        setRecentInvoices(data.invoices || []);
      }
    } catch {
      // Ignore background load error
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetch("/api/billing/invoices?limit=8");
        const data = await res.json();
        if (isMounted && data.success) {
          setRecentInvoices(data.invoices || []);
        }
      } catch {
        // Ignore background load error
      } finally {
        if (isMounted) setLoadingRecent(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearchPatient = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setPatientData(null);
    setChargesData(null);
    setSelectedItems([]);

    try {
      const res = await fetch(`/api/billing/pending-charges?patientId=${encodeURIComponent(searchQuery.trim())}`);
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
          items.push({
            id: `rx-${rx.prescriptionId}`,
            department: "Pharmacy",
            itemType: "Medication",
            itemName: `Pharmacy Prescription: ${rx.drugCount} Medication(s) by ${rx.doctorName}`,
            quantity: 1,
            unitPrice: rx.totalAmount,
            totalPrice: rx.totalAmount,
            referenceId: rx.prescriptionId,
          });
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

  const toggleItemSelection = (item) => {
    const exists = selectedItems.some((i) => i.id === item.id);
    if (exists) {
      setSelectedItems(selectedItems.filter((i) => i.id !== item.id));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const isItemSelected = (id) => selectedItems.some((i) => i.id === id);

  const cartSubtotal = selectedItems.reduce((s, it) => s + (Number(it.totalPrice) || 0), 0);
  const cartNetTotal = Math.max(0, cartSubtotal - Number(discount || 0));

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
        issuedDepartment: "Reception",
        items: selectedItems.map(({ department, itemType, itemName, quantity, unitPrice, totalPrice, referenceId }) => ({
          department,
          itemType,
          itemName,
          quantity,
          unitPrice,
          totalPrice,
          referenceId,
        })),
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
        // Refresh patient charges & recent invoices
        handleSearchPatient();
        fetchRecentInvoices();
      } else {
        showNotice("error", data.error || "Failed to process hospital invoice payment");
      }
    } catch {
      showNotice("error", "Network error during checkout payment processing");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
      <ReceptionistSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header onMenuClick={() => setSidebarOpen(true)} title="Consolidated Billing & Cashier Desk" />

        <main className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Top Bar Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Receipt className="w-4 h-4" />
                <span>Centralized & Hybrid Cashier Counter</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mt-1">
                Patient Hospital Billing & Fee Settlement
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Lookup registered patients to aggregate unbilled bed stays, doctor consultations, prescriptions, and diagnostic lab orders into a single consolidated PKR invoice.
              </p>
            </div>

            {/* Patient Search Input */}
            <form onSubmit={handleSearchPatient} className="flex items-center gap-2 max-w-md w-full">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Patient ID (e.g. PAT-012) or Phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-primary focus:border-primary"
                />
              </div>
              <button
                type="submit"
                disabled={searching || !searchQuery.trim()}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition disabled:opacity-50"
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
            {/* Left 2 Columns: Patient Profile & Pending Line Items */}
            <div className="lg:col-span-2 space-y-6">
              {patientData ? (
                <>
                  {/* Patient Info Card */}
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
                          <span className="font-semibold text-rose-600">Blood: {patientData.bloodGroup || "N/A"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Pending Charges Total</span>
                      <span className="text-xl font-bold text-primary">
                        Rs. {chargesData ? chargesData.grandTotal || 0 : 0}
                      </span>
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
                            <span>Inpatient Stay & Ward Accommodation</span>
                          </div>
                          <span className="text-xs font-semibold text-primary">
                            Rs. {chargesData.admission.totalCharge}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-slate-800 block">
                              Ward: {chargesData.admission.ward} (Bed {chargesData.admission.bedNumber})
                            </span>
                            <span className="text-slate-500">
                              Stay Duration: {chargesData.admission.stayDays} Day(s) @ Rs. {chargesData.admission.dailyRate} / day
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              toggleItemSelection({
                                id: `adm-${chargesData.admission.admissionId}`,
                                department: "Reception",
                                itemType: "Bed Stay",
                                itemName: `Inpatient Stay: ${chargesData.admission.ward} (Bed ${chargesData.admission.bedNumber})`,
                                quantity: chargesData.admission.stayDays,
                                unitPrice: chargesData.admission.dailyRate,
                                totalPrice: chargesData.admission.totalCharge,
                                referenceId: chargesData.admission.admissionId,
                              })
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                              isItemSelected(`adm-${chargesData.admission.admissionId}`)
                                ? "bg-primary text-white"
                                : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {isItemSelected(`adm-${chargesData.admission.admissionId}`) ? "Selected" : "Add to Bill"}
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
                            <span>Doctor Consultations & OPD Visits ({chargesData.appointments.length})</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {chargesData.appointments.map((apt) => (
                            <div
                              key={apt.appointmentId}
                              className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-semibold text-slate-800 block">
                                  {apt.doctorName} ({apt.department})
                                </span>
                                <span className="text-slate-500">
                                  Date: {apt.date} • Consultation Fee: Rs. {apt.fee}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  toggleItemSelection({
                                    id: `apt-${apt.appointmentId}`,
                                    department: "Reception",
                                    itemType: "Consultation",
                                    itemName: `Doctor Consultation: ${apt.doctorName}`,
                                    quantity: 1,
                                    unitPrice: apt.fee,
                                    totalPrice: apt.fee,
                                    referenceId: apt.appointmentId,
                                  })
                                }
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                  isItemSelected(`apt-${apt.appointmentId}`)
                                    ? "bg-primary text-white"
                                    : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                {isItemSelected(`apt-${apt.appointmentId}`) ? "Selected" : "Add to Bill"}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 3. Pharmacy Prescriptions */}
                    {chargesData?.prescriptions?.length > 0 && (
                      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                            <Pill className="w-4 h-4 text-amber-500" />
                            <span>Pharmacy Prescriptions ({chargesData.prescriptions.length})</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {chargesData.prescriptions.map((rx) => (
                            <div
                              key={rx.prescriptionId}
                              className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-semibold text-slate-800 block">
                                  Prescribed by {rx.doctorName} ({rx.drugCount} medications)
                                </span>
                                <span className="text-slate-500">
                                  Total Medication Value: Rs. {rx.totalAmount}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  toggleItemSelection({
                                    id: `rx-${rx.prescriptionId}`,
                                    department: "Pharmacy",
                                    itemType: "Medication",
                                    itemName: `Pharmacy Prescription (${rx.drugCount} Items)`,
                                    quantity: 1,
                                    unitPrice: rx.totalAmount,
                                    totalPrice: rx.totalAmount,
                                    referenceId: rx.prescriptionId,
                                  })
                                }
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                  isItemSelected(`rx-${rx.prescriptionId}`)
                                    ? "bg-primary text-white"
                                    : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                {isItemSelected(`rx-${rx.prescriptionId}`) ? "Selected" : "Add to Bill"}
                              </button>
                            </div>
                          ))}
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
                              className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-semibold text-slate-800 block">
                                  {lab.testName} ({lab.priority})
                                </span>
                                <span className="text-slate-500">
                                  Order #{lab.orderId} • Standard Fee: Rs. {lab.fee}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  toggleItemSelection({
                                    id: `lab-${lab.orderId}`,
                                    department: "Laboratory",
                                    itemType: "Diagnostic Test",
                                    itemName: `Diagnostic Lab: ${lab.testName}`,
                                    quantity: 1,
                                    unitPrice: lab.fee,
                                    totalPrice: lab.fee,
                                    referenceId: lab.orderId,
                                  })
                                }
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                  isItemSelected(`lab-${lab.orderId}`)
                                    ? "bg-primary text-white"
                                    : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                                }`}
                              >
                                {isItemSelected(`lab-${lab.orderId}`) ? "Selected" : "Add to Bill"}
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
                          <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            This patient currently has no unbilled admissions, consultations, pending prescriptions, or diagnostic tests.
                          </p>
                        </div>
                      )}
                  </div>
                </>
              ) : (
                /* Empty state when no patient is searched yet */
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <Search className="w-8 h-8" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800">No Patient Selected</h2>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Enter a Patient Registration Number (e.g. PAT-001, PAT-012) or phone number in the top lookup bar to aggregate pending clinical charges.
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
                    onClick={fetchRecentInvoices}
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
                        <th className="py-2.5 px-3 text-right">Receipt</th>
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
                          <td className="py-2.5 px-3">{inv.items?.length || 0} line items</td>
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
                            <button
                              onClick={() => setActiveReceipt(inv)}
                              className="p-1 hover:bg-slate-100 rounded text-slate-600 transition"
                              title="Print Thermal Receipt"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
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
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-semibold text-slate-800 block truncate">{item.itemName}</span>
                        <span className="text-[11px] text-slate-400">Dept: {item.department}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-slate-800 block">Rs. {item.totalPrice}</span>
                        <button
                          type="button"
                          onClick={() => toggleItemSelection(item)}
                          className="text-[10px] text-rose-500 hover:underline"
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
                  <span>Collect Payment & Issue Invoice</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Printable Invoice / Thermal Receipt Modal */}
      {activeReceipt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
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
                <p className="text-[11px] text-slate-500">Multan Road / Medical Complex, Pakistan</p>
                <p className="text-[11px] font-semibold text-primary mt-1">Invoice #{activeReceipt.invoiceId}</p>
                <p className="text-[10px] text-slate-400">
                  {activeReceipt.createdAt ? new Date(activeReceipt.createdAt).toLocaleString() : ''}
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

              {/* Line Items */}
              <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3">
                <div className="flex items-center justify-between font-semibold text-[10px] text-slate-400 uppercase">
                  <span>Description</span>
                  <span>Amount (PKR)</span>
                </div>
                {(activeReceipt.items || []).map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between text-slate-700">
                    <span className="truncate pr-2">
                      {it.itemName} {it.quantity > 1 ? `(x${it.quantity})` : ""}
                    </span>
                    <span className="font-bold shrink-0">Rs. {it.totalPrice}</span>
                  </div>
                ))}
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
            <div className="flex items-center justify-end gap-3 pt-2">
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
                <span>Print Thermal Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
