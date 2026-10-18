import React, { useState, useRef } from 'react';
import {
  Upload,
  Youtube,
  Sparkles,
  Play,
  Square,
  Download,
  RefreshCcw,
  CheckCircle2,
  CreditCard,
  Scissors,
  Music,
  Mic,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NeonNoirVoiceCard } from '../NeonNoirVoiceCard';
import { YouTubeTrimmerModal, formatTimecode } from '../YouTubeTrimmerModal';
import {
  GeneratedSong,
  RetryAdjustmentOption,
  TrimmedYouTubeSelection,
} from '../../types';
import { awaazifyApi } from '../../services/api';
import { studioAudio } from '../../utils/audioEngine';

const VOICE_FILTER_TABS = [
  { id: 'All', label: 'All Voices' },
  { id: 'Custom', label: 'My Voices' },
  { id: 'Singers', label: 'Singers' },
  { id: 'Cricketers & Celebs', label: 'Cricketers & Celebs' },
  { id: 'Public Leaders', label: 'Public Leaders' },
  { id: 'Global Stars', label: 'Global Stars' },
] as const;

export const SongCoverTool: React.FC = () => {
  const {
    regionMode,
    user,
    wallet,
    formattedBalance,
    voiceModels,
    selectedVoiceId,
    setSelectedVoiceId,
    consumeSongPassOrTrial,
    refreshWallet,
    addGeneratedSong,
    applyFreeRetryAdjustment,
    setStudioTool,
  } = useApp();

  // Step 1: Song Input State
  const [inputMode, setInputMode] = useState<'upload' | 'youtube'>('youtube');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [youtubeUrlInput, setYoutubeUrlInput] = useState<string>('');
  const [isTrimmerOpen, setIsTrimmerOpen] = useState<boolean>(false);
  const [trimmedYoutube, setTrimmedYoutube] =
    useState<TrimmedYouTubeSelection | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const htmlAudioRef = useRef<HTMLAudioElement | null>(null);

  // Step 2: Voice Filter State
  const [voiceTab, setVoiceTab] = useState<string>('All');

  // Step 3: Generation Progress & Output State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progressStage, setProgressStage] = useState<1 | 2 | 3>(1);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [activeOutputSong, setActiveOutputSong] =
    useState<GeneratedSong | null>(null);
  const [isPlayingOutput, setIsPlayingOutput] = useState<boolean>(false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string>('');

  const selectedModel =
    voiceModels.find((m) => m.id === selectedVoiceId) || voiceModels[0];

  const filteredModels = voiceModels.filter((m) => {
    if (m.status === 'Hidden') return false;
    // Privacy: custom voices are private — only the owner sees them.
    // (Public catalog voices have isCustom=false.)
    if (m.isCustom && m.ownerUserId !== user?.id) return false;
    if (voiceTab === 'All') return true;
    if (voiceTab === 'Custom') return Boolean(m.isCustom);
    return m.category === voiceTab;
  });

  const singleSongPrice = regionMode === 'PK' ? 'Rs. 50' : '$0.99';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedUploadFile(file);
      setUploadedFileName(file.name);
      setInputMode('upload');
    }
  };

  const handleOpenYoutubeTrimmer = () => {
    setIsTrimmerOpen(true);
  };

  const stopAllAudio = () => {
    studioAudio.stopAll();
    if (htmlAudioRef.current) {
      htmlAudioRef.current.pause();
      htmlAudioRef.current.currentTime = 0;
      htmlAudioRef.current = null;
    }
    setIsPlayingOutput(false);
  };

  const handleCreateSongCover = async () => {
    setStatusNotice('');
    stopAllAudio();

    // Validate: YouTube mode needs a real URL, upload mode needs a file.
    if (inputMode === 'youtube' && !youtubeUrlInput.trim()) {
      setStatusNotice('Please paste a YouTube link first, or use the Trim & Select button to pick a song.');
      return;
    }
    if (inputMode === 'upload' && !selectedUploadFile) {
      setStatusNotice('Please upload an audio file first.');
      return;
    }

    const isTrialJob = wallet.credits === 0;
    const allowed = consumeSongPassOrTrial(isTrialJob);

    if (!allowed) {
      setStatusNotice(
        `Your free 30-second preview has been used. Unlock full-length songs for ${singleSongPrice} in your Wallet.`
      );
      return;
    }

    setIsGenerating(true);
    setProgressStage(1);
    setProgressPercent(8);

    try {
      let fileStorageUrl = uploadedFileName || undefined;
      if (inputMode === 'upload' && selectedUploadFile) {
        const storagePath = `${user?.id || 'usr_studio'}/${Date.now()}_${selectedUploadFile.name}`;
        fileStorageUrl = await awaazifyApi.uploadFileToStorage('raw-uploads', selectedUploadFile, storagePath);
      }

      const sourceLabel =
        inputMode === 'upload' && uploadedFileName
          ? uploadedFileName
          : trimmedYoutube
          ? `YouTube (${formatTimecode(
              trimmedYoutube.startTimeSec
            )} – ${formatTimecode(trimmedYoutube.endTimeSec)})`
          : 'YouTube Track';

      const res = await awaazifyApi.generateSongCover(
        {
          userId: user?.id || 'usr_studio',
          inputType: inputMode === 'upload' ? 'file' : 'youtube',
          fileUrl: fileStorageUrl,
          youtubeUrl: youtubeUrlInput || undefined,
          trimStart: trimmedYoutube?.startTimeSec ?? 60,
          trimEnd: trimmedYoutube?.endTimeSec ?? 90,
          isTrialPreview: isTrialJob,
          voiceModelId: selectedModel.id,
          pitchShift: 0,
          isRetry: false,
        },
        (stage, pct) => {
          setProgressStage(stage);
          setProgressPercent(pct);
        }
      );

      const newSong: GeneratedSong = {
        id: res.jobId,
        userId: user?.id || 'usr_studio',
        title: `${selectedModel.name} — AI Song Cover`,
        sourceType: inputMode === 'upload' ? 'file' : 'youtube',
        sourceLabel,
        voiceModelId: selectedModel.id,
        voiceModelName: selectedModel.name,
        createdAt: 'Just now',
        durationSec: isTrialJob
          ? 30
          : trimmedYoutube
          ? trimmedYoutube.endTimeSec - trimmedYoutube.startTimeSec
          : 210,
        isTrialPreview: isTrialJob,
        pitchShift: 0,
        clarityBoost: false,
        hasUsedFreeRetry: false,
        isRetryVersion: false,
        baseFreqHz: selectedModel.avatarConfig.baseFreqHz || 220,
        audioUrl: res.audioUrl,
        outputAudioUrl: res.audioUrl,
      };

      addGeneratedSong(newSong);
      setActiveOutputSong(newSong);
      // Backend charged the wallet — refresh to show the true balance.
      refreshWallet();
    } catch (err: any) {
      console.error('Song cover generation error:', err);
      setStatusNotice(err.message || 'Failed to generate song cover. Please ensure backend is reachable.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTogglePlayOutput = () => {
    if (!activeOutputSong) return;

    if (isPlayingOutput) {
      stopAllAudio();
      return;
    }

    const audioUrl = activeOutputSong.outputAudioUrl || activeOutputSong.audioUrl;
    if (audioUrl && (audioUrl.startsWith('http://') || audioUrl.startsWith('https://') || audioUrl.startsWith('/'))) {
      try {
        const audio = new Audio(audioUrl);
        htmlAudioRef.current = audio;
        audio.onended = () => {
          setIsPlayingOutput(false);
          htmlAudioRef.current = null;
        };
        audio.onerror = () => {
          console.warn('HTML5 Audio playback failed, falling back to studio preview synthesizer.');
          const started = studioAudio.playStudioPreview({
            id: `output_${activeOutputSong.id}`,
            baseFreqHz: activeOutputSong.baseFreqHz,
            mode: 'converted',
            pitchShiftSemitones: activeOutputSong.pitchShift,
            clarityBoost: activeOutputSong.clarityBoost,
            durationMs: 15000,
            onEnded: () => setIsPlayingOutput(false),
          });
          setIsPlayingOutput(started);
        };
        audio.play().then(() => {
          setIsPlayingOutput(true);
        }).catch(() => {
          const started = studioAudio.playStudioPreview({
            id: `output_${activeOutputSong.id}`,
            baseFreqHz: activeOutputSong.baseFreqHz,
            mode: 'converted',
            pitchShiftSemitones: activeOutputSong.pitchShift,
            clarityBoost: activeOutputSong.clarityBoost,
            durationMs: 15000,
            onEnded: () => setIsPlayingOutput(false),
          });
          setIsPlayingOutput(started);
        });
        return;
      } catch (e) {
        console.warn('Audio playback error:', e);
      }
    }

    const started = studioAudio.playStudioPreview({
      id: `output_${activeOutputSong.id}`,
      baseFreqHz: activeOutputSong.baseFreqHz,
      mode: 'converted',
      pitchShiftSemitones: activeOutputSong.pitchShift,
      clarityBoost: activeOutputSong.clarityBoost,
      durationMs: 15000,
      onEnded: () => setIsPlayingOutput(false),
    });
    setIsPlayingOutput(started);
  };

  const handleDownloadOutput = () => {
    if (!activeOutputSong) return;
    const audioUrl = activeOutputSong.outputAudioUrl || activeOutputSong.audioUrl;
    const filename = `${activeOutputSong.voiceModelName.toLowerCase().replace(/\s+/g, '_')}_cover.mp3`;

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
        activeOutputSong.baseFreqHz,
        6,
        activeOutputSong.pitchShift
      );
    }
  };

  const handleApplyFreeRetry = async (option: RetryAdjustmentOption) => {
    if (!activeOutputSong || activeOutputSong.hasUsedFreeRetry) return;
    stopAllAudio();
    setIsRetrying(true);

    const updated = await applyFreeRetryAdjustment(activeOutputSong.id, option);
    if (updated) {
      setActiveOutputSong(updated);
    }
    setIsRetrying(false);
  };

  const getStageLabel = (stage: 1 | 2 | 3) => {
    if (stage === 1) return '1. Separating background music from vocals...';
    if (stage === 2) return `2. Converting vocals to ${selectedModel.name}...`;
    return '3. Mixing final track with original background music...';
  };

  // No voice models in the catalog yet (e.g. right after demo removal, before
  // the admin adds real ones) — show a friendly empty state instead of crashing
  // on selectedModel being undefined.
  if (!selectedModel) {
    return (
      <div className="space-y-6 sm:space-y-8 min-w-0">
        <div className="p-10 rounded-3xl bg-white border border-slate-200 text-center space-y-3">
          <p className="text-xl font-extrabold text-[#0F172A]">Koi voice model nahi mila</p>
          <p className="text-sm text-slate-500">
            Abhi catalog me koi voice nahi hai. Thodi der me dobara check karein.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A]">
            Create AI Song Cover
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
            Upload an audio track or paste a YouTube link, choose a voice, and generate your cover.
          </p>
        </div>

        <div className="px-4 py-2 rounded-2xl bg-white border border-slate-200 shadow-2xs text-xs font-extrabold self-start sm:self-auto shrink-0">
          {wallet.credits > 0 ? (
            <span className="text-[#059669]">
              Balance: {formattedBalance} ({wallet.credits} Full{' '}
              {wallet.credits === 1 ? 'Song' : 'Songs'})
            </span>
          ) : (
            <span className="text-amber-800">
              Balance: {formattedBalance} · Free 30s Preview Ready
            </span>
          )}
        </div>
      </div>

      {/* STEP 1: SELECT SONG SOURCE */}
      <section className="rounded-3xl bg-white border border-slate-200/90 shadow-2xs p-5 sm:p-7 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-[#10B981] text-white font-extrabold text-xs flex items-center justify-center shrink-0">
              1
            </span>
            <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A]">
              Select Song Source
            </h2>
          </div>
          <span className="text-xs font-bold text-[#059669]">
            Original background music is preserved automatically
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Option 1: Upload Audio File */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`p-5 rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col justify-between gap-4 min-w-0 ${
              inputMode === 'upload'
                ? 'bg-emerald-50/70 border-[#10B981]'
                : 'bg-slate-50/80 border-slate-300 hover:border-[#10B981]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,.m4a,audio/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-[#10B981] text-white flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-extrabold text-[#0F172A] truncate">
                  Upload Audio File (.MP3 / .WAV)
                </h3>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Select any song file from your phone or computer
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2 text-xs font-bold min-w-0">
              {uploadedFileName ? (
                <span className="text-[#059669] truncate">
                  Selected: {uploadedFileName}
                </span>
              ) : (
                <span className="text-slate-500 truncate">Max file size 25MB</span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setUploadedFileName('Acoustic_Pop_Track.mp3');
                  setInputMode('upload');
                }}
                className="text-xs font-extrabold text-[#059669] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                Load Sample MP3
              </button>
            </div>
          </div>

          {/* Option 2: Paste YouTube Link */}
          <div
            onClick={() => setInputMode('youtube')}
            className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between gap-4 min-w-0 ${
              inputMode === 'youtube'
                ? 'bg-amber-50/70 border-[#F59E0B]'
                : 'bg-slate-50/80 border-slate-200 hover:border-[#F59E0B]'
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-[#F59E0B] text-white flex items-center justify-center shrink-0">
                <Youtube className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-extrabold text-[#0F172A] truncate">
                  Paste YouTube Link
                </h3>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Paste a link and trim the exact chorus or full song
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="url"
                value={youtubeUrlInput}
                onChange={(e) => {
                  setYoutubeUrlInput(e.target.value);
                  setInputMode('youtube');
                }}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1 min-w-0 px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 focus:border-[#10B981] focus:outline-none text-xs sm:text-sm font-medium text-[#0F172A]"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setInputMode('youtube');
                  handleOpenYoutubeTrimmer();
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-xs whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Scissors className="w-4 h-4" />
                <span>Trim Clip</span>
              </button>
            </div>

            {trimmedYoutube && (
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2 text-xs font-bold min-w-0">
                <span className="text-[#0F172A] truncate">
                  Segment:{' '}
                  <strong className="text-[#059669]">
                    {formatTimecode(trimmedYoutube.startTimeSec)} –{' '}
                    {formatTimecode(trimmedYoutube.endTimeSec)}
                  </strong>{' '}
                  ({trimmedYoutube.endTimeSec - trimmedYoutube.startTimeSec}s)
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenYoutubeTrimmer();
                  }}
                  className="text-[#059669] hover:underline font-extrabold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Edit Segment
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* STEP 2: CHOOSE VOICE MODEL */}
      <section className="rounded-3xl bg-white border border-slate-200/90 shadow-2xs p-5 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-[#F59E0B] text-white font-extrabold text-xs flex items-center justify-center shrink-0">
              2
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A]">
                Choose a Voice Model
              </h2>
              <p className="text-xs text-slate-600 font-bold">
                Active Selection:{' '}
                <strong className="text-[#059669]">{selectedModel.name}</strong>
              </p>
            </div>
          </div>

          {/* Voice Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {VOICE_FILTER_TABS.map((tab) => {
              const active = voiceTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setVoiceTab(tab.id)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#10B981] text-white'
                      : 'bg-slate-100 text-slate-600 hover:text-[#0F172A]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {filteredModels.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {filteredModels.map((model) => (
              <NeonNoirVoiceCard
                key={model.id}
                model={model}
                compact
                isSelected={model.id === selectedVoiceId}
                ctaLabel="Select Voice"
                onSelectVoice={(m) => setSelectedVoiceId(m.id)}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-amber-50/70 border border-amber-200 text-center space-y-3">
            <Mic className="w-8 h-8 text-[#F59E0B] mx-auto" />
            <h3 className="text-base font-extrabold text-[#0F172A]">
              No Custom Voices Yet
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto font-medium">
              Record a 3-minute voice sample to create your own personal voice model.
            </p>
            <button
              type="button"
              onClick={() => setStudioTool('train-voice')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#F59E0B] hover:bg-amber-600 text-white text-xs sm:text-sm font-extrabold cursor-pointer"
            >
              <span>Train Custom Voice</span>
            </button>
          </div>
        )}
      </section>

      {/* STEP 3: GENERATE & DOWNLOAD */}
      <section className="rounded-3xl bg-white border border-slate-200/90 shadow-2xs p-5 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-[#10B981] text-white font-extrabold text-xs flex items-center justify-center shrink-0">
              3
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A]">
                Generate Song Cover
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                {wallet.credits === 0
                  ? 'Free 30-Second Preview Mode'
                  : 'Full-Length Song + 1 Free Retry Included'}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isGenerating}
            onClick={handleCreateSongCover}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white font-extrabold text-sm sm:text-base shadow-md transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-5 h-5" />
            <span>{isGenerating ? 'Generating Song...' : 'Generate Song Cover'}</span>
          </button>
        </div>

        {statusNotice && (
          <div className="p-4 rounded-2xl bg-[#FEF3C7] border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-amber-950 font-extrabold">
              {statusNotice}
            </p>
            <button
              type="button"
              onClick={() => setStudioTool('wallet')}
              className="px-4 py-2.5 rounded-xl bg-[#10B981] text-white font-extrabold text-xs whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
            >
              Add Balance ({singleSongPrice})
            </button>
          </div>
        )}

        {/* 3-STEP ANIMATED LOADING BAR */}
        {isGenerating && (
          <div className="p-6 rounded-3xl bg-slate-50 border-2 border-[#10B981] space-y-4 text-center">
            <h3 className="text-base sm:text-lg font-extrabold text-[#0F172A]">
              {getStageLabel(progressStage)}
            </h3>

            <div className="max-w-xl mx-auto w-full h-3.5 rounded-full bg-slate-200 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#10B981] to-[#F59E0B] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-bold pt-1">
              <div
                className={`p-3 rounded-2xl border ${
                  progressStage >= 1
                    ? 'bg-white border-[#10B981] text-[#059669]'
                    : 'bg-white/50 border-slate-200 text-slate-400'
                }`}
              >
                1. Separating Music
              </div>
              <div
                className={`p-3 rounded-2xl border ${
                  progressStage >= 2
                    ? 'bg-white border-[#10B981] text-[#059669]'
                    : 'bg-white/50 border-slate-200 text-slate-400'
                }`}
              >
                2. Converting Voice
              </div>
              <div
                className={`p-3 rounded-2xl border ${
                  progressStage >= 3
                    ? 'bg-white border-[#10B981] text-[#059669]'
                    : 'bg-white/50 border-slate-200 text-slate-400'
                }`}
              >
                3. Mixing Final Track
              </div>
            </div>
          </div>
        )}

        {/* RESULT PLAYER & 1 FREE RETRY */}
        {activeOutputSong && !isGenerating && (
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-50/90 via-white to-amber-50/80 border-2 border-[#10B981] shadow-md space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-[#10B981] text-white flex items-center justify-center shrink-0">
                  <Music className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-extrabold text-[#059669] uppercase">
                    Ready to Play & Download
                  </span>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#0F172A] truncate">
                    {activeOutputSong.title}
                  </h3>
                  <p className="text-xs text-slate-600 font-bold mt-0.5 truncate">
                    {activeOutputSong.sourceLabel}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleTogglePlayOutput}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white hover:bg-slate-50 text-[#0F172A] border-2 border-[#10B981] text-xs font-extrabold cursor-pointer whitespace-nowrap"
                >
                  {isPlayingOutput ? (
                    <>
                      <Square className="w-4 h-4 text-[#10B981] fill-current" />
                      <span>Stop</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 text-[#10B981] fill-current" />
                      <span>Play Track</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadOutput}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-extrabold shadow-sm cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  <span>Download MP3</span>
                </button>
              </div>
            </div>

            {/* Soundbars */}
            <div className="h-14 rounded-2xl bg-white border border-slate-200 px-3 flex items-center justify-between gap-1 overflow-hidden">
              {Array.from({ length: 32 }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-full ${
                    i % 3 === 0 ? 'bg-[#F59E0B]' : 'bg-[#10B981]'
                  } ${isPlayingOutput ? 'animate-soundwave' : 'opacity-70'}`}
                  style={{
                    height: `${28 + ((i * 19) % 64)}%`,
                    animationDelay: `${(i % 6) * 0.12}s`,
                  }}
                />
              ))}
            </div>

            {/* Free Trial Upsell Notice */}
            {activeOutputSong.isTrialPreview && (
              <div className="p-4 rounded-2xl bg-[#FEF3C7] border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs sm:text-sm text-amber-950 font-extrabold">
                  Enjoyed your 30-second preview? Unlock full-length songs for {singleSongPrice}.
                </p>
                <button
                  type="button"
                  onClick={() => setStudioTool('wallet')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F59E0B] hover:bg-amber-600 text-white text-xs font-extrabold whitespace-nowrap shrink-0 cursor-pointer self-start sm:self-auto"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Unlock Full Song ({singleSongPrice})</span>
                </button>
              </div>
            )}

            {/* 1 Free Retry Adjustment Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
              {!activeOutputSong.hasUsedFreeRetry ? (
                <>
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-[#0F172A]">
                    <RefreshCcw className="w-4 h-4 text-[#10B981] shrink-0" />
                    <span>1 Free Retry Included — Adjust Vocal Tone:</span>
                  </div>

                  {isRetrying ? (
                    <div className="py-2 text-xs sm:text-sm font-extrabold text-[#059669]">
                      Updating vocal tone and remixing track...
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleApplyFreeRetry('deeper')}
                        className="p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-[#10B981] text-left transition-all cursor-pointer"
                      >
                        <div className="text-xs font-extrabold text-[#0F172A]">
                          Make Voice Deeper
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Lower vocal pitch slightly
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyFreeRetry('higher')}
                        className="p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-[#10B981] text-left transition-all cursor-pointer"
                      >
                        <div className="text-xs font-extrabold text-[#0F172A]">
                          Make Voice Higher
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Raise vocal pitch for high notes
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApplyFreeRetry('clarity')}
                        className="p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-[#10B981] text-left transition-all cursor-pointer"
                      >
                        <div className="text-xs font-extrabold text-[#0F172A]">
                          Boost Vocal Clarity
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Sharpen lyrics over background music
                        </div>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="inline-flex items-center gap-2 text-xs sm:text-sm text-[#059669] font-extrabold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Free retry adjustment applied to this track.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <YouTubeTrimmerModal
        isOpen={isTrimmerOpen}
        youtubeUrl={youtubeUrlInput}
        onClose={() => setIsTrimmerOpen(false)}
        onConfirm={(selection) => {
          setTrimmedYoutube(selection);
          setIsTrimmerOpen(false);
        }}
      />
    </div>
  );
};
