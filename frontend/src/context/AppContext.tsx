import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AdminModelPayload,
  CustomVoiceTrainingJob,
  GeneratedSong,
  PaymentTransaction,
  PublicPage,
  RegionMode,
  RetryAdjustmentOption,
  StudioTool,
  UserProfile,
  UserWallet,
  VoiceModel,
} from '../types';
import { awaazifyApi } from '../services/api';
import { studioAudio } from '../utils/audioEngine';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

// Post-OAuth return routing: loginWithGoogle() can record where the caller
// wants to land after the full-page Google round-trip. sessionStorage is
// per-tab, so it survives the OAuth redirect (same tab) without leaking
// across tabs.
const POST_LOGIN_VIEW_KEY = 'awaazify_post_login_view';

/** Read the one-time post-login view and remove it (single-use). */
function consumePostLoginView(): string | null {
  try {
    const v = sessionStorage.getItem(POST_LOGIN_VIEW_KEY);
    sessionStorage.removeItem(POST_LOGIN_VIEW_KEY);
    return v;
  } catch {
    return null;
  }
}

// The OAuth return fires BOTH the hash-cleanup effect and onAuthStateChange's
// SIGNED_IN (order varies). Memoize the consumed value per page load so both
// route consistently to the same view.
let resolvedPostLoginView: 'admin' | 'studio' | null = null;

// True only when the user clicked a login button during THIS page load.
// Supabase also emits SIGNED_IN when a backgrounded tab becomes visible or
// when another tab's login syncs through shared storage — those must NOT
// trigger post-login navigation. (OAuth itself always reloads the page, so a
// genuine login return is handled by the hash-cleanup effect instead.)
let loginInitiatedThisLoad = false;

/** Admin logins return to the admin view; everything else lands on studio. */
function resolvePostLoginView(): 'admin' | 'studio' {
  if (resolvedPostLoginView === null) {
    resolvedPostLoginView = consumePostLoginView() === 'admin' ? 'admin' : 'studio';
  }
  return resolvedPostLoginView;
}


interface AppContextValue {
  regionMode: RegionMode;
  setRegionMode: (mode: RegionMode) => void;
  isAuthenticated: boolean;
  user: UserProfile | null;
  wallet: UserWallet;
  formattedBalance: string;
  activeView: 'public' | 'studio' | 'admin';
  setActiveView: (view: 'public' | 'studio' | 'admin') => void;
  publicPage: PublicPage;
  setPublicPage: (page: PublicPage) => void;
  studioTool: StudioTool;
  setStudioTool: (tool: StudioTool) => void;
  selectedVoiceId: string;
  setSelectedVoiceId: (id: string) => void;

