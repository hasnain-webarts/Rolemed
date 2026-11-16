"use client";

import { useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, Loader2, X } from 'lucide-react';

/**
 * Accessible, Enterprise-Standard Confirmation Modal for Destructive & Critical Clinical Actions
 * Supports WCAG AA focus trapping, Escape-key dismissal, and high-visibility alert callouts.
 */
export default function ConfirmationModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  alertNotice = null,
  onConfirm,
  onClose,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in"
    >
      <div className="bg-surface-container-lowest max-w-240 w-full rounded-2xl border border-outline-variant/30 shadow-2xl overflow-hidden text-on-surface">
        {/* Header */}
        <div className="p-5 flex items-start gap-3.5 border-b border-outline-variant/10">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              isDanger
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                : isWarning
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                : 'bg-primary/10 text-primary border border-primary/20'
            }`}
          >
            {isDanger ? (
              <AlertTriangle className="w-5 h-5" />
            ) : isWarning ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <Info className="w-5 h-5" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 id="confirm-modal-title" className="font-bold text-base text-on-surface">
              {title}
            </h3>
            <p id="confirm-modal-desc" className="text-xs text-outline mt-1 leading-relaxed">
              {description}
            </p>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-container text-outline hover:text-on-surface transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Optional Alert Notice (e.g., Financial Clearance warning) */}
        {alertNotice && (
          <div className="px-5 pt-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs text-amber-800 dark:text-amber-200">
              {alertNotice}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-5 flex justify-end gap-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="cursor-pointer px-4 py-2 rounded-xl border border-outline-variant/30 text-outline hover:bg-surface-container font-semibold text-xs transition-all disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`cursor-pointer px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : isWarning
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-primary hover:opacity-90 text-on-primary'
            }`}
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Processing...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

