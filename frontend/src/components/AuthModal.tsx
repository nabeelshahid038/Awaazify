import React, { useState } from 'react';
import { X, Gift } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BrandLogo } from './BrandLogo';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, loginWithGoogle } = useApp();
  const [errorMsg, setErrorMsg] = useState('');

  if (!isAuthModalOpen) return null;

  const handleGoogleContinue = async () => {
    try {
      setErrorMsg('');
      await loginWithGoogle();
    } catch (err: any) {
      setErrorMsg(err.message || 'Google Sign-In failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-8 overflow-hidden">
        {/* Close Button */}
        <button
          type="button"
          onClick={closeAuthModal}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-5">
          <BrandLogo size="md" />
          <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-[#059669]">
            <Gift className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Includes 1 Free 30-Second Song Preview</span>
          </div>
        </div>

        {/* 1-Click Continue with Google Button */}
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
          <span>Continue with Google (1-Click)</span>
        </button>

        {errorMsg && (
          <p className="mt-4 text-xs text-red-600 font-bold text-center">
            {errorMsg}
          </p>
        )}

        <p className="mt-5 text-center text-xs text-slate-500 leading-relaxed">
          Sign in with your Google account to enter the studio. New accounts
          get 1 free 30-second song preview.
        </p>
      </div>
    </div>
  );
};
