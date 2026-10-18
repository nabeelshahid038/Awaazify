import React from 'react';
import { Home, SearchX } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const PublicNotFound: React.FC = () => {
  const { setPublicPage } = useApp();

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] py-16 lg:py-24">
      <div className="max-w-xl mx-auto px-4 sm:px-6 text-center">
        <div className="mx-auto w-16 h-16 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
          <SearchX className="w-8 h-8 text-[#059669]" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] mt-6">
          Page not found
        </h1>
        <p className="text-sm sm:text-base text-slate-600 font-medium mt-3 leading-relaxed">
          The page you are looking for does not exist or was moved.
          Let&apos;s get you back to the music.
        </p>
        <button
          type="button"
          onClick={() => setPublicPage('home')}
          className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white text-sm font-extrabold transition-all cursor-pointer shadow-md"
        >
          <Home className="w-4 h-4" />
          Back to home
        </button>
      </div>
    </div>
  );
};
