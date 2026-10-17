import React, { useState, useEffect } from 'react';
import { Play, Square, Check, Music, Sparkles } from 'lucide-react';
import { VoiceModel } from '../types';
import { studioAudio } from '../utils/audioEngine';

interface VoiceCardProps {
  model: VoiceModel;
  onSelectVoice: (model: VoiceModel) => void;
  isSelected?: boolean;
  compact?: boolean;
  ctaLabel?: string;
}

const GRADIENT_THEMES: Record<
  VoiceModel['avatarConfig']['gradientTheme'],
  { bg: string; accent: string; ring: string }
> = {
  emerald: {
    bg: 'from-emerald-100 via-teal-50 to-amber-50',
    accent: '#059669',
    ring: '#10B981',
  },
  amber: {
    bg: 'from-amber-100 via-orange-50 to-yellow-50',
    accent: '#D97706',
    ring: '#F59E0B',
  },
  sky: {
    bg: 'from-sky-100 via-cyan-50 to-emerald-50',
    accent: '#0284C7',
    ring: '#0EA5E9',
  },
  rose: {
    bg: 'from-rose-100 via-pink-50 to-amber-50',
    accent: '#E11D48',
    ring: '#F43F5E',
  },
  violet: {
    bg: 'from-purple-100 via-indigo-50 to-pink-50',
    accent: '#7C3AED',
    ring: '#8B5CF6',
  },
};

