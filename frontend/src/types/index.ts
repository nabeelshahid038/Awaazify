export type RegionMode = 'PK' | 'GLOBAL';

export type PublicPage = 'home' | 'voices' | 'how-it-works' | 'pricing';

export type StudioTool = 'song-cover' | 'train-voice' | 'my-songs' | 'wallet';

export type VoiceCategory =
  | 'Singers'
  | 'Cricketers & Celebs'
  | 'Public Leaders'
  | 'Global Stars'
  | 'Custom';

export interface AvatarVisualConfig {
  silhouetteType: 'vocalist' | 'athlete' | 'orator' | 'popstar' | 'custom';
  gradientTheme: 'emerald' | 'amber' | 'sky' | 'rose' | 'violet';
  baseFreqHz: number;
}

export interface VoiceModel {
  id: string;
  name: string;
  subtitle: string;
  category: VoiceCategory;
  usageCount: number;
  avatarConfig: AvatarVisualConfig;
  modelFileName?: string;
  extraFileName?: string;
  modelFileUrl?: string;
  indexFileUrl?: string;
  defaultPitch: number;
  previewAudioUrl?: string;
  status: 'Active' | 'Coming Soon' | 'Hidden';
  isCustom?: boolean;
  ownerUserId?: string;
  featured?: boolean;
}

export interface TrimmedYouTubeSelection {
  youtubeUrl: string;
  videoTitle: string;
  channelName: string;
  totalDurationSec: number;
  startTimeSec: number;
  endTimeSec: number;
  isTrialClip: boolean;
}

export type RetryAdjustmentOption = 'deeper' | 'higher' | 'clarity';

export interface GeneratedSong {
  id: string;
  userId: string;
  title: string;
  sourceType: 'file' | 'youtube';
  sourceLabel: string;
  voiceModelId: string;
  voiceModelName: string;
  createdAt: string;
  durationSec: number;
  isTrialPreview: boolean;
  pitchShift: 0 | -2 | 2;
  clarityBoost: boolean;
  hasUsedFreeRetry: boolean;
  isRetryVersion: boolean;
  parentJobId?: string;
  baseFreqHz: number;
  audioUrl?: string;
  outputAudioUrl?: string;
}

export interface PaymentTransaction {
  id: string;
  userId: string;
  userEmail: string;
  provider: 'easypaisa' | 'jazzcash' | 'card';
  packageId: 'song-50' | 'voice-150';
  packageName: string;
  songsAdded: number;
  voicePassAdded: number;
  amountDisplay: string;
  amountPkr?: number;
  amountUsd?: number;
  transactionId: string;
  screenshotName?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
}

export interface CustomVoiceTrainingJob {
  id: string;
  userId: string;
  userEmail: string;
  voiceName: string;
  audioFileNames: string[];
  totalDurationSec: number;
  autoCleanNoise: boolean;
  status: 'Cleaning & Queued' | 'Processing' | 'Active in Library';
  createdAt: string;
  linkedModelId?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: 'user' | 'admin';
  emailVerified?: boolean;
}

export interface UserWallet {
  balancePkr: number;
  balanceUsd: number;
  credits: number;
  voicePasses: number;
  hasFreeTrial: boolean;
}

export interface CoverGeneratePayload {
  userId: string;
  inputType: 'file' | 'youtube';
  fileUrl?: string;
  youtubeUrl?: string;
  trimStart?: number;
  trimEnd?: number;
  isTrialPreview: boolean;
  voiceModelId: string;
  pitchShift: 0 | -2 | 2;
  clarityBoost?: boolean;
  isRetry: boolean;
  parentJobId?: string;
}

export interface VoiceTrainPayload {
  userId: string;
  voiceName: string;
  audioFiles: string[];
  autoCleanNoise: true;
}

export interface LocalPaymentPayload {
  userId: string;
  provider: 'easypaisa' | 'jazzcash';
  packageId: 'song-50' | 'voice-150';
  amountPkr: number;
  transactionId: string;
  screenshotUrl: string;
}

export interface AdminModelPayload {
  name: string;
  subtitle: string;
  category: VoiceCategory;
  avatarConfig: AvatarVisualConfig;
  modelFileName?: string;
  extraFileName?: string;
  modelFileUrl?: string;
  indexFileUrl?: string;
  defaultPitch: number;
  previewAudioUrl: string;
  status: 'Active' | 'Coming Soon' | 'Hidden';
}
