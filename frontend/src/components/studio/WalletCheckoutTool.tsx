import React, { useState, useRef } from 'react';
import {
  Copy,
  Check,
  Upload,
  Clock,
  CheckCircle2,
  Wallet,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { awaazifyApi } from '../../services/api';

const TWO_SIMPLE_PACKAGES = [
  {
    id: 'song-50' as const,
    icon: '🎵',
    titlePkr: '1 Full Song Cover — Rs. 50',
    titleUsd: '1 Full Song Cover — $0.99',
    songsAdded: 1,
    voicePassAdded: 0,
    pkr: 50,
    usd: 0.99,
    description:
      'Convert 1 full-length song into any voice model with automatic background music mixing and 1 Free Retry.',
  },
  {
    id: 'voice-150' as const,
    icon: '🎙️',
    titlePkr: 'Custom Voice + 1 Free Song — Rs. 150',
    titleUsd: 'Custom Voice + 1 Free Song — $2.99',
    songsAdded: 1,
    voicePassAdded: 1,
    pkr: 150,
    usd: 2.99,
    description:
      'Train your personal voice model from a 3-minute recording with automatic noise cleaning + 1 Full Song included free.',
  },
];

export const WalletCheckoutTool: React.FC = () => {
  const {
    regionMode,
    setRegionMode,
    formattedBalance,
    transactions,
    submitLocalPaymentRequest,
  } = useApp();

  const [selectedPkgId, setSelectedPkgId] = useState<'song-50' | 'voice-150'>(
    'song-50'
  );

  // PKR Mode State (EasyPaisa / JazzCash)
  const [pkGateway, setPkGateway] = useState<'easypaisa' | 'jazzcash'>(
    'easypaisa'
  );
  const [copiedAccount, setCopiedAccount] = useState<boolean>(false);
  const [tidInput, setTidInput] = useState<string>('');
  const [screenshotName, setScreenshotName] = useState<string>('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [pkError, setPkError] = useState<string>('');
  const [pkSuccess, setPkSuccess] = useState<string>('');
  const [isSubmittingPk, setIsSubmittingPk] = useState<boolean>(false);
  const screenshotInputRef = useRef<HTMLInputElement | null>(null);

  // P0: card / Apple Pay / Google Pay checkout is DISABLED until a real
  // payment processor (e.g. Stripe) is integrated. The previous form minted
  // "Approved" credits with a fake test card number and no processor.

  const selectedPkg =
    TWO_SIMPLE_PACKAGES.find((p) => p.id === selectedPkgId) ||
    TWO_SIMPLE_PACKAGES[0];

  const walletAccountNumber =
    pkGateway === 'easypaisa' ? '0345-8920411' : '0301-7482910';
  const walletAccountTitle = 'AWAAZIFY STUDIO';

  const handleCopyAccount = () => {
    navigator.clipboard?.writeText(walletAccountNumber.replace(/-/g, ''));
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2500);
  };

  const handlePkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPkError('');
    setPkSuccess('');

    const cleanTid = tidInput.replace(/\D/g, '');
    if (cleanTid.length < 6) {
      setPkError('Please enter a valid EasyPaisa or JazzCash Transaction ID (TID).');
      return;
    }

    setIsSubmittingPk(true);

    let screenshotPublicUrl = screenshotName || `${pkGateway}_receipt_${selectedPkg.pkr}.jpg`;
    if (screenshotFile) {
      const storagePath = `payment_${Date.now()}_${screenshotFile.name}`;
      screenshotPublicUrl = await awaazifyApi.uploadFileToStorage('payment-screenshots', screenshotFile, storagePath);
    }

    await submitLocalPaymentRequest({
      provider: pkGateway,
      packageId: selectedPkg.id,
      packageName: selectedPkg.titlePkr,
      songsAdded: selectedPkg.songsAdded,
      voicePassAdded: selectedPkg.voicePassAdded,
      amountPkr: selectedPkg.pkr,
      transactionId: cleanTid,
      screenshotName: screenshotPublicUrl,
    });

    setIsSubmittingPk(false);
    setTidInput('');
    setScreenshotName('');
    setScreenshotFile(null);
    setPkSuccess('Payment submitted! Your package will be activated within 2 minutes.');
  };

  return (
    <div className="space-y-6 sm:space-y-8 min-w-0">
      {/* Top Header with Balance: Rs. 0 (or $0.00) & Single Pricing Currency Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A]">
            Wallet & Pricing
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
            Select a package below to top up your studio balance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Strict Fix #1: Balance displays "Rs. 0" (or active currency balance) */}
          <div className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center gap-2 text-xs sm:text-sm font-extrabold">
            <Wallet className="w-4 h-4 text-[#10B981] shrink-0" />
            <span className="text-slate-500">Balance:</span>
            <span className="text-[#059669] font-mono tabular-nums">
              {formattedBalance}
            </span>
          </div>

          {/* Currency Switcher strictly on Pricing / Wallet page */}
          <div className="inline-flex p-1 rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setRegionMode('PK')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer whitespace-nowrap ${
                regionMode === 'PK'
                  ? 'bg-[#10B981] text-white'
                  : 'text-slate-600 hover:text-[#0F172A]'
              }`}
            >
              PKR (Rs)
            </button>
            <button
              type="button"
              onClick={() => setRegionMode('GLOBAL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer whitespace-nowrap ${
                regionMode === 'GLOBAL'
                  ? 'bg-[#10B981] text-white'
                  : 'text-slate-600 hover:text-[#0F172A]'
              }`}
            >
              USD ($)
            </button>
          </div>
        </div>
      </div>

      {/* 2 Package Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {TWO_SIMPLE_PACKAGES.map((pkg) => {
          const isSelected = pkg.id === selectedPkgId;
          return (
            <div
              key={pkg.id}
              onClick={() => setSelectedPkgId(pkg.id)}
              className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-emerald-50/70 border-[#10B981] shadow-sm ring-4 ring-[#10B981]/15'
                  : 'bg-white border-slate-200 hover:border-[#10B981]/60 shadow-2xs'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-2xl">{pkg.icon}</span>
                  {isSelected ? (
                    <span className="px-3 py-1 rounded-xl bg-[#10B981] text-white text-xs font-extrabold">
                      Selected
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-400">
                      Tap to Select
                    </span>
                  )}
                </div>

                <h3 className="text-lg sm:text-xl font-extrabold text-[#0F172A]">
                  {regionMode === 'PK' ? pkg.titlePkr : pkg.titleUsd}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                  {pkg.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Checkout Form: PKR (EasyPaisa / JazzCash) vs USD (Card / Apple Pay / Google Pay) */}
      {regionMode === 'PK' ? (
        <form
          onSubmit={handlePkSubmit}
          className="rounded-3xl bg-white border border-slate-200/90 shadow-2xs p-5 sm:p-7 space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-extrabold text-[#059669] uppercase">
                Local Mobile Wallet Checkout
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#0F172A] mt-0.5">
                Pay Rs. {selectedPkg.pkr} via EasyPaisa or JazzCash
              </h2>
            </div>

            <div className="inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setPkGateway('easypaisa')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  pkGateway === 'easypaisa'
                    ? 'bg-[#10B981] text-white'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                EasyPaisa
              </button>
              <button
                type="button"
                onClick={() => setPkGateway('jazzcash')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  pkGateway === 'jazzcash'
                    ? 'bg-[#F59E0B] text-white'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                JazzCash
              </button>
            </div>
          </div>

          {/* Merchant Account Details */}
          <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div>
              <div className="text-xs font-bold text-slate-500">Wallet Provider</div>
              <div className="text-sm sm:text-base font-extrabold text-[#0F172A] uppercase mt-0.5">
                {pkGateway === 'easypaisa' ? 'EasyPaisa' : 'JazzCash'}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-500">Account Title</div>
              <div className="text-sm sm:text-base font-extrabold text-[#0F172A] mt-0.5">
                {walletAccountTitle}
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-3">
              <div>
                <div className="text-xs font-bold text-slate-500">Account Number</div>
                <div className="text-lg font-mono font-extrabold text-[#059669] tabular-nums">
                  {walletAccountNumber}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyAccount}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-100 text-xs font-extrabold text-[#059669] cursor-pointer shrink-0"
              >
                {copiedAccount ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* TID & Receipt Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs sm:text-sm font-extrabold text-[#0F172A] mb-1.5">
                1. Transaction ID (TID) *
              </label>
              <input
                type="text"
                required
                maxLength={14}
                value={tidInput}
                onChange={(e) => setTidInput(e.target.value)}
                placeholder="e.g., 38492019482"
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-[#10B981] focus:bg-white focus:outline-none text-sm font-mono font-bold text-[#0F172A] placeholder-slate-400 tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-extrabold text-[#0F172A] mb-1.5">
                2. Payment Receipt Screenshot *
              </label>
              <div
                onClick={() => screenshotInputRef.current?.click()}
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 hover:border-[#10B981] flex items-center justify-between gap-2 cursor-pointer transition-colors"
              >
                <input
                  ref={screenshotInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setScreenshotFile(f);
                      setScreenshotName(f.name);
                    }
                  }}
                  className="hidden"
                />
                <div className="flex items-center gap-2 min-w-0">
                  <Upload className="w-4 h-4 text-[#10B981] shrink-0" />
                  <span className="text-xs font-bold text-[#0F172A] truncate">
                    {screenshotName || 'Upload Receipt Screenshot'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setScreenshotName(
                      `${pkGateway}_receipt_${selectedPkg.pkr}.jpg`
                    );
                  }}
                  className="text-xs font-extrabold text-[#059669] hover:underline shrink-0 cursor-pointer"
                >
                  Sample Receipt
                </button>
              </div>
            </div>
          </div>

          {pkError && (
            <p className="text-xs sm:text-sm text-red-600 font-extrabold">
              {pkError}
            </p>
          )}

          {pkSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-[#10B981] text-xs sm:text-sm font-extrabold text-[#059669]">
              {pkSuccess}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmittingPk}
            className="w-full py-4 px-6 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-sm sm:text-base shadow-md transition-all cursor-pointer"
          >
            {isSubmittingPk
              ? 'Submitting Verification...'
              : `Submit Rs. ${selectedPkg.pkr} Payment`}
          </button>
        </form>
      ) : (
        /* P0: USD CARD / APPLE PAY / GOOGLE PAY — DISABLED until a real payment
           processor is integrated. No credits may be minted without one. */
        <div className="rounded-3xl bg-white border border-slate-200/90 shadow-2xs p-5 sm:p-7 space-y-5 opacity-90">
          <div className="pb-4 border-b border-slate-100">
            <span className="text-xs font-extrabold text-slate-400 uppercase">
              Card / Apple Pay / Google Pay
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#0F172A] mt-0.5">
              Card payments coming soon
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2 leading-relaxed">
              Instant USD card checkout is not available yet — we are integrating
              a secure payment processor. Please switch to{' '}
              <button
                type="button"
                onClick={() => setRegionMode('PK')}
                className="font-extrabold text-[#059669] hover:underline cursor-pointer"
              >
                PKR (Rs)
              </button>{' '}
              and top up with EasyPaisa or JazzCash instead.
            </p>
          </div>

          <button
            type="button"
            disabled
            className="w-full py-4 px-6 rounded-2xl bg-slate-200 text-slate-400 font-extrabold text-sm sm:text-base cursor-not-allowed"
          >
            {`Pay $${selectedPkg.usd} — Coming Soon`}
          </button>
        </div>
      )}

      {/* Payment History */}
      <section className="rounded-3xl bg-white border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <h3 className="text-base font-extrabold text-[#0F172A]">
          Payment History
        </h3>

        <div className="space-y-2.5">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm"
            >
              <div className="min-w-0">
                <div className="font-extrabold text-[#0F172A] truncate">
                  {tx.packageName} ({tx.amountDisplay})
                </div>
                <div className="text-xs text-slate-500 font-mono truncate">
                  {tx.provider.toUpperCase()} · TID: {tx.transactionId} ·{' '}
                  {tx.createdAt}
                </div>
              </div>

              <div className="shrink-0">
                {tx.status === 'Pending' ? (
                  <span className="inline-flex items-center gap-1.5 text-amber-700 font-extrabold text-xs">
                    <Clock className="w-4 h-4" />
                    <span>Pending Verification (~2 mins)</span>
                  </span>
                ) : tx.status === 'Approved' ? (
                  <span className="inline-flex items-center gap-1.5 text-[#059669] font-extrabold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approved</span>
                  </span>
                ) : (
                  <span className="text-red-600 font-extrabold text-xs">
                    Rejected
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
