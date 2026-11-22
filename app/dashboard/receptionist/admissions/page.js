"use client";

import { useState, useEffect, useMemo } from 'react';
import { Search, Bed, Plus, Check, DoorOpen, AlertCircle, Loader2, Filter, UserCheck, ShieldAlert, ArrowRightLeft, X, Wrench, Printer } from 'lucide-react';
import Sidebar from '@/components/Receptionist_Sidebar';
import Footer from '@/components/Footer';
import ConfirmationModal from '@/components/ConfirmationModal';
import PatientDossierPrintModal from '@/components/PatientDossierPrintModal';

export default function ReceptionistAdmissions() {
  const [admissions, setAdmissions] = useState([]);
  const [equipmentBeds, setEquipmentBeds] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dischargingId, setDischargingId] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'Admitted' | 'Discharged'
  const [wardFilter, setWardFilter] = useState('ALL');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedWard, setSelectedWard] = useState('General Ward A');
  const [bedNumber, setBedNumber] = useState('A-101');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [admittingDiagnosis, setAdmittingDiagnosis] = useState('');

  // Bed Transfer Modal State
  const [transferringAdmission, setTransferringAdmission] = useState(null);
  const [transferWard, setTransferWard] = useState('General Ward A');
  const [transferBed, setTransferBed] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);

  // Destructive Discharge Confirmation State (RM-FE-UX-001)
  const [dischargeModalData, setDischargeModalData] = useState(null);
  const [dossierPatientId, setDossierPatientId] = useState(null);

  // Global Escape-key listener to close modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (transferringAdmission && !transferSubmitting) {
          setTransferringAdmission(null);
        }
        if (dischargeModalData && !dischargingId) {
          setDischargeModalData(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [transferringAdmission, transferSubmitting, dischargeModalData, dischargingId]);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function loadAdmissionsData() {
      try {
        const [admRes, patRes, docRes] = await Promise.all([
          fetch('/api/admissions', { cache: 'no-store' }),
          fetch('/api/patients?limit=200', { cache: 'no-store' }),
          fetch('/api/doctors', { cache: 'no-store' }),
        ]);

        const admData = await admRes.json();
        const patData = await patRes.json();
        const docData = await docRes.json();

        if (!ignore) {
          if (admData.success) {
            setAdmissions(admData.admissions || []);
            if (admData.beds) {
              setEquipmentBeds(admData.beds);
              // Ensure selectedWard defaults to an active ward with beds
              const bedWards = Array.from(new Set(admData.beds.map((b) => b.department).filter(Boolean)));
              if (bedWards.length > 0) {
                setSelectedWard((prev) => (bedWards.includes(prev) ? prev : bedWards[0]));
              }
            }
          }
          if (patData.success) {
            setPatients(patData.patients || []);
          }
          const doctorList = docData.doctors || docData.staff || [];
          if (docData.success && doctorList.length > 0) {
            setDoctors(doctorList);
            if (!selectedDoctor) {
              const first = doctorList[0];
              const docName = first.name.startsWith('Dr.') ? first.name : `Dr. ${first.name}`;
              setSelectedDoctor(`${docName} (${first.department || first.specialization || 'Medicine'})`);
            }
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error('Error fetching admissions data:', err);
          setErrorMsg('Failed to load admissions from hospital server.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadAdmissionsData();
    return () => {
      ignore = true;
    };
  }, [refreshKey, selectedDoctor]);

  // Group backend equipment beds by department / ward
  const wardBedsMap = useMemo(() => {
    const map = {};
    for (const b of equipmentBeds) {
      if (!b.department || !b.bedNumber) continue;
      const ward = b.department;
      if (!map[ward]) map[ward] = [];
      map[ward].push(b);
    }
    for (const w of Object.keys(map)) {
      map[w].sort((a, b) => a.bedNumber.localeCompare(b.bedNumber, undefined, { numeric: true }));
    }
    return map;
  }, [equipmentBeds]);

  // Dynamically resolve available wards from live registered beds
  const availableWards = useMemo(() => {
    const list = Object.keys(wardBedsMap);
    if (list.length === 0) {
      return ['General Ward A', 'General Ward B', 'ICU', 'Maternity Ward', 'Pediatrics Ward'];
    }
    const priority = ['General Ward A', 'General Ward B', 'ICU', 'Maternity Ward', 'Pediatrics Ward'];
    return list.sort((a, b) => {
      const idxA = priority.indexOf(a);
      const idxB = priority.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [wardBedsMap]);

  // Map equipment fleet bed assets by bedNumber
  const bedAssetMap = useMemo(() => {
    const map = {};
    for (const b of equipmentBeds) {
      if (b.bedNumber) {
        map[b.bedNumber.trim().toUpperCase()] = b;
      }
    }
    return map;
  }, [equipmentBeds]);

  // Compute currently occupied beds in the selected ward
  const occupiedBedsInWard = useMemo(() => {
    const occupied = {};
    admissions
      .filter((a) => {
        if (a.status !== 'Admitted') return false;
        const admW = (a.ward || '').toLowerCase().trim();
        const selW = (selectedWard || '').toLowerCase().trim();
        return admW === selW || admW.includes(selW) || selW.includes(admW);
      })
      .forEach((a) => {
        const bedKey = (a.bedNumber || '').trim().toUpperCase();
        occupied[bedKey] = {
          patientName: a.patientName,
          patientId: a.patientId,
          admissionDate: a.admissionDate,
        };
      });
    return occupied;
  }, [admissions, selectedWard]);

  // Dynamically resolve active beds strictly from backend registered equipment bed fleet
  const activeWardBeds = useMemo(() => {
    const bedsInWard = wardBedsMap[selectedWard] || [];
    return bedsInWard.map((b) => b.bedNumber.trim().toUpperCase());
  }, [wardBedsMap, selectedWard]);

  const handleWardChange = (newWard) => {
    setSelectedWard(newWard);
    const beds = wardBedsMap[newWard] || [];
    const bedIds = beds.map((b) => b.bedNumber.trim().toUpperCase());

    const occupied = {};
    admissions
      .filter((a) => {
        if (a.status !== 'Admitted') return false;
        const admW = (a.ward || '').toLowerCase().trim();
        const targetW = (newWard || '').toLowerCase().trim();
        return admW === targetW || admW.includes(targetW) || targetW.includes(admW);
      })
      .forEach((a) => {
        if (a.bedNumber) occupied[a.bedNumber.trim().toUpperCase()] = true;
      });

    const firstAvailable = bedIds.find((b) => {
      const isOcc = occupied[b];
      const asset = bedAssetMap[b];
      const isMaint = asset && ['Under Maintenance', 'Needs Inspection', 'Decommissioned'].includes(asset.status);
      return !isOcc && !isMaint;
    });
    setBedNumber(firstAvailable || '');
  };

  const handleAdmitPatient = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedPatientId || !selectedWard || !bedNumber || !selectedDoctor) {
      setErrorMsg('Please select Patient, Ward, Bed, and Attending Doctor.');
      return;
    }

    // Verify bed is not occupied
    if (occupiedBedsInWard[bedNumber.trim().toUpperCase()]) {
      setErrorMsg(`Bed ${bedNumber} in ${selectedWard} is already occupied. Please select an available green bed.`);
      return;
    }

    // Verify bed is not under biomedical maintenance or decommissioned
    const chosenAsset = bedAssetMap[bedNumber.trim().toUpperCase()];
    if (chosenAsset && ['Under Maintenance', 'Needs Inspection', 'Decommissioned'].includes(chosenAsset.status)) {
      setErrorMsg(`Bed ${bedNumber} in ${selectedWard} is currently marked as "${chosenAsset.status}" for servicing. Please select an operational vacant bed.`);
      return;
    }

    const patient = patients.find((p) => p.patientId === selectedPatientId || p._id === selectedPatientId);

    setSubmitting(true);
    try {
      const res = await fetch('/api/admissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient ? patient.patientId : selectedPatientId,
          patientName: patient ? patient.name : 'Patient',
          ward: selectedWard,
          bedNumber: bedNumber.trim().toUpperCase(),
          doctorName: selectedDoctor,
          admittingDiagnosis: admittingDiagnosis || 'Observational Triage',
        }),
      });

      const data = await res.json();
      setSubmitting(false);

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to process admission');
      } else {
        setSuccessMsg(
          `Patient ${patient ? patient.name : ''} successfully admitted to ${selectedWard} (Bed ${bedNumber})! ID: ${data.admission?.admissionId}`
        );
        setSelectedPatientId('');
        setAdmittingDiagnosis('');
        setRefreshKey((k) => k + 1);

        setTimeout(() => setSuccessMsg(''), 4500);
      }
    } catch (err) {
      setSubmitting(false);
      setErrorMsg('Network error while processing patient admission.');
    }
  };

  const handleDischargePatient = async (admission) => {
    let unpaidInvoices = [];
    let totalUnpaid = 0;
    const admissionId = admission.admissionId;
    const patientId = admission.patientId;

    try {
      if (patientId) {
        const res = await fetch(`/api/billing/pending-charges?patientId=${encodeURIComponent(patientId)}`);
        const data = await res.json();
        if (data.success && data.totals) {
          totalUnpaid = data.totals.grandTotal || 0;
          const itemsCount = 
            (data.charges.prescriptions?.length || 0) +
            (data.charges.labOrders?.length || 0) +
            (data.charges.appointments?.length || 0) +
            (data.charges.admission ? 1 : 0);
          unpaidInvoices = new Array(itemsCount).fill({});
        }
      }
    } catch {
      // Non-blocking pre-check
    }

    setDischargeModalData({
      admissionId,
      patientId,
      patientName: admission.patientName || 'Patient',
      ward: admission.ward,
      bedNumber: admission.bedNumber,
      unpaidCount: unpaidInvoices.length,
      totalUnpaid,
    });
  };

  const executeDischarge = async () => {
    if (!dischargeModalData) return;
    const { admissionId } = dischargeModalData;

    setDischargingId(admissionId);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/admissions/${admissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Discharged',
          dischargeSummary: 'Routine discharge processed by receptionist desk.',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to discharge patient');
        return;
      }

      setSuccessMsg(data.message || 'Patient discharged successfully. Bed released into vacancy pool.');
      setDischargeModalData(null);
      setRefreshKey((k) => k + 1);

      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error discharging patient:', err);
      setErrorMsg('Network error while discharging patient.');
    } finally {
      setDischargingId(null);
    }
  };

  // Compute available beds for target transfer ward dynamically from backend fleet
  const transferWardBeds = useMemo(() => {
    const beds = wardBedsMap[transferWard] || [];
    const list = beds.map((b) => b.bedNumber.trim().toUpperCase());

    const occupied = {};
    admissions
      .filter((a) => {
        if (a.status !== 'Admitted') return false;
        const admW = (a.ward || '').toLowerCase().trim();
        const trW = (transferWard || '').toLowerCase().trim();
        const wardMatches = admW === trW || admW.includes(trW) || trW.includes(admW);
        return wardMatches && a.admissionId !== transferringAdmission?.admissionId;
      })
      .forEach((a) => {
        if (a.bedNumber) occupied[a.bedNumber.trim().toUpperCase()] = true;
      });

    return list.map((b) => {
      const asset = bedAssetMap[b];
      const isMaint = asset && ['Under Maintenance', 'Needs Inspection', 'Decommissioned'].includes(asset.status);
      return {
        bedId: b,
        isOccupied: Boolean(occupied[b]),
        isMaintenance: isMaint,
        maintenanceStatus: asset?.status,
        condition: asset?.condition,
      };
    });
  }, [admissions, transferWard, transferringAdmission, wardBedsMap, bedAssetMap]);

  const openTransferModal = (adm) => {
    setTransferringAdmission(adm);
    const ward = adm.ward || availableWards[0] || 'General Ward A';
    setTransferWard(ward);
    const beds = wardBedsMap[ward] || [];
    const list = beds.map((b) => b.bedNumber.trim().toUpperCase());

    const occupied = {};
    admissions
      .filter((a) => {
        if (a.status !== 'Admitted') return false;
        const admW = (a.ward || '').toLowerCase().trim();
        const targetW = (ward || '').toLowerCase().trim();
        return (admW === targetW || admW.includes(targetW) || targetW.includes(admW)) && a.admissionId !== adm.admissionId;
      })
      .forEach((a) => {
        if (a.bedNumber) occupied[a.bedNumber.trim().toUpperCase()] = true;
      });

    const firstVacant = list.find((b) => {
      const isOcc = occupied[b];
      const asset = bedAssetMap[b];
      const isMaint = asset && ['Under Maintenance', 'Needs Inspection', 'Decommissioned'].includes(asset.status);
      return !isOcc && !isMaint && b !== adm.bedNumber;
    });
    setTransferBed(firstVacant || '');
    setTransferReason('Clinical acuity change / patient request');
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!transferringAdmission || !transferWard || !transferBed) {
      setErrorMsg('Please select target Ward and vacant Bed for transfer.');
      return;
    }
    if (transferWard === transferringAdmission.ward && transferBed === transferringAdmission.bedNumber) {
      setErrorMsg('Target bed is identical to current bed. Please select a different bed.');
      return;
    }

    const targetAsset = bedAssetMap[transferBed.trim().toUpperCase()];
    if (targetAsset && ['Under Maintenance', 'Needs Inspection', 'Decommissioned'].includes(targetAsset.status)) {
      setErrorMsg(`Target Bed ${transferBed} is currently marked as "${targetAsset.status}" for servicing. Please select an operational vacant bed.`);
      return;
    }

    setTransferSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/admissions/${transferringAdmission.admissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ward: transferWard,
          bedNumber: transferBed,
          transferReason: transferReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete bed transfer');
      }

      setSuccessMsg(`Patient ${transferringAdmission.patientName} successfully transferred to ${transferWard} (Bed ${transferBed})!`);
      setTransferringAdmission(null);
      setRefreshKey((k) => k + 1);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Error executing bed transfer');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setTransferSubmitting(false);
    }
  };

  const filteredAdmissions = useMemo(() => {
    return admissions.filter((adm) => {
      const name = adm.patientName || '';
      const id = adm.admissionId || '';
      const pId = adm.patientId || '';
      const ward = adm.ward || '';
      const doc = adm.doctorName || '';
      const bed = adm.bedNumber || '';
      const q = searchQuery.toLowerCase();

      const matchesSearch =
        name.toLowerCase().includes(q) ||
        id.toLowerCase().includes(q) ||
        pId.toLowerCase().includes(q) ||
        ward.toLowerCase().includes(q) ||
        doc.toLowerCase().includes(q) ||
        bed.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'ALL' || adm.status === statusFilter;

      const matchesWard =
        wardFilter === 'ALL' || adm.ward === wardFilter;

      return matchesSearch && matchesStatus && matchesWard;
    });
  }, [admissions, searchQuery, statusFilter, wardFilter]);

  const activeAdmitted = admissions.filter((a) => a.status === 'Admitted');
  const operationalFleetBeds = equipmentBeds.filter((b) => b.status !== 'Decommissioned');
  const totalBedsHospital = operationalFleetBeds.length > 0 ? operationalFleetBeds.length : 44;
  const totalOccupied = activeAdmitted.length;
  const availableBeds = Math.max(0, totalBedsHospital - totalOccupied);
  const occupancyPercentage = Math.round((totalOccupied / totalBedsHospital) * 100);

  const icuOccupied = activeAdmitted.filter((a) => (a.ward || '').toUpperCase().includes('ICU')).length;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background p-margin no-scrollbar">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-lg">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
              IPD Admissions & Ward Management
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              Interactive visual bed occupancy matrix, inpatient intake, and hospital discharge tracking.
            </p>
          </div>
        </header>

        {errorMsg && (
          <div className="mb-lg p-md rounded-2xl bg-error-container text-on-error-container flex items-center gap-2 clinical-shadow font-semibold text-body-sm animate-fade-in border border-error/20">
            <AlertCircle className="w-5 h-5 text-error shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-lg p-md rounded-2xl bg-secondary-container text-on-secondary-container flex items-center gap-2 clinical-shadow font-semibold text-body-sm animate-fade-in border border-secondary/20">
            <Check className="w-5 h-5 text-secondary shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Ward Bed Capacities Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-lg text-body-sm">
          <div className="glass-card p-md rounded-2xl clinical-shadow border-l-4 border-primary">
            <div className="flex justify-between items-center mb-1">
              <span className="text-outline text-xs font-bold uppercase tracking-wider">Hospital Occupancy</span>
              <span className="font-mono text-primary font-bold text-xs">{occupancyPercentage}% Occupied</span>
            </div>
            <h3 className="font-bold text-headline-md text-on-surface">
              {totalOccupied} <span className="text-outline text-title-sm font-normal">/ {totalBedsHospital} Beds</span>
            </h3>
            <p className="text-xs text-secondary font-semibold mt-1 flex items-center gap-1">
              <Bed size={13} /> {availableBeds} Vacant beds ready for intake
            </p>
          </div>

          <div className="glass-card p-md rounded-2xl clinical-shadow border-l-4 border-error">
            <div className="flex justify-between items-center mb-1">
              <span className="text-outline text-xs font-bold uppercase tracking-wider">ICU Status</span>
              <span className="font-mono text-error font-bold text-xs">{icuOccupied} / 6 Occupied</span>
            </div>
            <h3 className="font-bold text-headline-md text-on-surface">
              {icuOccupied >= 6 ? 'FULL' : `${6 - icuOccupied} Available`}
            </h3>
            <p className="text-xs text-outline font-medium mt-1">
              {icuOccupied >= 5 ? 'High Critical Alert — Near Capacity' : 'Intensive care capacity nominal'}
            </p>
          </div>

          <div className="glass-card p-md rounded-2xl clinical-shadow border-l-4 border-secondary">
            <div className="flex justify-between items-center mb-1">
              <span className="text-outline text-xs font-bold uppercase tracking-wider">Active Inpatients</span>
              <span className="font-mono text-secondary font-bold text-xs">{activeAdmitted.length} Patients</span>
            </div>
            <h3 className="font-bold text-headline-md text-on-surface">{activeAdmitted.length} Admitted</h3>
            <p className="text-xs text-outline font-medium mt-1">Under continuous clinical observation</p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-gutter mb-lg">
          {/* Inpatient Admission Form & Visual Bed Matrix */}
          <div className="col-span-12 xl:col-span-5 glass-card p-margin rounded-[24px] clinical-shadow space-y-md">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <h3 className="text-title-sm font-bold text-on-surface flex items-center gap-2">
                <Plus className="text-primary" /> Inpatient Admission
              </h3>
              <span className="text-[11px] font-bold text-primary bg-primary-fixed px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Direct Intake
              </span>
            </div>

            <form onSubmit={handleAdmitPatient} className="space-y-md">
              <div>
                <label className="block text-body-sm text-outline mb-1 font-semibold">Registered Patient *</label>
                <select
                  required
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary cursor-pointer font-medium"
                >
                  <option value="">Select Patient from Registry...</option>
                  {patients.map((p) => (
                    <option key={p._id || p.patientId} value={p.patientId}>
                      {p.name} ({p.patientId}) {p.cnic ? `• ${p.cnic}` : ''} {p.status === 'Inpatient' ? '• [Already Inpatient]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ward Selection */}
              <div>
                <label className="block text-body-sm text-outline mb-1 font-semibold">Target Ward *</label>
                <select
                  value={selectedWard}
                  onChange={(e) => handleWardChange(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary font-bold cursor-pointer"
                >
                  {availableWards.map((w) => {
                    const beds = wardBedsMap[w] || [];
                    const total = beds.length;
                    const occ = admissions.filter((a) => {
                      if (a.status !== 'Admitted') return false;
                      const aW = (a.ward || '').toLowerCase().trim();
                      const thisW = w.toLowerCase().trim();
                      return aW === thisW || aW.includes(thisW) || thisW.includes(aW);
                    }).length;
                    const vacant = Math.max(0, total - occ);
                    return (
                      <option key={w} value={w}>
                        {w} ({total} Beds • {vacant} Vacant)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Interactive Visual Ward Bed Matrix */}
              <div className="p-3.5 bg-surface-container/30 border border-outline-variant/20 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                    <Bed size={15} className="text-primary" /> Visual Bed Matrix ({selectedWard})
                  </span>
                  <span className="text-[11px] font-mono font-bold text-primary">
                    Selected: {bedNumber || 'None'}
                  </span>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-outline py-1 border-b border-outline-variant/10">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Available
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Occupied
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Maintenance
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" /> Selected
                  </span>
                </div>

                {/* Bed Grid */}
                {activeWardBeds.length === 0 ? (
                  <div className="p-4 text-center text-outline text-xs bg-surface-container/20 rounded-xl">
                    No registered hospital beds found in {selectedWard}. Register beds in the Admin Equipment Fleet.
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 pt-1">
                  {activeWardBeds.map((bedId) => {
                    const occ = occupiedBedsInWard[bedId];
                    const isOccupied = !!occ;
                    const asset = bedAssetMap[bedId];
                    const isMaintenance = asset && ['Under Maintenance', 'Needs Inspection', 'Decommissioned'].includes(asset.status);
                    const isSelected = bedNumber === bedId;
                    const disabled = isOccupied || isMaintenance;

                    return (
                      <button
                        key={bedId}
                        type="button"
                        disabled={disabled}
                        onClick={() => setBedNumber(bedId)}
                        title={
                          isMaintenance
                            ? `Bed ${bedId} [${asset?.assetId || 'ASSET'}]: marked as ${asset?.status || 'Maintenance'} (${asset?.condition || 'Biomedical Service Required'})`
                            : isOccupied
                            ? `Occupied by: ${occ.patientName} (${occ.patientId}) since ${new Date(occ.admissionDate).toLocaleDateString()}`
                            : `Bed ${bedId} [${asset?.assetId || 'Live Fleet'}]: Operational & Vacant - Click to Select`
                        }
                        className={`cursor-pointer p-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all border ${
                          isSelected
                            ? 'bg-primary border-primary text-white ring-2 ring-primary/40 shadow-sm scale-105'
                            : isMaintenance
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400 opacity-80 cursor-not-allowed'
                            : isOccupied
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400 opacity-60 cursor-not-allowed'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                      >
                        {isMaintenance ? (
                          <Wrench size={13} className="mb-0.5 text-amber-600" />
                        ) : (
                          <Bed size={14} className="mb-0.5" />
                        )}
                        <span className="font-mono text-[11px]">{bedId}</span>
                        <span className="text-[9px] font-normal uppercase">
                          {isSelected ? 'Picked' : isMaintenance ? 'Maint' : isOccupied ? 'Occupied' : 'Vacant'}
                        </span>
                      </button>
                    );
                  })}
                </div>
                )}
              </div>

              {/* Attending Doctor */}
              <div>
                <label className="block text-body-sm text-outline mb-1 font-semibold">Attending Doctor *</label>
                <select
                  required
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="">Select Attending Physician...</option>
                  {doctors.map((d) => {
                    const formatted = d.name.startsWith('Dr.') ? d.name : `Dr. ${d.name}`;
                    const label = `${formatted} (${d.department || d.specialization || 'Clinical'})`;
                    return (
                      <option key={d._id || d.name} value={label}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-body-sm text-outline mb-1 font-semibold">
                  Admitting Diagnosis / Triage Reason
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Acute exacerbation of COPD, post-operative observation, severe dehydration..."
                  value={admittingDiagnosis}
                  onChange={(e) => setAdmittingDiagnosis(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="cursor-pointer w-full flex items-center justify-center gap-2 py-3 bg-primary text-on-primary rounded-xl font-bold clinical-shadow hover:opacity-90 disabled:opacity-50 transition-all text-body-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Admitting Patient...
                  </>
                ) : (
                  <>
                    <Plus size={18} /> Confirm IPD Admission (Bed {bedNumber})
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Admissions Ledger Column */}
          <div className="col-span-12 xl:col-span-7 glass-card p-margin rounded-[24px] clinical-shadow flex flex-col h-[740px]">
            {/* Header and Filter Controls */}
            <div className="space-y-3 mb-md">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="text-title-sm font-bold text-on-surface">Inpatient Admission Records</h3>
                  <p className="text-xs text-outline">{filteredAdmissions.length} admissions found</p>
                </div>

                {/* Status Switcher Tabs */}
                <div className="flex bg-surface-container rounded-xl p-1 text-xs font-bold">
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    className={`cursor-pointer px-3 py-1.5 rounded-lg transition-all ${
                      statusFilter === 'ALL'
                        ? 'bg-white text-primary clinical-shadow'
                        : 'text-outline hover:text-on-surface'
                    }`}
                  >
                    All ({admissions.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('Admitted')}
                    className={`cursor-pointer px-3 py-1.5 rounded-lg transition-all ${
                      statusFilter === 'Admitted'
                        ? 'bg-white text-secondary clinical-shadow'
                        : 'text-outline hover:text-on-surface'
                    }`}
                  >
                    Active ({activeAdmitted.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('Discharged')}
                    className={`cursor-pointer px-3 py-1.5 rounded-lg transition-all ${
                      statusFilter === 'Discharged'
                        ? 'bg-white text-outline clinical-shadow'
                        : 'text-outline hover:text-on-surface'
                    }`}
                  >
                    Discharged ({admissions.filter((a) => a.status === 'Discharged').length})
                  </button>
                </div>
              </div>

              {/* Search & Ward Filter Pills */}
              <div className="flex flex-col md:flex-row gap-2 items-center justify-between">
                {/* Ward Pills */}
                <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
                  {['ALL', ...availableWards].map((w) => (
                    <button
                      key={w}
                      onClick={() => setWardFilter(w)}
                      className={`cursor-pointer px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                        wardFilter === w
                          ? 'bg-primary border-primary text-white shadow-xs'
                          : 'bg-white border-outline-variant/30 text-outline hover:text-primary'
                      }`}
                    >
                      {w === 'ALL' ? 'All Wards' : w.replace(' Ward', '')}
                    </button>
                  ))}
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search name, bed, diagnosis..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-surface-container border border-outline-variant/30 rounded-xl text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Admission Cards List */}
            <div className="flex-1 overflow-y-auto space-y-sm sidebar-scroll pr-1">
              {loading ? (
                <div className="py-24 text-center text-outline flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-xs font-semibold">Loading inpatient records...</p>
                </div>
              ) : filteredAdmissions.length > 0 ? (
                filteredAdmissions.map((adm) => {
                  const isAdmitted = adm.status === 'Admitted';

                  return (
                    <div
                      key={adm.admissionId || adm._id}
                      className="p-md bg-surface-container-low border border-outline-variant/10 rounded-2xl clinical-shadow flex flex-col justify-between space-y-2"
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold text-secondary font-mono uppercase bg-secondary-container px-2 py-0.5 rounded-md">
                              {adm.admissionId}
                            </span>
                            <span className="text-xs font-mono font-bold text-outline ml-2">
                              {adm.patientId}
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                              isAdmitted
                                ? 'bg-secondary text-on-secondary'
                                : 'bg-surface-container-high text-outline'
                            }`}
                          >
                            {adm.status}
                          </span>
                        </div>

                        <div className="flex justify-between items-baseline mt-2">
                          <h4 className="font-bold text-on-surface text-body-md">{adm.patientName}</h4>
                          <span className="text-xs font-bold text-primary bg-primary-fixed px-2.5 py-0.5 rounded-lg font-mono">
                            {adm.ward} — Bed {adm.bedNumber}
                          </span>
                        </div>

                        <p className="text-xs text-on-surface-variant font-medium mt-1">
                          Admitting Diagnosis: <strong className="text-on-surface">{adm.admittingDiagnosis}</strong>
                        </p>
                        <p className="text-[11px] text-outline mt-0.5">
                          Attending: {adm.doctorName}
                        </p>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-outline-variant/10 text-xs">
                        <span className="text-outline">
                          Admitted: <strong className="text-on-surface">{adm.admissionDate}</strong>
                          {adm.dischargeDate && (
                            <>
                              {' • '}Discharged: <strong className="text-on-surface">{adm.dischargeDate}</strong>
                            </>
                          )}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDossierPatientId(adm.patientId)}
                            className="cursor-pointer text-xs font-semibold text-slate-700 hover:bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1 transition-all"
                            title="Print Clinical Dossier & Clearance"
                          >
                            <Printer size={13} /> Dossier
                          </button>
                          {isAdmitted && (
                            <>
                              <button
                                type="button"
                                onClick={() => openTransferModal(adm)}
                                className="cursor-pointer text-xs font-semibold text-primary hover:bg-primary-fixed/30 px-3 py-1.5 rounded-xl border border-primary/20 flex items-center gap-1 transition-all"
                                title="Transfer to different bed or ward"
                              >
                                <ArrowRightLeft size={13} /> Transfer Bed
                              </button>
                              <button
                                type="button"
                                disabled={dischargingId === adm.admissionId}
                                onClick={() => handleDischargePatient(adm)}
                                className="cursor-pointer text-xs font-bold text-error hover:bg-error-container/20 px-3 py-1.5 rounded-xl border border-error/20 flex items-center gap-1 transition-all"
                              >
                                {dischargingId === adm.admissionId ? (
                                  <>
                                    <Loader2 size={13} className="animate-spin" /> Discharging...
                                  </>
                                ) : (
                                  <>
                                    <DoorOpen size={14} /> Process Discharge
                                  </>
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-20 text-center text-outline">
                  <Bed className="mx-auto w-12 h-12 text-outline-variant mb-2" />
                  <p className="font-semibold text-body-sm">No admission records found matching filters.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Inpatient Bed Transfer Modal */}
        {transferringAdmission && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="transfer-modal-title"
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in"
          >
            <div className="bg-surface-container-lowest rounded-2xl max-w-240 w-full border border-outline-variant/20 shadow-2xl overflow-hidden flex flex-col">
              <div className="p-5 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container/30">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-primary" />
                  <div>
                    <h3 id="transfer-modal-title" className="font-bold text-on-surface text-base">Inpatient Bed Transfer</h3>
                    <p className="text-[11px] text-outline font-mono">Admission ID: {transferringAdmission.admissionId}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTransferringAdmission(null)}
                  className="p-1 rounded-lg hover:bg-surface-container text-outline hover:text-on-surface transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleTransferSubmit} className="p-5 space-y-4 text-xs">
                {/* Current Bed Placement Summary */}
                <div className="bg-surface-container/40 p-3 rounded-xl border border-outline-variant/10 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-on-surface text-sm">{transferringAdmission.patientName}</p>
                    <p className="text-[11px] text-outline">Patient ID: {transferringAdmission.patientId}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-outline uppercase font-mono block">Current Placement</span>
                    <span className="font-bold text-primary">{transferringAdmission.ward} — Bed {transferringAdmission.bedNumber}</span>
                  </div>
                </div>

                {/* Target Ward Selection */}
                <div>
                  <label className="block text-outline font-semibold mb-1">Target Hospital Ward</label>
                  <select
                    value={transferWard}
                    onChange={(e) => {
                      const newW = e.target.value;
                      setTransferWard(newW);
                      const beds = wardBedsMap[newW] || [];
                      const list = beds.map((b) => b.bedNumber.trim().toUpperCase());
                      const occupied = {};
                      admissions
                        .filter((a) => {
                          if (a.status !== 'Admitted') return false;
                          const aW = (a.ward || '').toLowerCase().trim();
                          const targetW = newW.toLowerCase().trim();
                          return (aW === targetW || aW.includes(targetW) || targetW.includes(aW)) && a.admissionId !== transferringAdmission?.admissionId;
                        })
                        .forEach((a) => {
                          if (a.bedNumber) occupied[a.bedNumber.trim().toUpperCase()] = true;
                        });
                      const firstVacant = list.find((b) => {
                        const isOcc = occupied[b];
                        const asset = bedAssetMap[b];
                        const isMaint = asset && ['Under Maintenance', 'Needs Inspection', 'Decommissioned'].includes(asset.status);
                        return !isOcc && !isMaint;
                      });
                      setTransferBed(firstVacant || '');
                    }}
                    className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {availableWards.map((w) => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>

                {/* Target Bed Picker Matrix */}
                <div>
                  <label className="block text-outline font-semibold mb-1.5">
                    Target Designated Bed <span className="text-primary font-bold">({transferBed || 'Select a vacant bed'})</span>
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {transferWardBeds.map(({ bedId, isOccupied, isMaintenance, maintenanceStatus }) => {
                      const isCurrent = transferWard === transferringAdmission.ward && bedId === transferringAdmission.bedNumber;
                      const isSelected = transferBed === bedId;
                      const disabled = isOccupied || isCurrent || isMaintenance;
                      return (
                        <button
                          key={bedId}
                          type="button"
                          disabled={disabled}
                          onClick={() => setTransferBed(bedId)}
                          title={
                            isMaintenance
                              ? `Bed ${bedId} is marked as ${maintenanceStatus} for servicing`
                              : isOccupied
                              ? `Bed ${bedId} is occupied`
                              : isCurrent
                              ? `Current bed`
                              : `Bed ${bedId} is vacant - Click to transfer`
                          }
                          className={`cursor-pointer p-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all border ${
                            isSelected
                              ? 'bg-primary text-on-primary border-primary shadow-sm scale-105'
                              : isCurrent
                              ? 'bg-surface-container text-outline border-outline-variant/30 opacity-50 cursor-not-allowed'
                              : isMaintenance
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/30 opacity-70 cursor-not-allowed'
                              : isOccupied
                              ? 'bg-rose-500/10 text-rose-500/60 border-rose-500/20 opacity-50 cursor-not-allowed'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {isMaintenance ? (
                            <Wrench size={12} className="mb-0.5 text-amber-600" />
                          ) : (
                            <Bed size={13} className="mb-0.5" />
                          )}
                          <span className="font-mono text-[10px]">{bedId}</span>
                          <span className="text-[8px] font-normal uppercase">
                            {isCurrent ? 'Current' : isSelected ? 'Picked' : isMaintenance ? 'Maint' : isOccupied ? 'Occupied' : 'Vacant'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Transfer Reason */}
                <div>
                  <label className="block text-outline font-semibold mb-1">Clinical Transfer Justification / Reason</label>
                  <input
                    type="text"
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    placeholder="e.g., Step down to General Ward, Escalation to ICU, Patient preference..."
                    className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-outline-variant/10 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setTransferringAdmission(null)}
                    className="cursor-pointer px-4 py-2 rounded-xl border border-outline-variant/30 text-outline hover:bg-surface-container font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={transferSubmitting || !transferBed || (transferWard === transferringAdmission.ward && transferBed === transferringAdmission.bedNumber)}
                    className="cursor-pointer px-4 py-2 rounded-xl bg-primary text-on-primary font-bold hover:opacity-90 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {transferSubmitting ? (
                      <>
                        <Loader2 size={13} className="animate-spin" /> Transferring...
                      </>
                    ) : (
                      <>
                        <ArrowRightLeft size={14} /> Confirm Transfer
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Destructive Inpatient Discharge Confirmation Modal */}
        <ConfirmationModal
          isOpen={Boolean(dischargeModalData)}
          title={`Confirm Inpatient Discharge: ${dischargeModalData?.patientName}`}
          description={`Are you sure you want to process discharge for admission record ${dischargeModalData?.admissionId}? This will officially release bed ${dischargeModalData?.bedNumber} in ${dischargeModalData?.ward} back into the available vacancy pool.`}
          confirmLabel="Confirm & Release Bed"
          cancelLabel="Keep Admitted"
          variant={dischargeModalData?.unpaidCount > 0 ? 'warning' : 'danger'}
          loading={Boolean(dischargingId)}
          alertNotice={
            dischargeModalData?.unpaidCount > 0 ? (
              <div>
                <p className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                  <ShieldAlert size={15} /> Financial Clearance Notice
                </p>
                <p className="mt-1">
                  This patient currently has <strong>{dischargeModalData.unpaidCount} unpaid billing item(s)</strong> totaling{' '}
                  <strong className="underline font-mono">PKR Rs. {dischargeModalData.totalUnpaid.toLocaleString()}</strong>.
                  Please verify payment clearance at the cashier desk prior to releasing this patient.
                </p>
                <div className="mt-2">
                  <a
                    href={`/dashboard/receptionist/billing`}
                    target="_blank"
                    className="text-xs font-bold text-primary underline hover:text-primary/80"
                  >
                    Open Cashier Desk in New Tab to Settle Charges →
                  </a>
                </div>
              </div>
            ) : null
          }
          onConfirm={executeDischarge}
          onClose={() => setDischargeModalData(null)}
        />

        {dossierPatientId && (
          <PatientDossierPrintModal
            isOpen={Boolean(dossierPatientId)}
            patientId={dossierPatientId}
            onClose={() => setDossierPatientId(null)}
            initialPreset="discharge_billing"
          />
        )}

        <Footer />
      </main>
    </div>
  );
}
