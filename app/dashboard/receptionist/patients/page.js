"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  UserPlus,
  Phone,
  User,
  Mail,
  MapPin,
  Heart,
  ShieldAlert,
  Check,
  X,
  Eye,
  Loader2,
  Sparkles,
  RotateCcw,
  Calendar,
  AlertCircle,
  Edit2,
  Printer,
} from 'lucide-react';
import Sidebar from '@/components/Receptionist_Sidebar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import PatientDossierPrintModal from '@/components/PatientDossierPrintModal';
import { matchesPhone, normalizePhoneForStorage } from '@/lib/phoneUtils';

const DEMO_PATIENTS = [
  {
    name: 'Muhammad Tariq Mehmood',
    age: 44,
    gender: 'Male',
    bloodGroup: 'B+',
    phone: '03008451290',
    cnic: '35201-1234567-3',
    email: 'tariq.mehmood@example.pk',
    address: 'House #42, Street 7, Model Town, Lahore',
    emergencyContact: 'Ayesha Tariq',
    emergencyPhone: '03219876543',
    allergies: 'Penicillin, Dust mite',
  },
  {
    name: 'Fatima Noor Zahra',
    age: 29,
    gender: 'Female',
    bloodGroup: 'O+',
    phone: '03335129844',
    cnic: '37405-7654321-2',
    email: 'fatima.zahra@example.pk',
    address: 'Sector F-8/2, Street 14, Islamabad',
    emergencyContact: 'Zahra Begum',
    emergencyPhone: '03014455667',
    allergies: 'Sulfa Drugs',
  },
  {
    name: 'Zubair Ahmed Qureshi',
    age: 52,
    gender: 'Male',
    bloodGroup: 'A+',
    phone: '03157766554',
    cnic: '42101-9988776-5',
    email: 'zubair.qureshi@example.pk',
    address: 'Block 4, Gulshan-e-Iqbal, Karachi',
    emergencyContact: 'Bilal Qureshi',
    emergencyPhone: '03452233445',
    allergies: 'Aspirin',
  },
];