  // Auth Gate & Modal
  isAuthModalOpen: boolean;
  openAuthModal: (pendingAction?: { targetTool?: StudioTool; voiceId?: string }) => void;
  closeAuthModal: () => void;
  loginWithGoogle: (returnTo?: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  requireAuthAndNavigate: (targetTool?: StudioTool, voiceId?: string) => void;

  consumeSongPassOrTrial: (isTrialJob: boolean) => boolean;
  refreshWallet: () => Promise<void>;
  addWalletPackage: (songs: number, voicePasses: number, pkrValue: number, usdValue: number) => void;

  // Voice Models
  voiceModels: VoiceModel[];
  refreshAdminVoiceModels: () => Promise<void>;
  addAdminVoiceModel: (payload: AdminModelPayload) => Promise<void>;
  toggleVoiceModelStatus: (id: string) => Promise<void>;
  deleteVoiceModel: (id: string) => Promise<void>;

  // Generated Songs & Retry
  generatedSongs: GeneratedSong[];
  addGeneratedSong: (song: GeneratedSong) => void;
  applyFreeRetryAdjustment: (
    songId: string,
    option: RetryAdjustmentOption
  ) => Promise<GeneratedSong | null>;

  // Transactions & Admin Approvals
  transactions: PaymentTransaction[];
  submitLocalPaymentRequest: (data: {
    provider: 'easypaisa' | 'jazzcash';
    packageId: 'song-50' | 'voice-150';
    packageName: string;
    songsAdded: number;
    voicePassAdded: number;
    amountPkr: number;
    transactionId: string;
    screenshotName: string;
  }) => Promise<void>;
  submitGlobalPayment: (data: {
    packageId: 'song-50' | 'voice-150';
    packageName: string;
    songsAdded: number;
    voicePassAdded: number;
    amountUsd: number;
  }) => Promise<void>;
  approveTransaction: (txId: string) => Promise<void>;
  rejectTransaction: (txId: string) => Promise<void>;
  deleteTransaction: (txId: string) => Promise<void>;
  deleteTrainingJob: (jobId: string) => Promise<void>;

  // Custom Voice Orders
  trainingJobs: CustomVoiceTrainingJob[];
  submitCustomVoiceTraining: (data: {
    voiceName: string;
    audioFileNames: string[];
    totalDurationSec: number;
  }) => Promise<void>;
  publishTrainedVoiceToUserLibrary: (
    jobId: string,
    modelFile: string,
    extraFile: string
  ) => Promise<void>;

  // Dedicated Admin Page Trigger & Security Verification
  isAdminVerified: boolean;
  setIsAdminVerified: (verified: boolean) => void;
  triggerLogoMicClick: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [regionMode, setRegionMode] = useState<RegionMode>('PK');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAdminVerified, setIsAdminVerified] = useState<boolean>(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<UserWallet>({
    balancePkr: 50,
    balanceUsd: 0.99,
    credits: 1,
    voicePasses: 0,
    hasFreeTrial: true,
  });

  const [activeView, setActiveView] = useState<'public' | 'studio' | 'admin'>('public');
  const [publicPage, setPublicPage] = useState<PublicPage>('home');
  const [studioTool, setStudioTool] = useState<StudioTool>('song-cover');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [pendingRedirect, setPendingRedirect] = useState<{
    targetTool?: StudioTool;
    voiceId?: string;
  } | null>(null);

  const [voiceModels, setVoiceModels] = useState<VoiceModel[]>([]);
  const [generatedSongs, setGeneratedSongs] = useState<GeneratedSong[]>([]);
  // No hardcoded sample transactions — admin panel loads real data from backend.
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);

  // No hardcoded sample jobs — admin panel loads real data from backend.
  const [trainingJobs, setTrainingJobs] = useState<CustomVoiceTrainingJob[]>([]);

  const [micClickTimestamps, setMicClickTimestamps] = useState<number[]>([]);

  // Sync Supabase user profile & wallet
  const syncSupabaseUser = useCallback(async (supabaseUser: any, customName?: string) => {
    if (!supabaseUser) return;
    const uid = supabaseUser.id;
    const email = supabaseUser.email || 'user@example.com';
    const name =
      customName ||
      supabaseUser.user_metadata?.name ||
      email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

    const profile: UserProfile = {
      id: uid,
      name,
      email,
      avatarUrl: supabaseUser.user_metadata?.avatar_url || '',
      role: 'user',
      emailVerified: true,
    };

    setUser(profile);
    setIsAuthenticated(true);

    if (isSupabaseConfigured) {
      try {
        // P1: user sync + Rs. 50 signup bonus are granted SERVER-SIDE via
        // POST /api/v1/users/me/sync (idempotent — the backend grants the
        // bonus exactly once). The client-side direct insert is gone.
        // Non-blocking: a backend failure must never break login.
        let syncedBalance: number | null = null;
        try {
          const sync = await awaazifyApi.syncUser();
          syncedBalance = sync.balance;
        } catch (syncErr) {
          console.warn('Backend user sync failed (non-blocking):', syncErr);
        }

        // Read the full wallet row for the remaining fields (read-only).
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', uid)
          .maybeSingle();

        setWallet({
          balancePkr: existingUser?.balance_pkr ?? syncedBalance ?? 50,
          balanceUsd: existingUser?.balance_usd ?? 0,
          credits: existingUser?.song_credits ?? 0,
          voicePasses: existingUser?.voice_passes ?? 0,
          hasFreeTrial: existingUser?.has_free_trial ?? true,
        });
      } catch (err) {
        console.warn('Supabase user sync error:', err);
      }
    }
  }, []);

