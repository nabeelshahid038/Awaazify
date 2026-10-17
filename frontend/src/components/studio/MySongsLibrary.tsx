import React, { useState, useRef } from 'react';
import {
  Music,
  Play,
  Square,
  Download,
  RefreshCcw,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { GeneratedSong, RetryAdjustmentOption } from '../../types';
import { studioAudio } from '../../utils/audioEngine';

export const MySongsLibrary: React.FC = () => {
  const {
    generatedSongs,
    applyFreeRetryAdjustment,
    setStudioTool,
  } = useApp();

  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const [openRetryId, setOpenRetryId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const htmlAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopAllAudio = () => {
    studioAudio.stopAll();
    if (htmlAudioRef.current) {
      htmlAudioRef.current.pause();
      htmlAudioRef.current.currentTime = 0;
      htmlAudioRef.current = null;
    }
    setPlayingSongId(null);
  };

  const handleTogglePlay = (song: GeneratedSong) => {
    if (playingSongId === song.id) {
      stopAllAudio();
      return;
    }

    stopAllAudio();

    const audioUrl = song.outputAudioUrl || song.audioUrl;
    if (audioUrl && (audioUrl.startsWith('http://') || audioUrl.startsWith('https://') || audioUrl.startsWith('/'))) {
      try {
        const audio = new Audio(audioUrl);
        htmlAudioRef.current = audio;
        audio.onended = () => {
          setPlayingSongId(null);
          htmlAudioRef.current = null;
        };
        audio.onerror = () => {
          const started = studioAudio.playStudioPreview({
            id: `lib_${song.id}`,
            baseFreqHz: song.baseFreqHz,
            mode: 'converted',
            pitchShiftSemitones: song.pitchShift,
            clarityBoost: song.clarityBoost,
            durationMs: 15000,
            onEnded: () => setPlayingSongId(null),
          });
          setPlayingSongId(started ? song.id : null);
        };
        audio.play().then(() => {
          setPlayingSongId(song.id);
        }).catch(() => {
          const started = studioAudio.playStudioPreview({
            id: `lib_${song.id}`,
            baseFreqHz: song.baseFreqHz,
            mode: 'converted',
            pitchShiftSemitones: song.pitchShift,
            clarityBoost: song.clarityBoost,
            durationMs: 15000,
            onEnded: () => setPlayingSongId(null),
          });
          setPlayingSongId(started ? song.id : null);
        });
        return;
      } catch (e) {
        console.warn('Audio play exception:', e);
      }
    }

    const started = studioAudio.playStudioPreview({
      id: `lib_${song.id}`,
      baseFreqHz: song.baseFreqHz,
      mode: 'converted',
      pitchShiftSemitones: song.pitchShift,
      clarityBoost: song.clarityBoost,
      durationMs: 15000,
      onEnded: () => setPlayingSongId(null),
    });
    setPlayingSongId(started ? song.id : null);
  };

  const handleDownloadSong = (song: GeneratedSong) => {
    const audioUrl = song.outputAudioUrl || song.audioUrl;
    const filename = `${song.voiceModelName.toLowerCase().replace(/\s+/g, '_')}_song.mp3`;

    if (audioUrl && (audioUrl.startsWith('http://') || audioUrl.startsWith('https://'))) {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = filename;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      studioAudio.downloadMasterAudioFile(
        filename.replace('.mp3', '.wav'),
        song.baseFreqHz,
        6,
        song.pitchShift
      );
    }
  };

  const handleRetry = async (songId: string, option: RetryAdjustmentOption) => {
    stopAllAudio();
    setRetryingId(songId);
    await applyFreeRetryAdjustment(songId, option);
    setRetryingId(null);
    setOpenRetryId(null);
  };

  return (
    <div className="space-y-6 sm:space-y-8 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A]">
            My Songs ({generatedSongs.length})
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
            Play your generated tracks, download MP3 files, or apply your 1 Free Retry.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setStudioTool('song-cover')}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-xs sm:text-sm shadow-2xs cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>Create New Song</span>
        </button>
      </div>

      {generatedSongs.length === 0 ? (
        <div className="p-10 sm:p-12 rounded-3xl bg-white border border-slate-200 shadow-2xs text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-[#10B981] mx-auto">
            <Music className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-extrabold text-[#0F172A]">
              No Songs Generated Yet
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-md mx-auto">
              Create your first 30-second song preview or full-length cover and it will appear here.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStudioTool('song-cover')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-xs sm:text-sm cursor-pointer shadow-2xs"
          >
            <Sparkles className="w-4 h-4" />
            <span>Create Song Cover</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {generatedSongs.map((song) => {
            const isPlaying = playingSongId === song.id;
            const isRetryOpen = openRetryId === song.id;
            return (
              <div
                key={song.id}
                className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 hover:border-[#10B981] shadow-2xs space-y-4 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base sm:text-lg font-extrabold text-[#0F172A] truncate">
                        {song.title}
                      </h3>
                      <span className="text-xs font-extrabold text-[#059669]">
                        · {song.isTrialPreview ? '30s Preview' : 'Full Song'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-bold truncate">
                      {song.sourceLabel} · {song.durationSec}s · {song.createdAt}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTogglePlay(song)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-emerald-50 text-xs font-extrabold text-[#0F172A] cursor-pointer"
                    >
                      {isPlaying ? (
                        <>
                          <Square className="w-4 h-4 text-[#10B981] fill-current" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 text-[#10B981] fill-current" />
                          <span>Play</span>
                        </>
                      )}
                    </button>

                    {!song.hasUsedFreeRetry ? (
                      <button
                        type="button"
                        onClick={() =>
                          setOpenRetryId(isRetryOpen ? null : song.id)
                        }
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#FEF3C7] hover:bg-amber-200 text-xs font-extrabold text-amber-950 cursor-pointer"
                      >
                        <RefreshCcw className="w-3.5 h-3.5 text-[#F59E0B]" />
                        <span>1 Free Retry</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-[#059669] font-extrabold px-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Retry Applied</span>
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDownloadSong(song)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-extrabold cursor-pointer shadow-2xs"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download MP3</span>
                    </button>
                  </div>
                </div>

                {isRetryOpen && !song.hasUsedFreeRetry && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="text-xs font-extrabold text-[#0F172A]">
                      Select Vocal Adjustment (1 Free Retry):
                    </div>
                    {retryingId === song.id ? (
                      <div className="text-xs font-extrabold text-[#059669]">
                        Updating vocal tone and remixing track...
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleRetry(song.id, 'deeper')}
                          className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-[#10B981] text-left text-xs font-extrabold text-[#0F172A] cursor-pointer"
                        >
                          Make Voice Deeper
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRetry(song.id, 'higher')}
                          className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-[#10B981] text-left text-xs font-extrabold text-[#0F172A] cursor-pointer"
                        >
                          Make Voice Higher
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRetry(song.id, 'clarity')}
                          className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-[#10B981] text-left text-xs font-extrabold text-[#0F172A] cursor-pointer"
                        >
                          Boost Vocal Clarity
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
