/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { PublicNavbar } from './components/PublicNavbar';
import { PublicFooter } from './components/PublicFooter';
import { AuthModal } from './components/AuthModal';
import { PublicHome } from './pages/PublicHome';
import { PublicVoices } from './pages/PublicVoices';
import { PublicHowItWorks } from './pages/PublicHowItWorks';
import { PublicPricing } from './pages/PublicPricing';
import { StudioDashboard } from './pages/StudioDashboard';
import { AdminDashboard } from './pages/AdminDashboard';

const AwaazifyRouter: React.FC = () => {
  const { activeView, isAuthenticated, publicPage } = useApp();

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
