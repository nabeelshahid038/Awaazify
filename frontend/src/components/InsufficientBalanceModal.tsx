import React from 'react';
import { X, Wallet, AlertTriangle } from 'lucide-react';

interface InsufficientBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTopUp: () => void;
  requiredPkr: number;
  currentPkr: number;
  actionName: string;
}

/**
 * Popup shown when the user's wallet balance is too low for an action
 * (e.g. Rs. 150 for custom voice training, Rs. 50 for a song cover).
 */
export const InsufficientBalanceModal: React.FC<InsufficientBalanceModalProps> = ({
  isOpen,
  onClose,
  onTopUp,
  requiredPkr,
  currentPkr,
  actionName,
}) => {
  if (!isOpen) return null;

  const shortfall = Math.max(0, requiredPkr - currentPkr);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Insufficient balance"
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white shadow-2xl p-6 sm:p-8 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-[#0F172A]">
            Insufficient Balance
          </h2>
          <p className="text-sm text-slate-500">
            {actionName} ke liye <strong className="text-[#0F172A]">Rs. {requiredPkr}</strong> chahiye,
            lekin aapke wallet me <strong className="text-[#0F172A]">Rs. {currentPkr}</strong> hai.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">Shortfall</span>
          <span className="text-lg font-extrabold text-amber-600">Rs. {shortfall}</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onTopUp}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#10B981] hover:bg-emerald-600 text-white text-sm font-extrabold transition-colors cursor-pointer"
          >
            <Wallet className="w-4 h-4" />
            <span>Top Up Wallet</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-extrabold transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>

        <p className="text-xs text-slate-400 text-center">
          EasyPaisa / JazzCash se top-up karein — admin approval ke baad balance update ho jayega.
        </p>
      </div>
    </div>
  );
};
