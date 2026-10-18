import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Trash2,
  RefreshCw,
  Download,
  Eye,
  Upload,
  ShieldCheck,
  Mic,
  CreditCard,
  Users,
  Lock,
  LogOut,
  Link2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BrandLogo } from '../components/BrandLogo';
import { VoiceCategory, VoiceModel } from '../types';
import { studioAudio } from '../utils/audioEngine';
import { awaazifyApi } from '../services/api';

export const AdminDashboard: React.FC = () => {
  const {
    isAuthenticated,
    user,
    setActiveView,
    loginWithGoogle,
    logoutUser,
    voiceModels,
    addAdminVoiceModel,
    toggleVoiceModelStatus,
    deleteVoiceModel,
    transactions,
    approveTransaction,
    rejectTransaction,
    trainingJobs,
    publishTrainedVoiceToUserLibrary,
  } = useApp();

  // Google-auth admin gate. The stealth entry (Ctrl+Shift+A / 5x logo click)
  // opens this panel shell; real enforcement is SERVER-SIDE — the backend
  // allowlists ONE admin Gmail (ADMIN_EMAIL env var) against the verified
  // Google JWT email on every /api/v1/admin/* route. This UI only decides
  // what to show: sign-in card, access-denied card, or the dashboard.
  const [adminCheck, setAdminCheck] = useState<'loading' | 'allowed' | 'denied' | 'signed-out'>('loading');
  const [gateError, setGateError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isAuthenticated) {
        if (!cancelled) setAdminCheck('signed-out');
        return;
      }
      if (!cancelled) {
        setAdminCheck('loading');
        setGateError('');
      }
      try {
        const me = await awaazifyApi.getAdminMe();
        if (!cancelled) setAdminCheck(me.is_admin ? 'allowed' : 'denied');
      } catch (err: any) {
        if (!cancelled) {
          setGateError(err?.message || 'Could not verify admin access.');
          setAdminCheck('denied');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const handleGoogleContinue = async () => {
    setGateError('');
    try {
      await loginWithGoogle('admin');
    } catch (err: any) {
      setGateError(err?.message || 'Google sign-in failed. Please try again.');
    }
  };

  const [activeTab, setActiveTab] = useState<'models' | 'payments' | 'training'>('models');

  // Voice Model Form State
  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState<VoiceCategory>('Singers');
  const [gradientTheme, setGradientTheme] =
    useState<VoiceModel['avatarConfig']['gradientTheme']>('emerald');
  const [avatarFileName, setAvatarFileName] = useState('');
  const [pthDriveUrl, setPthDriveUrl] = useState('');
  const [indexDriveUrl, setIndexDriveUrl] = useState('');
  const [demoFileName, setDemoFileName] = useState('');
  const [isSubmittingModel, setIsSubmittingModel] = useState(false);
  const [cmsFeedback, setCmsFeedback] = useState('');

  // Payment Receipt Preview State
  const [previewScreenshotTx, setPreviewScreenshotTx] = useState<string | null>(null);

  // Ready Voice File State
  const [readyFileByJob, setReadyFileByJob] = useState<Record<string, string>>({});

  const pendingPaymentsCount = transactions.filter((t) => t.status === 'Pending').length;

  const handleCreateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmittingModel(true);
    setCmsFeedback('');

    try {
      await addAdminVoiceModel({
        name: name.trim(),
        subtitle: subtitle.trim() || 'Expressive studio singing voice',
        category,
        avatarConfig: {
          silhouetteType: 'vocalist',
          gradientTheme,
          baseFreqHz: 215,
        },
        modelFileName: `${name.toLowerCase().replace(/\s+/g, '_')}.pth`,
        extraFileName: `${name.toLowerCase().replace(/\s+/g, '_')}.index`,
        modelFileUrl: pthDriveUrl.trim() || undefined,
        indexFileUrl: indexDriveUrl.trim() || undefined,
        defaultPitch: 0,
        previewAudioUrl: demoFileName || 'https://zvmixkkymxgnqatxehqg.supabase.co/storage/v1/object/public/rvc-models/demo_audio.mp3',
        status: 'Active',
      });
    } catch (err: any) {
      // P0: surface backend failures instead of pretending the model was published.
      setIsSubmittingModel(false);
      setCmsFeedback(`Failed to publish model: ${err?.message || 'server error'}`);
      setTimeout(() => setCmsFeedback(''), 5000);
      return;
    }

    setName('');
    setSubtitle('');
    setAvatarFileName('');
    setPthDriveUrl('');
    setIndexDriveUrl('');
    setDemoFileName('');
    setIsSubmittingModel(false);
    setCmsFeedback('Voice model published to the live catalog.');
    setTimeout(() => setCmsFeedback(''), 3500);
  };

  // RENDER GOOGLE-AUTH ADMIN GATE (replaces the old PIN/OTP theater).
  // The stealth entry opens this shell; the backend enforces the single
  // admin Gmail on every admin API call. States: signed-out -> Google button;
  // loading -> spinner; denied -> restricted message + sign out; allowed ->
  // the full dashboard below.
  if (adminCheck !== 'allowed') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col">
        <header className="bg-white border-b border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <BrandLogo
              size="sm"
              onClickNavigate={() => setActiveView(isAuthenticated ? 'studio' : 'public')}
            />
            <button
              type="button"
              onClick={() => setActiveView(isAuthenticated ? 'studio' : 'public')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-extrabold text-[#0F172A] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isAuthenticated ? 'Back to Studio' : 'Back to Website'}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-xl p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#059669] flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F172A]">
                Admin Access
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                {adminCheck === 'signed-out' &&
                  'This area is restricted to the Awaazify administrator. Sign in with the admin Google account to continue.'}
                {adminCheck === 'loading' && 'Verifying admin access…'}
                {adminCheck === 'denied' &&
                  'Access restricted — this area is limited to the admin account.'}
              </p>
            </div>

            {adminCheck === 'loading' && (
              <div className="flex justify-center py-6">
                <RefreshCw className="w-8 h-8 text-[#10B981] animate-spin" />
              </div>
            )}

            {adminCheck === 'signed-out' && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleContinue}
                  className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-sm transition-all shadow-sm cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.08.72-2.45 1.16-4.22 1.16-3.24 0-5.98-2.18-6.96-5.11H1.02v3.14C3.03 21.18 7.21 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.04 14.04C4.79 13.32 4.65 12.55 4.65 11.75s.14-1.57.39-2.29V6.32H1.02C.37 7.61 0 9.09 0 11.75s.37 4.14 1.02 5.43l4.02-3.14z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.79 0 3.4.62 4.67 1.82l3.5-3.5C18.07 1.14 15.3 0 12 0 7.21 0 3.03 2.82 1.02 6.82l4.02 3.14c.98-2.93 3.72-5.21 6.96-5.21z"
                      />
                    </svg>
                  </div>
                  <span>Continue with Google</span>
                </button>
                {gateError && (
                  <p className="text-xs text-red-600 font-bold text-center">
                    {gateError}
                  </p>
                )}
              </>
            )}

            {adminCheck === 'denied' && (
              <div className="space-y-4">
                {user?.email && (
                  <p className="text-xs text-slate-500 font-semibold text-center">
                    Signed in as <span className="text-[#0F172A]">{user?.email ?? ''}</span>
                  </p>
                )}
                {gateError && (
                  <p className="text-xs text-red-600 font-bold text-center">
                    {gateError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => logoutUser()}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-[#0F172A] hover:bg-slate-800 text-white font-extrabold text-sm transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col">
      {/* Top Standalone Admin Navbar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandLogo
              size="sm"
              onClickNavigate={() => setActiveView(isAuthenticated ? 'studio' : 'public')}
            />
            <span className="hidden sm:inline-block text-slate-300">|</span>
            <div className="hidden sm:flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-[#059669] truncate">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span className="truncate">Admin Dashboard (Verified)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => logoutUser()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-extrabold text-amber-900 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Lock Admin</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView(isAuthenticated ? 'studio' : 'public')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-extrabold text-[#0F172A] transition-colors cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{isAuthenticated ? 'Studio' : 'Website'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Summary Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase">Active Voices</div>
              <div className="text-2xl font-extrabold text-[#0F172A] mt-1 tabular-nums">
                {voiceModels.length}
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#059669] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase">Pending Payments</div>
              <div className="text-2xl font-extrabold text-amber-600 mt-1 tabular-nums">
                {pendingPaymentsCount}
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-[#F59E0B] flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase">Custom Voice Orders</div>
              <div className="text-2xl font-extrabold text-[#059669] mt-1 tabular-nums">
                {trainingJobs.length}
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#10B981] flex items-center justify-center">
              <Mic className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('models')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'models'
                ? 'bg-[#10B981] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:text-[#0F172A]'
            }`}
          >
            Voice Catalog ({voiceModels.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'payments'
                ? 'bg-[#10B981] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:text-[#0F172A]'
            }`}
          >
            Payment Approvals ({pendingPaymentsCount} Pending)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('training')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'training'
                ? 'bg-[#10B981] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:text-[#0F172A]'
            }`}
          >
            Custom Voice Orders ({trainingJobs.length})
          </button>
        </div>

        {/* TAB 1: VOICE CATALOG & ADD NEW VOICE */}
        {activeTab === 'models' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Add New Voice Form */}
            <form
              onSubmit={handleCreateModel}
              className="lg:col-span-4 p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4"
            >
              <h2 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-[#10B981]" />
                <span>Add New Voice</span>
              </h2>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Voice Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Rahat Fateh Ali Khan"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-[#0F172A] focus:border-[#10B981] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Short Description
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Warm acoustic and classical vocals"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-[#0F172A] focus:border-[#10B981] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as VoiceCategory)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-[#0F172A] focus:border-[#10B981] focus:outline-none"
                  >
                    <option value="Singers">Singers</option>
                    <option value="Cricketers & Celebs">Cricketers & Celebs</option>
                    <option value="Public Leaders">Public Leaders</option>
                    <option value="Global Stars">Global Stars</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Color Theme
                  </label>
                  <select
                    value={gradientTheme}
                    onChange={(e) =>
                      setGradientTheme(
                        e.target.value as VoiceModel['avatarConfig']['gradientTheme']
                      )
                    }
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-[#0F172A] focus:border-[#10B981] focus:outline-none"
                  >
                    <option value="emerald">Emerald Green</option>
                    <option value="amber">Sunny Amber</option>
                    <option value="sky">Sky Blue</option>
                    <option value="rose">Warm Rose</option>
                    <option value="violet">Royal Violet</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                <label className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-dashed border-slate-300 hover:border-[#10B981] cursor-pointer text-xs">
                  <span className="font-bold text-slate-700 truncate">
                    {avatarFileName || 'Upload Portrait Image'}
                  </span>
                  <Upload className="w-4 h-4 text-[#10B981] shrink-0" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setAvatarFileName(f.name);
                    }}
                    className="hidden"
                  />
                </label>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      .pth Google Drive Link (RVC Model File)
                    </label>
                    <div className="relative flex items-center">
                      <Link2 className="w-3.5 h-3.5 text-[#10B981] absolute left-3 pointer-events-none" />
                      <input
                        type="url"
                        value={pthDriveUrl}
                        onChange={(e) => setPthDriveUrl(e.target.value)}
                        placeholder="https://drive.google.com/file/d/.../view"
                        className="w-full pl-8 pr-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-[#0F172A] placeholder:text-slate-400 focus:border-[#10B981] focus:bg-white focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      .index Google Drive Link (Feature Index File)
                    </label>
                    <div className="relative flex items-center">
                      <Link2 className="w-3.5 h-3.5 text-[#10B981] absolute left-3 pointer-events-none" />
                      <input
                        type="url"
                        value={indexDriveUrl}
                        onChange={(e) => setIndexDriveUrl(e.target.value)}
                        placeholder="https://drive.google.com/file/d/.../view"
                        className="w-full pl-8 pr-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-[#0F172A] placeholder:text-slate-400 focus:border-[#10B981] focus:bg-white focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <label className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-dashed border-slate-300 hover:border-[#10B981] cursor-pointer text-xs">
                  <span className="font-bold text-slate-700 truncate">
                    {demoFileName || 'Upload 5s Audio Sample (.mp3)'}
                  </span>
                  <Upload className="w-4 h-4 text-[#10B981] shrink-0" />
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setDemoFileName(f.name);
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              {cmsFeedback && (
                <p className="text-xs text-[#059669] font-extrabold">{cmsFeedback}</p>
              )}

              <button
                type="submit"
                disabled={isSubmittingModel}
                className="w-full py-3 px-4 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-sm shadow-xs transition-all cursor-pointer"
              >
                {isSubmittingModel ? 'Publishing...' : 'Publish Voice Model'}
              </button>
            </form>

            {/* Voice Models Data Table */}
            <div className="lg:col-span-8 p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-extrabold text-[#0F172A]">
                  Voice Catalog ({voiceModels.length})
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-extrabold uppercase text-slate-400">
                      <th className="py-3 pr-4">Voice Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Total Covers</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                    {voiceModels.map((vm) => (
                      <tr key={vm.id} className="hover:bg-slate-50/80">
                        <td className="py-3.5 pr-4">
                          <div className="font-extrabold text-[#0F172A]">{vm.name}</div>
                          <div className="text-xs text-slate-500 truncate max-w-xs">
                            {vm.subtitle}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-semibold whitespace-nowrap">
                          {vm.category}
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-slate-600">
                          {vm.usageCount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`text-xs font-extrabold ${
                              vm.status === 'Active'
                                ? 'text-[#059669]'
                                : vm.status === 'Coming Soon'
                                ? 'text-amber-600'
                                : 'text-slate-400'
                            }`}
                          >
                            {vm.status}
                          </span>
                        </td>
                        <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleVoiceModelStatus(vm.id)}
                            title="Toggle Status"
                            className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-[#059669] mr-1.5 cursor-pointer"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteVoiceModel(vm.id)}
                            title="Delete Voice"
                            className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PAYMENT APPROVALS DATA TABLE */}
        {activeTab === 'payments' && (
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
            <div>
              <h2 className="text-base font-extrabold text-[#0F172A]">
                Payment Verification Queue
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify Transaction IDs (TID) and receipt screenshots to credit user wallets immediately.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-extrabold uppercase text-slate-400">
                    <th className="py-3 pr-4">Gateway & TID</th>
                    <th className="py-3 px-4">User Email</th>
                    <th className="py-3 px-4">Package</th>
                    <th className="py-3 px-4">Receipt</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 pl-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80">
                      <td className="py-3.5 pr-4 font-mono tabular-nums whitespace-nowrap">
                        <div className="font-extrabold text-[#0F172A] uppercase">
                          {tx.provider}
                        </div>
                        <div className="text-[#059669] font-bold">
                          TID: {tx.transactionId}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap">
                        {tx.userEmail}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-[#0F172A] font-bold">{tx.packageName}</div>
                        <div className="text-slate-500 text-xs font-mono">
                          {tx.amountDisplay}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewScreenshotTx(
                              previewScreenshotTx === tx.id ? null : tx.id
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 font-bold text-xs cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#059669]" />
                          <span>{tx.screenshotName || 'receipt.jpg'}</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`font-extrabold text-xs ${
                            tx.status === 'Approved'
                              ? 'text-[#059669]'
                              : tx.status === 'Rejected'
                              ? 'text-red-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                        {tx.status === 'Pending' ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => approveTransaction(tx.id)}
                              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-xs cursor-pointer shadow-2xs"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => rejectTransaction(tx.id)}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs cursor-pointer"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs font-bold">
                            Processed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {previewScreenshotTx && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs space-y-1">
                  <div className="font-extrabold text-[#0F172A]">
                    Receipt Preview — TID:{' '}
                    {transactions.find((t) => t.id === previewScreenshotTx)?.transactionId}
                  </div>
                  <div className="text-slate-600">
                    Verified transfer to official Awaazify merchant wallet.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewScreenshotTx(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-white text-xs font-bold text-slate-700 border border-slate-200 cursor-pointer self-start sm:self-auto"
                >
                  Close Preview
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CUSTOM VOICE ORDERS TABLE */}
        {activeTab === 'training' && (
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
            <div>
              <h2 className="text-base font-extrabold text-[#0F172A]">
                Custom Voice Training Orders
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Download customer 3-minute voice recordings and publish completed voice models to their account.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-extrabold uppercase text-slate-400">
                    <th className="py-3 pr-4">Voice Name</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Recording Duration</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 pl-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {trainingJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50/80">
                      <td className="py-4 pr-4 font-extrabold text-[#0F172A] whitespace-nowrap">
                        {job.voiceName}
                      </td>
                      <td className="py-4 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {job.userEmail}
                      </td>
                      <td className="py-4 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                        {Math.floor(job.totalDurationSec / 60)}m {job.totalDurationSec % 60}s
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="text-xs font-extrabold text-[#059669]">
                          {job.status}
                        </span>
                      </td>
                      <td className="py-4 pl-4 text-right whitespace-nowrap">
                        <div className="inline-flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              studioAudio.downloadMasterAudioFile(
                                `${job.voiceName.toLowerCase().replace(/\s+/g, '_')}_3min_recording.wav`,
                                210,
                                5
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#0F172A] cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5 text-[#10B981]" />
                            <span>Download Audio</span>
                          </button>

                          <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-xs font-bold text-slate-700 cursor-pointer">
                            <Upload className="w-3.5 h-3.5 text-[#10B981]" />
                            <span>
                              {readyFileByJob[job.id] || 'Attach Voice File'}
                            </span>
                            <input
                              type="file"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                  setReadyFileByJob((prev) => ({
                                    ...prev,
                                    [job.id]: f.name,
                                  }));
                                }
                              }}
                              className="hidden"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() =>
                              publishTrainedVoiceToUserLibrary(
                                job.id,
                                readyFileByJob[job.id] || 'custom_voice.model',
                                'custom_voice.profile'
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-xs cursor-pointer shadow-2xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Publish to User</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
