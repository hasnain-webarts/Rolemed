"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/Admin_Sidebar';
import Footer from '@/components/Footer';
import { 
  MdOutlineInventory, 
  MdClose,
  MdRefresh 
} from "react-icons/md";
import { Pill, AlertTriangle, Plus, Download, Check, AlertCircle, X, Search } from "lucide-react";
import { exportToCsv } from '@/lib/csvExport';

export default function AdminPharmacyPage() {
  const [inventoryList, setInventoryList] = useState([]);
  const [invoicesSummary, setInvoicesSummary] = useState({ totalRevenue: 0, paidCount: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState("");
  const [errorNotice, setErrorNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Drug Form State in PKR
  const [name, setName] = useState("");
  const [genericName, setGenericName] = useState("");
  const [category, setCategory] = useState("Antibiotics");
  const [stockQuantity, setStockQuantity] = useState("100");
  const [quantityPerPack, setQuantityPerPack] = useState("20");
  const [pricePerPack, setPricePerPack] = useState("350");
  const [reorderLevel, setReorderLevel] = useState("20");

  useEffect(() => {
    let ignore = false;
    async function loadPharmacyData() {
      setLoading(true);
      try {
        const [medsRes, invsRes] = await Promise.all([
          fetch('/api/medicines?limit=200', { cache: 'no-store' }),
          fetch('/api/pharmacy/invoices?limit=100', { cache: 'no-store' }),
        ]);

        const [medsData, invsData] = await Promise.all([
          medsRes.json(),
          invsRes.json(),
        ]);

        if (!ignore) {
          if (medsData.success) setInventoryList(medsData.medicines || []);
          if (invsData.success && invsData.summary) {
            setInvoicesSummary(invsData.summary);
          }
        }
      } catch (err) {
        console.error('Error fetching pharmacy data:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadPharmacyData();
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  // Filter Inventory
  const filteredInventory = useMemo(() => {
    return inventoryList.filter((item) => {
      const isLow = item.stockQuantity <= item.reorderLevel;
      if (statusFilter === 'Low' && !isLow) return false;
      if (statusFilter === 'Adequate' && isLow) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const mName = (item.name || '').toLowerCase();
      const mGen = (item.genericName || '').toLowerCase();
      const mCat = (item.category || '').toLowerCase();
      const mSku = (item.sku || '').toLowerCase();

      return mName.includes(q) || mGen.includes(q) || mCat.includes(q) || mSku.includes(q);
    });
  }, [inventoryList, statusFilter, searchQuery]);

  const criticalCount = useMemo(() => {
    return inventoryList.filter((i) => i.stockQuantity <= i.reorderLevel).length;
  }, [inventoryList]);

  // Add Medicine Submit in PKR
  const handleAddMedicine = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setErrorNotice("");

    const packsQty = Math.max(1, parseInt(quantityPerPack, 10) || 1);
    const packPrice = Math.max(0, parseFloat(pricePerPack) || 0);
    const unitPrice = Math.round((packPrice / packsQty) * 100) / 100;

    try {
      const res = await fetch('/api/medicines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          genericName: genericName.trim() || name.trim(),
          category,
          stockQuantity: parseInt(stockQuantity, 10) || 50,
          quantityPerPack: packsQty,
          pricePerPack: packPrice,
          unitPrice,
          reorderLevel: parseInt(reorderLevel, 10) || 20,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add medicine');
      }

      setFeedbackNotice(`Added ${data.medicine?.name} to pharmacy formulary in PKR!`);
      setIsAddModalOpen(false);
      setName('');
      setGenericName('');
      setRefreshKey((k) => k + 1);
      setTimeout(() => setFeedbackNotice(''), 4000);
    } catch (err) {
      setErrorNotice(err.message || 'Error adding medicine.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export CSV
  const handleExport = () => {
    const columns = [
      { key: 'sku', label: 'SKU Code' },
      { key: 'name', label: 'Brand Name' },
      { key: 'genericName', label: 'Generic Name' },
      { key: 'category', label: 'Therapeutic Class' },
      { key: 'stockQuantity', label: 'Stock (Units)' },
      { key: 'quantityPerPack', label: 'Units/Pack' },
      { key: 'pricePerPack', label: 'Price/Pack (PKR)' },
      { key: 'unitPrice', label: 'Unit Price (PKR)' },
      { key: 'reorderLevel', label: 'Reorder Level' },
    ];
    exportToCsv('hospital_pharmacy_inventory_pkr.csv', columns, filteredInventory);
    setFeedbackNotice(`Exported ${filteredInventory.length} formulary items to CSV.`);
    setTimeout(() => setFeedbackNotice(''), 3500);
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
                  <Pill className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold font-headline tracking-tight">
                    Central Pharmacy Oversight &amp; Inventory (PKR)
                  </h1>
                  <p className="text-sm text-outline">
                    Medication formulary control, pack pricing in PKR, reorder thresholds, and realized sales audit.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setRefreshKey((k) => k + 1)}
                disabled={loading}
                className="cursor-pointer px-3.5 py-2 border border-outline-variant/30 rounded-xl text-xs font-semibold hover:bg-surface-container flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <MdRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <button
                type="button"
                onClick={handleExport}
                className="cursor-pointer px-4 py-2 border border-outline-variant/30 rounded-xl text-xs font-semibold hover:bg-surface-container flex items-center gap-1.5 transition-all text-outline hover:text-on-surface"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="cursor-pointer flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-xl font-bold text-xs hover:opacity-90 transition-all shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Add Formulary Drug
              </button>
            </div>
          </div>

          {/* Feedback Notices */}
          {feedbackNotice && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-semibold flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{feedbackNotice}</span>
              </div>
              <button type="button" onClick={() => setFeedbackNotice("")} className="cursor-pointer p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {errorNotice && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-semibold flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorNotice}</span>
              </div>
              <button type="button" onClick={() => setErrorNotice("")} className="cursor-pointer p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* KPI Bar in PKR */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
              <span className="text-xs font-semibold text-outline uppercase tracking-wider block">Formulary Items</span>
              <p className="text-2xl font-black font-headline text-on-surface mt-1">{inventoryList.length}</p>
              <p className="text-[10px] text-outline mt-0.5">Active catalog formulations</p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
              <span className="text-xs font-semibold text-outline uppercase tracking-wider block">Low Stock Alerts</span>
              <p className="text-2xl font-black font-headline text-rose-600 dark:text-rose-400 mt-1">{criticalCount}</p>
              <p className="text-[10px] text-outline mt-0.5">At or below reorder limit</p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
              <span className="text-xs font-semibold text-outline uppercase tracking-wider block">Realized Sales (PKR)</span>
              <p className="text-2xl font-black font-headline text-emerald-600 dark:text-emerald-400 mt-1">
                Rs. {(invoicesSummary.totalRevenue || 0).toLocaleString()}
              </p>
              <p className="text-[10px] text-outline mt-0.5">Dispensed pharmacy revenue</p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-sm">
              <span className="text-xs font-semibold text-outline uppercase tracking-wider block">Settled Invoices</span>
              <p className="text-2xl font-black font-headline text-primary mt-1">{invoicesSummary.paidCount || 0}</p>
              <p className="text-[10px] text-outline mt-0.5">Paid POS transactions</p>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 p-1 bg-surface-container/40 rounded-2xl border border-outline-variant/20 overflow-x-auto">
              {['All', 'Low', 'Adequate'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    statusFilter === st
                      ? "bg-surface-container-lowest text-primary shadow-xs font-headline"
                      : "text-outline hover:text-on-surface"
                  }`}
                >
                  {st === 'Low' ? 'Critical / Low Stock' : st === 'Adequate' ? 'Adequate Stock' : 'All Stock'}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-outline absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search medication by name, SKU, class..."
                className="pl-9 pr-4 py-2 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-72"
              />
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container/40 text-outline text-[11px] font-bold">
                  <tr>
                    <th className="p-3.5">SKU</th>
                    <th className="p-3.5">Medication Formulation</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5 text-right">Units / Pack</th>
                    <th className="p-3.5 text-right">Pack Price (PKR)</th>
                    <th className="p-3.5 text-right">Unit Price (PKR)</th>
                    <th className="p-3.5 text-right">Available Stock</th>
                    <th className="p-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {filteredInventory.map((item) => {
                    const isLow = item.stockQuantity <= item.reorderLevel;
                    return (
                      <tr key={item.sku || item._id} className="hover:bg-surface-container/30 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-primary">{item.sku}</td>
                        <td className="p-3.5">
                          <span className="font-bold text-on-surface block">{item.name}</span>
                          <span className="text-[10px] text-outline italic">{item.genericName}</span>
                        </td>
                        <td className="p-3.5 font-medium text-on-surface">{item.category}</td>
                        <td className="p-3.5 text-right text-outline">{item.quantityPerPack || 1}</td>
                        <td className="p-3.5 text-right font-semibold text-on-surface">
                          Rs. {(item.pricePerPack || 0).toLocaleString()}
                        </td>
                        <td className="p-3.5 text-right font-mono text-outline">
                          Rs. {(item.unitPrice || 0).toFixed(1)}
                        </td>
                        <td className="p-3.5 text-right font-black text-on-surface">
                          {item.stockQuantity} units
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isLow
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {isLow ? 'Low Stock' : 'Adequate'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredInventory.length === 0 && (
                    <tr>
                      <td colSpan="8" className="p-10 text-center text-outline text-xs">
                        {loading ? 'Loading pharmacy inventory from MongoDB...' : 'No medicines found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Add Medicine Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
            <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl w-full max-w-240 shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container/30">
                <div className="flex items-center gap-2">
                  <Pill className="w-5 h-5 text-primary" />
                  <span className="font-bold text-sm">Add Formulary Medicine (PKR)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="cursor-pointer p-1 rounded-lg hover:bg-surface-container text-outline"
                >
                  <MdClose className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddMedicine} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-outline mb-1">Brand Name &amp; Strength</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g., Ciprofloxacin 500mg"
                    className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-outline mb-1">Generic Salt</label>
                    <input
                      type="text"
                      value={genericName}
                      onChange={(e) => setGenericName(e.target.value)}
                      placeholder="e.g., Ciprofloxacin HCl"
                      className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-outline mb-1">Therapeutic Class</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none"
                    >
                      <option value="Antibiotics">Antibiotics</option>
                      <option value="Analgesics">Analgesics</option>
                      <option value="Cardiovascular">Cardiovascular</option>
                      <option value="Antidiabetics">Antidiabetics</option>
                      <option value="Respiratory">Respiratory</option>
                      <option value="Gastrointestinal">Gastrointestinal</option>
                      <option value="Neurology">Neurology</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-outline mb-1">Stock Quantity (Units)</label>
                    <input
                      type="number"
                      min="0"
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(e.target.value)}
                      required
                      className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-outline mb-1">Units per Pack</label>
                    <input
                      type="number"
                      min="1"
                      value={quantityPerPack}
                      onChange={(e) => setQuantityPerPack(e.target.value)}
                      required
                      className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-outline mb-1">Price per Pack (PKR)</label>
                    <input
                      type="number"
                      min="0"
                      value={pricePerPack}
                      onChange={(e) => setPricePerPack(e.target.value)}
                      required
                      className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-outline mb-1">Reorder Alert Level</label>
                  <input
                    type="number"
                    min="1"
                    value={reorderLevel}
                    onChange={(e) => setReorderLevel(e.target.value)}
                    className="w-full p-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl focus:outline-none"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-outline-variant/10">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="cursor-pointer px-4 py-2 border border-outline-variant/30 rounded-xl font-semibold hover:bg-surface-container text-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="cursor-pointer px-5 py-2 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting ? "Adding..." : "Add to Formulary"}
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
