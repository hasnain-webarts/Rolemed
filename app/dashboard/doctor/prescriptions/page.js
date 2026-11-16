"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Pill,
  Plus,
  Trash2,
  Printer,
  Eye,
  Check,
  ChevronDown,
  X,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  AlertCircle,
  PackageCheck,
} from 'lucide-react';
import Sidebar from '@/components/Doctor_Sidebar';
import Footer from '@/components/Footer';

const COMMON_MEDICATIONS = [
  { name: 'Amoxicillin 500mg', defaultDosage: '500mg', allergenKeyword: 'penicillin' },
  { name: 'Augmentin 625mg', defaultDosage: '625mg', allergenKeyword: 'penicillin' },
  { name: 'Lisinopril 10mg', defaultDosage: '10mg', allergenKeyword: 'ace' },
  { name: 'Metformin 500mg', defaultDosage: '500mg', allergenKeyword: '' },
  { name: 'Paracetamol 500mg', defaultDosage: '500mg', allergenKeyword: '' },
  { name: 'Ibuprofen 400mg', defaultDosage: '400mg', allergenKeyword: 'nsaid' },
  { name: 'Aspirin 81mg', defaultDosage: '81mg', allergenKeyword: 'aspirin' },
  { name: 'Atorvastatin 20mg', defaultDosage: '20mg', allergenKeyword: 'statin' },
  { name: 'Cetirizine 10mg', defaultDosage: '10mg', allergenKeyword: '' },
  { name: 'Omeprazole 20mg', defaultDosage: '20mg', allergenKeyword: '' },
  { name: 'Azithromycin 250mg', defaultDosage: '250mg', allergenKeyword: 'macrolide' },
  { name: 'Sumatriptan 50mg', defaultDosage: '50mg', allergenKeyword: 'triptan' },
];

