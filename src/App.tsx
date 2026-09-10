import React, { useState, useEffect } from 'react';
import { AppHeader } from './components/layout/AppHeader';
import { MobileApp } from './components/mobile/MobileApp';
import { WebDashboard } from './components/dashboard/WebDashboard';
import { User, AppNotification, Inspection, Defect } from './types';
import { DEMO_USERS } from './mockData';
import { StorageService } from './services/storageService';
import { ApiService } from './services/apiService';
import { ShieldCheck, Smartphone, LayoutDashboard, Radio } from 'lucide-react';

export default function App() {
  const storage = StorageService.getInstance();

  // Clean Mode Switch: 'mobile' (Field Inspector) | 'web' (Admin/Management Dashboard)
  const [currentMode, setCurrentMode] = useState<'mobile' | 'web'>('web');

  // Current active user
  const [currentUser, setCurrentUser] = useState<User>(DEMO_USERS[0]);

  // Offline Simulation state
  const [isOffline, setIsOffline] = useState<boolean>(storage.isOffline());

  // Real-time Notifications
  const [notifications, setNotifications] = useState<AppNotification[]>(storage.getNotifications());

  // Real-time toast alert state for SIH demo
  const [activeToast, setActiveToast] = useState<{
    title: string;
    message: string;
    type: 'SUCCESS' | 'ALERT' | 'INFO';
  } | null>(null);

  const showToast = (title: string, message: string, type: 'SUCCESS' | 'ALERT' | 'INFO' = 'INFO') => {
    setActiveToast({ title, message, type });
    setTimeout(() => {
      setActiveToast(null);
    }, 4500);
  };

  // Sync notifications periodically
  useEffect(() => {
    const updateNotifs = async () => {
      const n = await ApiService.getNotifications();
      setNotifications(n);
    };
    updateNotifs();
    const interval = setInterval(updateNotifs, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleOffline = () => {
    const newStatus = storage.toggleOfflineSimulation();
    setIsOffline(newStatus);
    showToast(
      newStatus ? 'Offline Mode Active' : 'Online Mode Restored',
      newStatus
        ? 'Inspections and photos are stored in local encrypted queue.'
        : 'Reconnected to Central Cloud. Background sync auto-engaged.',
      newStatus ? 'ALERT' : 'SUCCESS'
    );
  };

  const handleResetDemo = () => {
    storage.resetToInitialDemoData();
    setIsOffline(false);
    showToast('Demo Data Reset', 'Initial SIH benchmark data reloaded successfully.', 'SUCCESS');
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  const handleMarkNotificationRead = (id: string) => {
    storage.markNotificationAsRead(id);
    setNotifications(storage.getNotifications());
  };

  // Callback when inspector submits an inspection on mobile
  const handleInspectionCreated = (inspection: Inspection) => {
    showToast(
      'Field Inspection Registered!',
      `${inspection.inspectionNumber} at ${inspection.siteName} (${inspection.score}% Quality Score)`,
      'SUCCESS'
    );
  };

  // Callback when inspector reports a defect on mobile
  const handleDefectReported = (defect: Defect) => {
    showToast(
      `🚨 ${defect.severity} DEFECT REPORTED`,
      `${defect.title} at ${defect.siteName}. SLA: ${defect.slaHours} hours.`,
      'ALERT'
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      
      {/* Top Header */}
      <AppHeader
        currentMode={currentMode}
        onModeChange={(m) => setCurrentMode(m)}
        currentUser={currentUser}
        onUserChange={(u) => setCurrentUser(u)}
        isOffline={isOffline}
        onToggleOffline={handleToggleOffline}
        onResetDemo={handleResetDemo}
        notifications={notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
      />

      {/* Floating Real-time Toast Alert */}
      {activeToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900/95 backdrop-blur-md border border-slate-700 p-4 rounded-2xl shadow-2xl flex items-start gap-3 text-xs animate-bounce">
          <div
            className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
              activeToast.type === 'ALERT'
                ? 'bg-red-500 animate-ping'
                : activeToast.type === 'SUCCESS'
                ? 'bg-emerald-400'
                : 'bg-blue-400'
            }`}
          />
          <div className="flex-1">
            <h4 className="font-bold text-white text-xs">{activeToast.title}</h4>
            <p className="text-slate-300 text-[11px] mt-0.5">{activeToast.message}</p>
          </div>
          <button
            onClick={() => setActiveToast(null)}
            className="text-slate-500 hover:text-white font-bold px-1 text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Primary Workspace Views */}
      <main className="flex-1">
        
        {/* MODE 1: FIELD INSPECTOR MOBILE APP */}
        {currentMode === 'mobile' && (
          <div className="py-6 px-4 flex flex-col items-center justify-center">
            <div className="mb-4 text-center max-w-xl">
              <span className="text-[11px] font-bold tracking-wider px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 uppercase">
                Field Inspector Mobile Application
              </span>
              <h2 className="text-xl font-extrabold text-white mt-2">
                Real-Time Field Inspection Terminal
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Equipped with hardware GPS validation (300m geofence), digital checklists, pixel-level watermark camera evidence, and offline synchronization engine.
              </p>
            </div>

            <MobileApp
              currentUser={currentUser}
              onUserChange={setCurrentUser}
              isOffline={isOffline}
              onToggleOffline={handleToggleOffline}
              onInspectionCreated={handleInspectionCreated}
              onDefectReported={handleDefectReported}
            />
          </div>
        )}

        {/* MODE 2: ADMIN / MANAGEMENT DASHBOARD */}
        {currentMode === 'web' && (
          <div className="py-2">
            <WebDashboard currentUser={currentUser} />
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Smart Real-Time Monitoring & Inspection Platform • Smart India Hackathon 2026</span>
          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
            <span>React + TypeScript</span>
            <span>•</span>
            <span>Express Backend</span>
            <span>•</span>
            <span>PostgreSQL Schema</span>
            <span>•</span>
            <span>Gemini AI Vision</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
