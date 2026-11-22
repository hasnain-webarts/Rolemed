"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Search,
  User,
  Phone,
  Heart,
  ShieldAlert,
  ChevronRight,
  Loader2,
  AlertCircle,
  Bed,
  Stethoscope,
  Users,
  FileText,
  Printer,
} from 'lucide-react';
import Sidebar from '@/components/Doctor_Sidebar';
import Footer from '@/components/Footer';
import PatientEHRModal from '@/components/PatientEHRModal';
import PatientDossierPrintModal from '@/components/PatientDossierPrintModal';
import { matchesPhone } from '@/lib/phoneUtils';
import Link from 'next/link';

export default function Patients() {
  const { data: session } = useSession();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('All');
  const [scope, setScope] = useState('mine'); // 'mine' | 'all'
  const [selectedPatientId, setSelectedPatientId] = useState(null); // Patient ID for EHR Modal
  const [dossierPatientId, setDossierPatientId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const bloodGroups = ['All', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

  // Identify current doctor name
  const doctorName = session?.user?.name || 'Dr. Sarah Johnson';

  useEffect(() => {
    let ignore = false;
    async function loadPatients() {
      setLoading(true);
      setErrorMsg('');
      try {
        let url = '/api/patients?limit=200';
        if (scope === 'mine' && doctorName) {
          url = `/api/patients?doctor=${encodeURIComponent(doctorName)}&limit=100`;
        }

        const res = await fetch(url, { cache: 'no-store' });
        const data = await res.json();

        if (!ignore) {
          if (data.success) {
            setPatients(data.patients || []);
          } else {
            setErrorMsg(data.error || 'Failed to fetch patients list');
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error('Error fetching patients:', err);
          setErrorMsg('Network error while loading patients.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadPatients();
    return () => {
      ignore = true;
    };
  }, [scope, doctorName]);

  const filteredPatients = patients.filter((p) => {
    const name = p.name || '';
    const id = p.patientId || '';
    const phone = p.phone || '';
    const cnic = p.cnic || '';
    const q = searchQuery.toLowerCase();
    const cleanDigits = searchQuery.replace(/\D/g, '');

    const matchesSearch =
      name.toLowerCase().includes(q) ||
      id.toLowerCase().includes(q) ||
      phone.toLowerCase().includes(q) ||
      matchesPhone(searchQuery, phone) ||
      cnic.toLowerCase().includes(q) ||
      (cleanDigits.length >= 3 &&
        (phone.replace(/\D/g, '').includes(cleanDigits) ||
          cnic.replace(/\D/g, '').includes(cleanDigits)));

    const matchesBlood =
      selectedBloodGroup === 'All' || p.bloodGroup === selectedBloodGroup;

    return matchesSearch && matchesBlood;
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background p-margin no-scrollbar relative">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-lg">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
              Patient Directory & EHR Records
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              Access full longitudinal medical charts, past visits, diagnoses, prescriptions, and lab history.
            </p>
          </div>

          {/* Privacy Scope Switcher: My Patients vs All Hospital Records */}
          <div className="flex items-center bg-surface-container rounded-2xl p-1 border border-outline-variant/30 text-xs font-bold shadow-xs">
            <button
              onClick={() => setScope('mine')}
              className={`cursor-pointer px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                scope === 'mine'
                  ? 'bg-primary text-on-primary clinical-shadow'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              <Stethoscope size={14} /> My Patients ({doctorName})
            </button>
            <button
              onClick={() => setScope('all')}
              className={`cursor-pointer px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                scope === 'all'
                  ? 'bg-primary text-on-primary clinical-shadow'
                  : 'text-outline hover:text-on-surface'
              }`}
            >
              <Users size={14} /> All Hospital Patients
            </button>
          </div>
        </header>

        {errorMsg && (
          <div className="mb-lg p-md rounded-2xl bg-error-container text-on-error-container flex items-center gap-2 clinical-shadow font-semibold text-body-sm">
            <AlertCircle className="w-5 h-5 text-error shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="flex flex-col xl:flex-row justify-between gap-4 mb-lg items-center">
          {/* Blood group pills */}
          <div className="flex flex-wrap gap-2 w-full xl:w-auto">
            {bloodGroups.map((bg) => (
              <button
                key={bg}
                onClick={() => setSelectedBloodGroup(bg)}
                className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  selectedBloodGroup === bg
                    ? 'bg-primary border-primary text-on-primary clinical-shadow'
                    : 'bg-white border-outline-variant/30 text-outline hover:text-primary hover:border-primary/40'
                }`}
              >
                {bg}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full xl:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, ID, phone, or CNIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant/30 rounded-xl text-body-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Directory Grid */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-outline gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="font-semibold text-body-sm">Loading patient records...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter mb-lg">
            {filteredPatients.length > 0 ? (
              filteredPatients.map((p) => {
                const pId = p.patientId || p._id;
                const allergies = Array.isArray(p.allergies) ? p.allergies : [];

                return (
                  <div
                    key={pId}
                    className="glass-card p-md rounded-2xl clinical-shadow border border-outline-variant/20 flex flex-col justify-between min-h-[220px] transition-all hover:scale-[1.01]"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-sm">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant uppercase tracking-wider font-mono">
                          {pId}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {p.status === 'Inpatient' && (
                            <span className="text-[10px] font-bold text-secondary bg-secondary-container px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Bed size={10} /> IPD
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-[11px] font-bold text-error bg-error-container/40 border border-error/15 px-2 py-0.5 rounded-md">
                            <Heart size={12} className="fill-error" /> {p.bloodGroup || 'N/A'}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-3 items-start">
                        <div className="w-12 h-12 rounded-2xl bg-surface-container-high border border-outline-variant/20 flex items-center justify-center text-primary font-bold text-title-sm shrink-0">
                          {(p.name || 'P')
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <div className="overflow-hidden flex-1">
                          <h4 className="font-bold text-on-surface text-body-lg leading-snug truncate">
                            {p.name}
                          </h4>
                          <p className="text-[12px] text-outline mt-0.5">
                            {p.gender || 'Not specified'}, {p.age || '--'} years
                          </p>
                          {p.cnic && (
                            <p className="text-[11px] text-outline-variant font-mono mt-0.5 font-semibold truncate">
                              <span className="text-[10px] uppercase font-bold text-outline">CNIC:</span> {p.cnic}
                            </p>
                          )}
                        </div>
                      </div>

                      {allergies.length > 0 && (
                        <p className="text-[12px] text-error font-semibold flex items-center gap-1 mt-sm truncate">
                          <ShieldAlert size={14} className="shrink-0" /> Allergies: {allergies.join(', ')}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-2.5 border-t border-outline-variant/20 mt-3">
                      <span className="text-[11px] text-outline flex items-center gap-1">
                        <Phone size={12} /> {p.phone || 'No phone'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDossierPatientId(pId)}
                          className="cursor-pointer text-xs font-semibold text-slate-600 hover:text-primary flex items-center gap-1"
                          title="Print Clinical Dossier"
                        >
                          <Printer size={12} /> Dossier
                        </button>
                        <Link
                          href={`/dashboard/doctor/consultations?patientId=${pId}&name=${encodeURIComponent(p.name)}&age=${p.age}&gender=${p.gender}`}
                          className="cursor-pointer text-xs font-bold text-secondary flex items-center gap-0.5 hover:underline"
                        >
                          <FileText size={13} /> Consult
                        </Link>
                        <button
                          type="button"
                          onClick={() => setSelectedPatientId(pId)}
                          className="cursor-pointer text-xs font-bold text-primary flex items-center gap-0.5 hover:underline"
                        >
                          View EHR Chart <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-16 text-center text-outline">
                <User className="mx-auto w-12 h-12 text-outline-variant mb-3" />
                <p className="font-semibold text-body-md">
                  {scope === 'mine'
                    ? `No patients found in ${doctorName}'s clinical records.`
                    : 'No patient matches found in hospital directory.'}
                </p>
                {scope === 'mine' && (
                  <button
                    onClick={() => setScope('all')}
                    className="cursor-pointer mt-3 text-xs font-bold text-primary underline"
                  >
                    Switch to All Hospital Patients
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 360 EHR Longitudinal Chart Modal */}
        <PatientEHRModal
          patientId={selectedPatientId}
          isOpen={!!selectedPatientId}
          onClose={() => setSelectedPatientId(null)}
        />

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
