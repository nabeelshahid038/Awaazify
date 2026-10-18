/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { PublicNavbar } from './components/PublicNavbar';
import { PublicFooter } from './components/PublicFooter';
import { AuthModal } from './components/AuthModal';
import { PublicHome } from './pages/PublicHome';
import { PublicVoices } from './pages/PublicVoices';
import { PublicHowItWorks } from './pages/PublicHowItWorks';
import { PublicPricing } from './pages/PublicPricing';
import { Terms } from './pages/Terms';
import { Privacy } from './pages/Privacy';
import { PublicNotFound } from './pages/PublicNotFound';
import { StudioDashboard } from './pages/StudioDashboard';
import { AdminDashboard } from './pages/AdminDashboard';

/**
 * Safety net: without this, any render crash (e.g. a null-deref during an
 * auth state transition) unmounts the whole tree and leaves a blank white
 * page. The boundary shows a friendly recovery screen instead.
 */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error('[Awaazify] render crash caught by boundary:', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-3xl bg-white border border-slate-200 shadow-xl p-8 text-center space-y-4">
            <h1 className="text-xl font-extrabold">Kuch garbar ho gayi</h1>
            <p className="text-sm text-slate-500">
              Page load nahi ho saka. Reload karne se theek ho jana chahiye.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-xl bg-[#0F172A] text-white text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AwaazifyRouter: React.FC = () => {  const { activeView, isAuthenticated, publicPage, setPublicPage } = useApp();

  // Unknown deep links (e.g. /terms served by the SPA fallback) land on a
  // friendly 404 instead of silently showing the home page.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      setPublicPage('notfound');
    }
  }, [setPublicPage]);

  if (activeView === 'admin') {
    return (
      <>
        <AdminDashboard />
        <AuthModal />
      </>
    );
  }

  if (activeView === 'studio' && isAuthenticated) {
    return (
      <>
        <StudioDashboard />
        <AuthModal />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col overflow-x-hidden">
      <PublicNavbar />
      <main className="flex-1">
        {publicPage === 'home' && <PublicHome />}
        {publicPage === 'voices' && <PublicVoices />}
        {publicPage === 'how-it-works' && <PublicHowItWorks />}
        {publicPage === 'pricing' && <PublicPricing />}
        {publicPage === 'terms' && <Terms />}
        {publicPage === 'privacy' && <Privacy />}
        {publicPage === 'notfound' && <PublicNotFound />}
      </main>
      <PublicFooter />
      <AuthModal />
    </div>
  );
};

export default function App() {
  return (
    <RootErrorBoundary>
      <AppProvider>
        <AwaazifyRouter />
      </AppProvider>
    </RootErrorBoundary>
  );
}
