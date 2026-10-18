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

const AwaazifyRouter: React.FC = () => {
  const { activeView, isAuthenticated, publicPage, setPublicPage } = useApp();

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
    <AppProvider>
      <AwaazifyRouter />
    </AppProvider>
  );
}
