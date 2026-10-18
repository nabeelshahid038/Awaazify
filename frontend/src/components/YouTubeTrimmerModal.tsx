import React, { useState, useEffect } from 'react';
import { X, Scissors, Play, Square, Check, CreditCard } from 'lucide-react';
import { TrimmedYouTubeSelection } from '../types';
import { useApp } from '../context/AppContext';
import { studioAudio } from '../utils/audioEngine';

interface YouTubeTrimmerModalProps {
  isOpen: boolean;
  youtubeUrl: string;
  onClose: () => void;
  onConfirm: (selection: TrimmedYouTubeSelection) => void;
  // P1: real metadata when the caller fetched it via /api/v1/utils/youtube-meta.
  // All optional — sensible placeholders are used when absent.
  videoTitle?: string;
  channelName?: string;
  totalDurationSec?: number;
}

export const formatTimecode = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const WAVEFORM_BARS = [
  28, 42, 56, 44, 68, 82, 52, 88, 94, 76, 62, 90, 98, 84, 70, 92, 100, 95, 78,
  64, 86, 92, 88, 74, 58, 72, 96, 98, 86, 80, 66, 60, 74, 90, 94, 82, 68, 54,
  46, 62, 78, 84, 72, 58, 44, 36, 30, 24,
];

export const YouTubeTrimmerModal: React.FC<YouTubeTrimmerModalProps> = ({
  isOpen,
  youtubeUrl,
  onClose,
  onConfirm,
  videoTitle: videoTitleProp,
  channelName: channelNameProp,
  totalDurationSec: totalDurationSecProp,
}) => {
  const { wallet, regionMode, setStudioTool } = useApp();
  const isTrialMode = wallet.credits === 0;
  // P1: use the real video duration when the caller provides one;
  // fall back to 04:00 (the metadata endpoint does not return duration yet).
  const totalDurationSec =
    totalDurationSecProp && totalDurationSecProp > 0
      ? Math.round(totalDurationSecProp)
      : 240;

  const [startSec, setStartSec] = useState<number>(60);
  const [endSec, setEndSec] = useState<number>(90);
  const [convertFullTrack, setConvertFullTrack] = useState<boolean>(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);

  useEffect(() => {
    if (isTrialMode) {
      setConvertFullTrack(false);
      setStartSec(60);
      setEndSec(90);
    }
  }, [isTrialMode, isOpen]);

  useEffect(() => {
    return () => {
      if (studioAudio.isPlaying('yt_trimmer_preview')) {
        studioAudio.stopAll();
      }
    };
  }, []);

  if (!isOpen) return null;

  // P1: real YouTube title/author when provided; placeholder otherwise.
  const videoTitle = videoTitleProp || 'Selected YouTube Track';
  const channelName = channelNameProp || 'YouTube Audio';

  const handleStartChange = (newStart: number) => {
    if (isTrialMode) {
      const clampedStart = Math.max(0, Math.min(totalDurationSec - 30, newStart));
      setStartSec(clampedStart);
      setEndSec(clampedStart + 30);
    } else {
      setConvertFullTrack(false);
      const clampedStart = Math.max(0, Math.min(endSec - 10, newStart));
      setStartSec(clampedStart);
    }
  };

  const handleEndChange = (newEnd: number) => {
    if (isTrialMode) {
      const clampedEnd = Math.max(30, Math.min(totalDurationSec, newEnd));
      setEndSec(clampedEnd);
      setStartSec(clampedEnd - 30);
    } else {
      setConvertFullTrack(false);
      const clampedEnd = Math.max(startSec + 10, Math.min(totalDurationSec, newEnd));
      setEndSec(clampedEnd);
    }
  };

  const handleSelectFullVideo = () => {
    if (isTrialMode) return;
    setConvertFullTrack(true);
    setStartSec(0);
    setEndSec(totalDurationSec);
  };

  const handleQuickChorusPreset = (presetStart: number) => {
    setConvertFullTrack(false);
    setStartSec(presetStart);
    setEndSec(Math.min(totalDurationSec, presetStart + 30));
  };

  const handleToggleAudioPreview = () => {
    const playing = studioAudio.playStudioPreview({
      id: 'yt_trimmer_preview',
      baseFreqHz: 220,
      mode: 'original',
      durationMs: 5000,
      onEnded: () => setIsPlayingPreview(false),
    });
    setIsPlayingPreview(playing);
  };

  const handleConfirm = () => {
    studioAudio.stopAll();
    onConfirm({
      youtubeUrl,
      videoTitle,
      channelName,
      totalDurationSec,
      startTimeSec: convertFullTrack ? 0 : startSec,
      endTimeSec: convertFullTrack ? totalDurationSec : endSec,
      isTrialClip: isTrialMode,
    });
  };

  const leftPercent = ((convertFullTrack ? 0 : startSec) / totalDurationSec) * 100;
  const rightPercent = ((convertFullTrack ? totalDurationSec : endSec) / totalDurationSec) * 100;
  const selectedDuration =
    (convertFullTrack ? totalDurationSec : endSec) -
    (convertFullTrack ? 0 : startSec);

  const singleSongPrice = regionMode === 'PK' ? 'Rs. 50' : '$0.99';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white border border-slate-200 shadow-2xl p-5 sm:p-7">
        {/* Top Modal Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#059669] shrink-0">
              <Scissors className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-extrabold text-[#0F172A] truncate">
                Select Song Segment
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                {videoTitle} · {channelName}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Total Length: 00:00 — {formatTimecode(totalDurationSec)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              studioAudio.stopAll();
              onClose();
            }}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Banner: Free Trial 30s vs Paid Full Song */}
        {isTrialMode ? (
          <div className="mt-4 p-4 rounded-2xl bg-[#FEF3C7]/80 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs sm:text-sm text-amber-950 font-semibold leading-relaxed">
              Free Trial: Select any 30-second segment. Unlock full-length songs for {singleSongPrice}.
            </div>
            <button
              type="button"
              onClick={() => {
                studioAudio.stopAll();
                onClose();
                setStudioTool('wallet');
              }}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-amber-600 text-white text-xs font-extrabold whitespace-nowrap shrink-0 transition-colors cursor-pointer shadow-2xs"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Unlock Full Song ({singleSongPrice})</span>
            </button>
          </div>
        ) : (
          <div className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs sm:text-sm text-emerald-950 font-bold">
              Credits Available: Convert the full track or select a custom clip.
            </div>
            <button
              type="button"
              onClick={handleSelectFullVideo}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                convertFullTrack
                  ? 'bg-[#10B981] text-white shadow-2xs'
                  : 'bg-white text-[#059669] border border-emerald-300 hover:bg-emerald-100'
              }`}
            >
              Select Full Track
            </button>
          </div>
        )}

        {/* Quick Part Buttons & Play Preview */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickChorusPreset(15)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              Intro (00:15)
            </button>
            <button
              type="button"
              onClick={() => handleQuickChorusPreset(60)}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-extrabold text-[#059669] transition-colors cursor-pointer"
            >
              Main Chorus (01:00 – 01:30)
            </button>
            <button
              type="button"
              onClick={() => handleQuickChorusPreset(120)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
            >
              Verse 2 (02:00)
            </button>
          </div>

          <button
            type="button"
            onClick={handleToggleAudioPreview}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-xs font-extrabold text-amber-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isPlayingPreview ? (
              <>
                <Square className="w-3.5 h-3.5 text-[#F59E0B] fill-current" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-[#F59E0B] fill-current" />
                <span>Preview Segment</span>
              </>
            )}
          </button>
        </div>

        {/* Waveform Timeline Box */}
        <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold tabular-nums mb-3">
            <div>
              <span className="text-slate-500">Start: </span>
              <span className="text-[#0F172A]">
                {formatTimecode(convertFullTrack ? 0 : startSec)}
              </span>
            </div>
            <div className="text-[#059669] font-extrabold">
              {selectedDuration}s {isTrialMode ? '(30s Preview)' : convertFullTrack ? '(Full Track)' : ''}
            </div>
            <div>
              <span className="text-slate-500">End: </span>
              <span className="text-[#0F172A]">
                {formatTimecode(convertFullTrack ? totalDurationSec : endSec)}
              </span>
            </div>
          </div>

          {/* Music Wave Bar with Green Highlight Box */}
          <div className="relative h-20 w-full rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center px-2 select-none">
            <div
              className="absolute top-0 bottom-0 bg-[#10B981]/20 border-x-4 border-[#10B981] transition-all duration-75 pointer-events-none"
              style={{
                left: `${leftPercent}%`,
                width: `${Math.max(2, rightPercent - leftPercent)}%`,
              }}
            />

            <div className="w-full h-14 flex items-center justify-between gap-1 relative z-10">
              {WAVEFORM_BARS.map((heightPct, idx) => {
                const barPosPct = (idx / WAVEFORM_BARS.length) * 100;
                const isInsideSelection =
                  barPosPct >= leftPercent && barPosPct <= rightPercent;
                return (
                  <div
                    key={idx}
                    className={`flex-1 rounded-full transition-colors ${
                      isInsideSelection ? 'bg-[#10B981]' : 'bg-slate-200'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                );
              })}
            </div>
          </div>

          {/* Range Sliders */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1.5">
                <span>{isTrialMode ? 'Slide 30s Window' : 'Start Time'}</span>
                <span className="font-mono tabular-nums text-[#0F172A]">
                  {formatTimecode(convertFullTrack ? 0 : startSec)}
                </span>
              </label>
              <input
                type="range"
                min={0}
                max={totalDurationSec - (isTrialMode ? 30 : 10)}
                step={1}
                value={convertFullTrack ? 0 : startSec}
                onChange={(e) => handleStartChange(Number(e.target.value))}
                className="w-full accent-[#10B981] cursor-pointer"
              />
            </div>

            <div>
              <label className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1.5">
                <span>{isTrialMode ? 'End Time (+30s)' : 'End Time'}</span>
                <span className="font-mono tabular-nums text-[#0F172A]">
                  {formatTimecode(convertFullTrack ? totalDurationSec : endSec)}
                </span>
              </label>
              <input
                type="range"
                min={isTrialMode ? 30 : 10}
                max={totalDurationSec}
                step={1}
                value={convertFullTrack ? totalDurationSec : endSec}
                onChange={(e) => handleEndChange(Number(e.target.value))}
                className="w-full accent-[#10B981] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Bottom Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              studioAudio.stopAll();
              onClose();
            }}
            className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-xs sm:text-sm font-bold text-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white text-xs sm:text-sm font-extrabold shadow-sm transition-all cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>
              Confirm ({formatTimecode(convertFullTrack ? 0 : startSec)} –{' '}
              {formatTimecode(convertFullTrack ? totalDurationSec : endSec)})
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
