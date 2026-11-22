"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
  Search,
  Pill,
  Eye,
  X,
  Check,
  FileText,
  Loader2,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  Printer,
} from 'lucide-react';
import Sidebar from '@/components/Pharmacist_Sidebar';
import Footer from '@/components/Footer';
import PatientDossierPrintModal from '@/components/PatientDossierPrintModal';

export default function PharmacyPrescriptions() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Pending'); // 'Pending', 'Dispensed', 'All'
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [dispensing, setDispensing] = useState(false);
  const [dossierPatientId, setDossierPatientId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Dispensing Modal State
  const [selectedRx, setSelectedRx] = useState(null);
  const [modalDrugs, setModalDrugs] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentStatus, setPaymentStatus] = useState('Paid');

  // Customer Add-on Medicine State
  const [showAddOnForm, setShowAddOnForm] = useState(false);
  const [extraDrugName, setExtraDrugName] = useState('');
  const [extraDrugQty, setExtraDrugQty] = useState('10');
  const [extraInstruction, setExtraInstruction] = useState('After meals');

  // Live Inventory and Prescriptions
  const [inventory, setInventory] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        setLoading(true);
        setErrorMsg('');

        const [rxRes, medRes] = await Promise.all([
          fetch('/api/prescriptions', { cache: 'no-store' }),
          fetch('/api/medicines?limit=500', { cache: 'no-store' }),
        ]);

        const rxData = await rxRes.json();
        const medData = await medRes.json();

        if (!ignore) {
          if (rxData.success) {
            setPrescriptions(rxData.prescriptions || []);
          }
          if (medData.success) {
            setInventory(medData.medicines || []);
          }
        }
      } catch (err) {
        console.error('Error fetching prescriptions or formulary:', err);
        if (!ignore) {
          setErrorMsg('Failed to synchronize incoming prescriptions and live inventory.');
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

  const findFormularyItem = useCallback(
    (drugName) => {
      if (!drugName) return null;
      const searchLower = drugName.toLowerCase().trim();
      const firstWord = searchLower.split(' ')[0];

      return (
        inventory.find((i) => {
          const nameL = (i.name || '').toLowerCase();
          const genL = (i.genericName || '').toLowerCase();
          return (
            nameL === searchLower ||
            genL === searchLower ||
            nameL.includes(searchLower) ||
            searchLower.includes(nameL) ||
            (firstWord.length >= 4 && (nameL.includes(firstWord) || genL.includes(firstWord)))
          );
        }) || null
      );
    },
    [inventory]
  );

  const checkStockStatus = useCallback(
    (drugName, qtyNeeded) => {
      const invItem = findFormularyItem(drugName);
      if (!invItem) {
        return {
          label: 'Formulary Unmatched',
          color: 'text-outline font-medium',
          status: 'unmatched',
          available: 0,
          unitPrice: 0,
          pricePerPack: 0,
          quantityPerPack: 10,
        };
      }

      const available = invItem.stockQuantity || 0;
      const unitPrice = invItem.unitPrice || 0;
      const pricePerPack = invItem.pricePerPack || 0;
      const quantityPerPack = invItem.quantityPerPack || 10;

      if (available === 0) {
        return {
          label: `Out of Stock (0 avail)`,
          color: 'text-error font-extrabold',
          status: 'out',
          available,
          sku: invItem.sku,
          unitPrice,
          pricePerPack,
          quantityPerPack,
        };
      }

      if (available < qtyNeeded) {
        return {
          label: `Short Stock (${available} left, needs ${qtyNeeded})`,
          color: 'text-error font-bold',
          status: 'short',
          available,
          sku: invItem.sku,
          unitPrice,
          pricePerPack,
          quantityPerPack,
        };
      }

      return {
        label: `In Stock (${available} avail - SKU: ${invItem.sku})`,
        color: 'text-secondary font-bold',
        status: 'ok',
        available,
        sku: invItem.sku,
        unitPrice,
        pricePerPack,
        quantityPerPack,
      };
    },
    [findFormularyItem]
  );

  const handleOpenModal = (rx) => {
    const initialDrugs = (rx.drugs || []).map((drug) => {
      const match = findFormularyItem(drug.name);
      const unitPrice =
        drug.unitPrice !== undefined && drug.unitPrice > 0
          ? drug.unitPrice
          : match
          ? match.unitPrice || 0
          : 0;
      const pricePerPack =
        drug.pricePerPack !== undefined && drug.pricePerPack > 0
          ? drug.pricePerPack
          : match
          ? match.pricePerPack || 0
          : 0;
      const quantityPerPack =
        drug.quantityPerPack !== undefined && drug.quantityPerPack > 0
          ? drug.quantityPerPack
          : match
          ? match.quantityPerPack || 10
          : 10;
      const qty = drug.qtyNeeded || 10;
      const totalPrice = Math.round(qty * unitPrice * 100) / 100;

      return {
        ...drug,
        qtyNeeded: qty,
        unitPrice,
        pricePerPack,
        quantityPerPack,
        totalPrice,
        isCustomerAddOn: !!drug.isCustomerAddOn,
      };
    });

    setModalDrugs(initialDrugs);
    setPaymentMethod(rx.paymentMethod || 'Cash');
    setPaymentStatus(rx.paymentStatus === 'Paid' ? 'Paid' : 'Paid');
    setShowAddOnForm(false);
    setSelectedRx(rx);
  };

  // Grand Total Calculation in PKR
  const calculatedGrandTotal = useMemo(() => {
    return modalDrugs.reduce((sum, d) => sum + (d.totalPrice || 0), 0);
  }, [modalDrugs]);

  // Handle Adding Customer Requested Medicine at Counter
  const handleAddCustomerDrug = (e) => {
    e.preventDefault();
    if (!extraDrugName) return;

    const matchedMed = findFormularyItem(extraDrugName);
    const qty = Math.max(1, parseInt(extraDrugQty, 10) || 1);
    const unitPrice = matchedMed ? matchedMed.unitPrice || 0 : 0;
    const pricePerPack = matchedMed ? matchedMed.pricePerPack || 0 : 0;
    const quantityPerPack = matchedMed ? matchedMed.quantityPerPack || 10 : 10;
    const totalPrice = Math.round(qty * unitPrice * 100) / 100;

    const newAddOn = {
      name: matchedMed ? matchedMed.name : extraDrugName.trim(),
      dosage: matchedMed ? matchedMed.strength || matchedMed.dosageForm : 'Standard',
      frequency: 'As requested',
      duration: 'PRN',
      instruction: extraInstruction || 'As directed',
      qtyNeeded: qty,
      unitPrice,
      pricePerPack,
      quantityPerPack,
      totalPrice,
      isCustomerAddOn: true,
    };

    setModalDrugs((prev) => [...prev, newAddOn]);
    setExtraDrugName('');
    setExtraDrugQty('10');
    setExtraInstruction('After meals');
    setShowAddOnForm(false);
  };

  const handleRemoveDrug = (index) => {
    setModalDrugs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDispenseMedication = async (e) => {
    e.preventDefault();
    if (!selectedRx) return;

    setDispensing(true);
    setErrorMsg('');

    try {
      const rxId = selectedRx.prescriptionId || selectedRx._id;
      const res = await fetch(`/api/prescriptions/${rxId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Dispensed',
          drugs: modalDrugs,
          totalAmount: Math.round(calculatedGrandTotal * 100) / 100,
          paymentStatus,
          paymentMethod,
          dispensedBy: session?.user?.name || 'Clinical Pharmacist',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update dispensation status');
      }

      setSuccessMsg(`Prescription ${rxId} dispensed! Payment of PKR ${calculatedGrandTotal.toFixed(2)} recorded.`);
      setSelectedRx(null);
      setRefreshKey((k) => k + 1);

      setTimeout(() => {
        setSuccessMsg('');
      }, 5000);
    } catch (err) {
      console.error('Dispense error:', err);
      setErrorMsg(err.message || 'Error dispensing medication');
    } finally {
      setDispensing(false);
    }
  };

  const pendingCount = useMemo(
    () => prescriptions.filter((r) => r.status !== 'Dispensed').length,
    [prescriptions]
  );
  const dispensedCount = useMemo(
    () => prescriptions.filter((r) => r.status === 'Dispensed').length,
    [prescriptions]
  );

  const filteredPrescriptions = prescriptions.filter((rx) => {
    const isDispensed = rx.status === 'Dispensed';
    const matchesStatus =
      statusFilter === 'All'
        ? true
        : statusFilter === 'Pending'
        ? !isDispensed
        : isDispensed;

    const matchesSearch =
      (rx.patientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rx.prescriptionId || rx.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rx.patientId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rx.status || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background p-margin no-scrollbar">
        {/* Header */}
        <header className="flex justify-between items-center mb-lg">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold">Dispense Prescriptions</h2>
            <p className="text-body-sm text-on-surface-variant">
              Review digital doctor prescriptions, cross-check live inventory stocks, append customer requests, and record payments in PKR.
            </p>
          </div>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="cursor-pointer px-4 py-2 bg-surface-container hover:bg-surface-container-high rounded-xl text-body-sm font-semibold flex items-center gap-1.5 transition-colors border border-outline-variant/30 text-on-surface"
          >
            <RefreshCw size={15} /> Refresh Queue
          </button>
        </header>

        {errorMsg && (
          <div className="mb-md p-4 rounded-2xl bg-error-container text-on-error-container flex items-center gap-2 border border-error/30 text-body-sm font-semibold">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-lg p-md rounded-2xl bg-secondary-container text-on-secondary-container flex items-center gap-2 clinical-shadow font-semibold text-body-sm border border-secondary/20 animate-fade-in">
            <Check className="w-5 h-5 text-secondary shrink-0" /> {successMsg}
          </div>
        )}

        {/* Prescription Queue */}
        <div className="glass-card p-margin rounded-[24px] clinical-shadow flex flex-col min-h-[500px] mb-lg">
          <div className="mb-md flex flex-col md:flex-row justify-between items-center gap-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
              <h3 className="text-title-sm font-bold text-on-surface flex items-center gap-2">
                <Pill className="text-primary w-5 h-5" /> Prescription Queue ({filteredPrescriptions.length})
              </h3>

              {/* Status Segment Tabs */}
              <div className="flex bg-surface-container rounded-xl p-1 border border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setStatusFilter('Pending')}
                  className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    statusFilter === 'Pending'
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  Pending
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      statusFilter === 'Pending'
                        ? 'bg-white/20 text-white'
                        : 'bg-surface-container-high text-outline'
                    }`}
                  >
                    {pendingCount}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('Dispensed')}
                  className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    statusFilter === 'Dispensed'
                      ? 'bg-secondary text-on-secondary shadow-sm'
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  Dispensed
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      statusFilter === 'Dispensed'
                        ? 'bg-white/20 text-white'
                        : 'bg-surface-container-high text-outline'
                    }`}
                  >
                    {dispensedCount}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('All')}
                  className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    statusFilter === 'All'
                      ? 'bg-surface-container-highest text-on-surface shadow-sm font-extrabold'
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  All ({prescriptions.length})
                </button>
              </div>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4.5 h-4.5" />
              <input
                type="text"
                placeholder="Search prescription queue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-surface-container border border-outline-variant/30 rounded-xl text-body-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-outline gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-body-sm font-semibold">Fetching pharmacy orders from hospital database...</span>
            </div>
          ) : (
            <div className="space-y-sm">
              {filteredPrescriptions.length > 0 ? (
                filteredPrescriptions.map((item) => {
                  const rxId = item.prescriptionId || item.id || 'RX-XXXX';
                  const drugs = item.drugs || [];
                  const isDispensed = item.status === 'Dispensed';

                  return (
                    <div
                      key={item._id || rxId}
                      className="p-md bg-surface-container-low border border-outline-variant/15 rounded-2xl clinical-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-2xl bg-primary-fixed/40 text-primary shrink-0">
                          <Pill size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-primary font-mono uppercase tracking-wider">
                              {rxId}
                            </span>
                            <span className="text-[10px] text-outline font-semibold">{item.date}</span>
                          </div>
                          <h5 className="font-bold text-on-surface text-body-md leading-none mb-1">{item.patientName}</h5>
                          <p className="text-[12px] text-outline mt-0.5 font-medium">
                            Patient ID: <span className="font-mono">{item.patientId}</span> • Prescribed by:{' '}
                            <span className="font-bold text-secondary">{item.doctorName || item.doctor || 'Attending MD'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-body-sm shrink-0 md:w-60">
                        <span className="text-[10px] text-outline block font-semibold uppercase">Prescribed Drugs</span>
                        <span className="font-bold text-on-surface-variant text-body-sm block truncate">
                          {drugs.map((d) => d.name).join(', ') || 'No drugs listed'}
                        </span>
                      </div>

                      {/* Pricing info in PKR */}
                      <div className="text-body-sm shrink-0 text-right">
                        <span className="text-[10px] text-outline block font-semibold uppercase">Amount</span>
                        <span className="font-bold text-primary text-body-md font-mono">
                          Rs. {(item.totalAmount || 0).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-sm shrink-0 w-full md:w-auto justify-between md:justify-end border-t border-outline-variant/10 pt-2 md:border-0 md:pt-0">
                        <button
                          type="button"
                          onClick={() => setDossierPatientId(item.patientId)}
                          className="cursor-pointer text-xs font-semibold text-slate-600 hover:text-primary px-2.5 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1 transition-all"
                          title="Print Prescription Slip & Dossier"
                        >
                          <Printer size={13} /> Slip
                        </button>

                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            isDispensed
                              ? 'bg-secondary-container text-on-secondary-container'
                              : 'bg-primary-fixed text-on-primary-fixed-variant'
                          }`}
                        >
                          {item.status}
                        </span>

                        {!isDispensed ? (
                          <button
                            onClick={() => handleOpenModal(item)}
                            className="cursor-pointer text-xs font-bold bg-primary text-on-primary px-4 py-2 rounded-xl flex items-center gap-1 hover:opacity-90 transition-all clinical-shadow"
                          >
                            Dispense Rx
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenModal(item)}
                            className="cursor-pointer text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                          >
                            <Eye size={14} /> Review Slip
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-16 text-center text-outline">
                  <Pill className="mx-auto w-12 h-12 text-outline-variant mb-2" />
                  <p className="font-semibold text-body-sm">No incoming e-prescriptions located.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Prescription Dispensing / Receipt Modal */}
        {selectedRx && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-md animate-fade-in">
            <div className="bg-white rounded-2xl max-w-3xl w-full clinical-shadow border border-outline-variant/30 overflow-hidden">
              <div className="px-6 py-4 bg-primary text-on-primary flex justify-between items-center">
                <h3 className="font-bold text-title-sm flex items-center gap-1.5">
                  <FileText size={18} /> {selectedRx.status === 'Dispensed' ? 'Prescription Dispense Slip' : 'Dispense Medication Order'}
                </h3>
                <button
                  onClick={() => setSelectedRx(null)}
                  className="cursor-pointer hover:bg-white/10 p-1 rounded-full transition-colors text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={handleDispenseMedication}
                className="p-margin space-y-md text-body-sm overflow-y-auto max-h-[560px] sidebar-scroll"
              >
                <div className="flex justify-between border-b border-outline-variant/20 pb-3">
                  <div>
                    <span className="block text-[10px] text-outline font-bold uppercase">Patient details</span>
                    <p className="font-bold text-on-surface text-body-md">{selectedRx.patientName}</p>
                    <p className="text-xs text-outline font-mono">{selectedRx.patientId}</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-outline font-bold uppercase">Transmitted Date</span>
                    <p className="font-semibold text-on-surface-variant text-body-sm">{selectedRx.date}</p>
                    <p className="text-xs font-bold text-primary mt-1 font-mono">
                      {selectedRx.prescriptionId || selectedRx.id}
                    </p>
                  </div>
                </div>

                {/* Drugs verification table with live stock verification & PKR Pricing */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-outline font-bold uppercase">
                      Medication Order Items & PKR Pricing
                    </span>
                    {selectedRx.status !== 'Dispensed' && (
                      <button
                        type="button"
                        onClick={() => setShowAddOnForm(!showAddOnForm)}
                        className="cursor-pointer text-xs font-bold text-secondary bg-secondary-container/60 hover:bg-secondary-container px-3 py-1 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Plus size={13} /> Add Customer Request
                      </button>
                    )}
                  </div>

                  {/* Customer Add-On Drawer / Inline Form */}
                  {showAddOnForm && selectedRx.status !== 'Dispensed' && (
                    <div className="mb-3 p-3 bg-secondary-container/20 border border-secondary/30 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-secondary flex items-center gap-1">
                          <Plus size={14} /> Add Customer-Requested OTC / Extra Medicine
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAddOnForm(false)}
                          className="text-outline hover:text-error text-xs"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div className="md:col-span-2">
                          <label className="block text-[10px] text-outline font-semibold mb-0.5">Medicine Name</label>
                          <input
                            type="text"
                            placeholder="Select or type drug name..."
                            value={extraDrugName}
                            onChange={(e) => setExtraDrugName(e.target.value)}
                            list="formulary-prescription-datalist"
                            className="w-full p-2 border border-outline-variant/40 rounded-lg text-xs bg-white focus:outline-none focus:border-primary font-medium"
                          />
                          <datalist id="formulary-prescription-datalist">
                            {inventory.map((m) => (
                              <option key={m.sku || m._id} value={m.name}>
                                {m.name} - Rs. {m.pricePerPack}/pk (Rs. {m.unitPrice}/unit)
                              </option>
                            ))}
                          </datalist>
                        </div>
                        <div>
                          <label className="block text-[10px] text-outline font-semibold mb-0.5">Units / Qty</label>
                          <input
                            type="number"
                            min={1}
                            value={extraDrugQty}
                            onChange={(e) => setExtraDrugQty(e.target.value)}
                            className="w-full p-2 border border-outline-variant/40 rounded-lg text-xs bg-white focus:outline-none focus:border-primary font-mono font-bold"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleAddCustomerDrug}
                          className="cursor-pointer px-4 py-1.5 bg-secondary text-on-secondary rounded-lg text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1"
                        >
                          <Plus size={13} /> Append to Prescription Slip
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="border border-outline-variant/20 rounded-xl overflow-hidden text-body-sm">
                    <table className="w-full text-left">
                      <thead className="bg-surface-container-high text-outline font-bold text-xs">
                        <tr>
                          <th className="p-2.5">Medication</th>
                          <th className="p-2.5 text-center">Qty</th>
                          <th className="p-2.5 text-center">Pack / Unit Price (PKR)</th>
                          <th className="p-2.5 text-center">Status</th>
                          <th className="p-2.5 text-right">Total (PKR)</th>
                          {selectedRx.status !== 'Dispensed' && <th className="p-2.5 text-center w-10"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {modalDrugs.map((drug, i) => {
                          const stock = checkStockStatus(drug.name, drug.qtyNeeded);
                          const unitP = drug.unitPrice !== undefined ? drug.unitPrice : stock.unitPrice;
                          const lineTotal = Math.round(drug.qtyNeeded * unitP * 100) / 100;

                          return (
                            <tr key={i} className="border-t border-outline-variant/10 hover:bg-surface-container/20">
                              <td className="p-2.5 font-bold text-on-surface">
                                <div className="flex items-center gap-1.5">
                                  <span>{drug.name}</span>
                                  {drug.isCustomerAddOn && (
                                    <span className="text-[9px] font-bold bg-secondary-container text-secondary px-1.5 py-0.5 rounded uppercase">
                                      Customer Add-On
                                    </span>
                                  )}
                                </div>
                                <span className="block text-[10px] text-outline font-medium">
                                  {drug.dosage} • {drug.frequency} • {drug.duration} ({drug.instruction})
                                </span>
                              </td>
                              <td className="p-2.5 text-center font-bold text-on-surface-variant font-mono">
                                {drug.qtyNeeded}
                              </td>
                              <td className="p-2.5 text-center text-xs font-mono">
                                <span className="font-bold text-on-surface">Rs. {unitP.toFixed(2)}/u</span>
                                <span className="block text-[10px] text-outline">
                                  (Rs. {stock.pricePerPack}/pk of {stock.quantityPerPack})
                                </span>
                              </td>
                              <td className={`p-2.5 text-center text-xs ${stock.color}`}>{stock.label}</td>
                              <td className="p-2.5 text-right font-mono font-bold text-primary">
                                Rs. {lineTotal.toFixed(2)}
                              </td>
                              {selectedRx.status !== 'Dispensed' && (
                                <td className="p-2.5 text-center">
                                  {drug.isCustomerAddOn && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveDrug(i)}
                                      className="cursor-pointer text-error hover:bg-error-container p-1 rounded"
                                      title="Remove customer add-on"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Grand Total Bar in PKR */}
                <div className="p-3 bg-surface-container-high/40 rounded-xl border border-outline-variant/15 flex justify-between items-center text-body-md">
                  <span className="font-semibold text-outline">Prescription Grand Total (PKR):</span>
                  <span className="font-bold text-headline-sm text-primary font-mono">
                    Rs. {calculatedGrandTotal.toFixed(2)}
                  </span>
                </div>

                {/* Payment Selection (only when dispensing) */}
                {selectedRx.status !== 'Dispensed' ? (
                  <div className="grid grid-cols-2 gap-sm bg-surface-container/20 p-3 rounded-xl border border-outline-variant/10">
                    <div>
                      <label className="block text-outline mb-1 font-semibold text-xs">Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full p-2 border border-outline-variant/40 rounded-xl bg-white text-xs font-semibold focus:outline-none"
                      >
                        <option value="Cash">Cash Counter</option>
                        <option value="Card">Credit / Debit Card</option>
                        <option value="Insurance">Hospital Insurance Claim</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-outline mb-1 font-semibold text-xs">Payment Settlement</label>
                      <select
                        value={paymentStatus}
                        onChange={(e) => setPaymentStatus(e.target.value)}
                        className="w-full p-2 border border-outline-variant/40 rounded-xl bg-white text-xs font-semibold focus:outline-none"
                      >
                        <option value="Paid">Mark as Paid</option>
                        <option value="Unpaid">Invoice to Patient Account</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-surface-container/30 rounded-xl border border-outline-variant/10 flex justify-between items-center text-xs">
                    <span className="text-outline">
                      Payment Mode: <strong className="text-on-surface">{selectedRx.paymentMethod || 'Cash'}</strong>
                    </span>
                    <span className="text-outline">
                      Settlement Status:{' '}
                      <strong className="text-secondary font-bold">{selectedRx.paymentStatus || 'Paid'}</strong>
                    </span>
                  </div>
                )}

                {selectedRx.generalInstructions && (
                  <div>
                    <p className="text-xs text-outline font-bold uppercase mb-1">Doctor Directions</p>
                    <p className="text-body-sm text-on-surface-variant bg-surface-container/30 p-2.5 rounded-lg border border-outline-variant/10">
                      {selectedRx.generalInstructions}
                    </p>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t border-outline-variant/20">
                  <span
                    className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                      selectedRx.status === 'Dispensed'
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'bg-primary-fixed text-on-primary-fixed-variant'
                    }`}
                  >
                    {selectedRx.status}
                  </span>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDossierPatientId(selectedRx.patientId)}
                      className="cursor-pointer px-4 py-2 border border-outline-variant/30 hover:bg-surface-container rounded-xl text-body-sm font-semibold flex items-center gap-1.5 transition-colors text-primary"
                    >
                      <Printer size={14} /> Print Rx Slip &amp; Dossier
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRx(null)}
                      className="cursor-pointer px-4 py-2 border border-outline-variant/30 hover:bg-surface-container rounded-xl text-body-sm font-semibold transition-colors"
                    >
                      Close
                    </button>
                    {selectedRx.status !== 'Dispensed' && (
                      <button
                        type="submit"
                        disabled={dispensing}
                        className="cursor-pointer px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 transition-all clinical-shadow text-body-sm flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {dispensing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Dispensing...
                          </>
                        ) : (
                          `Confirm Dispense (PKR ${calculatedGrandTotal.toFixed(2)})`
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {dossierPatientId && (
          <PatientDossierPrintModal
            isOpen={Boolean(dossierPatientId)}
            patientId={dossierPatientId}
            onClose={() => setDossierPatientId(null)}
            initialPreset="prescription"
          />
        )}

        <Footer />
      </main>
    </div>
  );
}
