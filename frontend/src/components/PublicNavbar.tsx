import React, { useState } from 'react';
import { Music, Menu, X, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BrandLogo } from './BrandLogo';
import { PublicPage } from '../types';

export const PublicNavbar: React.FC = () => {
  const {
    publicPage,
    setPublicPage,
    isAuthenticated,
    openAuthModal,
    setActiveView,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: PublicPage; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'voices', label: 'Explore Voices' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'pricing', label: 'Pricing' },
  ];

  const handleNavClick = (page: PublicPage) => {
    setPublicPage(page);
    setMobileMenuOpen(false);
  };

  const handleStartFreeClick = () => {
    setMobileMenuOpen(false);
    if (!isAuthenticated) {
      openAuthModal({ targetTool: 'song-cover' });
    } else {
      setActiveView('studio');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Logo */}
        <BrandLogo onClickNavigate={() => handleNavClick('home')} />

        {/* Zone 2: Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-7">
          {navItems.map((item) => {
            const active = publicPage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`text-sm font-bold transition-colors whitespace-nowrap shrink-0 py-1.5 border-b-2 cursor-pointer ${
                  active
                    ? 'text-[#059669] border-[#10B981]'
                    : 'text-slate-600 border-transparent hover:text-[#0F172A]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action & Mobile Hamburger Button */}
        <div className="flex items-center gap-3 shrink-0">
          {!isAuthenticated ? (
            <>
              <button
                type="button"
                onClick={() => openAuthModal({ targetTool: 'song-cover' })}
                className="hidden sm:inline-flex items-center justify-center px-4 py-2.5 text-xs sm:text-sm font-bold text-[#0F172A] bg-white border border-slate-200 hover:border-[#10B981] rounded-2xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={handleStartFreeClick}
                className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-extrabold text-white bg-[#10B981] hover:bg-[#059669] rounded-2xl shadow-sm transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Music className="w-4 h-4" />
                <span>Start Free</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setActiveView('studio')}
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-extrabold text-white bg-[#10B981] hover:bg-[#059669] rounded-2xl shadow-sm transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Music className="w-4 h-4" />
              <span>Open Studio</span>
            </button>
          )}

          {/* Mobile Hamburger Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0F172A] transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Smooth Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3 shadow-lg">
          <nav className="flex flex-col space-y-1">
            {navItems.map((item) => {
              const active = publicPage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-extrabold flex items-center justify-between transition-colors cursor-pointer ${
                    active
                      ? 'bg-emerald-50 text-[#059669]'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{item.label}</span>
                  <ArrowRight className="w-4 h-4 opacity-60" />
                </button>
              );
            })}
          </nav>

          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2.5">
            {!isAuthenticated && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openAuthModal({ targetTool: 'song-cover' });
                }}
                className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-[#0F172A] font-extrabold text-sm text-center cursor-pointer"
              >
                Sign In
              </button>
            )}
            <button
              type="button"
              onClick={handleStartFreeClick}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Music className="w-4 h-4" />
              <span>{isAuthenticated ? 'Open Studio' : 'Start Free Trial'}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
