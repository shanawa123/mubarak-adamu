/**
 * ShinkafiRide.ng - Full-Stack Ride-Hailing, Transport Management, and Security Platform
 * Shinkafi, Zamfara State, Nigeria
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { LandingPage } from './components/public/LandingPage';
import { PassengerDashboard } from './components/passenger/PassengerDashboard';
import { DriverDashboard } from './components/driver/DriverDashboard';
import { OperatorDashboard } from './components/operator/OperatorDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { SecurityDashboard } from './components/security/SecurityDashboard';
import { TestSuiteModal } from './components/tests/TestSuiteModal';

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [testModalOpen, setTestModalOpen] = useState<boolean>(false);

  // Auto-route based on active user role when switching persona
  useEffect(() => {
    if (user) {
      if (user.role === 'security_officer') {
        setCurrentTab('security');
      } else if (['passenger', 'driver', 'operator', 'admin'].includes(user.role)) {
        setCurrentTab(user.role);
      }
    }
  }, [user?.role]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      {/* Strict Top Bar Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenTestSuite={() => setTestModalOpen(true)}
      />

      {/* Main Content Viewport */}
      <main className="flex-1">
        {currentTab === 'home' && <LandingPage onNavigateTab={setCurrentTab} />}
        {currentTab === 'passenger' && <PassengerDashboard />}
        {currentTab === 'driver' && <DriverDashboard />}
        {currentTab === 'operator' && <OperatorDashboard />}
        {currentTab === 'admin' && <AdminDashboard />}
        {currentTab === 'security' && <SecurityDashboard />}
      </main>

      {/* Footer with NDPA 2023 compliance & emergency contacts */}
      <Footer />

      {/* In-App Automated Test Suite Modal */}
      <TestSuiteModal
        isOpen={testModalOpen}
        onClose={() => setTestModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
