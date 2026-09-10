import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  LayoutDashboard,
  Columns,
  BookOpen,
  Wifi,
  WifiOff,
  Bell,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import { User, AppNotification } from '../../types';
import { DEMO_USERS } from '../../mockData';
import { StorageService } from '../../services/storageService';

interface AppHeaderProps {
  currentMode: 'mobile' | 'web';
  onModeChange: (mode: 'mobile' | 'web') => void;
  currentUser: User;
  onUserChange: (user: User) => void;
  isOffline: boolean;
  onToggleOffline: () => void;
  onResetDemo: () => void;
  notifications: AppNotification[];
  onMarkNotificationRead: (id: string) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentMode,
  onModeChange,
  currentUser,
  onUserChange,
  isOffline,
  onToggleOffline,
  onResetDemo,
  notifications,
  onMarkNotificationRead,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);

  useEffect(() => {
    const checkQueue = () => {
      const q = StorageService.getInstance().getOfflineQueue();
      setOfflineQueueCount(q.length);
    };
    checkQueue();
    const interval = setInterval(checkQueue, 2000);
    return () => clearInterval(interval);
  }, [isOffline]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Brand & SIH Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white font-black text-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white">Smart Inspector</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                SIH 2026
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Real-Time Field Monitoring & Inspection Verification Platform
            </p>
          </div>
        </div>

        {/* Center: Mode Switcher Tabs */}
        <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 shadow-inner">
          <button
            id="nav-tab-mobile"
            onClick={() => onModeChange('mobile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              currentMode === 'mobile'
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Field Inspector App</span>
          </button>

          <button
            id="nav-tab-web"
            onClick={() => onModeChange('web')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              currentMode === 'web'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Admin / Management Dashboard</span>
          </button>
        </div>

        {/* Right: Controls & User Switcher */}
        <div className="flex items-center gap-2.5">
          
          {/* Offline-First Simulation Toggle */}
          <button
            id="btn-toggle-offline-simulation"
            onClick={onToggleOffline}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isOffline
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
            title={isOffline ? 'Offline Mode Active. Inspections are saved locally.' : 'Online Mode. Connected to Central Cloud.'}
          >
            {isOffline ? <WifiOff className="w-3.5 h-3.5 text-amber-400" /> : <Wifi className="w-3.5 h-3.5 text-emerald-400" />}
            <span className="hidden sm:inline">{isOffline ? 'Offline Mode' : 'Online'}</span>
            {offlineQueueCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-bold">
                {offlineQueueCount} queued
              </span>
            )}
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              id="btn-notifications-toggle"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="p-3 border-b border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-white">Live Alert Stream</span>
                    <span className="text-[10px] px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full font-mono">
                      {unreadCount} new
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      notifications.forEach((n) => onMarkNotificationRead(n.id));
                    }}
                    className="text-[11px] text-blue-400 hover:underline"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-700/60">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">No recent notifications</div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => onMarkNotificationRead(notif.id)}
                        className={`p-3 text-xs hover:bg-slate-700/50 cursor-pointer transition-colors ${
                          !notif.read ? 'bg-slate-700/30' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span
                            className={`font-semibold text-[11px] ${
                              notif.severity === 'CRITICAL'
                                ? 'text-red-400'
                                : notif.severity === 'HIGH'
                                ? 'text-orange-400'
                                : 'text-blue-400'
                            }`}
                          >
                            {notif.title}
                          </span>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-300 text-[11px] line-clamp-2">{notif.message}</p>
                        {notif.siteName && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                            {notif.siteName}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User / Role Switcher */}
          <div className="relative group">
            <button className="flex items-center gap-2 p-1.5 pr-2.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs transition-colors">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-6 h-6 rounded-full object-cover border border-slate-600"
              />
              <div className="text-left hidden md:block leading-tight">
                <p className="font-semibold text-slate-200 text-xs truncate max-w-[100px]">{currentUser.name}</p>
                <span className="text-[10px] text-orange-400 font-mono">{currentUser.role}</span>
              </div>
            </button>

            {/* Dropdown Menu */}
            <div className="absolute right-0 mt-1 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl hidden group-hover:block z-50 p-1">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Simulate Role As:
              </div>
              {DEMO_USERS.map((usr) => (
                <button
                  key={usr.id}
                  onClick={() => onUserChange(usr)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs text-left transition-colors ${
                    currentUser.id === usr.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <div className="truncate">
                    <p className="font-medium truncate">{usr.name}</p>
                    <p className="text-[10px] opacity-75">{usr.role}</p>
                  </div>
                  {currentUser.id === usr.id && <CheckCircle2 className="w-4 h-4" />}
                </button>
              ))}
              <div className="border-t border-slate-700 my-1" />
              <button
                onClick={onResetDemo}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset SIH Demo Data
              </button>
            </div>
          </div>

        </div>

      </div>
    </header>
  );
};