export const NeonNoirVoiceCard: React.FC<VoiceCardProps> = ({
  model,
  onSelectVoice,
  isSelected = false,
  compact = false,
  ctaLabel = 'Use Voice',
}) => {
  const [isPlayingSample, setIsPlayingSample] = useState(false);
  const sampleId = `sample_${model.id}`;

  useEffect(() => {
    return () => {
      if (studioAudio.isPlaying(sampleId)) {
        studioAudio.stopAll();
      }
    };
  }, [sampleId]);

  const handleToggleSample = (e: React.MouseEvent) => {
    e.stopPropagation();
    const started = studioAudio.playStudioPreview({
      id: sampleId,
      baseFreqHz: model.avatarConfig.baseFreqHz || 220,
      mode: 'converted',
      pitchShiftSemitones: model.defaultPitch || 0,
      durationMs: 5000,
      onEnded: () => setIsPlayingSample(false),
    });
    setIsPlayingSample(started);
  };

  const theme =
    GRADIENT_THEMES[model.avatarConfig.gradientTheme] || GRADIENT_THEMES.emerald;

  return (
    <div
      onClick={() => onSelectVoice(model)}
      className={`group relative flex flex-col justify-between rounded-3xl bg-white transition-all duration-200 cursor-pointer overflow-hidden min-w-0 ${
        isSelected
          ? 'border-2 border-[#10B981] shadow-[0_8px_30px_rgba(16,185,129,0.2)] ring-4 ring-[#10B981]/15'
          : 'border border-slate-200/90 shadow-xs hover:shadow-md hover:border-[#10B981]/60'
      }`}
    >
      {/* Illustrated Portrait Header */}
      <div
        className={`relative w-full ${
          compact ? 'h-40' : 'h-48'
        } bg-gradient-to-br ${
          theme.bg
        } overflow-hidden flex items-center justify-center border-b border-slate-100`}
      >
        <svg
          viewBox="0 0 220 180"
          className="w-full h-full relative z-10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="110"
            cy="92"
            r={isPlayingSample ? '68' : '60'}
            fill="#FFFFFF"
            fillOpacity="0.65"
            className="transition-all duration-300"
          />
          <circle
            cx="110"
            cy="92"
            r={isPlayingSample ? '54' : '48'}
            stroke={theme.ring}
            strokeOpacity={isPlayingSample ? '0.65' : '0.28'}
            strokeWidth="2.5"
            strokeDasharray="6 6"
          />

          {[-56, -45, -34, 34, 45, 56].map((offset, idx) => {
            const barHeight = isPlayingSample
              ? idx % 2 === 0
                ? 42
                : 28
              : idx % 2 === 0
              ? 20
              : 12;
            return (
              <rect
                key={offset}
                x={110 + offset - 2}
                y={90 - barHeight / 2}
                width="4"
                height={barHeight}
                rx="2"
                fill={idx % 2 === 0 ? '#10B981' : '#F59E0B'}
                className="transition-all duration-200"
              />
            );
          })}

          <path
            d="M58 176C61 138 80 122 110 122C140 122 159 138 162 176Z"
            fill={theme.accent}
          />
          <path
            d="M92 124L110 144L128 124"
            stroke="#FFFFFF"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M75 80C75 54 90 38 110 38C130 38 145 54 145 80"
            stroke="#0F172A"
            strokeWidth="5"
            strokeLinecap="round"
          />

          <rect
            x="67"
            y="68"
            width="13"
            height="26"
            rx="6.5"
            fill="#F59E0B"
            stroke="#0F172A"
            strokeWidth="2.5"
          />
          <rect
            x="140"
            y="68"
            width="13"
            height="26"
            rx="6.5"
            fill="#F59E0B"
            stroke="#0F172A"
            strokeWidth="2.5"
          />

          <circle
            cx="110"
            cy="80"
            r="30"
            fill="#FDE68A"
            stroke="#0F172A"
            strokeWidth="2.5"
          />

          <path
            d="M82 72C84 52 96 44 112 44C127 44 137 53 138 72C131 63 121 60 110 60C98 60 89 64 82 72Z"
            fill="#0F172A"
          />

          <circle cx="99" cy="78" r="3" fill="#0F172A" />
          <circle cx="121" cy="78" r="3" fill="#0F172A" />
          <path
            d="M100 91C104 96 116 96 120 91"
            stroke="#0F172A"
            strokeWidth="2.8"
            strokeLinecap="round"
          />

          <rect
            x="104"
            y="108"
            width="12"
            height="18"
            rx="6"
            fill="#10B981"
            stroke="#0F172A"
            strokeWidth="2"
          />
          <line
            x1="110"
            y1="126"
            x2="110"
            y2="176"
            stroke="#0F172A"
            strokeWidth="2.5"
          />
        </svg>

        {/* Top Row: Clean Unboxed Category Metadata */}
        <div className="absolute top-3 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
          <span className="text-xs font-bold text-slate-700 truncate">
            {model.isCustom ? 'My Custom Voice' : model.category}
          </span>
          {isSelected && (
            <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#059669] shrink-0">
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Selected</span>
            </span>
          )}
        </div>

        {/* 5s Demo Button */}
        <button
          type="button"
          onClick={handleToggleSample}
          className={`absolute bottom-3 right-3 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shadow-xs cursor-pointer whitespace-nowrap shrink-0 ${
            isPlayingSample
              ? 'bg-[#F59E0B] text-[#0F172A]'
              : 'bg-white/95 hover:bg-white text-[#0F172A] border border-slate-200'
          }`}
        >
          {isPlayingSample ? (
            <>
              <Square className="w-3 h-3 fill-current" />
              <span>Stop</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3 fill-current text-[#10B981]" />
              <span>5s Demo</span>
            </>
          )}
        </button>
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-3.5 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base sm:text-lg font-extrabold text-[#0F172A] group-hover:text-[#059669] transition-colors truncate">
              {model.name}
            </h3>
            <Music className="w-4 h-4 text-[#F59E0B] shrink-0" />
          </div>
          <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
            {model.subtitle}
          </p>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 min-w-0">
          <span className="text-xs text-slate-500 font-medium tabular-nums truncate">
            {model.usageCount.toLocaleString()} covers
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectVoice(model);
            }}
            className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              isSelected
                ? 'bg-[#10B981] text-white shadow-xs'
                : 'bg-emerald-50 hover:bg-[#10B981] text-[#059669] hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isSelected ? 'Selected' : ctaLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
