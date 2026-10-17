import React from 'react';
import { Music, Mic, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BrandLogo } from './BrandLogo';
import { PublicPage } from '../types';

export const PublicFooter: React.FC = () => {
  const { publicPage, setPublicPage, requireAuthAndNavigate } = useApp();

  const navLinks: { id: PublicPage; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'voices', label: 'Explore Voices' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'pricing', label: 'Pricing' },
  ];

  return (
    <footer className="bg-white border-t border-slate-200/80 text-[#0F172A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-slate-100">
          {/* Brand Column */}
          <div className="md:col-span-5 space-y-3">
            <BrandLogo size="sm" onClickNavigate={() => setPublicPage('home')} />
            <p className="text-xs sm:text-sm text-slate-600 max-w-sm leading-relaxed font-medium">
              Create studio-quality song covers in your favorite voice or train your own personal voice model in minutes.
            </p>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#059669]">
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
              <span>1 Free 30-Second Preview Included</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-4 space-y-2.5">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Navigation
            </div>
            <ul className="grid grid-cols-2 sm:grid-cols-1 gap-2">
              {navLinks.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setPublicPage(item.id)}
                    className={`text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                      publicPage === item.id
                        ? 'text-[#059669]'
                        : 'text-slate-600 hover:text-[#0F172A]'
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Studio Actions */}
          <div className="md:col-span-3 space-y-2.5">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Get Started
            </div>
            <div className="flex flex-col sm:flex-row md:flex-col gap-2.5">
              <button
                type="button"
                onClick={() => requireAuthAndNavigate('song-cover')}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-extrabold transition-all cursor-pointer shadow-2xs"
              >
                <Music className="w-3.5 h-3.5" />
                <span>Create Song Cover</span>
              </button>
              <button
                type="button"
                onClick={() => requireAuthAndNavigate('train-voice')}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-[#0F172A] text-xs font-extrabold transition-all cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Train Custom Voice</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Copyright Row */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-semibold">
          <span>© {new Date().getFullYear()} Awaazify. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <span>EasyPaisa · JazzCash · Card</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
