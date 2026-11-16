"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Clock, ShieldAlert, LogOut, CheckCircle2 } from 'lucide-react';

const INACTIVITY_TIMEOUT_MS = 14 * 60 * 1000; // 14 minutes of inactivity before warning
const WARNING_COUNTDOWN_SECONDS = 60; // 60 seconds warning countdown before auto-logout (15 min total)

export default function SessionTimeoutModal() {
  const { data: session } = useSession();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(WARNING_COUNTDOWN_SECONDS);

  const lastActivityRef = useRef(0);
  const timerCheckRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showWarning) {
      setShowWarning(false);
      setSecondsRemaining(WARNING_COUNTDOWN_SECONDS);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }
  }, [showWarning]);

  const handleLogout = useCallback(() => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (timerCheckRef.current) clearInterval(timerCheckRef.current);
    signOut({ callbackUrl: '/login?timeout=true' });
  }, []);

  useEffect(() => {
    if (!session) return;
    lastActivityRef.current = Date.now();

    // Activity event listeners
    const activityEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'click'];
    const handleActivity = () => {
      if (!showWarning) {
        lastActivityRef.current = Date.now();
      }
    };

    activityEvents.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));

    // Periodic check for 14 minutes of inactivity
    timerCheckRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= INACTIVITY_TIMEOUT_MS && !showWarning) {
        setShowWarning(true);
        setSecondsRemaining(WARNING_COUNTDOWN_SECONDS);
      }
    }, 5000);

    return () => {
      activityEvents.forEach((ev) => window.removeEventListener(ev, handleActivity));
      if (timerCheckRef.current) clearInterval(timerCheckRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [session, showWarning]);

  // Countdown when modal warning is active
  useEffect(() => {
    if (showWarning) {
      countdownIntervalRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      };
    }
  }, [showWarning, handleLogout]);

  // Handle Escape key to stay signed in
  useEffect(() => {
    if (!showWarning) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        resetTimer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showWarning, resetTimer]);

  if (!showWarning) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
      aria-describedby="session-timeout-desc"
      className="fixed inset-0 z-[9999] bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in"
    >
      <div className="bg-surface-container-lowest max-w-240 w-full rounded-2xl border border-outline-variant/30 shadow-2xl p-6 text-on-surface">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 id="session-timeout-title" className="font-bold text-base text-on-surface">Shared Terminal Inactivity Notice</h3>
            <p className="text-xs text-outline">Hospital Security &amp; Patient Privacy Safeguard</p>
          </div>
        </div>

        <p id="session-timeout-desc" className="text-xs text-on-surface-variant leading-relaxed mb-4">
          No user interaction was detected for 14 minutes. For clinical security and patient health data protection on shared hospital terminals, your session will be terminated in:
        </p>

        <div className="py-3 px-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between mb-5">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
            <ShieldAlert size={16} /> Auto-Logout Countdown
          </span>
          <span className="font-mono text-lg font-black text-amber-600 dark:text-amber-400">
            00:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}
          </span>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={handleLogout}
            className="cursor-pointer px-4 py-2 rounded-xl border border-outline-variant/30 text-outline hover:text-error hover:bg-error-container/20 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <LogOut size={14} /> Log Out Now
          </button>
          <button
            type="button"
            onClick={resetTimer}
            className="cursor-pointer px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:opacity-90 flex items-center gap-1.5 shadow-sm transition-all"
          >
            <CheckCircle2 size={14} /> Stay Signed In
          </button>
        </div>
      </div>
    </div>
  );
}
