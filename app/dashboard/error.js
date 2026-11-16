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
      <div className="max-w-md w-full bg-surface-container-lowest rounded-3xl border border-error/25 shadow-xl p-7 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-error-container/20 border border-error/30 text-error mx-auto flex items-center justify-center">
          <AlertCircle className="w-7 h-7" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-on-surface">Clinical Module Interruption</h3>
          <p className="text-xs text-outline mt-0.5">
            This workspace segment encountered an unhandled exception.
          </p>
        </div>

        <div className="bg-surface-container/30 p-3 rounded-xl border border-outline-variant/10 text-left">
          <p className="text-[11px] font-mono text-error font-medium truncate">
            {error?.message || 'Unknown render exception'}
          </p>
          {error?.digest && (
            <p className="text-[10px] text-outline font-mono mt-1">
              Digest: {error.digest}
            </p>
          )}
        </div>

        <div className="flex gap-2 justify-center pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="cursor-pointer px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw size={13} /> Reload Module
          </button>
          <Link
            href="/dashboard/admin"
            className="cursor-pointer px-4 py-2 rounded-xl border border-outline-variant/30 text-outline hover:bg-surface-container text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <LayoutDashboard size={13} /> Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

