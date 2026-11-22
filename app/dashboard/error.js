"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, LayoutDashboard } from 'lucide-react';

export default function DashboardError({ error, reset }) {
  useEffect(() => {
    console.error('[RoleMed Dashboard Segment Error]:', error);
  }, [error]);

  return (
    <div className="flex-1 min-h-[70vh] flex items-center justify-center p-6">
      <div className="w-full max-w-[480px] bg-white rounded-3xl border border-red-200 shadow-xl p-7 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 text-red-600 mx-auto flex items-center justify-center">
          <AlertCircle className="w-7 h-7" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-800">Clinical Module Interruption</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            This workspace segment encountered an unhandled exception.
          </p>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-left">
          <p className="text-[11px] font-mono text-red-600 font-medium break-words">
            {error?.message || 'Unknown render exception'}
          </p>
          {error?.digest && (
            <p className="text-[10px] text-slate-400 font-mono mt-1">
              Digest: {error.digest}
            </p>
          )}
        </div>

        <div className="flex gap-2 justify-center pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="cursor-pointer px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw size={13} /> Reload Module
          </button>
          <Link
            href="/dashboard/receptionist"
            className="cursor-pointer px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <LayoutDashboard size={13} /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
