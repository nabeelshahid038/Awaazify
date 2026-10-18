import React, { useState } from 'react';
import {
  X,
  ArrowRight,
  Gift,
  User,
  Mail,
  Lock,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { BrandLogo } from './BrandLogo';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    loginUser,
    loginWithGoogle,
    signUpWithEmail,
    verifyEmailOtp,
  } = useApp();
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Email Verification State for standard email sign-ups
  const [verificationStep, setVerificationStep] = useState<
    'form' | 'verify-email'
  >('form');
  const [verificationCode, setVerificationCode] = useState('');
  const [resentNotice, setResentNotice] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleGoogleContinue = async () => {
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setErrorMsg(err.message || 'Google Sign-In failed');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    if (authTab === 'signup') {
      const res = await signUpWithEmail(trimmedEmail, password, name.trim() || undefined);
      setIsSubmitting(false);
      if (res.error) {
        setErrorMsg(res.error);
        return;
      }
      setVerificationStep('verify-email');
      return;
    }

    await loginUser(trimmedEmail, name.trim() || undefined);
    setIsSubmitting(false);
  };

  const handleVerifyEmailAndLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.trim().length < 4) {
      setErrorMsg('Please enter the 6-digit verification code sent to your email.');
      return;
    }
    setIsSubmitting(true);
    const res = await verifyEmailOtp(email.trim(), verificationCode.trim(), name.trim() || undefined);
    setIsSubmitting(false);
    if (res.error) {
      setErrorMsg(res.error);
      return;
    }
    setVerificationStep('form');
  };

  const handleResendEmail = () => {
    setResentNotice(true);
    setTimeout(() => setResentNotice(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-8 overflow-hidden">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            setVerificationStep('form');
            closeAuthModal();
          }}
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

        {verificationStep === 'verify-email' ? (
          /* EMAIL VERIFICATION STATE FOR EMAIL SIGN-UPS */
          <form onSubmit={handleVerifyEmailAndLogin} className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-1.5">
              <CheckCircle2 className="w-8 h-8 text-[#10B981] mx-auto" />
              <h3 className="text-base font-extrabold text-[#0F172A]">
                Verify Your Email Address
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                We sent a verification link and 6-digit code to{' '}
                <strong className="text-[#0F172A]">{email}</strong>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="••••••"
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-[#10B981] focus:bg-white focus:outline-none text-center font-mono text-lg font-extrabold tracking-widest text-[#0F172A]"
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-red-600 font-bold text-center">
                {errorMsg}
              </p>
            )}

            {resentNotice && (
              <p className="text-xs text-[#059669] font-bold text-center">
                ✓ A fresh verification email has been sent to {email}.
              </p>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-sm shadow-sm transition-all cursor-pointer"
            >
              <span>Verify Email & Enter Studio</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-between pt-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setVerificationStep('form')}
                className="text-slate-500 hover:text-[#0F172A] cursor-pointer"
              >
                ← Change Email
              </button>
              <button
                type="button"
                onClick={handleResendEmail}
                className="inline-flex items-center gap-1 text-[#059669] hover:underline cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Resend Verification Email</span>
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Sign In / Create Account Tabs */}
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 border border-slate-200 mb-5">
              <button
                type="button"
                onClick={() => {
                  setAuthTab('signin');
                  setErrorMsg('');
                }}
                className={`py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  authTab === 'signin'
                    ? 'bg-white text-[#0F172A] shadow-2xs'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab('signup');
                  setErrorMsg('');
                }}
                className={`py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  authTab === 'signup'
                    ? 'bg-white text-[#0F172A] shadow-2xs'
                    : 'text-slate-600 hover:text-[#0F172A]'
                }`}
              >
                Create Account
              </button>
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

            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="shrink mx-3 text-xs font-bold text-slate-400">
                or use email & password
              </span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleFormSubmit} className="space-y-3.5">
              {authTab === 'signup' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Studio Creator"
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-[#10B981] focus:bg-white focus:outline-none text-sm text-[#0F172A] placeholder-slate-400"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-[#10B981] focus:bg-white focus:outline-none text-sm text-[#0F172A] placeholder-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-[#10B981] focus:bg-white focus:outline-none text-sm text-[#0F172A] placeholder-slate-400"
                  />
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-red-600 font-bold">{errorMsg}</p>
              )}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-[#0F172A] hover:bg-slate-800 text-white font-extrabold text-sm transition-all cursor-pointer"
              >
                <span>
                  {authTab === 'signin'
                    ? 'Sign In to Studio'
                    : 'Send Verification Email'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
