import React, { useState } from 'react';
import { Check, ChevronDown, Gift, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

const FAQ_ITEMS = [
  {
    q: 'What is included in the Custom Voice package?',
    a: 'We clean background noise from your 3-minute (03:00) voice recording, train your personal AI voice model, and include 1 full-length song cover for free.',
  },
  {
    q: 'How does the 1 Free Retry work?',
    a: 'Every generated song includes 1 Free Retry so you can make the vocal tone deeper, higher, or clearer without extra cost.',
  },
  {
    q: 'How fast are EasyPaisa, JazzCash, and Card payments activated?',
    a: 'Card payments activate immediately. EasyPaisa and JazzCash transfers are verified and activated within 2 minutes of submitting your Transaction ID (TID).',
  },
];

export const PublicPricing: React.FC = () => {
  const { regionMode, setRegionMode, requireAuthAndNavigate } = useApp();
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  const singleSongPrice = regionMode === 'PK' ? 'Rs. 50' : '$0.99';
  const customVoicePrice = regionMode === 'PK' ? 'Rs. 150' : '$2.99';

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] py-10 lg:py-14">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header & Single Pricing Currency Switch */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200/80">
          <div>
            <span className="text-xs font-extrabold text-[#059669] uppercase tracking-wider">
              Simple Pay-As-You-Go Pricing
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-[#0F172A] mt-1">
              Transparent Pricing
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1.5">
              Start with 1 Free 30-Second Preview, then pay per song or train your own voice.
            </p>
          </div>

          {/* Single Currency Switcher strictly on Pricing / Wallet page */}
          <div className="inline-flex items-center p-1 rounded-2xl bg-white border border-slate-200 shadow-2xs self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setRegionMode('PK')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
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
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                regionMode === 'GLOBAL'
                  ? 'bg-[#10B981] text-white'
                  : 'text-slate-600 hover:text-[#0F172A]'
              }`}
            >
              USD ($)
            </button>
          </div>
        </div>

        {/* Free Starter Trial Banner */}
        <div className="rounded-3xl bg-[#FEF3C7] border border-amber-300 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center text-[#F59E0B] shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-amber-950">
                Free Starter Trial — {regionMode === 'PK' ? 'Rs. 0' : '$0.00'}
              </h2>
              <p className="text-xs text-amber-900 font-medium mt-0.5">
                Every new account receives 1 Free 30-Second Song Preview with any voice model.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => requireAuthAndNavigate('song-cover')}
            className="px-5 py-2.5 rounded-2xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-extrabold whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
          >
            Try 1 Free Song →
          </button>
        </div>

        {/* 2 Paid Packages */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Package 1 */}
          <div className="rounded-3xl bg-white border-2 border-[#10B981] shadow-sm p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <span className="text-xs font-extrabold text-[#059669] uppercase">
                Package 1 · Single Track
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] mt-1.5">
                1 Full Song Cover
              </h3>
              <div className="mt-3 flex items-baseline gap-2 tabular-nums">
                <span className="text-3xl sm:text-4xl font-extrabold text-[#059669]">
                  {singleSongPrice}
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-500">
                  / 1 Full Song
                </span>
              </div>

              <ul className="mt-5 space-y-3 text-xs sm:text-sm text-slate-700 font-medium">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                  <span>Convert 1 full-length song into any famous voice model</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                  <span>Automatic vocal separation and background music mixing</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                  <span className="font-bold text-[#059669]">
                    Includes 1 Free Retry to adjust vocal pitch or clarity
                  </span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => requireAuthAndNavigate('wallet')}
              className="mt-7 w-full py-3.5 px-5 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-sm shadow-2xs transition-all cursor-pointer"
            >
              Select Full Song Package ({singleSongPrice})
            </button>
          </div>

          {/* Package 2 */}
          <div className="rounded-3xl bg-gradient-to-br from-amber-50/90 via-white to-emerald-50/70 border-2 border-[#F59E0B] shadow-sm p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <span className="text-xs font-extrabold text-amber-800 uppercase">
                Package 2 · Custom Voice Bundle
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] mt-1.5">
                Train Custom Voice + 1 Free Song
              </h3>
              <div className="mt-3 flex items-baseline gap-2 tabular-nums">
                <span className="text-3xl sm:text-4xl font-extrabold text-[#0F172A]">
                  {customVoicePrice}
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-500">
                  / Voice + 1 Free Song
                </span>
              </div>

              <ul className="mt-5 space-y-3 text-xs sm:text-sm text-slate-700 font-medium">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                  <span>Record or upload 3 minutes (03:00) of your voice</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                  <span>Automatic background noise removal and voice training</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                  <span className="font-bold text-[#059669]">
                    Includes 1 Full Song Cover in your new voice free
                  </span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => requireAuthAndNavigate('train-voice')}
              className="mt-7 w-full py-3.5 px-5 rounded-2xl bg-[#F59E0B] hover:bg-amber-600 text-white font-extrabold text-sm shadow-2xs transition-all cursor-pointer"
            >
              Select Custom Voice Package ({customVoicePrice})
            </button>
          </div>
        </div>

        {/* Payment Methods Strip */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-xs sm:text-sm font-bold text-slate-700">
            {regionMode === 'PK'
              ? 'Supported Payment Methods: EasyPaisa & JazzCash'
              : 'Supported Payment Methods: Credit/Debit Card, Apple Pay & Google Pay'}
          </div>
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#059669]">
            <ShieldCheck className="w-4 h-4" />
            <span>Instant & Secure Checkout</span>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto space-y-3 pt-2">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] text-center mb-4">
            Frequently Asked Questions
          </h2>
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-white border border-slate-200 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 text-xs sm:text-sm font-extrabold text-[#0F172A] hover:text-[#059669] transition-colors cursor-pointer"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150 ${
                      isOpen ? 'rotate-180 text-[#10B981]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-xs sm:text-sm text-slate-600 font-medium leading-relaxed border-t border-slate-100 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
