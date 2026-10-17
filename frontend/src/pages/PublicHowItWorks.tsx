import React from 'react';
import {
  Music,
  Scissors,
  Mic,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const PublicHowItWorks: React.FC = () => {
  const { requireAuthAndNavigate } = useApp();

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] py-10 lg:py-14">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Page Header */}
        <div className="max-w-2xl">
          <span className="text-xs font-extrabold text-[#059669] uppercase tracking-wider">
            Step-by-Step Guide
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#0F172A] mt-1">
            How Awaazify Works
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-2 leading-relaxed">
            Our studio automatically separates the original background music, converts the singing voice, and mixes the final track for you.
          </p>
        </div>

        {/* Card 1: Automatic Vocal Separation & Mixing */}
        <div className="rounded-3xl bg-white border border-slate-200/90 shadow-2xs p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
          <div className="lg:col-span-7 space-y-3.5">
            <div className="inline-flex items-center gap-2 text-xs font-extrabold text-[#059669] bg-emerald-50 px-3 py-1.5 rounded-xl">
              <Music className="w-4 h-4" />
              <span>1. Automatic Song Mixing</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A]">
              Original Background Music Stays Intact
            </h2>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 font-semibold pt-1">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                <span>
                  Step 1: Separates the instrumental music from the original vocals.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                <span>
                  Step 2: Converts the vocal track into your selected voice model.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                <span>
                  Step 3: Mixes the new vocals back with the original music ready for MP3 download.
                </span>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-5 p-5 rounded-3xl bg-emerald-50/70 border border-emerald-200 space-y-2.5 text-center">
            <div className="p-3 rounded-2xl bg-white border border-slate-200 font-bold text-xs sm:text-sm text-[#0F172A]">
              🎵 Input Song (MP3 or YouTube)
            </div>
            <div className="text-xs font-extrabold text-[#059669]">
              ↓ Vocal & Music Separation ↓
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <div className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-700">
                🎸 Original Music
              </div>
              <div className="p-3 rounded-2xl bg-[#FEF3C7] border border-amber-300 text-amber-950">
                🎤 New AI Vocals
              </div>
            </div>
            <div className="text-xs font-extrabold text-[#059669]">
              ↓ Studio Track Mix ↓
            </div>
            <div className="p-3.5 rounded-2xl bg-[#10B981] text-white font-extrabold text-xs sm:text-sm">
              🎧 Finished MP3 (+ 1 Free Retry)
            </div>
          </div>
        </div>

        {/* Card 2: Smart YouTube Segment Trimmer */}
        <div className="rounded-3xl bg-white border border-slate-200/90 shadow-2xs p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
          <div className="lg:col-span-7 space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-extrabold text-amber-900 bg-[#FEF3C7] px-3 py-1.5 rounded-xl">
              <Scissors className="w-4 h-4 text-[#F59E0B]" />
              <span>2. Smart YouTube Chorus Selector</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A]">
              Preview Any 30-Second Chorus for Free
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              Skip slow song intros and slide the 30-second window directly to the main chorus for your free trial preview, or unlock the full track anytime.
            </p>
          </div>

          <div className="lg:col-span-5 p-5 rounded-3xl bg-amber-50/70 border border-amber-200 space-y-2.5">
            <div className="text-xs font-extrabold text-amber-950 text-center">
              30-Second Chorus Selection
            </div>
            <div className="h-12 rounded-2xl bg-white border border-slate-200 relative flex items-center px-3">
              <div
                className="absolute top-0 bottom-0 bg-[#10B981]/20 border-x-4 border-[#10B981]"
                style={{ left: '28%', width: '34%' }}
              />
              <div className="w-full flex items-center justify-between gap-1">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-full ${
                      i >= 7 && i <= 15
                        ? 'bg-[#10B981] h-7'
                        : 'bg-slate-200 h-3.5'
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-600 font-bold text-center">
              01:00 — 01:30 (Main Chorus)
            </p>
          </div>
        </div>

        {/* Card 3: 3-Minute Custom Voice Training */}
        <div className="rounded-3xl bg-white border border-slate-200/90 shadow-2xs p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
          <div className="lg:col-span-7 space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-extrabold text-[#059669] bg-emerald-50 px-3 py-1.5 rounded-xl">
              <Mic className="w-4 h-4" />
              <span>3. Custom Voice Training</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A]">
              Record 3 Minutes of Your Voice — Noise Cleaned Automatically
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              Read our guided teleprompter script for 3 minutes (03:00) or upload a voice note. We remove room noise automatically and credit 1 Free Full Song to your account.
            </p>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => requireAuthAndNavigate('song-cover')}
              className="w-full py-4 px-5 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Start Free in Studio</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
