"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  Search,
  Receipt,
  Plus,
  Check,
  Trash2,
  Printer,
  Eye,
  X,
  RefreshCw,
  FileText,
  AlertCircle,
  CreditCard,
  ChevronDown,
  User,
  FlaskConical,
} from 'lucide-react';
import Sidebar from '@/components/Lab_Technician_Sidebar';
import Footer from '@/components/Footer';
import BillingDesk from '@/components/BillingDesk';

// Standard Laboratory Diagnostic Catalog in Pakistani Rupees (PKR)
export const LAB_CATALOG = [
  { testCode: 'T-CBC', testName: 'Complete Blood Count (CBC) with ESR', category: 'Hematology', price: 950 },
  { testCode: 'T-FBS', testName: 'Fasting Blood Sugar (FBS)', category: 'Biochemistry', price: 350 },
  { testCode: 'T-HBA1C', testName: 'Glycated Hemoglobin (HbA1c)', category: 'Biochemistry', price: 1400 },
  { testCode: 'T-LIP', testName: 'Lipid Profile (Chol, HDL, LDL, Trig)', category: 'Biochemistry', price: 1800 },
  { testCode: 'T-LFT', testName: 'Liver Function Panel (ALT, AST, Bilirubin)', category: 'Biochemistry', price: 1650 },
  { testCode: 'T-RFT', testName: 'Renal Function Panel (Urea, Creatinine)', category: 'Biochemistry', price: 1500 },
  { testCode: 'T-UA', testName: 'Urine Routine Examination (Urine R/E)', category: 'Pathology', price: 450 },
  { testCode: 'T-TSH', testName: 'Thyroid Stimulating Hormone (TSH)', category: 'Endocrinology', price: 1200 },
  { testCode: 'T-ECG', testName: 'Electrocardiogram (12-Lead ECG)', category: 'Cardiology', price: 1000 },
  { testCode: 'T-CXR', testName: 'Chest X-Ray (PA View)', category: 'Radiology', price: 1500 },
  { testCode: 'T-USG', testName: 'Ultrasound Abdomen & Pelvis', category: 'Radiology', price: 2500 },
  { testCode: 'T-DENGUE', testName: 'Dengue NS1 Antigen & Serology', category: 'Microbiology', price: 1800 },
];

