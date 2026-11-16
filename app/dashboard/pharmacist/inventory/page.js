"use client";

import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  Check,
  Loader2,
  PackageCheck,
  RefreshCw,
  Layers,
  Archive,
  ArrowUpDown,
  Building,
  MapPin,
  Coins,
} from 'lucide-react';
import Sidebar from '@/components/Pharmacist_Sidebar';
import Footer from '@/components/Footer';

const CATEGORIES = [
  'All',
  'Antibiotics',
  'Analgesics',
  'Antidiabetics',
  'Cardiovascular',
  'Respiratory',
  'Gastrointestinal',
  'Neurology',
  'Dermatology',
  'Other',
];

const DOSAGE_FORMS = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Inhaler', 'Drops', 'Ointment', 'Other'];

export default function PharmacyInventory() {
  const [medicines, setMedicines] = useState([]);
  const [summary, setSummary] = useState({
    totalFormulations: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalUnits: 0,
    totalStockValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'low', 'out', 'in'
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Quick Restock Modal
  const [restockItem, setRestockItem] = useState(null);
  const [restockQty, setRestockQty] = useState('50');

  // New Formulation Form State
  const [newName, setNewName] = useState('');
  const [newGenericName, setNewGenericName] = useState('');
  const [newCategory, setNewCategory] = useState('Antibiotics');
  const [newDosageForm, setNewDosageForm] = useState('Tablet');
  const [newStrength, setNewStrength] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newQuantityPerPack, setNewQuantityPerPack] = useState('20');
  const [newPricePerPack, setNewPricePerPack] = useState('');
  const [newReorderLevel, setNewReorderLevel] = useState('20');
  const [newExpiry, setNewExpiry] = useState('');
  const [newManufacturer, setNewManufacturer] = useState('');
  const [newLocation, setNewLocation] = useState('');

  // Live computed unit price in PKR
  const liveUnitPrice =
    parseFloat(newPricePerPack) > 0 && parseInt(newQuantityPerPack, 10) > 0
      ? (parseFloat(newPricePerPack) / parseInt(newQuantityPerPack, 10)).toFixed(2)
      : '0.00';

  useEffect(() => {
    let ignore = false;

    async function loadInventory() {
      try {
        setErrorMsg('');
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.append('search', searchQuery.trim());
        if (selectedCategory && selectedCategory !== 'All') params.append('category', selectedCategory);
        if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

        const res = await fetch(`/api/medicines?${params.toString()}`, { cache: 'no-store' });
        const data = await res.json();

        if (!ignore) {
          if (res.ok && data.success) {
            setMedicines(data.medicines || []);
            if (data.summary) {
              setSummary(data.summary);
            }
          } else {
            setErrorMsg(data.error || 'Failed to fetch inventory from hospital formulary');
          }
        }
      } catch (err) {
        if (!ignore) {
          setErrorMsg(err.message || 'Error communicating with formulary database');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadInventory();
    return () => {
      ignore = true;
    };
  }, [searchQuery, selectedCategory, statusFilter, refreshKey]);

  const handleAdjustQty = async (medicine, amount) => {
    const medId = medicine._id || medicine.sku;
    setActionLoadingId(medId);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/medicines/${medId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjustQty: amount }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to adjust stock quantity');
      }

      // Update in place for instant responsiveness
      setMedicines((prev) =>
        prev.map((m) => (m._id === medicine._id ? { ...m, stockQuantity: data.medicine.stockQuantity } : m))
      );
      setSuccessMsg(`Stock for "${medicine.name}" adjusted (${amount > 0 ? `+${amount}` : amount}).`);
      setTimeout(() => setSuccessMsg(''), 3000);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error('Adjust stock error:', err);
      setErrorMsg(err.message || 'Error adjusting stock');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBatchRestock = async (e) => {
    e.preventDefault();
    if (!restockItem) return;

    const qtyToAdd = parseInt(restockQty, 10);
    if (isNaN(qtyToAdd) || qtyToAdd <= 0) {
      setErrorMsg('Please enter a valid positive quantity to restock.');
      return;
    }

    setActionLoadingId(restockItem._id);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/medicines/${restockItem._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjustQty: qtyToAdd }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to process restock order');
      }

      setSuccessMsg(`Restocked +${qtyToAdd} units of "${restockItem.name}". New balance: ${data.medicine.stockQuantity}`);
      setRestockItem(null);
      setRestockQty('50');
      setTimeout(() => setSuccessMsg(''), 4000);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error('Batch restock error:', err);
      setErrorMsg(err.message || 'Error processing batch restock');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRegisterFormulation = async (e) => {
    e.preventDefault();
    if (!newName || !newQty || !newPricePerPack || !newExpiry) {
      setErrorMsg('Please fill in all mandatory fields (*)');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const qtyPerPack = parseInt(newQuantityPerPack, 10) || 10;
      const pricePerPack = parseFloat(newPricePerPack) || 0;
      const computedUnitPrice = Math.round((pricePerPack / qtyPerPack) * 100) / 100;

      const payload = {
        name: newName,
        genericName: newGenericName,
        category: newCategory,
        dosageForm: newDosageForm,
        strength: newStrength,
        quantityPerPack: qtyPerPack,
        pricePerPack,
        unitPrice: computedUnitPrice,
        stockQuantity: parseInt(newQty, 10),
        reorderLevel: parseInt(newReorderLevel, 10) || 20,
        expiryDate: newExpiry,
        manufacturer: newManufacturer || 'Hospital Formulary',
        location: newLocation || 'Central Pharmacy Shelf A',
      };

      const res = await fetch('/api/medicines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to register formulation');
      }

      setSuccessMsg(`Formulation "${data.medicine.name}" (${data.medicine.sku}) registered into formulary in PKR!`);

      // Reset form
      setNewName('');
      setNewGenericName('');
      setNewCategory('Antibiotics');
      setNewDosageForm('Tablet');
      setNewStrength('');
      setNewQty('');
      setNewQuantityPerPack('20');
      setNewPricePerPack('');
      setNewReorderLevel('20');
      setNewExpiry('');
      setNewManufacturer('');
      setNewLocation('');

      setTimeout(() => setSuccessMsg(''), 4000);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error('Registration error:', err);
      setErrorMsg(err.message || 'Error registering formulation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (medicine) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete "${medicine.name}" (${medicine.sku}) from the hospital formulary?`
      )
    ) {
      return;
    }

    setActionLoadingId(medicine._id);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/medicines/${medicine._id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete formulation');
      }

      setSuccessMsg(`Formulation "${medicine.name}" was removed from the formulary.`);
      setTimeout(() => setSuccessMsg(''), 3000);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error('Delete error:', err);
      setErrorMsg(err.message || 'Error deleting formulation');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStockStatus = (qty, reorderLevel = 20) => {
    if (qty === 0) {
      return { label: 'Out of Stock', css: 'bg-error-container text-on-error-container font-bold border border-error/20' };
    }
    if (qty <= reorderLevel) {
      return {
        label: `Low Stock (${qty} left)`,
        css: 'bg-error-container/40 border border-error/20 text-error font-bold',
      };
    }
    return { label: 'In Stock', css: 'bg-secondary-container text-on-secondary-container font-bold' };
  };

  const checkExpiryStatus = (expiryDate) => {
    if (!expiryDate) return { isExpired: false, isNear: false };
    const today = new Date().toISOString().split('T')[0];
    const target = new Date(expiryDate);
    const now = new Date();
    const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));

    if (expiryDate < today) {
      return { isExpired: true, isNear: false, label: 'EXPIRED' };
    }
    if (diffDays <= 90) {
      return { isExpired: false, isNear: true, label: `Expiring in ${diffDays}d` };
    }
    return { isExpired: false, isNear: false, label: '' };
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background p-margin no-scrollbar">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-lg">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
              Pharmaceutical Formulary & Stock Inventory
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              Central hospital medication catalog, batch balance management, and real-time inventory ledger (PKR).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setLoading(true);
                setRefreshKey((k) => k + 1);
              }}
              disabled={loading}
              className="cursor-pointer px-4 py-2 bg-surface-container hover:bg-surface-container-high rounded-xl text-body-sm font-semibold flex items-center gap-1.5 transition-colors border border-outline-variant/30 text-on-surface disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh Catalog
            </button>
          </div>
        </header>

        {/* Formulary KPI Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-lg text-body-sm">
          <div className="glass-card p-4 rounded-2xl clinical-shadow">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider block">Total Formulations</span>
            <p className="text-headline-sm font-extrabold text-on-surface mt-1">{summary.totalFormulations}</p>
            <span className="text-[10px] text-outline">Active catalogue SKUs</span>
          </div>
          <div className="glass-card p-4 rounded-2xl clinical-shadow">
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider block">Total Units in Stock</span>
            <p className="text-headline-sm font-extrabold text-primary mt-1">{summary.totalUnits}</p>
            <span className="text-[10px] text-outline">Boxes / viles on shelves</span>
          </div>
          <div className="glass-card p-4 rounded-2xl clinical-shadow">
            <span className="text-[11px] font-bold text-error uppercase tracking-wider block">Low Stock Alerts</span>
            <p className="text-headline-sm font-extrabold text-error mt-1">{summary.lowStockCount}</p>
            <span className="text-[10px] text-error font-medium">At or below reorder pt</span>
          </div>
          <div className="glass-card p-4 rounded-2xl clinical-shadow">
            <span className="text-[11px] font-bold text-on-error-container uppercase tracking-wider block">Out of Stock</span>
            <p className="text-headline-sm font-extrabold text-error mt-1">{summary.outOfStockCount}</p>
            <span className="text-[10px] text-outline">Immediate replenishment</span>
          </div>
          <div className="glass-card p-4 rounded-2xl clinical-shadow col-span-2 md:col-span-1">
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block">Valuation (PKR)</span>
            <p className="text-headline-sm font-extrabold text-secondary mt-1">Rs. {summary.totalStockValue.toLocaleString()}</p>
            <span className="text-[10px] text-outline">Formulary inventory value</span>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-md p-4 rounded-2xl bg-error-container text-on-error-container flex items-center gap-2 border border-error/30 text-body-sm font-semibold animate-fade-in">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-lg p-md rounded-2xl bg-secondary-container text-on-secondary-container flex items-center gap-2 clinical-shadow font-semibold text-body-sm border border-secondary/20 animate-fade-in">
            <Check className="w-5 h-5 text-secondary shrink-0" /> {successMsg}
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="flex flex-col md:flex-row gap-3 mb-md justify-between items-start md:items-center">
          {/* Categories Pills */}
          <div className="flex flex-wrap gap-1.5 items-center text-body-sm">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`cursor-pointer px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${selectedCategory === cat
                    ? 'bg-primary border-primary text-on-primary clinical-shadow'
                    : 'bg-white border-outline-variant/30 text-outline hover:text-primary hover:border-primary/40'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Status Segment Filters */}
          <div className="flex items-center gap-1 bg-surface-container-high p-1 rounded-xl border border-outline-variant/30 text-xs font-bold shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`cursor-pointer px-3 py-1 rounded-lg transition-colors ${statusFilter === 'all' ? 'bg-white text-on-surface shadow-xs' : 'text-outline hover:text-on-surface'
                }`}
            >
              All Items
            </button>
            <button
              onClick={() => setStatusFilter('low')}
              className={`cursor-pointer px-3 py-1 rounded-lg transition-colors ${statusFilter === 'low' ? 'bg-error text-white shadow-xs' : 'text-outline hover:text-error'
                }`}
            >
              Low Stock
            </button>
            <button
              onClick={() => setStatusFilter('out')}
              className={`cursor-pointer px-3 py-1 rounded-lg transition-colors ${statusFilter === 'out' ? 'bg-error-container text-on-error-container shadow-xs' : 'text-outline hover:text-on-error-container'
                }`}
            >
              Out of Stock
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-gutter mb-lg">
          {/* Register New Medicine Formulation Card */}
          <div className="col-span-12 xl:col-span-4 glass-card p-margin rounded-[24px] clinical-shadow">
            <h3 className="text-title-sm font-bold text-on-surface mb-md flex items-center gap-2">
              <Plus className="text-primary" /> Register Formulation
            </h3>

            <form onSubmit={handleRegisterFormulation} className="space-y-3 text-body-sm">
              <div>
                <label className="block text-outline mb-1 font-semibold text-xs">Formulation Trade Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amoxicillin 500mg"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-outline mb-1 font-semibold text-xs">Generic / Active Molecule</label>
                <input
                  type="text"
                  placeholder="e.g. Amoxicillin Trihydrate"
                  value={newGenericName}
                  onChange={(e) => setNewGenericName(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-outline mb-1 font-semibold text-xs">Therapeutic Category *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary"
                  >
                    {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-outline mb-1 font-semibold text-xs">Dosage Form</label>
                  <select
                    value={newDosageForm}
                    onChange={(e) => setNewDosageForm(e.target.value)}
                    className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary"
                  >
                    {DOSAGE_FORMS.map((form) => (
                      <option key={form} value={form}>
                        {form}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-outline mb-1 font-semibold text-xs">Strength</label>
                  <input
                    type="text"
                    placeholder="e.g. 500mg or 10ml"
                    value={newStrength}
                    onChange={(e) => setNewStrength(e.target.value)}
                    className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-outline mb-1 font-semibold text-xs">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={newExpiry}
                    onChange={(e) => setNewExpiry(e.target.value)}
                    className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Pack Sizing and PKR Pricing Grid */}
              <div className="p-3 bg-surface-container/30 rounded-xl border border-outline-variant/20 space-y-2">
                <span className="block text-[10px] font-bold text-outline uppercase tracking-wider flex items-center gap-1">
                  <Coins size={12} className="text-secondary" /> Pack Sizing & PKR Pricing
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-outline mb-1 font-semibold text-xs">Units per Pack *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="e.g. 20"
                      value={newQuantityPerPack}
                      onChange={(e) => setNewQuantityPerPack(e.target.value)}
                      className="w-full p-2 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-outline mb-1 font-semibold text-xs">Pack Price (PKR) *</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      min={0}
                      placeholder="e.g. 350"
                      value={newPricePerPack}
                      onChange={(e) => setNewPricePerPack(e.target.value)}
                      className="w-full p-2 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs font-semibold pt-1 text-outline">
                  <span>Unit Price (Calculated):</span>
                  <span className="font-bold text-secondary font-mono">
                    Rs. {liveUnitPrice} / unit
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-outline mb-1 font-semibold text-xs">Total Units in Stock *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    placeholder="e.g. 100"
                    value={newQty}
                    onChange={(e) => setNewQty(e.target.value)}
                    className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block text-outline mb-1 font-semibold text-xs">Reorder Limit (Units)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="20"
                    value={newReorderLevel}
                    onChange={(e) => setNewReorderLevel(e.target.value)}
                    className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-outline mb-1 font-semibold text-xs">Manufacturer</label>
                  <input
                    type="text"
                    placeholder="e.g. Pfizer / GSK"
                    value={newManufacturer}
                    onChange={(e) => setNewManufacturer(e.target.value)}
                    className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-outline mb-1 font-semibold text-xs">Dispensary Location</label>
                  <input
                    type="text"
                    placeholder="Shelf A-1 / Cold Store"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="cursor-pointer w-full mt-3 flex items-center justify-center gap-2 py-3 bg-primary text-on-primary rounded-xl font-bold clinical-shadow hover:opacity-90 transition-all text-body-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Registering Formulation...
                  </>
                ) : (
                  <>
                    <Plus size={18} /> Add to Hospital Formulary
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Stock Formulary Directory Grid */}
          <div className="col-span-12 xl:col-span-8 glass-card p-margin rounded-[24px] clinical-shadow flex flex-col h-[670px]">
            <div className="mb-md flex flex-col md:flex-row justify-between items-center gap-sm">
              <div className="flex items-center gap-2">
                <Layers className="text-primary w-5 h-5" />
                <h3 className="text-title-sm font-bold text-on-surface">
                  Formulary Stock Ledger ({medicines.length})
                </h3>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4.5 h-4.5" />
                <input
                  type="text"
                  placeholder="Search SKU, trade name, active..."
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
                  <span className="text-body-sm font-semibold">Synchronizing with hospital formulary ledger...</span>
                </div>
              ) : medicines.length > 0 ? (
                medicines.map((item) => {
                  const status = getStockStatus(item.stockQuantity, item.reorderLevel);
                  const expiryCheck = checkExpiryStatus(item.expiryDate);
                  const isLoadingThis = actionLoadingId === item._id;
                  const packSize = item.quantityPerPack || 10;
                  const estimatedPacks = Math.floor((item.stockQuantity || 0) / packSize);

                  return (
                    <div
                      key={item._id || item.sku}
                      className="p-md bg-surface-container-low border border-outline-variant/15 rounded-2xl clinical-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-body-sm hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-3 bg-secondary-container text-secondary rounded-xl shrink-0">
                          <PackageCheck size={20} />
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-[11px] font-bold text-primary bg-primary-fixed/50 px-2 py-0.5 rounded-md">
                              {item.sku}
                            </span>
                            <span className="text-[11px] text-outline font-semibold">
                              {item.dosageForm} • {item.strength || 'Standard'}
                            </span>
                          </div>
                          <h5 className="font-bold text-on-surface text-body-md leading-snug truncate">{item.name}</h5>
                          {item.genericName && (
                            <p className="text-[12px] text-outline-variant font-medium italic truncate">
                              Generic: {item.genericName}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-outline mt-1 font-medium">
                            <span>
                              Category: <strong className="text-on-surface">{item.category}</strong>
                            </span>
                            <span>•</span>
                            <span>
                              Pack: <strong className="text-on-surface">{packSize}/pack</strong> (Rs. {(item.pricePerPack || 0).toFixed(2)})
                            </span>
                            <span>•</span>
                            <span>
                              Unit: <strong className="text-secondary font-mono">Rs. {(item.unitPrice || 0).toFixed(2)}</strong>
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <MapPin size={11} /> {item.location || 'Shelf A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-bold ${expiryCheck.isExpired ? 'text-error font-extrabold' : expiryCheck.isNear ? 'text-error font-bold flex items-center gap-0.5' : 'text-outline'}`}>
                              {expiryCheck.isNear && <AlertTriangle size={12} />}
                              Expiry: {item.expiryDate} {expiryCheck.label && `(${expiryCheck.label})`}
                            </span>
                            {item.batchNumber && (
                              <span className="text-[10px] text-outline font-mono">Lot: {item.batchNumber}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stock Adjust Controls */}
                      <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-between md:justify-end border-t border-outline-variant/10 pt-2 md:border-0 md:pt-0">
                        <div className="text-right">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full block ${status.css}`}>
                            {status.label}
                          </span>
                          <span className="text-[10px] text-outline font-mono mt-0.5 block">
                            ~{estimatedPacks} pk{estimatedPacks === 1 ? '' : 's'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-outline-variant/20 shadow-xs">
                          <button
                            type="button"
                            disabled={isLoadingThis || item.stockQuantity <= 0}
                            onClick={() => handleAdjustQty(item, -1)}
                            className="cursor-pointer p-1.5 hover:bg-surface-container rounded-lg text-outline hover:text-error transition-colors disabled:opacity-30"
                            title="Decrement stock by 1 unit"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="font-extrabold px-2 min-w-10 text-center font-mono text-body-sm text-on-surface">
                            {item.stockQuantity}
                          </span>
                          <button
                            type="button"
                            disabled={isLoadingThis}
                            onClick={() => handleAdjustQty(item, 1)}
                            className="cursor-pointer p-1.5 hover:bg-surface-container rounded-lg text-outline hover:text-secondary transition-colors disabled:opacity-30"
                            title="Increment stock by 1 unit"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        {/* Quick Restock Action */}
                        <button
                          onClick={() => {
                            setRestockItem(item);
                            setRestockQty('50');
                          }}
                          className="cursor-pointer px-2.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-primary rounded-xl text-xs font-bold transition-colors border border-outline-variant/30 flex items-center gap-1"
                          title="Restock shipment"
                        >
                          <ArrowUpDown size={13} /> Restock
                        </button>

                        <button
                          onClick={() => handleDeleteItem(item)}
                          disabled={isLoadingThis}
                          className="cursor-pointer p-2 hover:bg-error-container text-error rounded-xl transition-colors disabled:opacity-30"
                          title="Delete formulation from formulary"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-20 text-center text-outline">
                  <Archive className="mx-auto w-12 h-12 text-outline-variant mb-2" />
                  <p className="font-semibold text-body-sm">No formulations matching criteria in formulary.</p>
                  <p className="text-xs text-outline mt-1">Try resetting search keywords or category filters.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Batch Restock Modal */}
        {restockItem && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-md animate-fade-in">
            <div className="bg-white rounded-2xl max-w-240 w-full clinical-shadow border border-outline-variant/30 overflow-hidden">
              <div className="px-6 py-4 bg-primary text-on-primary flex justify-between items-center">
                <h3 className="font-bold text-title-sm flex items-center gap-1.5">
                  <PackageCheck size={18} /> Restock Shipment Batch
                </h3>
                <button
                  onClick={() => setRestockItem(null)}
                  className="cursor-pointer hover:bg-white/10 p-1 rounded-full transition-colors text-white text-lg font-bold"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleBatchRestock} className="p-margin space-y-4 text-body-sm">
                <div>
                  <span className="block text-xs text-outline font-bold uppercase">Formulation</span>
                  <p className="text-body-md font-bold text-on-surface">{restockItem.name}</p>
                  <p className="text-xs text-outline font-mono">
                    SKU: {restockItem.sku} • Current Balance: {restockItem.stockQuantity} units (~{Math.floor((restockItem.stockQuantity || 0) / (restockItem.quantityPerPack || 10))} packs)
                  </p>
                </div>

                <div>
                  <label className="block text-outline mb-1 font-semibold text-xs">Quantity to Add (Total Units) *</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      required
                      min={1}
                      value={restockQty}
                      onChange={(e) => setRestockQty(e.target.value)}
                      className="flex-1 p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm font-mono font-bold focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    {['10', '25', '50', '100', '250'].map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setRestockQty(preset)}
                        className={`cursor-pointer px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${restockQty === preset
                            ? 'bg-primary text-on-primary border-primary'
                            : 'bg-surface-container text-outline border-outline-variant/30 hover:border-primary'
                          }`}
                      >
                        +{preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-high/60 border border-outline-variant/20 text-xs text-outline flex items-center gap-2">
                  <Building size={16} className="text-secondary shrink-0" />
                  <span>
                    New resulting stock balance will be:{' '}
                    <strong className="text-on-surface font-mono">
                      {restockItem.stockQuantity + (parseInt(restockQty, 10) || 0)} units
                    </strong>
                  </span>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-outline-variant/20">
                  <button
                    type="button"
                    onClick={() => setRestockItem(null)}
                    className="cursor-pointer px-4 py-2 border border-outline-variant/30 hover:bg-surface-container rounded-xl text-body-sm font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="cursor-pointer px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 transition-all clinical-shadow text-body-sm flex items-center gap-1.5"
                  >
                    Confirm & Update Ledger
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <Footer />
      </main>
    </div>
  );
}
