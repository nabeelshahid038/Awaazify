import React, { useState, useEffect } from 'react';
import {
  Play,
  Square,
  ArrowRight,
  Music,
  Check,
  Mic,
  Headphones,
  Gift,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { NeonNoirVoiceCard } from '../components/NeonNoirVoiceCard';
import { studioAudio } from '../utils/audioEngine';

const SOUNDWAVE_BARS = [
  32, 58, 76, 48, 92, 68, 84, 52, 96, 74, 62, 88, 100, 78, 54, 86, 94, 70, 44,
  72, 90, 64, 50, 82, 76, 60,
];

export const PublicHome: React.FC = () => {
  const {
    regionMode,
    voiceModels,
    setPublicPage,
    requireAuthAndNavigate,
  } = useApp();

  const [showcaseMode, setShowcaseMode] = useState<'original' | 'converted'>(
    'converted'
  );
  const [isShowcasePlaying, setIsShowcasePlaying] = useState(false);
  const [scrubPosition, setScrubPosition] = useState(38);

  useEffect(() => {
    let timer: number | undefined;
    if (isShowcasePlaying) {
      timer = window.setInterval(() => {
        setScrubPosition((prev) => (prev >= 100 ? 0 : prev + 3));
      }, 300);
    }
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [isShowcasePlaying]);

  useEffect(() => {
    return () => {
      if (studioAudio.isPlaying('hero_showcase')) {
        studioAudio.stopAll();
      }
    };
  }, []);

  const handleToggleShowcasePlay = () => {
    const started = studioAudio.playStudioPreview({
      id: 'hero_showcase',
      baseFreqHz: showcaseMode === 'converted' ? 220 : 196,
      mode: showcaseMode,
      durationMs: 12000,
      onEnded: () => setIsShowcasePlaying(false),
    });
    setIsShowcasePlaying(started);
  };

  const handleSwitchShowcaseMode = (mode: 'original' | 'converted') => {
    setShowcaseMode(mode);
    if (isShowcasePlaying) {
      studioAudio.stopAll();
      const started = studioAudio.playStudioPreview({
        id: 'hero_showcase',
        baseFreqHz: mode === 'converted' ? 220 : 196,
        mode,
        durationMs: 12000,
        onEnded: () => setIsShowcasePlaying(false),
      });
      setIsShowcasePlaying(started);
    }
  };

  const featuredModels = voiceModels
    .filter((m) => m.status !== 'Hidden' && !m.isCustom)
    .slice(0, 6);

  const singleSongPrice = regionMode === 'PK' ? 'Rs. 50' : '$0.99';
  const customVoicePrice = regionMode === 'PK' ? 'Rs. 150' : '$2.99';

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A]">
      {/* 1. HERO SECTION */}
      <section className="relative pt-10 pb-14 lg:pt-14 lg:pb-20 overflow-hidden border-b border-slate-200/80 bg-gradient-to-b from-emerald-50/70 via-[#F8FAFC] to-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left 7 Columns */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold text-amber-900 bg-[#FEF3C7] px-3.5 py-2 rounded-2xl shadow-2xs">
                <Gift className="w-4 h-4 text-[#F59E0B] shrink-0" />
                <span>Free Starter Gift: 1 Free 30-Second Song Preview</span>
              </div>

              <h1
                className="font-extrabold tracking-tight text-[#0F172A] leading-[1.12]"
                style={{
                  fontSize: 'clamp(2rem, 3.8vw, 3.4rem)',
                  textWrap: 'balance',
                }}
              >
                Turn Any Song Into Your Favorite Voice in{' '}
                <span className="text-[#059669]">3 Simple Steps</span>
              </h1>

              <p className="text-sm sm:text-base md:text-lg text-slate-600 max-w-2xl leading-relaxed font-medium">
                Upload an MP3 or paste a YouTube link, choose a voice model or train your own 3-minute custom voice, and download your finished track with original background music.
              </p>

              {/* CTA Buttons */}
              <div className="pt-1 flex flex-wrap items-center gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => requireAuthAndNavigate('song-cover')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-sm sm:text-base shadow-md transition-all cursor-pointer whitespace-nowrap"
                >
                  <Music className="w-5 h-5" />
                  <span>Create Song Cover</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => requireAuthAndNavigate('train-voice')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white hover:bg-amber-50 text-[#0F172A] border border-slate-200 hover:border-[#F59E0B] font-extrabold text-sm sm:text-base transition-all cursor-pointer whitespace-nowrap shadow-2xs"
                >
                  <Mic className="w-5 h-5 text-[#F59E0B]" />
                  <span>Train Your Voice</span>
                </button>
              </div>

              {/* Trust Strip */}
              <div className="pt-1 flex flex-wrap items-center gap-y-1.5 text-xs sm:text-sm text-slate-600 font-bold">
                <span>✓ 1 Free Song</span>
                <span className="mx-2.5 text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span>✓ Full Song {singleSongPrice}</span>
                <span className="mx-2.5 text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span>✓ 1 Free Retry Included</span>
              </div>
            </div>

            {/* Right 5 Columns: Interactive Before & After Audio Showcase */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl bg-white border border-slate-200/90 shadow-lg p-5 sm:p-7 space-y-5">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-extrabold text-[#059669] uppercase tracking-wide">
                      Interactive Audio Demo
                    </span>
                    <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A] mt-0.5">
                      Original Track vs. AI Voice Cover
                    </h2>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-[#FEF3C7] flex items-center justify-center text-[#F59E0B] shrink-0">
                    <Headphones className="w-5 h-5" />
                  </div>
                </div>

                {/* Toggle Buttons */}
                <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-100 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleSwitchShowcaseMode('original')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      showcaseMode === 'original'
                        ? 'bg-white text-[#0F172A] shadow-2xs border border-slate-200'
                        : 'text-slate-600 hover:text-[#0F172A]'
                    }`}
                  >
                    Original Singer
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchShowcaseMode('converted')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      showcaseMode === 'converted'
                        ? 'bg-[#10B981] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-[#0F172A]'
                    }`}
                  >
                    AI Voice Cover
                  </button>
                </div>

                {/* Soundwave Visualizer */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50/70 via-white to-amber-50/70 border border-slate-200/80 space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold gap-2">
                    <span className="text-[#0F172A] truncate">
                      {showcaseMode === 'converted'
                        ? 'Atif Aslam Voice + Original Music'
                        : 'Original Vocal Track'}
                    </span>
                    <span className="text-[#059669] shrink-0">
                      {showcaseMode === 'converted' ? 'AI Cover' : 'Original'}
                    </span>
                  </div>

                  <div className="h-20 flex items-end justify-between gap-1 px-1">
                    {SOUNDWAVE_BARS.map((baseHeight, idx) => {
                      const isPassed =
                        (idx / SOUNDWAVE_BARS.length) * 100 <= scrubPosition;
                      return (
                        <div
                          key={idx}
                          className={`flex-1 rounded-full transition-all duration-150 ${
                            isShowcasePlaying ? 'animate-soundwave' : ''
                          } ${
                            showcaseMode === 'converted'
                              ? isPassed
                                ? idx % 3 === 0
                                  ? 'bg-[#F59E0B]'
                                  : 'bg-[#10B981]'
                                : 'bg-emerald-200'
                              : isPassed
                              ? 'bg-slate-700'
                              : 'bg-slate-200'
                          }`}
                          style={{
                            height: `${baseHeight}%`,
                            animationDelay: `${(idx % 6) * 0.12}s`,
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Scrubber */}
                  <div className="space-y-1">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={scrubPosition}
                      onChange={(e) => setScrubPosition(Number(e.target.value))}
                      aria-label="Audio showcase progress"
                      className="w-full accent-[#10B981] cursor-pointer h-1.5"
                    />
                    <div className="flex items-center justify-between text-xs text-slate-500 font-bold tabular-nums">
                      <span>
                        00:
                        {Math.floor((scrubPosition / 100) * 30)
                          .toString()
                          .padStart(2, '0')}
                      </span>
                      <span>Toggle modes while playing</span>
                      <span>00:30</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleShowcasePlay}
                  className={`w-full py-3.5 px-5 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs ${
                    isShowcasePlaying
                      ? 'bg-[#F59E0B] text-[#0F172A]'
                      : 'bg-[#10B981] hover:bg-[#059669] text-white'
                  }`}
                >
                  {isShowcasePlaying ? (
                    <>
                      <Square className="w-4 h-4 fill-current" />
                      <span>Stop Audio</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Play Audio Comparison</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 3 SIMPLE STEPS */}
      <section className="py-12 lg:py-16 border-b border-slate-200/80 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-extrabold text-[#059669] uppercase tracking-wider">
              How It Works
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] mt-1">
              Studio Song Covers in 3 Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-3xl bg-[#F8FAFC] border border-slate-200/90 p-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-2xl flex items-center justify-center mx-auto">
                🎵
              </div>
              <div className="text-xs font-extrabold text-[#059669] uppercase">
                Step 1
              </div>
              <h3 className="text-lg font-extrabold text-[#0F172A]">
                Add Any Song
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Upload an MP3 audio file or paste a YouTube link and select your favorite chorus.
              </p>
            </div>

            <div className="rounded-3xl bg-[#F8FAFC] border border-slate-200/90 p-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#FEF3C7] text-2xl flex items-center justify-center mx-auto">
                🗣️
              </div>
              <div className="text-xs font-extrabold text-amber-700 uppercase">
                Step 2
              </div>
              <h3 className="text-lg font-extrabold text-[#0F172A]">
                Choose a Voice
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Select from famous artists and public figures or record a 3-minute sample of your own voice.
              </p>
            </div>

            <div className="rounded-3xl bg-[#F8FAFC] border border-slate-200/90 p-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-2xl flex items-center justify-center mx-auto">
                🎧
              </div>
              <div className="text-xs font-extrabold text-[#059669] uppercase">
                Step 3
              </div>
              <h3 className="text-lg font-extrabold text-[#0F172A]">
                Download & Share
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                Download your finished MP3 song mixed with the original background music, plus 1 Free Retry.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FEATURED VOICE MODELS */}
      <section className="py-12 lg:py-16 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-extrabold text-[#059669] uppercase tracking-wider">
                Featured Catalog
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] mt-1">
                Explore Popular Voice Models
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setPublicPage('voices')}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-[#059669] hover:text-[#10B981] transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
            >
              <span>
                View All Voices ({voiceModels.filter((m) => m.status !== 'Hidden').length}) →
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredModels.map((model) => (
              <NeonNoirVoiceCard
                key={model.id}
                model={model}
                onSelectVoice={(m) => requireAuthAndNavigate('song-cover', m.id)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 4. 2-PACKAGE PRICING OVERVIEW */}
      <section className="py-12 lg:py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-extrabold text-[#059669] uppercase tracking-wider">
              Pay As You Go
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] mt-1">
              2 Simple Packages + 1 Free Preview
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* Package 1 */}
            <div className="rounded-3xl bg-[#F8FAFC] border-2 border-[#10B981] shadow-sm p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="text-xs font-extrabold text-[#059669] uppercase">
                  Package 1 · Single Track
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] mt-1.5">
                  1 Full Song Cover
                </h3>
                <div className="mt-3 flex items-baseline gap-2 tabular-nums">
                  <span className="text-3xl sm:text-4xl font-extrabold text-[#059669]">
                    {singleSongPrice}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-500">
                    / Full Song
                  </span>
                </div>

                <ul className="mt-5 space-y-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                    <span>Convert 1 full-length song into any voice model</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                    <span>Automatic vocal separation and background music mixing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                    <span className="font-bold text-[#059669]">
                      Includes 1 Free Retry to adjust vocal tone
                    </span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => requireAuthAndNavigate('wallet')}
                className="mt-7 w-full py-3.5 px-5 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-sm shadow-2xs transition-all cursor-pointer"
              >
                Get 1 Full Song ({singleSongPrice})
              </button>
            </div>

            {/* Package 2 */}
            <div className="rounded-3xl bg-gradient-to-br from-amber-50/80 via-white to-emerald-50/60 border-2 border-[#F59E0B] shadow-sm p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="text-xs font-extrabold text-amber-800 uppercase">
                  Package 2 · Custom Voice Bundle
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] mt-1.5">
                  Custom Voice + 1 Free Song
                </h3>
                <div className="mt-3 flex items-baseline gap-2 tabular-nums">
                  <span className="text-3xl sm:text-4xl font-extrabold text-[#0F172A]">
                    {customVoicePrice}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-500">
                    / Custom Voice + 1 Song
                  </span>
                </div>

                <ul className="mt-5 space-y-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                    <span>Record or upload 3 minutes (03:00) of your own voice</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                    <span>Automatic background noise removal</span>
                  </li>
                  <li className="flex items-start gap-2">
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
                Train Your Voice ({customVoicePrice})
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
