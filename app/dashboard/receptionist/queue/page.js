"use client";

import { useState, useEffect } from 'react';
import { Search, ListOrdered, Clock, Play, CheckCircle2, ChevronRight, Stethoscope, RefreshCw, Check, AlertCircle, Loader2 } from 'lucide-react';
import Sidebar from '@/components/Receptionist_Sidebar';
import Footer from '@/components/Footer';

export default function ReceptionistQueue() {
  const [searchQuery, setSearchQuery] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [refreshKey, setRefreshKey] = useState(0);

  // Live queue & doctors state
  const [queue, setQueue] = useState([]);
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    let ignore = false;
    async function loadQueueData() {
      try {
        const res = await fetch('/api/queue');
        const data = await res.json();

        if (!ignore) {
          if (data.success) {
            setQueue(data.queue || []);
            setDoctors(data.doctors || []);
          } else {
            setErrorMsg(data.error || 'Failed to fetch queue');
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error('Error fetching queue:', err);
          setErrorMsg('Network error while fetching queue data.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    loadQueueData();
    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  const handleStatusChange = async (item, newStatus) => {
    setActionLoadingId(item.appointmentId);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: item.appointmentId,
          status: newStatus,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to update queue item');
        return;
      }

      if (newStatus === 'Completed') {
        setSuccessMsg(`Patient ${item.patientName} queue checkout completed!`);
      } else {
        setSuccessMsg(`Queue status for ${item.patientName} updated to ${newStatus}.`);
      }

      setRefreshKey((k) => k + 1);

      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Error updating queue status:', err);
      setErrorMsg('Failed to advance queue status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDoctorReassign = async (item, newDocName) => {
    setActionLoadingId(item.appointmentId);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: item.appointmentId,
          newDoctor: newDocName,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to reassign doctor');
        return;
      }

      setSuccessMsg(`Reassigned ${item.patientName} to ${newDocName}`);
      setRefreshKey((k) => k + 1);

      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Error reassigning doctor:', err);
      setErrorMsg('Failed to reassign doctor.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const activeQueue = queue.filter(q => q.status !== 'Completed');

  const filteredQueue = activeQueue.filter((q) => {
    const name = q.patientName || '';
    const id = q.id || '';
    const doc = q.doctor || '';
    const s = searchQuery.toLowerCase();
    return name.toLowerCase().includes(s) || id.toLowerCase().includes(s) || doc.toLowerCase().includes(s);
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background p-margin no-scrollbar">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-lg">
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold">Outpatient Clinic Queue</h2>
            <p className="text-body-sm text-on-surface-variant">Oversee live check-ins, advance queue numbers, reassign consultations, and monitor doctor room states.</p>
          </div>
          <button
            onClick={() => {
              setRefreshing(true);
              setRefreshKey((k) => k + 1);
            }}
            disabled={refreshing}
            className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-highest hover:bg-surface-container-high text-on-surface text-body-sm font-semibold transition-all clinical-shadow"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin text-primary' : ''} />
            <span>Refresh Queue</span>
          </button>
        </header>

        {errorMsg && (
          <div className="mb-lg p-md rounded-2xl bg-error-container text-on-error-container flex items-center gap-2 clinical-shadow font-semibold text-body-sm">
            <AlertCircle className="w-5 h-5 text-error shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-lg p-md rounded-2xl bg-secondary-container text-on-secondary-container flex items-center gap-2 clinical-shadow font-semibold text-body-sm transition-all animate-bounce">
            <Check className="w-5 h-5 text-secondary shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-12 gap-gutter mb-lg">
          {/* Clinic Queue Management Panel */}
          <div className="col-span-12 xl:col-span-8 glass-card p-margin rounded-[24px] clinical-shadow flex flex-col h-[650px]">
            <div className="mb-md flex flex-col md:flex-row justify-between items-center gap-sm">
              <h3 className="text-title-sm font-bold text-on-surface flex items-center gap-2">
                <ListOrdered className="text-primary" /> Active Clinic Queue ({filteredQueue.length})
              </h3>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4.5 h-4.5" />
                <input
                  type="text"
                  placeholder="Search queue list..."
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
                  <p className="font-semibold text-body-sm">Loading clinic queue...</p>
                </div>
              ) : filteredQueue.length > 0 ? (
                filteredQueue.map((item) => {
                  const isActionLoading = actionLoadingId === item.appointmentId;

                  return (
                    <div
                      key={item.appointmentId || item.id}
                      className="p-md bg-surface-container-low border border-outline-variant/15 rounded-2xl clinical-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <span className="w-12 h-12 rounded-2xl bg-primary-fixed/50 text-primary font-bold flex items-center justify-center text-body-lg shrink-0 clinical-shadow">
                          {item.id}
                        </span>
                        <div className="overflow-hidden flex-1">
                          <h5 className="font-bold text-on-surface text-body-md truncate">
                            {item.patientName}{' '}
                            <span className="text-xs font-normal text-outline">({item.patientId})</span>
                          </h5>
                          <p className="text-[12px] text-outline mt-0.5 font-medium truncate flex items-center gap-2">
                            <Clock size={12} /> Time: {item.time}
                          </p>
                        </div>
                      </div>

                      {/* Reassign / Room details */}
                      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-sm flex-1 w-full md:w-auto">
                        <div className="text-body-sm shrink-0 md:w-36">
                          <span className="text-[10px] text-outline block font-semibold uppercase">Consultant Room</span>
                          <span className="font-semibold text-on-surface-variant block truncate">
                            {item.doctor} ({item.room})
                          </span>
                        </div>

                        {item.status === 'Waiting' && (
                          <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-outline-variant/30">
                            <span className="text-[10px] text-outline px-1.5">Reassign:</span>
                            <select
                              value={item.doctor}
                              disabled={isActionLoading}
                              onChange={(e) => handleDoctorReassign(item, e.target.value)}
                              className="text-xs p-1 border-0 bg-transparent focus:ring-0 cursor-pointer font-bold text-primary disabled:opacity-50"
                            >
                              {doctors
                                .filter((d) => d.status !== 'Offline')
                                .map((d) => (
                                  <option key={d.name} value={d.name}>
                                    {d.name}
                                  </option>
                                ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Status & Action controllers */}
                      <div className="flex items-center gap-sm shrink-0 w-full md:w-auto justify-between md:justify-end border-t border-outline-variant/10 pt-2 md:border-0 md:pt-0">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            item.status === 'With Doctor'
                              ? 'bg-secondary-container text-on-secondary-container'
                              : item.status === 'Calling'
                              ? 'bg-error-container text-on-error-container animate-pulse font-bold'
                              : 'bg-surface-container-high text-outline'
                          }`}
                        >
                          {item.status}
                        </span>

                        <div className="flex gap-2">
                          {item.status === 'Waiting' && (
                            <button
                              disabled={isActionLoading}
                              onClick={() => handleStatusChange(item, 'Calling')}
                              className="cursor-pointer text-xs font-bold bg-primary text-on-primary px-3 py-1.5 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-1 shadow-xs"
                            >
                              {isActionLoading ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                              <span>Call Patient</span>
                            </button>
                          )}
                          {item.status === 'Calling' && (
                            <button
                              disabled={isActionLoading}
                              onClick={() => handleStatusChange(item, 'With Doctor')}
                              className="cursor-pointer text-xs font-bold bg-secondary text-on-secondary px-3 py-1.5 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-1 shadow-xs"
                            >
                              {isActionLoading ? <Loader2 size={12} className="animate-spin" /> : <ChevronRight size={12} />}
                              <span>Send In</span>
                            </button>
                          )}
                          {item.status === 'With Doctor' && (
                            <button
                              disabled={isActionLoading}
                              onClick={() => handleStatusChange(item, 'Completed')}
                              className="cursor-pointer text-xs font-bold bg-[#26A69A] text-white px-3 py-1.5 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-1 shadow-xs"
                            >
                              {isActionLoading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                              <span>Check-Out</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-20 text-center text-outline">
                  <ListOrdered className="mx-auto w-12 h-12 text-outline-variant mb-2" />
                  <p className="font-semibold text-body-sm">The clinic queue is currently empty.</p>
                </div>
              )}
            </div>
          </div>

          {/* Doctor Room Availability board */}
          <div className="col-span-12 xl:col-span-4 glass-card p-margin rounded-[24px] clinical-shadow flex flex-col h-[650px]">
            <h3 className="text-title-sm font-bold text-on-surface mb-md flex items-center gap-2">
              <Stethoscope className="text-secondary" /> Doctor Room Board
            </h3>

            <div className="space-y-md flex-1 overflow-y-auto sidebar-scroll pr-1">
              {doctors.map((doc, idx) => (
                <div
                  key={idx}
                  className="p-md bg-surface-container rounded-2xl border border-outline-variant/15 flex justify-between items-center gap-2 text-body-sm shadow-xs"
                >
                  <div>
                    <h5 className="font-bold text-on-surface">{doc.name}</h5>
                    <p className="text-[12px] text-outline mt-0.5">
                      {doc.specialty} • <span className="font-semibold">{doc.room}</span>
                    </p>
                    <span className="text-[10px] text-primary bg-primary-fixed px-2 py-0.5 rounded-md mt-2 inline-block font-bold">
                      {doc.patientsInQueue} In Queue
                    </span>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        doc.status === 'Available'
                          ? 'bg-secondary-container text-on-secondary-container'
                          : doc.status === 'In Consultation'
                          ? 'bg-primary-fixed text-on-primary-fixed-variant'
                          : 'bg-surface-container-high text-outline'
                      }`}
                    >
                      {doc.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Footer />
      </main>
    </div>
  );
}

