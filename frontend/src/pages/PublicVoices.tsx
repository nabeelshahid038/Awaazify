import React, { useState } from 'react';
import { Search, Mic, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { NeonNoirVoiceCard } from '../components/NeonNoirVoiceCard';

const FILTER_TABS = [
  'All',
  'Singers',
  'Cricketers & Celebs',
  'Public Leaders',
  'Global Stars',
] as const;

export const PublicVoices: React.FC = () => {
  const { voiceModels, requireAuthAndNavigate } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('All');

  const visibleModels = voiceModels.filter((m) => {
    if (m.status === 'Hidden') return false;
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeFilter === 'All') return true;
    return m.category === activeFilter;
  });

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] py-10 lg:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 pb-6 border-b border-slate-200/80">
          <div>
            <span className="text-xs font-extrabold text-[#059669] uppercase tracking-wider">
              Voice Catalog
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-[#0F172A] mt-1">
              Explore AI Voice Models
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1.5 max-w-xl">
              Preview a 5-second demo on any card or train your own custom voice from a 3-minute recording.
            </p>
          </div>

          <button
            type="button"
            onClick={() => requireAuthAndNavigate('train-voice')}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#FEF3C7] hover:bg-amber-200 text-amber-950 border border-amber-300 text-xs sm:text-sm font-extrabold transition-all self-start lg:self-auto cursor-pointer whitespace-nowrap shrink-0"
          >
            <Mic className="w-4 h-4 text-[#F59E0B]" />
            <span>Train Custom Voice</span>
          </button>
        </div>

        {/* Search & Category Buttons */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative w-full md:w-80 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search voices by name or style..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 focus:border-[#10B981] focus:outline-none text-sm font-medium text-[#0F172A] placeholder-slate-400 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {FILTER_TABS.map((tab) => {
              const active = activeFilter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveFilter(tab)}
                  className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#10B981] text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:text-[#0F172A] hover:border-[#10B981]/50'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Voice Cards Grid */}
        {visibleModels.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {visibleModels.map((model) => (
              <NeonNoirVoiceCard
                key={model.id}
                model={model}
                onSelectVoice={(m) => requireAuthAndNavigate('song-cover', m.id)}
              />
            ))}
          </div>
        ) : (
          <div className="p-10 rounded-3xl bg-white border border-slate-200 text-center space-y-3 shadow-2xs">
            <p className="text-base font-extrabold text-[#0F172A]">
              No voices matched "{searchQuery}"
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveFilter('All');
              }}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-[#10B981] text-white text-xs font-extrabold cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Show All Voices</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