export default function LabBillingPage() {
  const { data: session } = useSession();
  const [billingView, setBillingView] = useState('hospital'); // 'hospital' | 'catalog'
  const [patients, setPatients] = useState([]);
  const [labOrders, setLabOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [summaryStats, setSummaryStats] = useState({
    totalInvoices: 0,
    totalRevenue: 0,
    paidCount: 0,
    unpaidCount: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Success and Error banners
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-Import & Form States
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [isOrderDropdownOpen, setIsOrderDropdownOpen] = useState(false);
  const orderDropdownRef = useRef(null);

  // Patient Selection
  const [patientSearch, setPatientSearch] = useState('');
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const patientDropdownRef = useRef(null);

  // Diagnostic Test Selection
  const [selectedTests, setSelectedTests] = useState([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [customDiscount, setCustomDiscount] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState('Paid');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');

  // Table Filters & Ledger Search
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewingInvoice, setViewingInvoice] = useState(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (orderDropdownRef.current && !orderDropdownRef.current.contains(event.target)) {
        setIsOrderDropdownOpen(false);
      }
      if (patientDropdownRef.current && !patientDropdownRef.current.contains(event.target)) {
        setIsPatientDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Live Data with Cache Elimination
  useEffect(() => {
    let ignore = false;
    async function loadData() {
      setIsLoading(true);
      try {
        const [patientsRes, ordersRes, invoicesRes] = await Promise.all([
          fetch('/api/patients?limit=150', { cache: 'no-store' }),
          fetch('/api/lab-orders?limit=150', { cache: 'no-store' }),
          fetch('/api/lab/invoices?limit=150', { cache: 'no-store' }),
        ]);

        const [patientsData, ordersData, invoicesData] = await Promise.all([
          patientsRes.json(),
          ordersRes.json(),
          invoicesRes.json(),
        ]);

        if (!ignore) {
          if (patientsData.success) {
            setPatients(patientsData.patients || []);
          }
          if (ordersData.success) {
            setLabOrders(ordersData.labOrders || []);
          }
          if (invoicesData.success) {
            setInvoices(invoicesData.invoices || []);
            if (invoicesData.summary) {
              setSummaryStats(invoicesData.summary);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching billing data:', err);
        if (!ignore) {
          setErrorMsg('Failed to fetch diagnostic billing records.');
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  // Filtered Lab Orders for Combobox
  const filteredOrders = useMemo(() => {
    if (!orderSearch.trim()) return labOrders;
    const q = orderSearch.toLowerCase().trim();
    return labOrders.filter((ord) => {
      const orderId = (ord.orderId || '').toLowerCase();
      const pName = (ord.patientName || '').toLowerCase();
      const pId = (ord.patientId || '').toLowerCase();
      const testName = (ord.testName || '').toLowerCase();
      return orderId.includes(q) || pName.includes(q) || pId.includes(q) || testName.includes(q);
    });
  }, [labOrders, orderSearch]);

  // Filtered Patients for Combobox
  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return patients;
    const q = patientSearch.toLowerCase().trim();
    return patients.filter((p) => {
      const pId = (p.patientId || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      const cnic = (p.cnic || '').toLowerCase();
      const phone = (p.phone || '').toLowerCase();
      return pId.includes(q) || name.includes(q) || cnic.includes(q) || phone.includes(q);
    });
  }, [patients, patientSearch]);

  // Filtered Diagnostic Catalog
  const filteredCatalog = useMemo(() => {
    if (!catalogSearch.trim()) return LAB_CATALOG;
    const q = catalogSearch.toLowerCase().trim();
    return LAB_CATALOG.filter((test) => {
      return (
        test.testName.toLowerCase().includes(q) ||
        test.testCode.toLowerCase().includes(q) ||
        test.category.toLowerCase().includes(q)
      );
    });
  }, [catalogSearch]);

  // 1-Click Auto-Import from Doctor Lab Order
  const handleImportOrder = () => {
    if (!selectedOrderId) return;
    const order = labOrders.find(
      (o) => (o.orderId || '').toUpperCase() === selectedOrderId.toUpperCase()
    );
    if (!order) return;

    // Set Patient
    const matchedPatient = patients.find(
      (p) => (p.patientId || '').toUpperCase() === (order.patientId || '').toUpperCase()
    );

    if (matchedPatient) {
      setSelectedPatient(matchedPatient);
      setIsWalkIn(false);
    } else {
      setSelectedPatient(null);
      setIsWalkIn(true);
      setWalkInName(order.patientName || 'Walk-in Patient');
    }

    // Match Test from catalog
    const matchedTest = LAB_CATALOG.find(
      (t) =>
        t.testName.toLowerCase().includes(order.testName.toLowerCase()) ||
        order.testName.toLowerCase().includes(t.testName.toLowerCase())
    );

    if (matchedTest) {
      if (!selectedTests.some((t) => t.testCode === matchedTest.testCode)) {
        setSelectedTests((prev) => [...prev, matchedTest]);
      }
    } else {
      // Add custom order test at reasonable fallback
      const customTestObj = {
        testCode: 'T-CUST',
        testName: order.testName,
        category: 'Diagnostic Order',
        price: 1000,
      };
      if (!selectedTests.some((t) => t.testName === customTestObj.testName)) {
        setSelectedTests((prev) => [...prev, customTestObj]);
      }
    }

    setNotes(`Billed from Doctor Lab Order: ${order.orderId} (Dr. ${order.doctorName || 'Consultant'})`);
    setSuccessMsg(`Auto-imported doctor order ${order.orderId} for ${order.patientName}!`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Toggle Test in Bill
  const handleToggleTest = (test) => {
    const exists = selectedTests.some((t) => t.testCode === test.testCode && t.testName === test.testName);
    if (exists) {
      setSelectedTests((prev) =>
        prev.filter((t) => !(t.testCode === test.testCode && t.testName === test.testName))
      );
    } else {
      setSelectedTests((prev) => [...prev, test]);
    }
  };

  const handleRemoveTest = (index) => {
    setSelectedTests((prev) => prev.filter((_, i) => i !== index));
  };

  // Financial Calculations in PKR
  const subtotalPKR = useMemo(() => {
    return selectedTests.reduce((sum, t) => sum + (Number(t.price) || 0), 0);
  }, [selectedTests]);

  const discountPKR = Math.max(0, parseFloat(customDiscount) || 0);
  const totalPKR = Math.max(0, Math.round((subtotalPKR - discountPKR) * 100) / 100);

  // Submit Invoice to MongoDB
  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const patientName = isWalkIn ? walkInName.trim() : selectedPatient?.name;
    const patientId = isWalkIn ? 'WALK-IN' : selectedPatient?.patientId || 'WALK-IN';
    const patientObjId = !isWalkIn && selectedPatient?._id ? selectedPatient._id : undefined;

    if (!patientName) {
      setErrorMsg('Please select a registered patient or enter walk-in customer name.');
      return;
    }

    if (selectedTests.length === 0) {
      setErrorMsg('Please select at least one diagnostic test from the catalog.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        patient: patientObjId,
        patientId,
        patientName,
        orderId: selectedOrderId || '',
        tests: selectedTests,
        discount: discountPKR,
        paymentStatus,
        paymentMethod,
        notes,
        billedBy: session?.user?.name ? `${session.user.name}, Lab Specialist` : 'Lab Specialist',
      };

      const res = await fetch('/api/lab/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to compile lab invoice');
      }

      setSuccessMsg(`Invoice ${data.invoice.invoiceId} generated successfully in PKR!`);

      // Reset Form
      setSelectedOrderId('');
      setOrderSearch('');
      setSelectedPatient(null);
      setPatientSearch('');
      setIsWalkIn(false);
      setWalkInName('');
      setSelectedTests([]);
      setCustomDiscount(0);
      setPaymentStatus('Paid');
      setPaymentMethod('Cash');
      setNotes('');

      // Refresh Ledger
      setRefreshKey((k) => k + 1);

      setTimeout(() => {
        setSuccessMsg('');
      }, 5000);
    } catch (err) {
      console.error('Invoice creation error:', err);
      setErrorMsg(err.message || 'Error creating invoice. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Payment Status (Paid <-> Unpaid)
  const handleTogglePaymentStatus = async (invoice) => {
    try {
      const nextStatus = invoice.paymentStatus === 'Paid' ? 'Unpaid' : 'Paid';
      const res = await fetch(`/api/lab/invoices/${invoice.invoiceId || invoice._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update payment status');
      }

      setSuccessMsg(`Invoice ${invoice.invoiceId} status marked as ${nextStatus}.`);
      setRefreshKey((k) => k + 1);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to toggle payment status.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  // Void Invoice
  const handleVoidInvoice = async (invoice) => {
    if (!confirm(`Are you sure you want to void and remove invoice ${invoice.invoiceId}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/lab/invoices/${invoice.invoiceId || invoice._id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to void invoice');
      }

      setSuccessMsg(`Invoice ${invoice.invoiceId} voided successfully.`);
      if (viewingInvoice?.invoiceId === invoice.invoiceId) {
        setViewingInvoice(null);
      }
      setRefreshKey((k) => k + 1);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to void invoice.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  // Filtered Ledger List
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesStatus =
        statusFilter === 'all' || inv.paymentStatus?.toLowerCase() === statusFilter.toLowerCase();

      if (!matchesStatus) return false;

      if (!ledgerSearch.trim()) return true;
      const q = ledgerSearch.toLowerCase().trim();
      const invId = (inv.invoiceId || '').toLowerCase();
      const pName = (inv.patientName || '').toLowerCase();
      const pId = (inv.patientId || '').toLowerCase();
      const ordId = (inv.orderId || '').toLowerCase();
      const testsStr = (inv.tests || []).map((t) => t.testName).join(' ').toLowerCase();

      return (
        invId.includes(q) ||
        pName.includes(q) ||
        pId.includes(q) ||
        ordId.includes(q) ||
        testsStr.includes(q)
      );
    });
  }, [invoices, statusFilter, ledgerSearch]);

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
              onClick={() => setBillingView('catalog')}
              className="cursor-pointer px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-1.5 transition"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Diagnostic Catalog POS</span>
            </button>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            Laboratory Department Billing Counter
          </span>
        </div>
        <div className="flex-1 min-h-0">
          <BillingDesk
            department="Laboratory"
            SidebarComponent={Sidebar}
            portalTitle="Diagnostic Laboratory Cashier & Settlement Desk"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-background min-h-screen text-on-surface">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <div className="p-6 md:p-8 space-y-6 flex-1">
          {/* Switcher Bar */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBillingView('hospital')}
              className="cursor-pointer px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-1.5 border border-slate-200 transition"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Switch to Hospital Cashier Desk</span>
            </button>
            <span className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-primary text-white shadow-xs flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Diagnostic Catalog POS Active</span>
            </span>
          </div>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-outline-variant/10">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold font-headline tracking-tight">
                    Diagnostic Invoicing &amp; Cashier POS
                  </h1>
                  <p className="text-sm text-outline">
                    Generate diagnostic patient bills in PKR, auto-import doctor lab orders, and manage receipts.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setRefreshKey((k) => k + 1)}
                disabled={isLoading}
                className="cursor-pointer px-3.5 py-2 border border-outline-variant/30 rounded-xl text-xs font-semibold hover:bg-surface-container flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh Data
              </button>
            </div>
          </div>

          {/* Alert Banners */}
          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-semibold flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMsg('')}
                className="cursor-pointer p-1 rounded-lg hover:bg-emerald-500/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-semibold flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg('')}
                className="cursor-pointer p-1 rounded-lg hover:bg-rose-500/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Quick Metrics Bar in PKR */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
              <div className="flex items-center justify-between text-outline mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Invoices</span>
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-black font-headline">{summaryStats.totalInvoices}</p>
              <p className="text-[11px] text-outline mt-0.5">Recorded laboratory bills</p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
              <div className="flex items-center justify-between text-outline mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
                <span className="font-bold text-xs text-emerald-600">PKR</span>
              </div>
              <p className="text-2xl font-black font-headline text-emerald-600 dark:text-emerald-400">
                Rs. {summaryStats.totalRevenue.toLocaleString()}
              </p>
              <p className="text-[11px] text-outline mt-0.5">Diagnostic realized sales</p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
              <div className="flex items-center justify-between text-outline mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Paid Bills</span>
                <Check className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-black font-headline text-emerald-600 dark:text-emerald-400">
                {summaryStats.paidCount}
              </p>
              <p className="text-[11px] text-outline mt-0.5">Settled at reception/cashier</p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
              <div className="flex items-center justify-between text-outline mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Unpaid Balances</span>
                <CreditCard className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-black font-headline text-amber-600 dark:text-amber-400">
                {summaryStats.unpaidCount}
              </p>
              <p className="text-[11px] text-outline mt-0.5">Pending collection</p>
            </div>
          </div>

          {/* Main Grid: Invoice Generator Form (Left) & Diagnostic Test Checklist (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Patient & Order Details & Bill Formulation */}
            <div className="lg:col-span-6 bg-surface-container-lowest p-5 md:p-6 rounded-2xl border border-outline-variant/10 shadow-sm space-y-5">
              <h2 className="text-base font-bold font-headline flex items-center gap-2 border-b border-outline-variant/10 pb-3">
                <Plus className="w-4 h-4 text-primary" />
                Generate Diagnostic Invoice
              </h2>

              {/* 1. Optional Auto-Import Combobox from Doctor Lab Orders */}
              <div className="bg-primary/5 p-3.5 rounded-xl border border-primary/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                    <FlaskConical className="w-3.5 h-3.5" />
                    Auto-Import From Doctor Lab Order (Optional)
                  </span>
                </div>

                <div className="flex items-center gap-2" ref={orderDropdownRef}>
                  <div className="relative flex-1">
                    <button
                      type="button"
                      onClick={() => setIsOrderDropdownOpen(!isOrderDropdownOpen)}
                      className="cursor-pointer w-full p-2.5 text-left border border-primary/30 rounded-xl text-xs bg-surface-container-lowest text-on-surface flex items-center justify-between focus:ring-2 focus:ring-primary/40 focus:outline-none"
                    >
                      <span className={selectedOrderId ? 'font-semibold' : 'text-outline'}>
                        {selectedOrderId
                          ? (() => {
                              const o = labOrders.find(
                                (ord) =>
                                  (ord.orderId || '').toUpperCase() === selectedOrderId.toUpperCase()
                              );
                              return o
                                ? `${o.orderId} - ${o.patientName} (${o.testName})`
                                : selectedOrderId;
                            })()
                          : 'Select Doctor Order (REQ-xxx)...'}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-outline shrink-0 ml-1" />
                    </button>

                    {/* Order Combobox Floating Dropdown */}
                    {isOrderDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-xl max-h-56 overflow-y-auto p-1 space-y-1">
                        <div className="sticky top-0 bg-surface-container-lowest p-1.5 border-b border-outline-variant/10 flex items-center gap-2 z-10">
                          <Search className="w-3.5 h-3.5 text-outline shrink-0" />
                          <input
                            type="text"
                            value={orderSearch}
                            onChange={(e) => setOrderSearch(e.target.value)}
                            placeholder="Search REQ ID, Patient or Test..."
                            className="w-full text-xs bg-transparent focus:outline-none"
                            autoFocus
                          />
                        </div>

                        {filteredOrders.length > 0 ? (
                          filteredOrders.map((ord) => (
                            <button
                              key={ord.orderId || ord._id}
                              type="button"
                              onClick={() => {
                                setSelectedOrderId(ord.orderId);
                                setIsOrderDropdownOpen(false);
                                setOrderSearch('');
                              }}
                              className="w-full p-2 text-left rounded-lg hover:bg-surface-container/60 transition-colors flex items-center justify-between text-xs cursor-pointer group"
                            >
                              <div className="truncate">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-primary group-hover:underline">
                                    {ord.orderId}
                                  </span>
                                  <span className="font-bold text-on-surface truncate">
                                    {ord.patientName}
                                  </span>
                                </div>
                                <p className="text-[10px] text-outline truncate mt-0.5">
                                  {ord.testName} • Dr. {ord.doctorName || 'Staff'}
                                </p>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ml-2 ${
                                  ord.status === 'Completed'
                                    ? 'bg-emerald-500/10 text-emerald-600'
                                    : 'bg-amber-500/10 text-amber-600'
                                }`}
                              >
                                {ord.status}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="py-3 text-center text-xs text-outline">
                            No orders matching &quot;{orderSearch}&quot;
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleImportOrder}
                    disabled={!selectedOrderId}
                    className="cursor-pointer px-3.5 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:opacity-90 transition-all disabled:opacity-40 shrink-0 h-full shadow-sm"
                  >
                    Import Order
                  </button>
                </div>
              </div>

              {/* 2. Patient Selection Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-outline uppercase tracking-wider">
                    Patient Assignment
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsWalkIn(!isWalkIn);
                      setSelectedPatient(null);
                    }}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    {isWalkIn ? '← Pick Registered Patient' : '+ Walk-In Patient'}
                  </button>
                </div>

                {isWalkIn ? (
                  <div className="p-3 bg-surface-container/20 rounded-xl border border-outline-variant/10 space-y-2">
                    <label className="block text-[11px] text-outline font-semibold">Walk-In Patient Name</label>
                    <input
                      type="text"
                      value={walkInName}
                      onChange={(e) => setWalkInName(e.target.value)}
                      placeholder="e.g., Tariq Mehmood"
                      className="w-full p-2.5 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary/40 focus:outline-none"
                    />
                  </div>
                ) : (
                  <div className="relative" ref={patientDropdownRef}>
                    {selectedPatient ? (
                      <div className="flex items-center justify-between p-3 border border-primary/30 rounded-xl text-xs bg-primary/5 text-on-surface">
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <span className="font-bold text-primary mr-1.5">
                              {selectedPatient.patientId}
                            </span>
                            <span className="font-semibold text-on-surface">{selectedPatient.name}</span>
                            <p className="text-[10px] text-outline truncate">
                              CNIC: {selectedPatient.cnic || 'N/A'} • {selectedPatient.gender}, {selectedPatient.age}y
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedPatient(null)}
                          className="cursor-pointer text-xs font-bold text-rose-500 hover:text-rose-600 px-2 py-1"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div>
                        <button
                          type="button"
                          onClick={() => setIsPatientDropdownOpen(!isPatientDropdownOpen)}
                          className="cursor-pointer w-full p-2.5 text-left border border-outline-variant/30 rounded-xl text-xs bg-surface-container-lowest text-on-surface flex items-center justify-between focus:ring-2 focus:ring-primary/40 focus:outline-none"
                        >
                          <span className="text-outline">Search and choose patient from registry...</span>
                          <ChevronDown className="w-3.5 h-3.5 text-outline" />
                        </button>

                        {isPatientDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-xl max-h-56 overflow-y-auto p-1 space-y-1">
                            <div className="sticky top-0 bg-surface-container-lowest p-1.5 border-b border-outline-variant/10 flex items-center gap-2 z-10">
                              <Search className="w-3.5 h-3.5 text-outline shrink-0" />
                              <input
                                type="text"
                                value={patientSearch}
                                onChange={(e) => setPatientSearch(e.target.value)}
                                placeholder="Search by Name, PAT-ID or CNIC..."
                                className="w-full text-xs bg-transparent focus:outline-none"
                                autoFocus
                              />
                            </div>

                            {filteredPatients.length > 0 ? (
                              filteredPatients.map((p) => (
                                <button
                                  key={p.patientId || p._id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedPatient(p);
                                    setIsPatientDropdownOpen(false);
                                    setPatientSearch('');
                                  }}
                                  className="w-full p-2 text-left rounded-lg hover:bg-surface-container/60 transition-colors flex items-center justify-between text-xs cursor-pointer group"
                                >
                                  <div className="truncate">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono font-bold text-primary group-hover:underline">
                                        {p.patientId}
                                      </span>
                                      <span className="font-bold text-on-surface truncate">{p.name}</span>
                                    </div>
                                    <p className="text-[10px] text-outline truncate">
                                      CNIC: {p.cnic || 'N/A'} • {p.gender}, {p.age}y
                                    </p>
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="py-3 text-center text-xs text-outline">
                                No patients found matching &quot;{patientSearch}&quot;
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Selected Tests Table Summary */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-outline uppercase tracking-wider">
                    Invoice Items ({selectedTests.length})
                  </span>
                  {selectedTests.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedTests([])}
                      className="text-xs text-rose-500 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {selectedTests.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-outline-variant/30 rounded-xl bg-surface-container/20">
                    <FlaskConical className="w-6 h-6 text-outline mx-auto mb-1.5" />
                    <p className="text-xs text-outline font-medium">No diagnostic tests added yet.</p>
                    <p className="text-[11px] text-outline mt-0.5">
                      Check items from the catalog on the right or auto-import from doctor orders.
                    </p>
                  </div>
                ) : (
                  <div className="border border-outline-variant/15 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-container/50 text-outline text-[11px] font-bold">
                        <tr>
                          <th className="p-2.5">Code</th>
                          <th className="p-2.5">Diagnostic Examination</th>
                          <th className="p-2.5 text-right">Price (PKR)</th>
                          <th className="p-2.5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {selectedTests.map((test, index) => (
                          <tr key={`${test.testCode}-${index}`} className="hover:bg-surface-container/30">
                            <td className="p-2.5 font-mono font-bold text-primary">{test.testCode}</td>
                            <td className="p-2.5">
                              <span className="font-semibold text-on-surface">{test.testName}</span>
                              <span className="block text-[10px] text-outline">{test.category}</span>
                            </td>
                            <td className="p-2.5 text-right font-bold text-on-surface">
                              Rs. {Number(test.price).toLocaleString()}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveTest(index)}
                                className="cursor-pointer p-1 text-rose-500 hover:bg-rose-500/10 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 4. Financial Calculations & Settlement */}
              <div className="bg-surface-container/30 p-4 rounded-xl border border-outline-variant/10 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-outline">Subtotal Amount:</span>
                  <span className="font-bold text-sm">Rs. {subtotalPKR.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <label htmlFor="lab-discount-input" className="text-outline">
                    Concession / Discount (PKR):
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-outline text-xs">Rs.</span>
                    <input
                      id="lab-discount-input"
                      type="number"
                      min="0"
                      value={customDiscount}
                      onChange={(e) => setCustomDiscount(e.target.value)}
                      className="w-24 p-1.5 text-right text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="border-t border-outline-variant/10 pt-2 flex justify-between items-center">
                  <div>
                    <span className="text-sm font-black font-headline">Net Total Due:</span>
                    <span className="block text-[10px] text-outline font-semibold">Pakistani Rupees</span>
                  </div>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-headline">
                    Rs. {totalPKR.toLocaleString()}
                  </span>
                </div>

                {/* Settlement Attributes */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-outline uppercase mb-1">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full p-2 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none"
                    >
                      <option value="Cash">Cash at Counter</option>
                      <option value="Card">Debit / Credit Card</option>
                      <option value="Insurance">Health Insurance TPA</option>
                      <option value="Pending">Pending Collection</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-outline uppercase mb-1">
                      Payment Status
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      className="w-full p-2 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none"
                    >
                      <option value="Paid">Paid / Settled</option>
                      <option value="Unpaid">Unpaid / On Account</option>
                      <option value="Waived">Waived / Exempt</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-outline uppercase mb-1">
                    Invoice Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g., Pre-operative diagnostic workup clearance"
                    className="w-full p-2 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleCreateInvoice}
                disabled={isSubmitting || selectedTests.length === 0}
                className="cursor-pointer w-full py-3 bg-primary text-on-primary rounded-xl font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Compiling Invoice in PKR...
                  </>
                ) : (
                  <>
                    <Receipt className="w-4 h-4" />
                    Finalize &amp; Issue Lab Bill (Rs. {totalPKR.toLocaleString()})
                  </>
                )}
              </button>
            </div>

            {/* Right Column: Diagnostic Test Catalog Checklist with PKR Rates */}
            <div className="lg:col-span-6 bg-surface-container-lowest p-5 md:p-6 rounded-2xl border border-outline-variant/10 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/10 pb-3">
                <div>
                  <h2 className="text-base font-bold font-headline flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-primary" />
                    Standard Diagnostic Catalog
                  </h2>
                  <p className="text-xs text-outline">Select one or multiple tests to append to current invoice.</p>
                </div>

                {/* Catalog Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-outline absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Filter test catalog..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-surface-container/40 border border-outline-variant/30 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Tests Grid */}
              <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                {filteredCatalog.map((test) => {
                  const isChecked = selectedTests.some(
                    (t) => t.testCode === test.testCode && t.testName === test.testName
                  );

                  return (
                    <div
                      key={test.testCode}
                      onClick={() => handleToggleTest(test)}
                      className={`cursor-pointer p-3 rounded-xl border transition-all flex items-center justify-between ${
                        isChecked
                          ? 'border-primary bg-primary/5 text-on-surface shadow-xs'
                          : 'border-outline-variant/15 hover:border-outline-variant/40 bg-surface-container/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                            isChecked ? 'bg-primary text-on-primary' : 'border border-outline-variant/40'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-primary">{test.testCode}</span>
                            <span className="text-xs font-bold text-on-surface">{test.testName}</span>
                          </div>
                          <span className="text-[10px] text-outline font-medium">{test.category}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-on-surface block">
                          Rs. {test.price.toLocaleString()}
                        </span>
                        <span className="text-[9px] text-outline uppercase font-semibold">Standard Fee</span>
                      </div>
                    </div>
                  );
                })}

                {filteredCatalog.length === 0 && (
                  <div className="py-8 text-center text-xs text-outline">
                    No diagnostic tests found matching &quot;{catalogSearch}&quot;
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Persistent Transactions Ledger */}
          <div className="bg-surface-container-lowest p-5 md:p-6 rounded-2xl border border-outline-variant/10 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/10 pb-4">
              <div>
                <h2 className="text-lg font-bold font-headline flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Diagnostic Billing Ledger &amp; Invoices
                </h2>
                <p className="text-xs text-outline">
                  Real-time MongoDB invoice records, payment reconciliation, and receipt generation.
                </p>
              </div>

              {/* Search & Status Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-outline absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    placeholder="Search invoices by ID, Patient, Order..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-surface-container/40 border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary w-60"
                  />
                </div>

                <div className="flex items-center bg-surface-container/40 p-1 rounded-xl border border-outline-variant/20">
                  {['all', 'Paid', 'Unpaid'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`cursor-pointer px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                        statusFilter === st
                          ? 'bg-surface-container-lowest text-primary shadow-xs font-bold'
                          : 'text-outline hover:text-on-surface'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container/40 text-outline text-[11px] font-bold">
                  <tr>
                    <th className="p-3">Invoice ID</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Patient</th>
                    <th className="p-3">Order Ref</th>
                    <th className="p-3">Tests Billed</th>
                    <th className="p-3 text-right">Subtotal</th>
                    <th className="p-3 text-right">Net Total (PKR)</th>
                    <th className="p-3">Method</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.invoiceId || inv._id} className="hover:bg-surface-container/30 transition-colors">
                      <td className="p-3 font-mono font-bold text-primary">{inv.invoiceId}</td>
                      <td className="p-3 text-outline">{inv.date}</td>
                      <td className="p-3">
                        <span className="font-bold text-on-surface">{inv.patientName}</span>
                        <span className="block text-[10px] text-outline font-mono">{inv.patientId}</span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-outline">
                        {inv.orderId ? (
                          <span className="bg-primary/5 text-primary px-1.5 py-0.5 rounded font-semibold">
                            {inv.orderId}
                          </span>
                        ) : (
                          'Direct'
                        )}
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-on-surface">
                          {inv.tests?.length || 0} test{inv.tests?.length !== 1 ? 's' : ''}
                        </span>
                        <span className="block text-[10px] text-outline truncate max-w-xs">
                          {inv.tests?.map((t) => t.testName).join(', ')}
                        </span>
                      </td>
                      <td className="p-3 text-right text-outline">
                        Rs. {(inv.subtotal || 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                        Rs. {(inv.totalAmount || 0).toLocaleString()}
                      </td>
                      <td className="p-3 font-medium text-outline">{inv.paymentMethod}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.paymentStatus === 'Paid'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {inv.paymentStatus}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingInvoice(inv)}
                            title="View Receipt"
                            className="cursor-pointer p-1.5 rounded-lg border border-outline-variant/20 hover:bg-surface-container text-outline hover:text-on-surface transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTogglePaymentStatus(inv)}
                            title={`Mark as ${inv.paymentStatus === 'Paid' ? 'Unpaid' : 'Paid'}`}
                            className="cursor-pointer px-2 py-1 rounded-lg border border-outline-variant/20 hover:bg-surface-container text-[10px] font-bold text-outline hover:text-primary transition-colors"
                          >
                            {inv.paymentStatus === 'Paid' ? 'Mark Unpaid' : 'Mark Paid'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleVoidInvoice(inv)}
                            title="Void Bill"
                            className="cursor-pointer p-1.5 rounded-lg border border-outline-variant/20 hover:bg-rose-500/10 text-outline hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan="10" className="p-8 text-center text-outline text-xs">
                        {isLoading ? 'Loading invoices from MongoDB...' : 'No invoices found matching criteria.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* View Invoice Modal */}
        {viewingInvoice && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
            <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl w-full max-w-240 shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container/30">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-primary" />
                  <span className="font-bold text-sm">Diagnostic Payment Receipt</span>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingInvoice(null)}
                  className="cursor-pointer p-1 rounded-lg hover:bg-surface-container text-outline"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                {/* Header Info */}
                <div className="flex justify-between items-start border-b border-outline-variant/10 pb-3">
                  <div>
                    <h3 className="text-base font-bold font-headline text-primary">RoleMed Diagnostics</h3>
                    <p className="text-[11px] text-outline">Clinical Pathology &amp; Diagnostic Wing</p>
                    <p className="text-[10px] text-outline font-mono mt-0.5">Billed by: {viewingInvoice.billedBy || 'Lab Staff'}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-sm text-primary block">{viewingInvoice.invoiceId}</span>
                    <span className="text-[10px] text-outline">{viewingInvoice.date}</span>
                    {viewingInvoice.orderId && (
                      <span className="block text-[10px] text-outline font-mono">Order: {viewingInvoice.orderId}</span>
                    )}
                  </div>
                </div>

                {/* Patient Demographics */}
                <div className="bg-surface-container/30 p-3 rounded-xl border border-outline-variant/10 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-outline uppercase font-semibold block">Patient Demographics</span>
                    <span className="font-bold text-sm">{viewingInvoice.patientName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-outline uppercase font-semibold block">Patient ID</span>
                    <span className="font-mono font-bold text-xs">{viewingInvoice.patientId}</span>
                  </div>
                </div>

                {/* Itemized Tests */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">
                    Diagnostic Examinations
                  </span>
                  <div className="border border-outline-variant/15 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-surface-container/50 text-[10px] text-outline font-bold">
                        <tr>
                          <th className="p-2">Examination</th>
                          <th className="p-2 text-right">Fee (PKR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {viewingInvoice.tests?.map((t, idx) => (
                          <tr key={idx}>
                            <td className="p-2">
                              <span className="font-semibold text-on-surface">{t.testName}</span>
                              <span className="block text-[9px] text-outline font-mono">{t.testCode} • {t.category}</span>
                            </td>
                            <td className="p-2 text-right font-bold">
                              Rs. {(t.price || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals Summary */}
                <div className="bg-surface-container/40 p-3 rounded-xl border border-outline-variant/10 space-y-1.5">
                  <div className="flex justify-between text-outline text-[11px]">
                    <span>Subtotal:</span>
                    <span>Rs. {(viewingInvoice.subtotal || 0).toLocaleString()}</span>
                  </div>
                  {viewingInvoice.discount > 0 && (
                    <div className="flex justify-between text-emerald-600 text-[11px]">
                      <span>Discount / Waiver:</span>
                      <span>- Rs. {viewingInvoice.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="border-t border-outline-variant/15 pt-1.5 flex justify-between items-center font-bold text-sm">
                    <span className="font-headline">Net Paid / Due:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-headline font-black">
                      Rs. {(viewingInvoice.totalAmount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 text-[10px] text-outline">
                    <span>Payment Method: {viewingInvoice.paymentMethod}</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-full ${
                        viewingInvoice.paymentStatus === 'Paid'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-amber-500/10 text-amber-600'
                      }`}
                    >
                      {viewingInvoice.paymentStatus}
                    </span>
                  </div>
                </div>

                {viewingInvoice.notes && (
                  <p className="text-[11px] text-outline italic">Notes: {viewingInvoice.notes}</p>
                )}

                {/* Footer Controls */}
                <div className="pt-2 flex items-center justify-between border-t border-outline-variant/10">
                  <button
                    type="button"
                    onClick={() => {
                      // Non-blocking mock trigger deferred for unified print rollout
                      alert(`Printing receipt for ${viewingInvoice.invoiceId}... (Print functionality will be rolled out globally across all modules in one go)`);
                    }}
                    className="cursor-pointer px-4 py-2 border border-outline-variant/30 rounded-xl font-bold hover:bg-surface-container flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Receipt
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewingInvoice(null)}
                    className="cursor-pointer px-4 py-2 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 transition-all"
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
