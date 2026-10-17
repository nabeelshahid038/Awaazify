import React, { useState } from 'react';
import {
  ArrowLeft,
  Music,
  Mic,
  Headphones,
  CreditCard,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  Wallet,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BrandLogo } from '../components/BrandLogo';
import { StudioTool } from '../types';
import { SongCoverTool } from '../components/studio/SongCoverTool';
import { TrainVoiceTool } from '../components/studio/TrainVoiceTool';
import { MySongsLibrary } from '../components/studio/MySongsLibrary';
import { WalletCheckoutTool } from '../components/studio/WalletCheckoutTool';

export const StudioDashboard: React.FC = () => {
  const {
    user,
    wallet,
    formattedBalance,
    studioTool,
    setStudioTool,
    setActiveView,
    logoutUser,
    generatedSongs,
  } = useApp();

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const studioTabs: {
    id: StudioTool;
    label: string;
    shortMobile: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: 'song-cover',
      label: '1. Create Song Cover',
      shortMobile: 'Create Song',
      icon: <Music className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'train-voice',
      label: '2. Train Custom Voice',
      shortMobile: 'My Voice',
      icon: <Mic className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'my-songs',
      label: '3. My Songs',
      shortMobile: 'My Songs',
      icon: <Headphones className="w-4 h-4 shrink-0" />,
      badge: generatedSongs.length,
    },
    {
      id: 'wallet',
      label: '4. Wallet & Pricing',
      shortMobile: 'Wallet',
      icon: <CreditCard className="w-4 h-4 shrink-0" />,
    },
  ];

  const handleSelectTool = (tool: StudioTool) => {
    setStudioTool(tool);
    setMobileDrawerOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col lg:flex-row pb-20 lg:pb-0 overflow-x-hidden">
      {/* DESKTOP LEFT SIDEBAR */}
      <aside className="hidden lg:flex w-72 shrink-0 bg-white border-r border-slate-200/80 flex-col justify-between p-6">
        <div className="space-y-6">
          {/* Brand Logo & Back to Website Link */}
          <div className="flex flex-col items-start gap-3 pb-5 border-b border-slate-100">
            <BrandLogo size="md" onClickNavigate={() => setActiveView('public')} />
            <button
              type="button"
              onClick={() => setActiveView('public')}
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-500 hover:text-[#059669] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Website</span>
            </button>
          </div>

          {/* 4 Studio Navigation Tabs */}
          <nav className="space-y-2">
            {studioTabs.map((item) => {
              const active = studioTool === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTool(item.id)}
                  className={`w-full flex items-center justify-between gap-2 px-4 py-3.5 rounded-2xl text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#10B981] text-white shadow-sm'
                      : 'bg-slate-50 text-[#0F172A] hover:bg-emerald-50 hover:text-[#059669] border border-slate-200/70'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </span>
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-lg text-xs font-extrabold tabular-nums ${
                        active
                          ? 'bg-white text-[#059669]'
                          : 'bg-emerald-100 text-[#059669]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* BOTTOM SIDEBAR: User Info */}
        <div className="pt-6 mt-6 border-t border-slate-100 space-y-4">

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#059669] flex items-center justify-center shrink-0">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-extrabold text-[#0F172A] truncate">
                    {user?.name || 'Studio Creator'}
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                </div>
                <div className="text-[11px] text-slate-500 truncate font-medium">
                  {user?.email || 'user@example.com'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={logoutUser}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-xs font-extrabold text-slate-600 hover:text-red-600 transition-colors shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Studio Header */}
        <header className="sticky top-0 z-30 h-16 sm:h-20 px-3.5 sm:px-8 border-b border-slate-200/80 bg-white/95 backdrop-blur-md flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <div className="lg:hidden">
              <BrandLogo size="sm" onClickNavigate={() => setActiveView('public')} />
            </div>
            <div className="hidden lg:block text-sm font-extrabold text-slate-700">
              Awaazify Voice Studio
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Wallet Balance Button (Compact on mobile so it never overlaps BrandLogo) */}
            <button
              type="button"
              onClick={() => handleSelectTool('wallet')}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-[#10B981] text-xs sm:text-sm font-extrabold transition-colors cursor-pointer whitespace-nowrap"
            >
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#10B981] shrink-0" />
              <span className="hidden sm:inline text-slate-500">Balance:</span>
              <span className="text-[#059669] font-mono tabular-nums">
                {formattedBalance}
              </span>
            </button>

            {/* Mobile Hamburger Drawer Button */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen((prev) => !prev)}
              className="lg:hidden inline-flex items-center justify-center p-2 sm:p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0F172A] transition-colors cursor-pointer shrink-0"
              aria-label="Open Studio Menu"
            >
              {mobileDrawerOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </header>

        {/* Smooth Mobile Navigation Drawer */}
        {mobileDrawerOpen && (
          <div className="lg:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-5 space-y-4 shadow-lg">
            <nav className="flex flex-col space-y-1.5">
              {studioTabs.map((item) => {
                const active = studioTool === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTool(item.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-extrabold transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#10B981] text-white'
                        : 'bg-slate-50 text-[#0F172A] hover:bg-emerald-50'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      {item.icon}
                      <span>{item.label}</span>
                    </span>
                    {typeof item.badge === 'number' && item.badge > 0 && (
                      <span
                        className={`px-2 py-0.5 rounded-lg text-xs font-extrabold ${
                          active
                            ? 'bg-white text-[#059669]'
                            : 'bg-emerald-100 text-[#059669]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    setActiveView('public');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-extrabold text-slate-700 cursor-pointer"
                >
                  Website
                </button>
                <button
                  type="button"
                  onClick={logoutUser}
                  className="px-3 py-1.5 rounded-xl bg-red-50 text-xs font-extrabold text-red-600 cursor-pointer"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Studio Tool Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto min-w-0">
          {studioTool === 'song-cover' && <SongCoverTool />}
          {studioTool === 'train-voice' && <TrainVoiceTool />}
          {studioTool === 'my-songs' && <MySongsLibrary />}
          {studioTool === 'wallet' && <WalletCheckoutTool />}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 px-2 py-2 grid grid-cols-4 gap-1 shadow-lg">
        {studioTabs.map((item) => {
          const active = studioTool === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectTool(item.id)}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-2xl text-[11px] font-extrabold transition-all cursor-pointer min-w-0 ${
                active
                  ? 'bg-[#10B981] text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.icon}
              <span className="truncate max-w-full">{item.shortMobile}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
