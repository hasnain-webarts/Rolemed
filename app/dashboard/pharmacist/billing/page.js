"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Receipt,
  Plus,
  Trash2,
  Printer,
  Eye,
  X,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
  FileText,
  Package,
  Layers,
  Coins,
  ChevronDown,
  CreditCard,
} from 'lucide-react';
import Sidebar from '@/components/Pharmacist_Sidebar';
import Footer from '@/components/Footer';
import BillingDesk from '@/components/BillingDesk';

export default function PharmacyBilling() {
  const [billingView, setBillingView] = useState('hospital'); // 'hospital' | 'dispensary'
  const [patients, setPatients] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Bill Form State
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedRxId, setSelectedRxId] = useState('');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [paymentStatus, setPaymentStatus] = useState('Paid');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [billingNotes, setBillingNotes] = useState('');

  // Searchable Rx combobox state
  const [rxSearch, setRxSearch] = useState('');
  const [isRxDropdownOpen, setIsRxDropdownOpen] = useState(false);
  const rxDropdownRef = useRef(null);

  // Item builder state
  const [selectedDrugSku, setSelectedDrugSku] = useState('');
  const [billingType, setBillingType] = useState('Pack'); // 'Pack' or 'Unit'
  const [selectedQty, setSelectedQty] = useState('1');

  // Searchable Medication Formulation combobox state
  const [drugSearch, setDrugSearch] = useState('');
  const [isDrugDropdownOpen, setIsDrugDropdownOpen] = useState(false);
  const drugDropdownRef = useRef(null);

  const [addedItems, setAddedItems] = useState([]);
  const [viewingSale, setViewingSale] = useState(null);

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (rxDropdownRef.current && !rxDropdownRef.current.contains(event.target)) {
        setIsRxDropdownOpen(false);
      }
      if (drugDropdownRef.current && !drugDropdownRef.current.contains(event.target)) {
        setIsDrugDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch real patients, inventory, prescriptions, and invoices
  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        setErrorMsg('');
        const [patRes, medRes, rxRes, invRes] = await Promise.all([
          fetch('/api/patients', { cache: 'no-store' }),
          fetch('/api/medicines?limit=500', { cache: 'no-store' }),
          fetch('/api/prescriptions', { cache: 'no-store' }),
          fetch('/api/pharmacy/invoices', { cache: 'no-store' }),
        ]);

        const [patData, medData, rxData, invData] = await Promise.all([
          patRes.json(),
          medRes.json(),
          rxRes.json(),
          invRes.json(),
        ]);

        if (!ignore) {
          if (patData.success) setPatients(patData.patients || []);
          if (medData.success) setInventory(medData.medicines || []);
          if (rxData.success) setPrescriptions(rxData.prescriptions || []);
          if (invData.success) setInvoices(invData.invoices || []);
        }
      } catch (err) {
        console.error('Error fetching billing data:', err);
        if (!ignore) {
          setErrorMsg('Failed to synchronize billing records with hospital server.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  // Selected drug details
  const selectedDrug = useMemo(() => {
    return inventory.find((m) => m.sku === selectedDrugSku) || null;
  }, [selectedDrugSku, inventory]);

  // Selected prescription details
  const selectedRxObj = useMemo(() => {
    if (!selectedRxId) return null;
    return (
      prescriptions.find(
        (r) =>
          (r.prescriptionId || '').toUpperCase() === selectedRxId.toUpperCase() ||
          r._id === selectedRxId
      ) || null
    );
  }, [selectedRxId, prescriptions]);

  // Filtered Prescriptions for combobox
  const filteredPrescriptions = useMemo(() => {
    if (!rxSearch.trim()) return prescriptions;
    const q = rxSearch.toLowerCase().trim();
    return prescriptions.filter((rx) => {
      const rxId = (rx.prescriptionId || rx.id || '').toLowerCase();
      const pName = (rx.patientName || '').toLowerCase();
      const pId = (rx.patientId || '').toLowerCase();
      const drugsStr = (rx.drugs || []).map((d) => d.name).join(' ').toLowerCase();
      return rxId.includes(q) || pName.includes(q) || pId.includes(q) || drugsStr.includes(q);
    });
  }, [prescriptions, rxSearch]);

  // Filtered Formulary Medicines for combobox
  const filteredMeds = useMemo(() => {
    if (!drugSearch.trim()) return inventory;
    const q = drugSearch.toLowerCase().trim();
    return inventory.filter((d) => {
      const name = (d.name || '').toLowerCase();
      const gen = (d.genericName || '').toLowerCase();
      const sku = (d.sku || '').toLowerCase();
      const cat = (d.category || '').toLowerCase();
      return name.includes(q) || gen.includes(q) || sku.includes(q) || cat.includes(q);
    });
  }, [inventory, drugSearch]);

  // Handle Quick Import from E-Prescription
  const handleImportRx = () => {
    if (!selectedRxId) return;

    const rx = prescriptions.find(
      (r) =>
        (r.prescriptionId || '').toUpperCase() === selectedRxId.toUpperCase() ||
        r._id === selectedRxId
    );

    if (!rx) {
      setErrorMsg(`Prescription "${selectedRxId}" not found.`);
      return;
    }

    // Set patient
    if (rx.patientId) {
      setSelectedPatientId(rx.patientId);
    }

    // Convert prescribed drugs into billing items
    const newItems = (rx.drugs || []).map((drug) => {
      const match = inventory.find(
        (m) =>
          m.name.toLowerCase() === drug.name.toLowerCase() ||
          (m.genericName && m.genericName.toLowerCase() === drug.name.toLowerCase())
      );

      const qtyUnits = drug.qtyNeeded || 10;
      const packSize = match ? match.quantityPerPack || 10 : 10;
      const pricePerPack = match ? match.pricePerPack || 0 : 0;
      const unitPrice = match ? match.unitPrice || 0 : drug.unitPrice || 0;
      const packs = Math.ceil(qtyUnits / packSize);
      const totalPrice = Math.round(qtyUnits * unitPrice * 100) / 100;

      return {
        sku: match ? match.sku : 'MED-GEN',
        name: drug.name,
        qtyUnits,
        packs,
        pricePerPack,
        unitPrice,
        totalPrice,
        billingType: 'Unit',
      };
    });

    setAddedItems((prev) => [...prev, ...newItems]);
    setSuccessMsg(`Imported ${newItems.length} medications from prescription ${rx.prescriptionId || rx._id}!`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Add Item to Bill
  const handleAddItem = () => {
    if (!selectedDrug || !selectedQty || parseInt(selectedQty, 10) <= 0) return;

    const qtyVal = parseInt(selectedQty, 10) || 1;
    let qtyUnits = qtyVal;
    let packs = 0;
    let lineTotal = 0;

    if (billingType === 'Pack') {
      packs = qtyVal;
      qtyUnits = packs * (selectedDrug.quantityPerPack || 10);
      lineTotal = Math.round(packs * (selectedDrug.pricePerPack || 0) * 100) / 100;
    } else {
      qtyUnits = qtyVal;
      packs = Math.ceil(qtyUnits / (selectedDrug.quantityPerPack || 10));
      lineTotal = Math.round(qtyUnits * (selectedDrug.unitPrice || 0) * 100) / 100;
    }

    const newItem = {
      sku: selectedDrug.sku,
      name: selectedDrug.name,
      qtyUnits,
      packs,
      pricePerPack: selectedDrug.pricePerPack || 0,
      unitPrice: selectedDrug.unitPrice || 0,
      totalPrice: lineTotal,
      billingType,
    };

    setAddedItems((prev) => [...prev, newItem]);
    setSelectedDrugSku('');
    setDrugSearch('');
    setSelectedQty('1');
  };

  const handleRemoveItem = (index) => {
    setAddedItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Subtotal & Total Due Calculations in PKR
  const subtotal = useMemo(() => {
    return addedItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  }, [addedItems]);

  const discountVal = Math.max(0, parseFloat(discountAmount) || 0);
  const totalCost = Math.max(0, subtotal - discountVal);

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (addedItems.length === 0) {
      setErrorMsg('Please add at least one medicine item to the invoice.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const patient = patients.find((p) => p.patientId === selectedPatientId || p.id === selectedPatientId);
      const patientName = patient ? patient.name : selectedPatientId ? selectedPatientId : 'Walk-In Customer';

      const payload = {
        patient: patient ? patient._id : null,
        patientId: patient ? patient.patientId : selectedPatientId || 'WALK-IN',
        patientName,
        prescriptionId: selectedRxId ? selectedRxId.trim().toUpperCase() : '',
        items: addedItems,
        discount: discountVal,
        paymentStatus,
        paymentMethod,
        notes: billingNotes,
      };

      const res = await fetch('/api/pharmacy/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to compile pharmacy invoice');
      }

      setSuccessMsg(`Pharmacy invoice ${data.invoice.invoiceId} compiled! Total: PKR ${data.invoice.totalAmount.toFixed(2)}`);

      // Reset Form
      setSelectedPatientId('');
      setSelectedRxId('');
      setRxSearch('');
      setSelectedDrugSku('');
      setDrugSearch('');
      setAddedItems([]);
      setDiscountAmount('0');
      setBillingNotes('');
      setPaymentStatus('Paid');
      setPaymentMethod('Cash');
      setRefreshKey((k) => k + 1);

      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error('Invoice error:', err);
      setErrorMsg(err.message || 'Error generating invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePayment = async (invoice) => {
    const nextStatus = invoice.paymentStatus === 'Paid' ? 'Unpaid' : 'Paid';
    try {
      const res = await fetch(`/api/pharmacy/invoices/${invoice.invoiceId || invoice._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setInvoices((prev) =>
          prev.map((inv) =>
            inv._id === invoice._id ? { ...inv, paymentStatus: nextStatus } : inv
          )
        );
        setSuccessMsg(`Invoice ${invoice.invoiceId} payment status updated to ${nextStatus}.`);
        setTimeout(() => setSuccessMsg(''), 3000);
        setRefreshKey((k) => k + 1);
      }
    } catch (err) {
      console.error('Toggle status error:', err);
    }
  };

  const handleVoidSale = async (invoice) => {
    if (!confirm(`Are you sure you want to void invoice ${invoice.invoiceId}?`)) return;

    try {
      const res = await fetch(`/api/pharmacy/invoices/${invoice.invoiceId || invoice._id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setInvoices((prev) => prev.filter((inv) => inv._id !== invoice._id));
        setSuccessMsg(`Invoice ${invoice.invoiceId} voided.`);
        setTimeout(() => setSuccessMsg(''), 3000);
        setRefreshKey((k) => k + 1);
      }
    } catch (err) {
      console.error('Void invoice error:', err);
    }
  };

  const filteredSales = invoices.filter(
    (s) =>
      (s.patientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.invoiceId || s.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.patientId || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (billingView === 'hospital') {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between shrink-0 z-40">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBillingView('hospital')}
              className="cursor-pointer px-3.5 py-1.5 rounded-lg text-xs font-bold bg-primary text-white shadow-xs flex items-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Hospital Cashier Desk</span>
            </button>
            <button
              type="button"
              onClick={() => setBillingView('dispensary')}
              className="cursor-pointer px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-1.5 transition"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Dispensary OTC Sales</span>
            </button>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            Pharmacy Department Billing Counter
          </span>
        </div>
        <div className="flex-1 min-h-0">
          <BillingDesk
            department="Pharmacy"
            SidebarComponent={Sidebar}
            portalTitle="Pharmacy Hospital Cashier & Settlement Desk"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background p-margin no-scrollbar">
        {/* View Switcher Header Bar */}
        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setBillingView('hospital')}
            className="cursor-pointer px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-1.5 border border-slate-200 transition"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Switch to Hospital Cashier Desk</span>
          </button>
          <span className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-primary text-white shadow-xs flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5" />
            <span>Dispensary OTC Sales Active</span>
          </span>
        </div>

        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-lg">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
              Pharmacy Billing & Invoicing Workspace
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              Compile customer receipts, calculate pack and loose unit pricing, and track dispensary transactions in PKR.
            </p>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              setRefreshKey((k) => k + 1);
            }}
            disabled={loading}
            className="cursor-pointer px-4 py-2 bg-surface-container hover:bg-surface-container-high rounded-xl text-body-sm font-semibold flex items-center gap-1.5 transition-colors border border-outline-variant/30 text-on-surface"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh Ledger
          </button>
        </header>

        {errorMsg && (
          <div className="mb-md p-4 rounded-2xl bg-error-container text-on-error-container flex items-center gap-2 border border-error/30 text-body-sm font-semibold animate-fade-in">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-lg p-md rounded-2xl bg-secondary-container text-on-secondary-container flex items-center gap-2 clinical-shadow font-semibold text-body-sm border border-secondary/20 animate-fade-in">
            <Check className="w-5 h-5 text-secondary shrink-0" /> {successMsg}
          </div>
        )}

        <div className="grid grid-cols-12 gap-gutter mb-lg">
          {/* Pharmacy Billing Invoice Form */}
          <div className="col-span-12 xl:col-span-5 glass-card p-margin rounded-[24px] clinical-shadow">
            <h3 className="text-title-sm font-bold text-on-surface mb-md flex items-center gap-2">
              <Receipt className="text-primary w-5 h-5" /> Compile Pharmacy Bill (PKR)
            </h3>

            <form onSubmit={handleCreateInvoice} className="space-y-md text-body-sm">
              {/* Patient Selection */}
              <div>
                <label className="block text-outline mb-1 font-semibold text-xs">Recipient Patient *</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary"
                >
                  <option value="">Walk-In Customer (Over-The-Counter)</option>
                  {patients.map((p) => (
                    <option key={p.patientId || p.id} value={p.patientId || p.id}>
                      {p.name} ({p.patientId || p.id}) - {p.gender}, {p.age}y
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Import from E-Prescription with Search */}
              <div className="p-3 bg-primary-fixed/20 border border-primary/20 rounded-xl space-y-1.5">
                <span className="block text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                  <FileText size={12} /> Auto-Import from Doctor Prescription (Optional)
                </span>
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1" ref={rxDropdownRef}>
                    {selectedRxObj ? (
                      <div className="flex items-center justify-between p-2 border border-primary/40 rounded-lg text-xs bg-white text-on-surface">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-mono font-bold text-primary bg-primary-fixed/40 px-1.5 py-0.5 rounded text-[10px]">
                            {selectedRxObj.prescriptionId || selectedRxObj.id}
                          </span>
                          <span className="font-semibold truncate">{selectedRxObj.patientName}</span>
                          <span className="text-[10px] text-outline">({selectedRxObj.drugs?.length || 0} drugs)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRxId('');
                            setRxSearch('');
                          }}
                          className="cursor-pointer text-outline hover:text-error ml-1 p-0.5 rounded hover:bg-surface-container"
                          title="Clear selection"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-outline w-3.5 h-3.5" />
                        <input
                          type="text"
                          placeholder="Search Rx ID or patient name..."
                          value={rxSearch}
                          onChange={(e) => {
                            setRxSearch(e.target.value);
                            setIsRxDropdownOpen(true);
                          }}
                          onFocus={() => setIsRxDropdownOpen(true)}
                          className="w-full pl-8 pr-7 p-2 border border-outline-variant/40 rounded-lg text-xs bg-white focus:outline-none focus:border-primary text-on-surface"
                        />
                        <button
                          type="button"
                          onClick={() => setIsRxDropdownOpen(!isRxDropdownOpen)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface cursor-pointer"
                        >
                          <ChevronDown size={14} className={`transition-transform ${isRxDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    )}

                    {isRxDropdownOpen && !selectedRxObj && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-outline-variant/30 rounded-xl shadow-lg z-30 max-h-52 overflow-y-auto sidebar-scroll p-1">
                        {filteredPrescriptions.length > 0 ? (
                          filteredPrescriptions.map((rx) => {
                            const rxIdVal = rx.prescriptionId || rx._id;
                            return (
                              <button
                                key={rxIdVal}
                                type="button"
                                onClick={() => {
                                  setSelectedRxId(rxIdVal);
                                  setIsRxDropdownOpen(false);
                                  setRxSearch('');
                                }}
                                className="w-full p-2 text-left rounded-lg hover:bg-surface-container/60 transition-colors flex items-center justify-between text-xs cursor-pointer group"
                              >
                                <div className="truncate">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-primary group-hover:underline">
                                      {rx.prescriptionId || rx.id}
                                    </span>
                                    <span className="font-bold text-on-surface truncate">{rx.patientName}</span>
                                  </div>
                                  <p className="text-[10px] text-outline truncate mt-0.5">
                                    Patient ID: {rx.patientId || 'N/A'} • {rx.drugs?.map((d) => d.name).join(', ') || 'No drugs'}
                                  </p>
                                </div>
                                <span className="text-[10px] bg-primary-fixed/40 text-primary font-bold px-1.5 py-0.5 rounded shrink-0 ml-2">
                                  {rx.drugs?.length || 0} drugs
                                </span>
                              </button>
                            );
                          })
                        ) : (
                          <div className="py-3 text-center text-xs text-outline">
                            No prescriptions matching &quot;{rxSearch}&quot;
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleImportRx}
                    disabled={!selectedRxId}
                    className="cursor-pointer px-3 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold hover:opacity-90 transition-all disabled:opacity-40 shrink-0 h-full"
                  >
                    Import Rx
                  </button>
                </div>
              </div>

              {/* Medicine Item Add Row with Search */}
              <div className="bg-surface-container/20 p-3 rounded-xl border border-outline-variant/10 space-y-2">
                <span className="block text-[11px] font-bold text-outline uppercase tracking-wider">
                  Add Medicine Item
                </span>

                <div className="relative" ref={drugDropdownRef}>
                  <label className="block text-[10px] text-outline mb-1 font-semibold">Medication Formulation</label>

                  {selectedDrug ? (
                    <div className="flex items-center justify-between p-2 border border-secondary/40 rounded-lg text-xs bg-surface-container-lowest text-on-surface">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono font-bold text-secondary bg-secondary-container/50 px-1.5 py-0.5 rounded text-[10px]">
                          {selectedDrug.sku}
                        </span>
                        <span className="font-bold text-on-surface truncate">{selectedDrug.name}</span>
                        <span className="text-[10px] text-outline">
                          (Stock: <strong className={selectedDrug.stockQuantity > 0 ? "text-secondary" : "text-error"}>{selectedDrug.stockQuantity}</strong>)
                        </span>
                        <span className="text-[10px] font-mono font-semibold text-primary">
                          Rs. {selectedDrug.pricePerPack}/pk • Rs. {selectedDrug.unitPrice}/u
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDrugSku('');
                          setDrugSearch('');
                        }}
                        className="cursor-pointer text-outline hover:text-error ml-2 p-0.5 rounded hover:bg-surface-container shrink-0"
                        title="Change medication"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-outline w-3.5 h-3.5" />
                      <input
                        type="text"
                        placeholder="Search medicine by trade name, generic molecule, or SKU..."
                        value={drugSearch}
                        onChange={(e) => {
                          setDrugSearch(e.target.value);
                          setIsDrugDropdownOpen(true);
                        }}
                        onFocus={() => setIsDrugDropdownOpen(true)}
                        className="w-full pl-8 pr-7 p-2 border border-outline-variant/40 rounded-lg bg-surface-container-lowest text-xs focus:outline-none focus:border-primary font-medium text-on-surface"
                      />
                      <button
                        type="button"
                        onClick={() => setIsDrugDropdownOpen(!isDrugDropdownOpen)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface cursor-pointer"
                      >
                        <ChevronDown size={14} className={`transition-transform ${isDrugDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  )}

                  {isDrugDropdownOpen && !selectedDrug && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-outline-variant/30 rounded-xl shadow-lg z-30 max-h-60 overflow-y-auto sidebar-scroll p-1">
                      {filteredMeds.length > 0 ? (
                        filteredMeds.map((d) => (
                          <button
                            key={d.sku}
                            type="button"
                            onClick={() => {
                              setSelectedDrugSku(d.sku);
                              setIsDrugDropdownOpen(false);
                              setDrugSearch('');
                            }}
                            className="w-full p-2 text-left rounded-lg hover:bg-surface-container/60 transition-colors flex items-center justify-between text-xs cursor-pointer group"
                          >
                            <div className="truncate">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] font-bold text-outline group-hover:text-primary">
                                  {d.sku}
                                </span>
                                <span className="font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                                  {d.name}
                                </span>
                                <span className="text-[10px] text-outline font-normal">
                                  {d.genericName ? `(${d.genericName})` : ''}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-outline mt-0.5">
                                <span>Category: <strong className="text-on-surface-variant">{d.category}</strong></span>
                                <span>•</span>
                                <span>Pack: <strong>{d.quantityPerPack} units</strong></span>
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <div className="font-mono font-bold text-primary text-xs">
                                Rs. {d.pricePerPack}/pk
                              </div>
                              <div className="text-[10px] text-outline">
                                Stock:{' '}
                                <span
                                  className={`font-bold font-mono ${
                                    d.stockQuantity === 0
                                      ? 'text-error'
                                      : d.stockQuantity <= (d.reorderLevel || 20)
                                      ? 'text-amber-600'
                                      : 'text-secondary'
                                  }`}
                                >
                                  {d.stockQuantity}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="py-3 text-center text-xs text-outline">
                          No medicines found matching &quot;{drugSearch}&quot;
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-outline mb-1 font-semibold">Billing Mode</label>
                    <select
                      value={billingType}
                      onChange={(e) => setBillingType(e.target.value)}
                      className="w-full p-2 border border-outline-variant/40 rounded-lg bg-surface-container-lowest text-xs focus:outline-none"
                    >
                      <option value="Pack">By Full Pack (Boxes)</option>
                      <option value="Unit">By Loose Units (Tablets/Capsules)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-outline mb-1 font-semibold">
                      Quantity ({billingType === 'Pack' ? 'Packs' : 'Units'})
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={selectedQty}
                      onChange={(e) => setSelectedQty(e.target.value)}
                      className="w-full p-2 border border-outline-variant/40 rounded-lg bg-surface-container-lowest text-xs focus:outline-none font-mono font-bold"
                    />
                  </div>
                </div>

                {selectedDrug && (
                  <div className="p-2 bg-surface-container/40 rounded-lg text-xs flex justify-between items-center text-outline">
                    <span>
                      Rate: <strong className="text-on-surface">
                        {billingType === 'Pack'
                          ? `Rs. ${selectedDrug.pricePerPack}/pk of ${selectedDrug.quantityPerPack}`
                          : `Rs. ${selectedDrug.unitPrice}/unit`}
                      </strong>
                    </span>
                    <span>
                      Est. Total:{' '}
                      <strong className="text-secondary font-mono font-bold">
                        Rs. {billingType === 'Pack'
                          ? ((parseInt(selectedQty, 10) || 0) * (selectedDrug.pricePerPack || 0)).toFixed(2)
                          : ((parseInt(selectedQty, 10) || 0) * (selectedDrug.unitPrice || 0)).toFixed(2)}
                      </strong>
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={!selectedDrug}
                  className="cursor-pointer text-xs font-bold text-secondary bg-secondary-container/60 border border-secondary/30 px-4 py-2 rounded-xl flex items-center justify-center gap-1 hover:bg-secondary-container transition-all w-full disabled:opacity-40"
                >
                  <Plus size={14} /> Append Medicine to Bill
                </button>
              </div>

              {/* Item List Preview */}
              <div>
                <span className="block text-outline mb-2 font-semibold text-xs">
                  Invoice Items ({addedItems.length})
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto sidebar-scroll pr-1">
                  {addedItems.length > 0 ? (
                    addedItems.map((item, index) => (
                      <div
                        key={index}
                        className="p-2.5 bg-surface-container-low border border-outline-variant/20 rounded-xl flex items-center justify-between shadow-xs text-xs"
                      >
                        <div>
                          <p className="font-bold text-on-surface">{item.name}</p>
                          <p className="text-[11px] text-outline mt-0.5 font-medium font-mono">
                            {item.billingType === 'Pack'
                              ? `${item.packs} Pk${item.packs === 1 ? '' : 's'} × Rs. ${item.pricePerPack.toFixed(2)} (${item.qtyUnits} units)`
                              : `${item.qtyUnits} Units × Rs. ${item.unitPrice.toFixed(2)}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary font-mono text-body-sm">
                            Rs. {item.totalPrice.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="cursor-pointer p-1.5 hover:bg-error-container text-error rounded-lg transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-body-sm text-outline italic py-4 text-center bg-surface-container-low border border-dashed border-outline-variant/20 rounded-xl">
                      No drug items added to this bill yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-outline mb-1 font-semibold text-xs">Payment Settlement</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="w-full p-2 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-xs focus:outline-none"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-outline mb-1 font-semibold text-xs">Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-2 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-xs focus:outline-none"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Insurance">Insurance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-outline mb-1 font-semibold text-xs">Discount (PKR)</label>
                  <input
                    type="number"
                    min={0}
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    className="w-full p-2 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-xs focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-surface-container-high/40 rounded-xl border border-outline-variant/15 flex justify-between items-center text-body-md">
                <span className="font-semibold text-outline">Calculated Total (PKR):</span>
                <span className="font-bold text-headline-sm text-primary font-mono">
                  Rs. {totalCost.toFixed(2)}
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting || addedItems.length === 0}
                className="cursor-pointer w-full flex items-center justify-center gap-2 py-3 bg-primary text-on-primary rounded-xl font-bold clinical-shadow hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-body-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Compiling Invoice & Deducting Stock...
                  </>
                ) : (
                  <>
                    <Plus size={18} /> Compile Pharmacy Invoice (PKR {totalCost.toFixed(2)})
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Sales Log Ledger Column */}
          <div className="col-span-12 xl:col-span-7 glass-card p-margin rounded-[24px] clinical-shadow flex flex-col h-[670px]">
            <div className="mb-md flex flex-col md:flex-row justify-between items-center gap-sm">
              <div className="flex items-center gap-2">
                <Receipt className="text-primary w-5 h-5" />
                <h3 className="text-title-sm font-bold text-on-surface">
                  Pharmacy Transactions Ledger ({invoices.length})
                </h3>
              </div>
              <div className="relative w-full md:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4.5 h-4.5" />
                <input
                  type="text"
                  placeholder="Search invoice or patient..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-surface-container border border-outline-variant/30 rounded-xl text-body-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-sm sidebar-scroll pr-1">
              {loading ? (
                <div className="py-24 flex flex-col items-center justify-center text-outline gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-body-sm">Loading transactions ledger...</span>
                </div>
              ) : filteredSales.length > 0 ? (
                filteredSales.map((sale) => (
                  <div
                    key={sale._id || sale.invoiceId}
                    className="p-md bg-surface-container-low border border-outline-variant/10 rounded-2xl clinical-shadow flex flex-col justify-between text-body-sm hover:border-primary/30 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-primary font-mono uppercase">
                            {sale.invoiceId}
                          </span>
                          <span className="text-[10px] text-outline font-semibold">Issued: {sale.date}</span>
                          {sale.prescriptionId && (
                            <span className="text-[10px] text-secondary font-mono font-bold bg-secondary-container/50 px-1.5 py-0.5 rounded">
                              Rx: {sale.prescriptionId}
                            </span>
                          )}
                        </div>
                        <h5 className="font-bold text-on-surface text-body-md mb-0.5">{sale.patientName}</h5>
                        <p className="text-[12px] text-on-surface-variant font-medium">
                          Drugs: {(sale.items || []).map((i) => `${i.name} (${i.qtyUnits}u)`).join(', ')}
                        </p>
                        <p className="text-[11px] text-outline mt-1 font-semibold">
                          Payment: {sale.paymentMethod} • Total:{' '}
                          <span className="text-primary font-bold font-mono">
                            Rs. {(sale.totalAmount || 0).toFixed(2)}
                          </span>
                        </p>
                      </div>

                      <div className="flex md:flex-col items-end gap-2 mt-2 md:mt-0 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full cursor-pointer hover:scale-105 transition-transform ${
                            sale.paymentStatus === 'Paid'
                              ? 'bg-secondary-container text-on-secondary-container'
                              : 'bg-error-container text-on-error-container font-bold'
                          }`}
                          onClick={() => handleTogglePayment(sale)}
                          title="Click to toggle Paid/Unpaid"
                        >
                          {sale.paymentStatus}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-md pt-2 border-t border-outline-variant/10">
                      <button
                        onClick={() => setViewingSale(sale)}
                        className="cursor-pointer text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                      >
                        <Eye size={12} /> View Invoice
                      </button>
                      <button
                        onClick={() => handleVoidSale(sale)}
                        className="cursor-pointer p-1 hover:bg-error-container text-error rounded-lg transition-colors"
                        title="Void sales record"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-16 text-center text-outline">
                  <Receipt className="mx-auto w-12 h-12 text-outline-variant mb-2" />
                  <p className="font-semibold text-body-sm">No pharmacy transactions found in the ledger.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selected Sale Receipt Modal */}
        {viewingSale && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-md animate-fade-in">
            <div className="bg-white rounded-2xl max-w-240 w-full clinical-shadow border border-outline-variant/30 overflow-hidden">
              <div className="px-6 py-4 bg-primary text-on-primary flex justify-between items-center">
                <h3 className="font-bold text-title-sm flex items-center gap-1.5">
                  <Receipt size={18} /> Pharmacy Drug Sales Invoice
                </h3>
                <button
                  onClick={() => setViewingSale(null)}
                  className="cursor-pointer hover:bg-white/10 p-1 rounded-full transition-colors text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-margin space-y-md text-body-sm overflow-y-auto max-h-[500px] sidebar-scroll">
                <div className="flex justify-between border-b border-outline-variant/20 pb-3">
                  <div>
                    <span className="block text-[10px] text-outline font-bold uppercase">Customer details</span>
                    <p className="font-bold text-on-surface text-body-md">{viewingSale.patientName}</p>
                    <p className="text-xs text-outline font-mono">{viewingSale.patientId}</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-outline font-bold uppercase">Invoice Date</span>
                    <p className="font-semibold text-on-surface-variant text-body-sm">{viewingSale.date}</p>
                    <p className="text-xs font-bold text-primary mt-1 font-mono">{viewingSale.invoiceId}</p>
                  </div>
                </div>

                {/* Items List */}
                <div>
                  <span className="block text-[10px] text-outline font-bold uppercase mb-2">
                    Itemized Medications
                  </span>
                  <div className="space-y-1.5 border border-outline-variant/20 rounded-xl p-2.5">
                    {(viewingSale.items || []).map((item, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center py-1.5 border-b border-outline-variant/10 last:border-0"
                      >
                        <div>
                          <span className="font-bold text-on-surface">{item.name}</span>
                          <span className="block text-[11px] text-outline font-mono">
                            {item.billingType === 'Pack'
                              ? `${item.packs} Pk${item.packs === 1 ? '' : 's'} (${item.qtyUnits} units)`
                              : `${item.qtyUnits} Units`}
                          </span>
                        </div>
                        <span className="font-bold font-mono text-on-surface">
                          Rs. {(item.totalPrice || 0).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 bg-surface-container p-3 rounded-xl border border-outline-variant/10 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-outline">Subtotal:</span>
                    <span className="font-semibold">Rs. {(viewingSale.subtotal || viewingSale.amount || 0).toFixed(2)}</span>
                  </div>
                  {viewingSale.discount > 0 && (
                    <div className="flex justify-between text-secondary">
                      <span>Discount:</span>
                      <span>- Rs. {viewingSale.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-body-md font-bold text-primary pt-1 border-t border-outline-variant/20">
                    <span>Total Amount Paid ({viewingSale.paymentMethod}):</span>
                    <span>Rs. {(viewingSale.totalAmount || viewingSale.amount || 0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-outline-variant/20">
                  <span
                    className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                      viewingSale.paymentStatus === 'Paid'
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'bg-error-container text-on-error-container font-bold'
                    }`}
                  >
                    {viewingSale.paymentStatus}
                  </span>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => alert('Print queue triggered for invoice receipt.')}
                      className="cursor-pointer px-4 py-2 border border-outline-variant/30 hover:bg-surface-container rounded-xl text-body-sm font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Printer size={14} /> Print Receipt
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewingSale(null)}
                      className="cursor-pointer px-6 py-2 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 transition-all clinical-shadow text-body-sm"
                    >
                      Close
                    </button>
                  </div>
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