export default function PatientRegistration() {
  const [patients, setPatients] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Mode: null = New Patient, string = Existing Patient ID being edited
  const [existingPatientId, setExistingPatientId] = useState(null);

  // Form Fields State
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [phone, setPhone] = useState('');
  const [cnic, setCnic] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [allergies, setAllergies] = useState('');

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [dossierPatientId, setDossierPatientId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [demoIndex, setDemoIndex] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function loadPatients() {
      try {
        const url = searchQuery ? `/api/patients?search=${encodeURIComponent(searchQuery)}` : '/api/patients?limit=200';
        const res = await fetch(url, { cache: 'no-store' });
        const data = await res.json();
        if (!ignore && data.success && data.patients) {
          setPatients(data.patients);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Error fetching patients:', err);
        }
      } finally {
        if (!ignore) {
          setLoadingList(false);
        }
      }
    }

    loadPatients();
    return () => {
      ignore = true;
    };
  }, [searchQuery, refreshKey]);

  // Real-time matching for CNIC or Phone to auto-suggest existing patients (supports 03xxxxx and 3xxxxx)
  const matchingPatients = useMemo(() => {
    const cleanCnic = cnic.replace(/\D/g, '');

    return patients.filter((p) => {
      // Don't suggest the patient that is already actively being edited
      if (existingPatientId && (p.patientId === existingPatientId || p._id === existingPatientId)) {
        return false;
      }
      const pCnicDigits = (p.cnic || '').replace(/\D/g, '');
      const emergencyContactPhone = typeof p.emergencyContact === 'object' ? p.emergencyContact?.phone : p.emergencyPhone;

      // Smart phone match: matches both 03xxxxx and 3xxxxx against patient and emergency contact phone
      const phoneMatch = matchesPhone(phone, p.phone) || matchesPhone(phone, emergencyContactPhone);
      const cnicMatch = cleanCnic.length >= 5 && pCnicDigits.includes(cleanCnic);

      return phoneMatch || cnicMatch;
    }).slice(0, 3); // top 3 matches
  }, [phone, cnic, patients, existingPatientId]);

  const handleAutofillPatient = (p) => {
    setExistingPatientId(p.patientId || p._id);
    setName(p.name || '');
    setAge(p.age ? String(p.age) : '');
    setGender(p.gender || 'Male');
    setBloodGroup(p.bloodGroup || 'Unknown');
    setPhone(p.phone || '');
    setCnic(p.cnic || '');
    setEmail(p.email || '');
    setAddress(p.address || '');
    setEmergencyContact(
      typeof p.emergencyContact === 'object' ? p.emergencyContact?.name || '' : p.emergencyContact || ''
    );
    setEmergencyPhone(
      typeof p.emergencyContact === 'object' ? p.emergencyContact?.phone || '' : p.emergencyPhone || ''
    );
    setAllergies(
      Array.isArray(p.allergies) ? p.allergies.join(', ') : p.allergies || ''
    );
    setErrorMsg('');
    setSuccessMsg(`Autofilled existing profile for ${p.name} (${p.patientId}).`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleClearForm = () => {
    setExistingPatientId(null);
    setName('');
    setAge('');
    setGender('Male');
    setBloodGroup('O+');
    setPhone('');
    setCnic('');
    setEmail('');
    setAddress('');
    setEmergencyContact('');
    setEmergencyPhone('');
    setAllergies('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleFillDemoData = () => {
    const demo = DEMO_PATIENTS[demoIndex % DEMO_PATIENTS.length];
    setDemoIndex((prev) => prev + 1);
    setExistingPatientId(null);
    setName(demo.name);
    setAge(String(demo.age));
    setGender(demo.gender);
    setBloodGroup(demo.bloodGroup);
    setPhone(demo.phone);
    setCnic(demo.cnic);
    setEmail(demo.email);
    setAddress(demo.address);
    setEmergencyContact(demo.emergencyContact);
    setEmergencyPhone(demo.emergencyPhone);
    setAllergies(demo.allergies);
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !age || !phone) {
      setErrorMsg('Please fill in required fields: Name, Age, Gender, and Phone');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        name: name.trim(),
        age: parseInt(age, 10),
        gender,
        bloodGroup,
        phone: normalizePhoneForStorage(phone),
        cnic: cnic ? cnic.trim() : '',
        email: email ? email.trim() : '',
        address: address ? address.trim() : '',
        emergencyContact: emergencyContact ? emergencyContact.trim() : '',
        emergencyPhone: emergencyPhone ? normalizePhoneForStorage(emergencyPhone) : '',
        allergies: allergies ? allergies.trim() : '',
      };

      let res;
      if (existingPatientId) {
        // Update existing patient
        res = await fetch(`/api/patients/${existingPatientId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Register brand new patient
        res = await fetch('/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      setSubmitting(false);

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to process patient record');
      } else {
        if (existingPatientId) {
          setSuccessMsg(`Patient profile for ${name} (${existingPatientId}) updated successfully!`);
        } else {
          setSuccessMsg(`New patient registered successfully! Assigned ID: ${data.patient?.patientId}`);
        }

        // Refresh patients directory
        setRefreshKey((k) => k + 1);
        handleClearForm();

        setTimeout(() => {
          setSuccessMsg('');
        }, 5000);
      }
    } catch (err) {
      setSubmitting(false);
      setErrorMsg('Network error while connecting to hospital patient database');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background p-margin no-scrollbar">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-lg">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold">Patient Registration & Intake</h2>
            <p className="text-body-sm text-on-surface-variant">
              Register new patients, auto-detect existing patients via CNIC / Phone, and manage Master Patient Index profiles.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFillDemoData}
              className="cursor-pointer flex items-center gap-1.5 px-3 py-2 bg-surface-container border border-outline-variant/30 text-primary font-bold rounded-xl text-xs hover:bg-surface-container-high transition-colors"
              title="Autofill sample Pakistani patient for quick testing"
            >
              <Sparkles size={14} /> Quick Demo Data
            </button>
            {existingPatientId && (
              <button
                type="button"
                onClick={handleClearForm}
                className="cursor-pointer flex items-center gap-1.5 px-3 py-2 bg-error-container text-on-error-container font-bold rounded-xl text-xs hover:opacity-90 transition-opacity"
              >
                <RotateCcw size={14} /> Clear / New Form
              </button>
            )}
          </div>
        </header>

        {successMsg && (
          <div className="mb-lg p-md rounded-2xl bg-secondary-container text-on-secondary-container flex items-center gap-2 clinical-shadow font-semibold text-body-sm animate-fade-in border border-secondary/20">
            <Check className="w-5 h-5 text-secondary shrink-0" /> {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="mb-lg p-md rounded-2xl bg-error-container text-on-error-container flex items-center gap-2 clinical-shadow font-semibold text-body-sm animate-fade-in border border-error/20">
            <ShieldAlert className="w-5 h-5 text-error shrink-0" /> {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-12 gap-gutter mb-lg">
          {/* Register Patient Form */}
          <div className="col-span-12 xl:col-span-7 glass-card p-margin rounded-[24px] clinical-shadow">
            <div className="flex items-center justify-between mb-md pb-2 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                {existingPatientId ? (
                  <>
                    <Edit2 className="text-secondary" />
                    <div>
                      <h3 className="text-title-sm font-bold text-on-surface">Update Patient Record</h3>
                      <span className="text-[11px] font-mono font-bold text-secondary">
                        Editing Registered Profile: {existingPatientId}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <UserPlus className="text-primary" />
                    <div>
                      <h3 className="text-title-sm font-bold text-on-surface">Patient Intake Form</h3>
                      <p className="text-[11px] text-outline">Type CNIC or Phone to auto-detect existing files</p>
                    </div>
                  </>
                )}
              </div>
              <span className="text-[11px] font-bold text-primary bg-primary-fixed px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                MPI Connected
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-md">
              {/* Phone and CNIC Inputs with Real-Time Suggestion Box */}
              <div className="p-3.5 bg-surface-container/30 border border-outline-variant/20 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Phone size={14} /> Contact & Identification Lookup
                  </span>
                  <span className="text-[11px] text-outline italic">Live match on input</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                  <div>
                    <label className="block text-body-sm text-outline mb-1 font-semibold">Contact Phone Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 03001234567 or 0300-1234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-body-sm text-outline mb-1 font-semibold">CNIC / National Identity No.</label>
                    <input
                      type="text"
                      placeholder="e.g. 35201-1234567-1"
                      value={cnic}
                      onChange={(e) => setCnic(e.target.value)}
                      className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary font-medium font-mono"
                    />
                  </div>
                </div>

                {/* Real-time Match Suggestion Box */}
                {matchingPatients.length > 0 && (
                  <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl animate-fade-in">
                    <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold text-xs mb-2">
                      <AlertCircle size={15} />
                      <span>Matching Patient Record(s) Detected ({matchingPatients.length}):</span>
                    </div>

                    <div className="space-y-2">
                      {matchingPatients.map((match) => (
                        <div
                          key={match.patientId || match._id}
                          className="bg-white/90 p-2.5 rounded-lg border border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-on-surface text-body-sm">{match.name}</span>
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary-fixed text-on-primary-fixed-variant">
                                {match.patientId}
                              </span>
                              <span className="text-[11px] font-bold text-error">
                                {match.bloodGroup || 'Blood: N/A'}
                              </span>
                            </div>
                            <p className="text-outline text-[11px] mt-0.5">
                              Phone: <span className="font-semibold text-on-surface-variant">{match.phone}</span>
                              {match.cnic && (
                                <>
                                  {' • '}CNIC: <span className="font-mono font-semibold text-on-surface-variant">{match.cnic}</span>
                                </>
                              )}
                              {' • '}Age: {match.age} yrs ({match.gender})
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleAutofillPatient(match)}
                              className="cursor-pointer px-3 py-1.5 bg-primary text-on-primary rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center gap-1 text-xs"
                            >
                              <Sparkles size={12} /> Auto-Fill Form
                            </button>
                            <Link
                              href={`/dashboard/receptionist/appointments?patientId=${match.patientId}&patientName=${encodeURIComponent(match.name)}`}
                              className="cursor-pointer px-2.5 py-1.5 bg-secondary-container text-on-secondary-container rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center gap-1 text-xs"
                            >
                              <Calendar size={12} /> Book OPD
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Name, Age, Gender */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                <div>
                  <label className="block text-body-sm text-outline mb-1 font-semibold">Full Patient Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="First and Last name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-sm">
                  <div>
                    <label className="block text-body-sm text-outline mb-1 font-semibold">Age *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={120}
                      placeholder="e.g. 34"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-body-sm text-outline mb-1 font-semibold">Gender *</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Blood Group and Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                <div>
                  <label className="block text-body-sm text-outline mb-1 font-semibold">Blood Group *</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none cursor-pointer font-bold"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="Unknown">Unknown</option>
                  </select>
                </div>
                <div>
                  <label className="block text-body-sm text-outline mb-1 font-semibold">Email Address</label>
                  <input
                    type="email"
                    placeholder="example@mail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Residential Address */}
              <div>
                <label className="block text-body-sm text-outline mb-1 font-semibold">Residential Address</label>
                <input
                  type="text"
                  placeholder="Street name, Area, City"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none"
                />
              </div>

              {/* Emergency Contact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                <div>
                  <label className="block text-body-sm text-outline mb-1 font-semibold">Emergency Contact Person</label>
                  <input
                    type="text"
                    placeholder="Spouse / Parent / Next of Kin"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-body-sm text-outline mb-1 font-semibold">Emergency Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 03217654321"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none"
                  />
                </div>
              </div>

              {/* Drug / Food Allergies */}
              <div>
                <label className="block text-body-sm text-outline mb-1 font-semibold">Known Drug/Food Allergies</label>
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Sulfa, NSAIDs (comma-separated, or leave empty if None)"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm focus:outline-none"
                />
              </div>

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="cursor-pointer flex-1 w-full flex items-center justify-center gap-2 py-3 bg-primary text-on-primary rounded-xl font-bold clinical-shadow hover:opacity-90 disabled:opacity-50 transition-all text-body-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Saving to Hospital Registry...
                    </>
                  ) : existingPatientId ? (
                    <>
                      <Edit2 size={18} /> Update Patient Profile ({existingPatientId})
                    </>
                  ) : (
                    <>
                      <UserPlus size={18} /> Complete Patient Registration
                    </>
                  )}
                </button>

                {existingPatientId && (
                  <Link
                    href={`/dashboard/receptionist/appointments?patientId=${existingPatientId}&patientName=${encodeURIComponent(name)}`}
                    className="cursor-pointer w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-3 bg-secondary text-on-secondary rounded-xl font-bold clinical-shadow hover:opacity-90 transition-all text-body-sm"
                  >
                    <Calendar size={18} /> Book OPD
                  </Link>
                )}
              </div>
            </form>
          </div>

          {/* Directory Column */}
          <div className="col-span-12 xl:col-span-5 glass-card p-margin rounded-[24px] clinical-shadow flex flex-col h-[760px]">
            <div className="mb-md">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-title-sm font-bold text-on-surface">Registered Patient Directory</h3>
                <span className="text-xs font-semibold text-outline">({patients.length} records)</span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4.5 h-4.5" />
                <input
                  type="text"
                  placeholder="Search by name, ID, phone, or CNIC..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-surface-container border border-outline-variant/30 rounded-xl text-body-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-sm sidebar-scroll pr-1">
              {loadingList ? (
                <div className="py-20 text-center text-outline flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-xs font-semibold">Loading patient directory...</p>
                </div>
              ) : patients.length > 0 ? (
                patients.map((p) => {
                  const allergiesStr = Array.isArray(p.allergies) ? p.allergies.join(', ') : p.allergies;
                  return (
                    <div
                      key={p.patientId || p._id}
                      className="p-md bg-surface-container-low border border-outline-variant/10 rounded-2xl clinical-shadow flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold text-primary font-label-caps uppercase">{p.patientId}</span>
                          <span className="text-[11px] font-bold text-error bg-error-container/40 border border-error/15 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                            <Heart size={10} className="fill-error" /> {p.bloodGroup}
                          </span>
                        </div>
                        <h5 className="font-bold text-on-surface text-body-md mb-1">{p.name}</h5>
                        <p className="text-[12px] text-outline">
                          {p.gender}, {p.age} Years • <span className="font-semibold text-primary">{p.status}</span>
                        </p>

                        {p.cnic && (
                          <p className="text-[11px] text-outline-variant font-mono mt-1 flex items-center gap-1 font-semibold">
                            <span className="text-[10px] uppercase font-bold text-outline">CNIC:</span> {p.cnic}
                          </p>
                        )}

                        {allergiesStr && allergiesStr !== 'None' && allergiesStr.length > 0 && (
                          <p className="text-[11px] text-error font-semibold flex items-center gap-1 mt-2">
                            <ShieldAlert size={12} /> Allergies: {allergiesStr}
                          </p>
                        )}
                      </div>

                      <div className="flex justify-between items-center mt-sm pt-2 border-t border-outline-variant/10">
                        <span className="text-[11px] text-outline font-medium flex items-center gap-1">
                          <Phone size={12} /> {p.phone}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDossierPatientId(p.patientId)}
                            className="cursor-pointer text-xs font-semibold text-slate-600 hover:text-primary flex items-center gap-1"
                            title="Print Clinical Dossier"
                          >
                            <Printer size={12} /> Dossier
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAutofillPatient(p)}
                            className="cursor-pointer text-xs font-bold text-primary hover:underline flex items-center gap-0.5"
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedPatient(p)}
                            className="cursor-pointer text-xs font-bold text-outline hover:text-primary flex items-center gap-1"
                          >
                            <Eye size={13} /> View
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-16 text-center text-outline">
                  <User className="mx-auto w-12 h-12 text-outline-variant mb-2" />
                  <p className="font-semibold text-body-sm">No registered patient files match.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selected Patient Detailed View Modal */}
        {selectedPatient && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-md animate-fade-in">
            <div className="bg-surface-container-lowest rounded-2xl max-w-2xl w-full clinical-shadow border border-outline-variant/30 overflow-hidden">
              <div className="px-6 py-4 bg-primary text-on-primary flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-title-sm">Patient Master Chart: {selectedPatient.patientId}</h3>
                  <p className="text-xs text-on-primary/80">Electronic Health Record Index</p>
                </div>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="cursor-pointer hover:bg-white/10 p-1.5 rounded-full transition-colors text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-md text-body-sm overflow-y-auto max-h-[520px] sidebar-scroll">
                <div>
                  <p className="text-xs text-outline font-bold uppercase mb-0.5">Full Name</p>
                  <p className="font-bold text-on-surface text-body-lg">{selectedPatient.name}</p>
                  <span className="text-xs text-primary font-bold bg-primary-fixed px-2 py-0.5 rounded-md mt-1 inline-block">
                    Status: {selectedPatient.status} {selectedPatient.assignedBed && `• Bed: ${selectedPatient.assignedBed}`}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-sm p-3.5 bg-surface-container/20 rounded-xl border border-outline-variant/10 text-center">
                  <div>
                    <span className="block text-[10px] text-outline font-bold uppercase">Age</span>
                    <span className="font-semibold text-on-surface">{selectedPatient.age} Yrs</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-outline font-bold uppercase">Gender</span>
                    <span className="font-semibold text-on-surface">{selectedPatient.gender}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-outline font-bold uppercase">Blood Group</span>
                    <span className="font-bold text-error flex justify-center items-center gap-0.5">
                      <Heart size={12} className="fill-error" /> {selectedPatient.bloodGroup}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2 items-center">
                    <Phone className="w-4 h-4 text-outline" />
                    <div>
                      <span className="text-[10px] text-outline block">Phone</span>
                      <span className="font-semibold text-on-surface-variant">{selectedPatient.phone}</span>
                    </div>
                  </div>
                  {selectedPatient.cnic && (
                    <div className="flex gap-2 items-center">
                      <ShieldAlert className="w-4 h-4 text-primary" />
                      <div>
                        <span className="text-[10px] text-outline block font-bold uppercase">CNIC / National Identity No.</span>
                        <span className="font-semibold text-on-surface-variant font-mono">{selectedPatient.cnic}</span>
                      </div>
                    </div>
                  )}
                  {selectedPatient.email && (
                    <div className="flex gap-2 items-center">
                      <Mail className="w-4 h-4 text-outline" />
                      <div>
                        <span className="text-[10px] text-outline block">Email</span>
                        <span className="font-semibold text-on-surface-variant">{selectedPatient.email}</span>
                      </div>
                    </div>
                  )}
                  {selectedPatient.address && (
                    <div className="flex gap-2 items-center">
                      <MapPin className="w-4 h-4 text-outline" />
                      <div>
                        <span className="text-[10px] text-outline block">Residential Address</span>
                        <span className="font-semibold text-on-surface-variant">{selectedPatient.address}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-outline-variant/20 pt-3 grid grid-cols-2 gap-sm bg-error-container/10 p-3 rounded-xl border border-error/10">
                  <div className="col-span-2">
                    <p className="text-[10px] text-error font-bold uppercase flex items-center gap-1">
                      <ShieldAlert size={12} /> Allergies Description
                    </p>
                    <p className="font-bold text-on-surface mt-1">
                      {Array.isArray(selectedPatient.allergies) && selectedPatient.allergies.length > 0
                        ? selectedPatient.allergies.join(', ')
                        : 'No documented drug or food allergies'}
                    </p>
                  </div>
                  {selectedPatient.emergencyContact && (
                    <div className="mt-2">
                      <span className="text-[10px] text-outline block uppercase font-bold">Emergency Contact</span>
                      <span className="font-semibold text-on-surface">
                        {typeof selectedPatient.emergencyContact === 'object'
                          ? `${selectedPatient.emergencyContact.name} (${selectedPatient.emergencyContact.relation || 'Contact'})`
                          : selectedPatient.emergencyContact}
                      </span>
                    </div>
                  )}
                  {selectedPatient.emergencyContact?.phone && (
                    <div className="mt-2">
                      <span className="text-[10px] text-outline block uppercase font-bold">Emergency Phone</span>
                      <span className="font-semibold text-on-surface">{selectedPatient.emergencyContact.phone}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-outline-variant/20">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        handleAutofillPatient(selectedPatient);
                        setSelectedPatient(null);
                      }}
                      className="cursor-pointer px-4 py-2 bg-secondary text-on-secondary rounded-xl font-bold hover:opacity-90 transition-all text-xs flex items-center gap-1"
                    >
                      <Edit2 size={14} /> Auto-Fill Intake
                    </button>
                    <button
                      onClick={() => setDossierPatientId(selectedPatient.patientId)}
                      className="cursor-pointer px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold transition-all text-xs flex items-center gap-1"
                    >
                      <Printer size={14} className="text-primary" /> Print Dossier
                    </button>
                  </div>
                  <button
                    onClick={() => setSelectedPatient(null)}
                    className="cursor-pointer px-6 py-2.5 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 transition-all clinical-shadow text-body-sm"
                  >
                    Close Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {dossierPatientId && (
          <PatientDossierPrintModal
            isOpen={Boolean(dossierPatientId)}
            patientId={dossierPatientId}
            onClose={() => setDossierPatientId(null)}
            initialPreset="all"
          />
        )}

        <Footer />
      </main>
    </div>
  );
}