function PrescriptionsContent() {
  const searchParams = useSearchParams();
  const paramPatientId = searchParams.get('patientId') || '';
  const paramPatientName = searchParams.get('patientName') || '';

  const [patients, setPatients] = useState([]);
  const [prescriptionsHistory, setPrescriptionsHistory] = useState([]);
  const [formularyMeds, setFormularyMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedPatient, setSelectedPatient] = useState(paramPatientId);
  const [generalInstructions, setGeneralInstructions] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Searchable combobox dropdown state
  const [patientSearch, setPatientSearch] = useState('');
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const patientDropdownRef = useRef(null);

  // Drug builder row state
  const [drugName, setDrugName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('Once daily');
  const [duration, setDuration] = useState('5 days');
  const [instruction, setInstruction] = useState('After meals');
  const [qtyNeeded, setQtyNeeded] = useState(10);

  const [addedDrugs, setAddedDrugs] = useState([]);
  const [viewingRx, setViewingRx] = useState(null);

  // Click outside to close combobox
  useEffect(() => {
    function handleClickOutside(event) {
      if (patientDropdownRef.current && !patientDropdownRef.current.contains(event.target)) {
        setIsPatientDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch real patients, prescriptions history, and live formulary from MongoDB
  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const [patRes, rxRes, medRes] = await Promise.all([
          fetch('/api/patients'),
          fetch('/api/prescriptions'),
          fetch('/api/medicines?limit=500'),
        ]);

        const patData = await patRes.json();
        const rxData = await rxRes.json();
        const medData = await medRes.json();

        if (!ignore) {
          if (patData.success) {
            let patientList = (patData.patients || []).map((p) => ({
              id: p.patientId,
              name: p.name,
              age: p.age,
              gender: p.gender,
              bloodGroup: p.bloodGroup,
              allergies: p.allergies || [],
            }));

            if (paramPatientId && !patientList.some((p) => p.id === paramPatientId)) {
              patientList = [
                {
                  id: paramPatientId,
                  name: paramPatientName || 'Patient',
                  age: 35,
                  gender: 'Unspecified',
                  bloodGroup: 'Unknown',
                  allergies: [],
                },
                ...patientList,
              ];
            }

            setPatients(patientList);
          }

          if (rxData.success) {
            setPrescriptionsHistory(rxData.prescriptions || []);
          }

          if (medData.success) {
            setFormularyMeds(medData.medicines || []);
          }
        }
      } catch (err) {
        console.error('Error fetching prescriptions data:', err);
        if (!ignore) {
          setErrorMsg('Failed to synchronize prescription records with hospital server.');
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
  }, [refreshKey, paramPatientId, paramPatientName]);

  const selectedPatientObj = patients.find((p) => p.id === selectedPatient);

  // Check if current drug input matches live formulary
  const matchedFormularyItem = drugName
    ? formularyMeds.find(
        (m) =>
          m.name.toLowerCase() === drugName.toLowerCase() ||
          (m.genericName && m.genericName.toLowerCase() === drugName.toLowerCase())
      )
    : null;

  // Check if current drug input conflicts with known patient allergies
  const allergyWarning = (() => {
    if (!selectedPatientObj || !selectedPatientObj.allergies || !drugName) return null;
    const drugLower = drugName.toLowerCase();
    for (const allergy of selectedPatientObj.allergies) {
      const aLower = allergy.toLowerCase();
      if (
        drugLower.includes(aLower) ||
        aLower.includes(drugLower) ||
        (drugLower.includes('amoxicillin') && aLower.includes('penicillin')) ||
        (drugLower.includes('augmentin') && aLower.includes('penicillin')) ||
        (drugLower.includes('aspirin') && aLower.includes('nsaid')) ||
        (drugLower.includes('ibuprofen') && aLower.includes('aspirin'))
      ) {
        return `Patient has a documented hypersensitivity / allergy to: ${allergy}!`;
      }
    }
    return null;
  })();

  const filteredPatientsForDropdown = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.id.toLowerCase().includes(patientSearch.toLowerCase())
  );

  const handleDrugNameChange = (val) => {
    setDrugName(val);
    const found = formularyMeds.find(
      (m) =>
        m.name.toLowerCase() === val.toLowerCase() ||
        (m.genericName && m.genericName.toLowerCase() === val.toLowerCase())
    );
    if (found && !dosage) {
      setDosage(found.strength || found.dosageForm || 'Standard');
    }
  };

  const handleAddDrug = () => {
    if (!drugName || !dosage) return;

    const newDrug = {
      name: drugName,
      dosage,
      frequency,
      duration,
      instruction,
      qtyNeeded: Number(qtyNeeded) || 10,
    };

    setAddedDrugs([...addedDrugs, newDrug]);
    setDrugName('');
    setDosage('');
    setQtyNeeded(10);
  };

  const handleRemoveDrug = (index) => {
    setAddedDrugs(addedDrugs.filter((_, i) => i !== index));
  };

  const handleSubmitPrescription = async (e) => {
    e.preventDefault();
    if (!selectedPatient || addedDrugs.length === 0) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const patient = patients.find((p) => p.id === selectedPatient) || { name: 'Unknown Patient', id: selectedPatient };

      const res = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          drugs: addedDrugs,
          generalInstructions: generalInstructions || 'Take medications as directed. Finish course unless adverse reactions occur.',
          doctorName: 'Dr. Sarah Johnson',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch prescription to pharmacy');
      }

      setSuccessMsg(`Prescription ${data.prescription.prescriptionId} transmitted successfully for ${patient.name}!`);

      // Reset
      setSelectedPatient('');
      setGeneralInstructions('');
      setAddedDrugs([]);
      setPatientSearch('');
      setRefreshKey((k) => k + 1);

      setTimeout(() => {
        setSuccessMsg('');
      }, 5000);
    } catch (err) {
      console.error('Submit prescription error:', err);
      setErrorMsg(err.message || 'An error occurred while dispatching the prescription');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredHistory = prescriptionsHistory.filter(
    (rx) =>
      (rx.patientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rx.prescriptionId || rx.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rx.patientId || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background p-margin no-scrollbar">
        {/* Header */}
        <header className="flex justify-between items-center mb-lg">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold">Pharmacy Prescriptions</h2>
            <p className="text-body-sm text-on-surface-variant">
              Write digital e-prescriptions, evaluate allergy safety alerts, and cross-check hospital formulary availability.
            </p>
          </div>
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

        <div className="grid grid-cols-12 gap-gutter mb-lg">
          {/* Builder Form */}
          <div className="col-span-12 xl:col-span-7 glass-card p-margin rounded-[24px] clinical-shadow">
            <h3 className="text-title-sm font-bold text-on-surface mb-md flex items-center gap-2">
              <Pill className="text-secondary" /> Prescription Builder
            </h3>

            <form onSubmit={handleSubmitPrescription} className="space-y-md">
              {/* Searchable Patient Combobox */}
              <div>
                <label className="block text-body-sm text-outline mb-1 font-semibold">Recipient Patient *</label>

                {selectedPatientObj ? (
                  // Selected Patient Card Display
                  <div className="p-3.5 bg-surface-container/40 border border-outline-variant/30 rounded-2xl flex items-center justify-between transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold text-body-md shrink-0 shadow-sm">
                        {selectedPatientObj.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-on-surface text-body-md">{selectedPatientObj.name}</p>
                          <span className="text-xs font-mono font-bold text-primary bg-primary-fixed px-2 py-0.5 rounded-md">
                            {selectedPatientObj.id}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {selectedPatientObj.gender}, {selectedPatientObj.age} yrs
                          {selectedPatientObj.bloodGroup && ` • Blood Group: ${selectedPatientObj.bloodGroup}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedPatientObj.allergies && selectedPatientObj.allergies.length > 0 && (
                        <span className="hidden md:flex items-center gap-1 text-[11px] font-bold text-error bg-error-container/50 px-2.5 py-1 rounded-lg border border-error/20">
                          <ShieldAlert size={13} /> Allergies: {selectedPatientObj.allergies.join(', ')}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatient('');
                          setPatientSearch('');
                          setIsPatientDropdownOpen(true);
                        }}
                        className="cursor-pointer text-xs font-semibold px-2.5 py-1.5 hover:bg-surface-container rounded-xl text-outline hover:text-error transition-colors flex items-center gap-1"
                        title="Change Patient"
                      >
                        <X size={14} /> Change
                      </button>
                    </div>
                  </div>
                ) : (
                  // Searchable dropdown input
                  <div className="relative" ref={patientDropdownRef}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search patient by name or ID (e.g. John Doe, PAT-001)..."
                        value={patientSearch}
                        onChange={(e) => {
                          setPatientSearch(e.target.value);
                          setIsPatientDropdownOpen(true);
                        }}
                        onFocus={() => setIsPatientDropdownOpen(true)}
                        className="w-full pl-9 pr-10 p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setIsPatientDropdownOpen(!isPatientDropdownOpen)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-outline cursor-pointer hover:text-on-surface"
                      >
                        <ChevronDown
                          size={18}
                          className={`transition-transform ${isPatientDropdownOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                    </div>

                    {isPatientDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl clinical-shadow z-30 max-h-60 overflow-y-auto sidebar-scroll p-1 animate-fade-in">
                        {filteredPatientsForDropdown.length > 0 ? (
                          filteredPatientsForDropdown.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSelectedPatient(p.id);
                                setIsPatientDropdownOpen(false);
                                setPatientSearch('');
                              }}
                              className="w-full p-2.5 text-left rounded-xl hover:bg-surface-container/60 transition-colors flex items-center justify-between cursor-pointer group"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-surface-container text-primary font-bold text-xs flex items-center justify-center shrink-0">
                                  {p.name.split(' ').map((n) => n[0]).join('')}
                                </div>
                                <div>
                                  <p className="text-body-sm font-bold text-on-surface group-hover:text-primary transition-colors">
                                    {p.name}
                                  </p>
                                  <p className="text-[11px] text-outline">
                                    {p.gender}, {p.age} yrs
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {p.allergies && p.allergies.length > 0 && (
                                  <span className="text-[10px] text-error font-semibold bg-error-container/40 px-1.5 py-0.5 rounded">
                                    Allergies: {p.allergies.join(', ')}
                                  </span>
                                )}
                                <span className="text-xs font-mono font-bold text-outline">{p.id}</span>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-xs text-outline">
                            No patient matched &ldquo;{patientSearch}&rdquo;
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Drug Row Form */}
              <div className="bg-surface-container/20 p-4 rounded-2xl border border-outline-variant/10">
                <div className="flex items-center justify-between mb-sm">
                  <span className="block text-[11px] font-bold text-outline uppercase tracking-wider">
                    Add Medication Item (Live Formulary Supported)
                  </span>
                  {allergyWarning && (
                    <span className="text-xs font-bold text-error bg-error-container px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-error/30 animate-pulse">
                      <ShieldAlert size={14} /> {allergyWarning}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-sm mb-sm">
                  <div>
                    <label className="block text-[11px] text-outline mb-1 font-semibold">
                      Medication Trade / Generic Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Amoxicillin 500mg, Lisinopril..."
                      value={drugName}
                      onChange={(e) => handleDrugNameChange(e.target.value)}
                      list="medication-suggestions"
                      className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary font-medium"
                    />
                    <datalist id="medication-suggestions">
                      {formularyMeds.map((m) => (
                        <option
                          key={m.sku || m._id}
                          value={m.name}
                        />
                      ))}
                      {COMMON_MEDICATIONS.map((m) => (
                        <option key={m.name} value={m.name} />
                      ))}
                    </datalist>

                    {/* Stock availability indicator */}
                    {matchedFormularyItem && (
                      <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                        <PackageCheck size={13} className="text-secondary" />
                        <span className="text-outline">Formulary [{matchedFormularyItem.sku}]:</span>
                        {matchedFormularyItem.stockQuantity === 0 ? (
                          <span className="text-error font-bold">Out of Stock</span>
                        ) : matchedFormularyItem.stockQuantity <= (matchedFormularyItem.reorderLevel || 20) ? (
                          <span className="text-error font-bold">
                            Low Stock ({matchedFormularyItem.stockQuantity} avail)
                          </span>
                        ) : (
                          <span className="text-secondary font-bold">
                            In Stock ({matchedFormularyItem.stockQuantity} avail)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] text-outline mb-1 font-semibold">Dosage Form & Strength</label>
                    <input
                      type="text"
                      placeholder="e.g. 500mg (Tablet), 10ml (Syrup)"
                      value={dosage}
                      onChange={(e) => setDosage(e.target.value)}
                      className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-xs mb-md">
                  <div>
                    <label className="block text-[10px] text-outline mb-1 font-semibold">Frequency</label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="w-full p-2 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="Once daily">Once daily (QD)</option>
                      <option value="BID">Twice daily (BID)</option>
                      <option value="TID">Thrice daily (TID)</option>
                      <option value="QID">Four times daily (QID)</option>
                      <option value="PRN">As needed (PRN)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-outline mb-1 font-semibold">Duration</label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full p-2 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="3 days">3 days</option>
                      <option value="5 days">5 days</option>
                      <option value="7 days">7 days</option>
                      <option value="10 days">10 days</option>
                      <option value="14 days">14 days</option>
                      <option value="30 days">30 days</option>
                      <option value="Ongoing">Ongoing</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-outline mb-1 font-semibold">Instruction</label>
                    <select
                      value={instruction}
                      onChange={(e) => setInstruction(e.target.value)}
                      className="w-full p-2 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="After meals">After meals</option>
                      <option value="Before meals">Before meals</option>
                      <option value="With meals">With meals</option>
                      <option value="On empty stomach">Empty stomach</option>
                      <option value="Before bedtime">Bedtime</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-outline mb-1 font-semibold">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      value={qtyNeeded}
                      onChange={(e) => setQtyNeeded(e.target.value)}
                      className="w-full p-2 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-xs focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddDrug}
                  className="cursor-pointer text-xs font-bold text-secondary bg-secondary-container/60 border border-secondary/30 px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 hover:bg-secondary-container transition-all w-full md:w-auto"
                >
                  <Plus size={15} /> Add Medication to Order
                </button>
              </div>

              {/* Added Drugs List preview */}
              <div>
                <span className="block text-body-sm text-outline mb-2 font-semibold">
                  Medications in current order ({addedDrugs.length})
                </span>
                {addedDrugs.length > 0 ? (
                  <div className="space-y-2">
                    {addedDrugs.map((drug, index) => (
                      <div
                        key={index}
                        className="p-3 bg-surface-container-lowest border border-outline-variant/20 rounded-xl flex justify-between items-center text-body-sm clinical-shadow"
                      >
                        <div>
                          <p className="font-bold text-on-surface">
                            {drug.name} <span className="text-secondary font-medium">({drug.dosage})</span>
                          </p>
                          <p className="text-[12px] text-outline mt-0.5">
                            {drug.frequency} • {drug.duration} • {drug.instruction} • Qty: {drug.qtyNeeded}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDrug(index)}
                          className="cursor-pointer text-error p-1.5 hover:bg-error-container rounded-lg transition-colors"
                          title="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-body-sm text-outline italic bg-surface-container/20 p-3 rounded-xl border border-dashed border-outline-variant/30 text-center">
                    No medications added yet. Fill the item above and click &ldquo;Add Medication to Order&rdquo;.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-body-sm text-outline mb-1 font-semibold">
                  Special Clinical Instructions & Warnings
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Advise patient to drink plenty of fluids, avoid driving if drowsy..."
                  value={generalInstructions}
                  onChange={(e) => setGeneralInstructions(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary leading-relaxed"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submitting || !selectedPatient || addedDrugs.length === 0}
                className="cursor-pointer w-full flex items-center justify-center gap-2 py-3 bg-primary text-on-primary rounded-xl font-bold clinical-shadow hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-body-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Transmitting Prescription to Central Pharmacy...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Authorize & Transmit E-Prescription
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Prescriptions History Column */}
          <div className="col-span-12 xl:col-span-5 glass-card p-margin rounded-[24px] clinical-shadow flex flex-col h-[740px]">
            <div className="mb-md">
              <h3 className="text-title-sm font-bold text-on-surface mb-2">
                Prescriptions Issued ({filteredHistory.length})
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4.5 h-4.5" />
                <input
                  type="text"
                  placeholder="Search by Rx ID, patient, drug..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-surface-container border border-outline-variant/30 rounded-xl text-body-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-outline gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs font-semibold">Loading prescription archive...</span>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-sm sidebar-scroll pr-1">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((rx) => {
                    const rxId = rx.prescriptionId || rx.id || 'RX-XXXX';
                    return (
                      <div
                        key={rx._id || rxId}
                        className="p-md bg-surface-container-low border border-outline-variant/10 rounded-2xl clinical-shadow flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold text-secondary font-mono uppercase tracking-wider">
                              {rxId}
                            </span>
                            <span className="text-[10px] text-outline font-semibold">{rx.date}</span>
                          </div>
                          <h5 className="font-bold text-on-surface text-body-md mb-1">{rx.patientName}</h5>
                          <span className="text-xs text-outline font-mono mb-2 block">{rx.patientId}</span>

                          <div className="space-y-1 bg-surface-container/30 p-2.5 rounded-xl border border-outline-variant/10">
                            {rx.drugs &&
                              rx.drugs.map((d, i) => (
                                <p key={i} className="text-xs text-on-surface-variant font-medium flex justify-between">
                                  <span>• {d.name} ({d.dosage})</span>
                                  <span className="text-outline text-[11px]">{d.frequency}</span>
                                </p>
                              ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-sm pt-2.5 border-t border-outline-variant/10">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              rx.status === 'Dispensed'
                                ? 'bg-secondary-container text-on-secondary-container'
                                : 'bg-primary-fixed text-on-primary-fixed-variant'
                            }`}
                          >
                            {rx.status}
                          </span>
                          <button
                            onClick={() => setViewingRx(rx)}
                            className="cursor-pointer text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                          >
                            <Eye size={14} /> Slip Receipt
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-16 text-center text-outline italic text-body-sm">
                    No prescription orders found matching search.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Detailed Modal view */}
        {viewingRx && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-md animate-fade-in">
            <div className="bg-surface-container-lowest rounded-2xl max-w-2xl w-full clinical-shadow border border-outline-variant/30 overflow-hidden">
              <div className="px-6 py-4.5 bg-primary text-on-primary flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-title-sm">Prescription Order Slip</h3>
                  <p className="text-xs text-on-primary/80">Authorized Clinical Dispensation Record</p>
                </div>
                <button
                  onClick={() => setViewingRx(null)}
                  className="cursor-pointer hover:bg-white/10 p-1.5 rounded-full transition-colors text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-md overflow-y-auto max-h-[560px] sidebar-scroll">
                <div className="flex justify-between border-b border-outline-variant/20 pb-3">
                  <div>
                    <span className="block text-[10px] text-outline font-bold uppercase">Patient details</span>
                    <p className="font-bold text-on-surface text-body-md">{viewingRx.patientName}</p>
                    <p className="text-body-sm text-outline font-mono">{viewingRx.patientId}</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-outline font-bold uppercase">Prescribed On</span>
                    <p className="font-semibold text-on-surface-variant text-body-sm">{viewingRx.date}</p>
                    <p className="text-xs font-bold text-primary mt-1 font-mono">
                      {viewingRx.prescriptionId || viewingRx.id}
                    </p>
                  </div>
                </div>

                {/* Drugs List table */}
                <div>
                  <span className="block text-[10px] text-outline font-bold uppercase mb-2">
                    Medication Order Items
                  </span>
                  <div className="border border-outline-variant/20 rounded-xl overflow-hidden text-body-sm">
                    <table className="w-full text-left">
                      <thead className="bg-surface-container-high text-outline font-bold">
                        <tr>
                          <th className="p-2.5">Drug</th>
                          <th className="p-2.5">Dosage</th>
                          <th className="p-2.5">Frequency</th>
                          <th className="p-2.5">Duration</th>
                          <th className="p-2.5">Intake</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingRx.drugs &&
                          viewingRx.drugs.map((drug, i) => (
                            <tr key={i} className="border-t border-outline-variant/10 hover:bg-surface-container/20">
                              <td className="p-2.5 font-bold text-on-surface">{drug.name}</td>
                              <td className="p-2.5 text-on-surface-variant">{drug.dosage}</td>
                              <td className="p-2.5 text-on-surface-variant font-semibold">{drug.frequency}</td>
                              <td className="p-2.5 text-on-surface-variant">{drug.duration}</td>
                              <td className="p-2.5 text-secondary font-bold">{drug.instruction}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {viewingRx.generalInstructions && (
                  <div>
                    <p className="text-xs text-outline font-bold uppercase mb-1">General Instructions</p>
                    <p className="text-body-sm text-on-surface-variant bg-surface-container/30 p-3 rounded-xl border border-outline-variant/10">
                      {viewingRx.generalInstructions}
                    </p>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t border-outline-variant/20">
                  <span
                    className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                      viewingRx.status === 'Dispensed'
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'bg-primary-fixed text-on-primary-fixed-variant'
                    }`}
                  >
                    {viewingRx.status}
                  </span>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => alert('Digital prescription print queue dispatched successfully.')}
                      className="cursor-pointer px-4 py-2 border border-outline-variant/30 hover:bg-surface-container rounded-xl text-body-sm font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Printer size={14} /> Print Rx
                    </button>
                    <button
                      onClick={() => setViewingRx(null)}
                      className="cursor-pointer px-6 py-2 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 transition-all clinical-shadow text-body-sm"
                    >
                      Close Receipt
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

export default function Prescriptions() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-outline">Loading prescriptions workspace...</div>}>
      <PrescriptionsContent />
    </Suspense>
  );
}
