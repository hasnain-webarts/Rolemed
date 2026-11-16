"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('[RoleMed Global Viewport Exception]:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background text-on-surface flex items-center justify-center p-6">
      <div className="max-w-md w-full glass-card p-8 rounded-3xl border border-error/30 shadow-2xl text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-error-container/30 border border-error/30 text-error mx-auto flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-on-surface font-headline">Clinical System Alert</h2>
          <p className="text-xs text-outline mt-1 font-mono">
            {error?.digest ? `Incident Reference: ${error.digest}` : 'Unexpected Application Exception'}
          </p>
        </div>

        <p className="text-xs text-on-surface-variant leading-relaxed bg-surface-container/40 p-3 rounded-xl border border-outline-variant/10 text-left line-clamp-3">
          {error?.message || 'A client-side runtime exception occurred. Protected patient records and data integrity remain secure.'}
        </p>

        <div className="flex gap-2.5 justify-center pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="cursor-pointer px-4 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw size={14} /> Try Again
          </button>
          <Link
            href="/"
            className="cursor-pointer px-4 py-2.5 rounded-xl border border-outline-variant/30 text-outline hover:bg-surface-container text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Home size={14} /> Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}