  // Initialize Auth state listener and initial data
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // Clean URL hash/params (removes #access_token=..., #error=..., or ?code=...)
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;
      if (
        hash.includes('access_token') ||
        hash.includes('error') ||
        search.includes('code=') ||
        search.includes('error=')
      ) {
        window.history.replaceState(null, '', window.location.pathname);
        setActiveView(resolvePostLoginView());
      }
    }

    // Load active voice models from public.voice_models
    const fetchVoiceModels = async () => {
      try {
        const { data, error } = await supabase
          .from('voice_models')
          .select('*')
          .eq('status', 'Active')
          .order('usage_count', { ascending: false });

        if (data && data.length > 0 && !error) {
          const mapped: VoiceModel[] = data.map((d: any) => ({
            id: d.id,
            name: d.name,
            subtitle: d.subtitle,
            category: d.category,
            usageCount: d.usage_count || 0,
            avatarConfig: d.avatar_config || {
              silhouetteType: 'vocalist',
              gradientTheme: 'emerald',
              baseFreqHz: 220,
            },
            modelFileName: d.model_file_name || `${d.name.toLowerCase().replace(/ /g, '_')}.pth`,
            extraFileName: d.extra_file_name || `${d.name.toLowerCase().replace(/ /g, '_')}.index`,
            modelFileUrl: d.model_file_url,
            indexFileUrl: d.index_file_url,
            defaultPitch: d.default_pitch || 0,
            status: d.status || 'Active',
            isCustom: d.is_custom || false,
            ownerUserId: d.owner_user_id,
            featured: d.featured || false,
          }));
          setVoiceModels(mapped);
          setSelectedVoiceId((prev) => {
            const exists = mapped.some((m) => m.id === prev);
            return exists ? prev : mapped[0].id;
          });
        }
      } catch (err) {
        console.warn('Failed to load voice models from Supabase:', err);
      }
    };

    fetchVoiceModels();

    // Check existing auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        syncSupabaseUser(session.user);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        syncSupabaseUser(session.user);
        // Navigate ONLY when the user actually clicked login in this page
        // load. Visibility-triggered re-emits, reload recoveries, and
        // cross-tab login syncs must leave the current view alone.
        if (event === 'SIGNED_IN' && loginInitiatedThisLoad) {
          loginInitiatedThisLoad = false;
          setActiveView(resolvePostLoginView());
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [syncSupabaseUser]);

  // Secret Admin Page Trigger: Ctrl + Shift + A or 5 clicks on Logo Microphone
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setActiveView((prev) => (prev === 'admin' ? (isAuthenticated ? 'studio' : 'public') : 'admin'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated]);

  const triggerLogoMicClick = () => {
    const now = Date.now();
    const recent = [...micClickTimestamps.filter((t) => now - t < 2500), now];
    if (recent.length >= 5) {
      setMicClickTimestamps([]);
      setActiveView('admin');
    } else {
      setMicClickTimestamps(recent);
    }
  };

  // Formatted currency balance (e.g., "Rs. 0" or "$0.00")
  const formattedBalance =
    regionMode === 'PK'
      ? `Rs. ${wallet.balancePkr}`
      : `$${wallet.balanceUsd.toFixed(2)}`;

  const openAuthModal = (pendingAction?: { targetTool?: StudioTool; voiceId?: string }) => {
    if (pendingAction) {
      setPendingRedirect(pendingAction);
    }
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setPendingRedirect(null);
  };

  const loginWithGoogle = async (returnTo?: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Sign-in is not configured. Please try again later.');
    }
    // Fresh login round-trip: reset the memoized destination, then record
    // where this login should land. A non-admin login also clears any stale
    // marker (e.g. an abandoned admin login) so it can't misroute later.
    // Mark that THIS page load initiated a login, so the SIGNED_IN handler
    // can tell a genuine login apart from background re-emits.
    resolvedPostLoginView = null;
    loginInitiatedThisLoad = true;
    try {
      if (returnTo) {
        sessionStorage.setItem(POST_LOGIN_VIEW_KEY, returnTo);
      } else {
        sessionStorage.removeItem(POST_LOGIN_VIEW_KEY);
      }
    } catch {
      // storage unavailable — login still proceeds, landing on studio
    }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const logoutUser = async () => {
    studioAudio.stopAll();
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setIsAuthenticated(false);
    setUser(null);
    setActiveView('public');
    setPublicPage('home');
  };

  const requireAuthAndNavigate = (targetTool: StudioTool = 'song-cover', voiceId?: string) => {
    if (voiceId) {
      setSelectedVoiceId(voiceId);
    }
    if (!isAuthenticated) {
      openAuthModal({ targetTool, voiceId });
      return;
    }
    setStudioTool(targetTool);
    setActiveView('studio');
  };

  const consumeSongPassOrTrial = (isTrialJob: boolean): boolean => {
    if (isTrialJob) {
      if (wallet.hasFreeTrial || wallet.credits === 0) {
        setWallet((prev) => ({ ...prev, hasFreeTrial: false }));
        return true;
      }
    }
    // P0 fix: CHECK-ONLY — do NOT deduct here. The backend deducts exactly
    // once (credits, then Rs. 50, then $0.99). Client-side deduction would
    // double-charge (same bug fixed for training in PR #5).
    // Returns true if the user CAN pay; backend does the actual charge.
    if (wallet.credits >= 1) return true;
    if (wallet.balancePkr >= 50) return true;
    if (wallet.balanceUsd >= 0.99) return true;
    return false;
  };

  /**
   * Re-reads the wallet from Supabase after a backend charge (song cover,
   * training) so the UI shows the true balance immediately.
   */
  const refreshWallet = async (): Promise<void> => {
    if (!isSupabaseConfigured || !user?.id) return;
    try {
      const { data } = await supabase
        .from('users')
        .select('balance_pkr, balance_usd, song_credits, has_free_trial')
        .eq('id', user.id)
        .maybeSingle();
      if (data) {
        setWallet({
          balancePkr: data.balance_pkr ?? 0,
          balanceUsd: data.balance_usd ?? 0,
          credits: data.song_credits ?? 0,
          voicePasses: data.voice_passes ?? 0,
          hasFreeTrial: data.has_free_trial ?? false,
        });
      }
    } catch (err) {
      console.warn('Wallet refresh failed:', err);
    }
  };

  const addWalletPackage = (
    songs: number,
    voicePasses: number,
    pkrValue: number,
    usdValue: number
  ) => {
    setWallet((prev) => ({
      ...prev,
      credits: prev.credits + songs,
      voicePasses: prev.voicePasses + voicePasses,
      balancePkr: prev.balancePkr + pkrValue,
      balanceUsd: Number((prev.balanceUsd + usdValue).toFixed(2)),
    }));
  };

  const addAdminVoiceModel = async (payload: AdminModelPayload) => {
    const res = await awaazifyApi.createAdminVoiceModel(payload);
    // Refresh from backend to get the canonical list (bypasses anon RLS issues)
    await refreshAdminVoiceModels();
  };

  const refreshAdminVoiceModels = async (): Promise<void> => {
    try {
      const data = await awaazifyApi.listAdminVoiceModels();
      if (data && data.length > 0) {
        const mapped: VoiceModel[] = data.map((d: any) => ({
          id: d.id,
          name: d.name,
          subtitle: d.subtitle,
          category: d.category,
          usageCount: d.usage_count || 0,
          avatarConfig: d.avatar_config || {
            silhouetteType: 'vocalist',
            gradientTheme: 'emerald',
            baseFreqHz: 220,
          },
          modelFileName: d.model_file_name || `${d.name.toLowerCase().replace(/ /g, '_')}.pth`,
          extraFileName: d.extra_file_name || `${d.name.toLowerCase().replace(/ /g, '_')}.index`,
          modelFileUrl: d.model_file_url,
          indexFileUrl: d.index_file_url,
          defaultPitch: d.default_pitch || 0,
          status: d.status || 'Active',
          isCustom: d.is_custom || false,
          ownerUserId: d.owner_user_id,
          featured: d.featured || false,
        }));
        setVoiceModels(mapped);
      } else {
        setVoiceModels([]);
      }
    } catch (err) {
      console.warn('Failed to refresh admin voice models:', err);
    }
  };

  const toggleVoiceModelStatus = async (id: string): Promise<void> => {
    const current = voiceModels.find((m) => m.id === id);
    const nextStatus =
      current?.status === 'Active'
        ? 'Coming Soon'
        : current?.status === 'Coming Soon'
        ? 'Hidden'
        : 'Active';
    // Persist server-side for real models; demo models (vm-*) are local-only.
    if (current && !id.startsWith('vm-')) {
      await awaazifyApi.updateAdminVoiceModelStatus(id, nextStatus);
    }
    setVoiceModels((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: nextStatus } : m))
    );
  };

  const deleteVoiceModel = async (id: string): Promise<void> => {
    // Demo models (vm-*) exist only in local state — nothing to delete server-side.
    // Real models go through the admin API so the deletion persists in the DB.
    if (!id.startsWith('vm-')) {
      await awaazifyApi.deleteAdminVoiceModel(id);
    }
    setVoiceModels((prev) => prev.filter((m) => m.id !== id));
  };

  const addGeneratedSong = (song: GeneratedSong) => {
    setGeneratedSongs((prev) => [song, ...prev]);
    setVoiceModels((prev) =>
      prev.map((m) =>
        m.id === song.voiceModelId ? { ...m, usageCount: m.usageCount + 1 } : m
      )
    );
  };

  const applyFreeRetryAdjustment = async (
    songId: string,
    option: RetryAdjustmentOption
  ): Promise<GeneratedSong | null> => {
    const target = generatedSongs.find((s) => s.id === songId);
    if (!target) return null;

    const pitchShift: 0 | -2 | 2 =
      option === 'deeper' ? -2 : option === 'higher' ? 2 : target.pitchShift;
    const clarityBoost = option === 'clarity' ? true : target.clarityBoost;

    await awaazifyApi.generateSongCover({
      userId: user?.id || 'usr_guest',
      inputType: target.sourceType,
      isTrialPreview: target.isTrialPreview,
      voiceModelId: target.voiceModelId,
      pitchShift,
      clarityBoost,
      isRetry: true,
      parentJobId: target.id,
    });

    const updatedSong: GeneratedSong = {
      ...target,
      pitchShift,
      clarityBoost,
      hasUsedFreeRetry: true,
      isRetryVersion: true,
      createdAt: 'Updated via Free Retry',
    };

    setGeneratedSongs((prev) =>
      prev.map((s) => (s.id === songId ? updatedSong : s))
    );
    return updatedSong;
  };

  const submitLocalPaymentRequest = async (data: {
    provider: 'easypaisa' | 'jazzcash';
    packageId: 'song-50' | 'voice-150';
    packageName: string;
    songsAdded: number;
    voicePassAdded: number;
    amountPkr: number;
    transactionId: string;
    screenshotName: string;
  }) => {
    const res = await awaazifyApi.submitLocalPayment({
      userId: user?.id || 'usr_studio',
      provider: data.provider,
      packageId: data.packageId,
      amountPkr: data.amountPkr,
      transactionId: data.transactionId,
      screenshotUrl: data.screenshotName,
    });

    const newTx: PaymentTransaction = {
      id: res.paymentId,
      userId: user?.id || 'usr_studio',
      userEmail: user?.email || 'user@example.com',
      provider: data.provider,
      packageId: data.packageId,
      packageName: data.packageName,
      songsAdded: data.songsAdded,
      voicePassAdded: data.voicePassAdded,
      amountDisplay: `Rs. ${data.amountPkr}`,
      amountPkr: data.amountPkr,
      amountUsd: data.packageId === 'song-50' ? 0.99 : 2.99,
      transactionId: data.transactionId,
      screenshotName: data.screenshotName,
      status: 'Pending',
      createdAt: 'Just now',
    };

    setTransactions((prev) => [newTx, ...prev]);
  };

  const submitGlobalPayment = async (data: {
    packageId: 'song-50' | 'voice-150';
    packageName: string;
    songsAdded: number;
    voicePassAdded: number;
    amountUsd: number;
  }) => {
    // P0: card payments are DISABLED until a real payment processor (e.g.
    // Stripe) is integrated. This function must never mint credits — the
    // previous implementation created "Approved" transactions with a fake
    // test card number and no processor. The Wallet UI now shows a
    // "Card payments coming soon" state instead of calling this.
    throw new Error(
      'Card payments are coming soon. Please top up with EasyPaisa or JazzCash.'
    );
  };

  const approveTransaction = async (txId: string) => {
    try {
      await awaazifyApi.approvePayment(txId);
    } catch (err: any) {
      const msg = err?.message || 'server error';
      // P1: backend returns 409 when the payment was already processed
      // (e.g. double-click race) — mark it approved locally WITHOUT
      // crediting the wallet again, and don't alarm the admin.
      if (msg.includes('409') || msg.toLowerCase().includes('already processed')) {
        setTransactions((prev) =>
          prev.map((tx) => (tx.id === txId ? { ...tx, status: 'Approved' } : tx))
        );
        return;
      }
      // P0: surface backend failures to the admin instead of pretending success.
      window.alert(`Could not approve payment: ${msg}`);
      return;
    }
    setTransactions((prev) =>
      prev.map((tx) => {
        if (tx.id !== txId || tx.status === 'Approved') return tx;
        addWalletPackage(
          tx.songsAdded,
          tx.voicePassAdded,
          tx.amountPkr || (tx.packageId === 'song-50' ? 50 : 150),
          tx.amountUsd || (tx.packageId === 'song-50' ? 0.99 : 2.99)
        );
        return { ...tx, status: 'Approved' };
      })
    );
  };

  const rejectTransaction = async (txId: string) => {
    try {
      await awaazifyApi.rejectPayment(txId);
    } catch (err: any) {
      const msg = err?.message || 'server error';
      // P1: 409 = already processed (double-click race) — mark rejected
      // locally without alarming the admin.
      if (msg.includes('409') || msg.toLowerCase().includes('already processed')) {
        setTransactions((prev) =>
          prev.map((tx) => (tx.id === txId ? { ...tx, status: 'Rejected' } : tx))
        );
        return;
      }
      window.alert(`Could not reject payment: ${msg}`);
      return;
    }
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === txId ? { ...tx, status: 'Rejected' } : tx))
    );
  };

  const deleteTransaction = async (txId: string) => {
    try {
      await awaazifyApi.deletePayment(txId);
    } catch (err: any) {
      window.alert(`Could not delete payment: ${err?.message || 'server error'}`);
      return;
    }
    setTransactions((prev) => prev.filter((tx) => tx.id !== txId));
  };

  const deleteTrainingJob = async (jobId: string) => {
    try {
      await awaazifyApi.deleteTrainingJob(jobId);
    } catch (err: any) {
      window.alert(`Could not delete training job: ${err?.message || 'server error'}`);
      return;
    }
    setTrainingJobs((prev) => prev.filter((j) => j.id !== jobId));
  };

  const submitCustomVoiceTraining = async (data: {
    voiceName: string;
    audioFileNames: string[];
    totalDurationSec: number;
  }) => {
    const res = await awaazifyApi.trainCustomVoice({
      userId: user?.id || 'usr_studio',
      voiceName: data.voiceName,
      audioFiles: data.audioFileNames,
      autoCleanNoise: true,
    });

    // P1 honesty: the backend deducts Rs. 150 and queues the training job.
    // The voice is NOT instantly active — it only enters the library after
    // training completes and the admin publishes it. Track the job with a
    // pending status instead of injecting a fake 'Active' model.
    // Mirror the server-side Rs. 150 deduction optimistically so the wallet
    // display stays in sync (the backend is the source of truth).
    setWallet((prev) => ({
      ...prev,
      balancePkr: Math.max(0, prev.balancePkr - 150),
    }));
    const newJob: CustomVoiceTrainingJob = {
      id: res.trainingJobId,
      userId: user?.id || 'usr_studio',
      userEmail: user?.email || 'user@example.com',
      voiceName: data.voiceName,
      audioFileNames: data.audioFileNames,
      totalDurationSec: data.totalDurationSec,
      autoCleanNoise: true,
      status: 'Processing',
      createdAt: 'Just now',
    };

    setTrainingJobs((prev) => [newJob, ...prev]);
  };

  const publishTrainedVoiceToUserLibrary = async (
    jobId: string,
    modelFile: string,
    extraFile: string
  ) => {
    const job = trainingJobs.find((j) => j.id === jobId);
    if (!job) return;

    let res;
    try {
      res = await awaazifyApi.publishTrainedVoice(jobId, {
        modelFileUrl: modelFile,
        indexFileUrl: extraFile,
      });
    } catch (err: any) {
      // P0: surface backend failures to the admin instead of pretending success.
      window.alert(`Could not publish trained voice: ${err?.message || 'server error'}`);
      return;
    }

    const newCustomModel: VoiceModel = {
      id: res.voiceModelId || `vm_custom_${Date.now().toString(36)}`,
      name: job.voiceName,
      subtitle: `Personal Voice (${job.userEmail})`,
      category: 'Custom',
      usageCount: 1,
      avatarConfig: {
        silhouetteType: 'custom',
        gradientTheme: 'emerald',
        baseFreqHz: 205,
      },
      modelFileName: modelFile || 'ready_voice.pth',
      extraFileName: extraFile || 'ready_voice.index',
      defaultPitch: 0,
      status: 'Active',
      isCustom: true,
      ownerUserId: job.userId,
    };

    setVoiceModels((prev) => [newCustomModel, ...prev]);
    setTrainingJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? { ...j, status: 'Active in Library', linkedModelId: newCustomModel.id }
          : j
      )
    );
  };

  return (
    <AppContext.Provider
      value={{
        regionMode,
        setRegionMode,
        isAuthenticated,
        user,
        wallet,
        formattedBalance,
        activeView,
        setActiveView,
        publicPage,
        setPublicPage,
        studioTool,
        setStudioTool,
        selectedVoiceId,
        setSelectedVoiceId,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        loginWithGoogle,
        logoutUser,
        requireAuthAndNavigate,
        consumeSongPassOrTrial,
        refreshWallet,
        addWalletPackage,
        voiceModels,
        refreshAdminVoiceModels,
        addAdminVoiceModel,
        toggleVoiceModelStatus,
        deleteVoiceModel,
        generatedSongs,
        addGeneratedSong,
        applyFreeRetryAdjustment,
        transactions,
        submitLocalPaymentRequest,
        submitGlobalPayment,
        approveTransaction,
        rejectTransaction,
        deleteTransaction,
        deleteTrainingJob,
        trainingJobs,
        submitCustomVoiceTraining,
        publishTrainedVoiceToUserLibrary,
        isAdminVerified,
        setIsAdminVerified,
        triggerLogoMicClick,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextValue => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
};
