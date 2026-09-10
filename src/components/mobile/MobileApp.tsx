import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  MapPin,
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Wifi,
  WifiOff,
  User,
  LogOut,
  ChevronRight,
  ArrowLeft,
  FileText,
  RotateCcw,
  Sparkles,
  Award,
  Layers,
  Search,
  Check,
  QrCode,
  Calendar,
  Send,
  Plus,
  RefreshCw,
  Eye,
  Sliders,
  AlertCircle,
  Cpu,
  BrainCircuit,
  Activity,
  Zap,
} from 'lucide-react';
import {
  User as UserType,
  Site,
  Inspection,
  Defect,
  ChecklistItem,
  InspectionEvidence,
  DefectSeverity,
  IoTSensorNode,
  DecisionSupportItem,
} from '../../types';
import { DEMO_SITES, DEMO_INSPECTORS, DEMO_CHECKLIST_TEMPLATE, DEMO_IOT_SENSORS, DEMO_DECISION_SUPPORT } from '../../mockData';
import { StorageService, calculateDistanceMeters, generateEvidenceHash } from '../../services/storageService';
import { ApiService } from '../../services/apiService';
import { PhotoWatermarkCapture } from './PhotoWatermarkCanvas';
import { analyzeDefectImageWithAI, AIDefectDiagnosis } from '../../services/aiService';

type MobileScreen =
  | 'splash'
  | 'login'
  | 'dashboard'
  | 'site_selection'
  | 'inspection_wizard'
  | 'defect_reporting'
  | 'inspection_summary'
  | 'offline_sync'
  | 'history'
  | 'history_compare'
  | 'profile'
  | 'iot_telemetry'
  | 'decision_alerts';

interface MobileAppProps {
  currentUser: UserType;
  onUserChange?: (u: UserType) => void;
  isOffline: boolean;
  onToggleOffline: () => void;
  onInspectionCreated?: (inspection: Inspection) => void;
  onDefectReported?: (defect: Defect) => void;
}

export const MobileApp: React.FC<MobileAppProps> = ({
  currentUser,
  isOffline,
  onToggleOffline,
  onInspectionCreated,
  onDefectReported,
}) => {
  const storage = StorageService.getInstance();

  // Navigation state
  const [currentScreen, setCurrentScreen] = useState<MobileScreen>('dashboard');
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'sync' | 'profile'>('home');

  // Login form state
  const [loginInspectorId, setLoginInspectorId] = useState('INSP-BLR-101');
  const [loginPassword, setLoginPassword] = useState('inspector@2026');

  // Selected site for inspection
  const [selectedSite, setSelectedSite] = useState<Site>(DEMO_SITES[0]);

  // Inspection Wizard state
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [startGps, setStartGps] = useState({
    latitude: 12.9756,
    longitude: 77.6094,
    accuracy: 3.4,
    timestamp: new Date().toISOString(),
  });
  const [currentDistance, setCurrentDistance] = useState<number>(45);
  const [isGeofencePassed, setIsGeofencePassed] = useState<boolean>(true);

  // Dynamic Checklists
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    JSON.parse(JSON.stringify(DEMO_CHECKLIST_TEMPLATE))
  );

  // Evidence photos captured during this session
  const [sessionEvidence, setSessionEvidence] = useState<InspectionEvidence[]>([]);
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);
  const [activeChecklistIdForPhoto, setActiveChecklistIdForPhoto] = useState<string | null>(null);

  // Defect Reporting Form
  const [defectTitle, setDefectTitle] = useState('');
  const [defectDescription, setDefectDescription] = useState('');
  const [defectSeverity, setDefectSeverity] = useState<DefectSeverity>('CRITICAL');
  const [defectCategory, setDefectCategory] = useState<'STRUCTURAL' | 'ELECTRICAL' | 'CIVIL' | 'SAFETY' | 'ENVIRONMENTAL'>('STRUCTURAL');
  const [defectPhotoUrl, setDefectPhotoUrl] = useState<string>('');
  const [defectPhotoHash, setDefectPhotoHash] = useState<string>('');
  const [aiDiagnosis, setAiDiagnosis] = useState<AIDefectDiagnosis | null>(null);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState<boolean>(false);

  // Overall remarks & signature
  const [overallRemarks, setOverallRemarks] = useState('Structural integrity confirmed nominal with Pier P-14 remediation flagged.');
  const [inspectorSignature, setInspectorSignature] = useState('R. Kumar (INSP-BLR-101)');

  // History & Comparison state
  const [inspectionsList, setInspectionsList] = useState<Inspection[]>(storage.getInspections());
  const [selectedComparisonPair, setSelectedComparisonPair] = useState<{
    current: Inspection;
    previous: Inspection;
  } | null>(null);

  // Offline sync queue state
  const [syncQueue, setSyncQueue] = useState(storage.getOfflineQueue());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResultMsg, setSyncResultMsg] = useState<string | null>(null);

  // IoT and Decision Support states for mobile
  const [mobileIotSensors, setMobileIotSensors] = useState<IoTSensorNode[]>(DEMO_IOT_SENSORS);
  const [mobileDecisions, setMobileDecisions] = useState<DecisionSupportItem[]>(DEMO_DECISION_SUPPORT);

  // Refresh lists periodically
  useEffect(() => {
    const refreshData = () => {
      setInspectionsList(storage.getInspections());
      setSyncQueue(storage.getOfflineQueue());
      ApiService.getIoTSensors().then(setMobileIotSensors).catch(() => {});
      ApiService.getDecisionSupport().then(setMobileDecisions).catch(() => {});
    };
    refreshData();
    const interval = setInterval(refreshData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Update distance & geofence status whenever site changes
  useEffect(() => {
    if (selectedSite) {
      const dist = calculateDistanceMeters(
        startGps.latitude,
        startGps.longitude,
        selectedSite.latitude,
        selectedSite.longitude
      );
      setCurrentDistance(dist);
      setIsGeofencePassed(dist <= selectedSite.geofenceRadiusMeters);
    }
  }, [selectedSite, startGps]);

  // Handle Photo Attached
  const handlePhotoCaptured = (photoUrl: string, hash: string) => {
    const newEv: InspectionEvidence = {
      id: 'ev-' + Date.now(),
      inspectionId: 'session-insp',
      checklistId: activeChecklistIdForPhoto || undefined,
      photoUrl,
      caption: activeChecklistIdForPhoto
        ? `Evidence for check item: ${activeChecklistIdForPhoto}`
        : 'Inspection general evidence',
      latitude: startGps.latitude,
      longitude: startGps.longitude,
      timestamp: new Date().toISOString(),
      inspectorId: currentUser.inspectorId || 'INSP-BLR-101',
      sha256Hash: hash,
      isGeoTagged: true,
      type: 'INITIAL_EVIDENCE',
    };

    setSessionEvidence((prev) => [...prev, newEv]);

    if (activeChecklistIdForPhoto) {
      setChecklist((prev) =>
        prev.map((item) =>
          item.id === activeChecklistIdForPhoto
            ? { ...item, evidencePhotoId: newEv.id }
            : item
        )
      );
    }

    // If on defect screen, attach to defect
    if (currentScreen === 'defect_reporting') {
      setDefectPhotoUrl(photoUrl);
      setDefectPhotoHash(hash);
    }

    setShowCameraModal(false);
    setActiveChecklistIdForPhoto(null);
  };

  // Run AI Defect Detection
  const handleRunAIDiagnosis = async () => {
    setIsAnalyzingAI(true);
    try {
      const result = await analyzeDefectImageWithAI(
        defectPhotoUrl || 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=600&auto=format&fit=crop&q=80',
        defectDescription || defectTitle || 'Concrete pier shear crack'
      );
      setAiDiagnosis(result);
      setDefectSeverity(result.suggestedSeverity);
      setDefectCategory(result.category);
      if (!defectTitle) setDefectTitle(result.detectedDefectType);
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  // Submit Defect from Mobile
  const handleSubmitDefect = async () => {
    if (!defectTitle) return;

    const newDefect: Defect = {
      id: 'def-' + Date.now(),
      code: `DEF-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
      inspectionId: 'insp-session',
      siteId: selectedSite.id,
      siteName: selectedSite.name,
      inspectorId: currentUser.inspectorId || 'INSP-BLR-101',
      inspectorName: currentUser.name,
      title: defectTitle,
      description: defectDescription || 'Field inspector observed structural anomaly during digital audit.',
      severity: defectSeverity,
      category: defectCategory,
      status: 'DETECTED',
      detectedAt: new Date().toISOString(),
      slaHours: defectSeverity === 'CRITICAL' ? 4 : defectSeverity === 'HIGH' ? 24 : 72,
      slaDeadline: new Date(Date.now() + (defectSeverity === 'CRITICAL' ? 4 : 24) * 3600 * 1000).toISOString(),
      isEscalated: defectSeverity === 'CRITICAL',
      escalatedTo: defectSeverity === 'CRITICAL' ? 'DIRECTOR' : undefined,
      latitude: startGps.latitude,
      longitude: startGps.longitude,
      evidencePhotos: [
        {
          id: 'ev-def-' + Date.now(),
          inspectionId: 'insp-session',
          photoUrl: defectPhotoUrl || 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=600&auto=format&fit=crop&q=80',
          caption: defectTitle,
          latitude: startGps.latitude,
          longitude: startGps.longitude,
          timestamp: new Date().toISOString(),
          inspectorId: currentUser.inspectorId || 'INSP-BLR-101',
          sha256Hash: defectPhotoHash || 'a8b94f1c93847e19da82137bc89d41289fe9432ab127d498302bf784a9182301',
          isGeoTagged: true,
          type: 'DEFECT',
        },
      ],
      aiAnalysis: aiDiagnosis
        ? {
            detectedDefectType: aiDiagnosis.detectedDefectType,
            confidenceScore: aiDiagnosis.confidenceScore,
            riskScore: aiDiagnosis.riskScore,
            recommendedAction: aiDiagnosis.recommendedAction,
          }
        : undefined,
    };

    await ApiService.createDefect(newDefect);
    if (onDefectReported) onDefectReported(newDefect);

    // Reset defect form and jump to summary
    setDefectTitle('');
    setDefectDescription('');
    setAiDiagnosis(null);
    setCurrentScreen('inspection_summary');
  };

  // Submit Completed Inspection
  const handleSubmitInspection = async () => {
    const failedChecks = checklist.filter((c) => c.status === 'FAIL').length;
    const passedChecks = checklist.filter((c) => c.status === 'PASS').length;
    const totalAnswered = failedChecks + passedChecks;
    const score = totalAnswered > 0 ? Math.round((passedChecks / totalAnswered) * 100) : 85;

    const newInspection: Inspection = {
      id: 'insp-' + Date.now(),
      inspectionNumber: `INSP-2026-${String(inspectionsList.length + 1).padStart(4, '0')}`,
      siteId: selectedSite.id,
      siteName: selectedSite.name,
      siteCode: selectedSite.code,
      inspectorId: currentUser.inspectorId || 'INSP-BLR-101',
      inspectorName: currentUser.name,
      status: 'COMPLETED',
      startedAt: startGps.timestamp,
      completedAt: new Date().toISOString(),
      startLatitude: startGps.latitude,
      startLongitude: startGps.longitude,
      endLatitude: startGps.latitude + 0.0002,
      endLongitude: startGps.longitude + 0.0003,
      isGeofenceVerified: isGeofencePassed,
      distanceFromSiteMeters: currentDistance,
      checklists: checklist,
      defectsCount: failedChecks,
      criticalCount: failedChecks > 0 ? 1 : 0,
      highCount: 0,
      score,
      overallRemarks,
      signatureUrl: inspectorSignature,
      evidence: sessionEvidence,
      isSynced: !isOffline,
      syncTimestamp: !isOffline ? new Date().toISOString() : undefined,
    };

    await ApiService.createInspection(newInspection);
    if (onInspectionCreated) onInspectionCreated(newInspection);

    setInspectionsList(storage.getInspections());
    setSyncQueue(storage.getOfflineQueue());

    // Navigate to history or dashboard
    setCurrentScreen('dashboard');
    setActiveTab('home');
    setWizardStep(1);
    setSessionEvidence([]);
  };

  // Manual Trigger for Offline Sync
  const handlePerformSync = async () => {
    setIsSyncing(true);
    setSyncResultMsg(null);
    try {
      const result = await storage.syncPendingQueue();
      setSyncResultMsg(`Successfully synced ${result.syncedCount} records. Conflicts: ${result.conflicts}.`);
      setSyncQueue(storage.getOfflineQueue());
      setInspectionsList(storage.getInspections());
    } catch (e: any) {
      setSyncResultMsg(`Sync encountered issue: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto bg-slate-950 text-slate-100 rounded-[40px] border-8 border-slate-800 shadow-2xl overflow-hidden flex flex-col min-h-[820px] max-h-[860px]">
      
      {/* Phone Notch & Status Bar */}
      <div className="bg-slate-950 pt-2 px-6 pb-1 flex items-center justify-between text-xs text-slate-400 select-none border-b border-slate-900 z-20">
        <span className="font-mono font-bold text-slate-200">09:41</span>
        <div className="w-24 h-4 bg-slate-900 rounded-full mx-auto" />
        <div className="flex items-center gap-1.5">
          {isOffline ? (
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span className="text-[10px] font-mono">5G</span>
          <div className="w-4 h-2 rounded-sm border border-slate-400 flex items-center p-0.5">
            <div className="w-full h-full bg-emerald-400 rounded-xs" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        
        {/* ============================================================ */}
        {/* SCREEN 1: SPLASH SCREEN */}
        {/* ============================================================ */}
        {currentScreen === 'splash' && (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-orange-600 to-indigo-600 flex items-center justify-center shadow-xl text-white shadow-orange-500/20">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight">Smart Inspector Mobile</h1>
              <p className="text-xs text-slate-400 mt-1">
                Real-Time Monitoring & Verified Inspection Engine
              </p>
              <div className="mt-3 inline-block px-3 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full text-orange-400 text-xs font-semibold">
                Smart India Hackathon 2026
              </div>
            </div>
            <button
              onClick={() => setCurrentScreen('dashboard')}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-sm shadow-lg transition-all"
            >
              Enter Field Workspace
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* SCREEN 2: LOGIN SCREEN */}
        {/* ============================================================ */}
        {currentScreen === 'login' && (
          <div className="py-6 space-y-6">
            <div className="text-center space-y-1">
              <div className="w-14 h-14 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center mx-auto text-blue-400 mb-2">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-white">Inspector Authentication</h2>
              <p className="text-xs text-slate-400">Enter your certified credentials to access site audits</p>
            </div>

            <div className="space-y-3 bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Inspector ID</label>
                <input
                  type="text"
                  value={loginInspectorId}
                  onChange={(e) => setLoginInspectorId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  placeholder="INSP-BLR-101"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Passcode / PIN</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Role: Field Certified Auditor</span>
                <span className="text-emerald-400">GPS Auto-Active</span>
              </div>
            </div>

            <button
              onClick={() => setCurrentScreen('dashboard')}
              className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-bold text-xs shadow-lg shadow-orange-600/20 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Verify & Unlock App</span>
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* SCREEN 3: DASHBOARD */}
        {/* ============================================================ */}
        {currentScreen === 'dashboard' && (
          <div className="space-y-4 pb-12">
            
            {/* Inspector Identity Card */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-850 p-4 rounded-2xl border border-slate-800 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="w-12 h-12 rounded-xl object-cover border-2 border-orange-500/50"
                    />
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{currentUser.name}</h3>
                    <p className="text-[11px] font-mono text-orange-400">{currentUser.inspectorId || 'INSP-BLR-101'}</p>
                    <p className="text-[10px] text-slate-400">South Zone Audit Bureau</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    ON DUTY
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">Rating: 4.9 ★</p>
                </div>
              </div>
            </div>

            {/* Live GPS Telemetry Pill */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="w-4 h-4 text-blue-400 animate-pulse" />
                <div>
                  <span className="text-[10px] text-slate-400 block leading-none">Live Telemetry</span>
                  <span className="font-mono text-[11px] text-slate-200">
                    {startGps.latitude.toFixed(4)}° N, {startGps.longitude.toFixed(4)}° E
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                ±3.2m ACC
              </span>
            </div>

            {/* Offline Status Alert Banner if Offline */}
            {isOffline && (
              <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-300">
                <WifiOff className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <span className="font-bold">Offline-First Engine Engaged</span>
                  <p className="text-[11px] text-amber-200/80 mt-0.5">
                    Inspections, geo-photos, and defects are encrypted & stored in local memory.
                  </p>
                </div>
              </div>
            )}

            {/* Quick Action: Start New Inspection */}
            <div className="bg-gradient-to-br from-blue-900/50 to-slate-900 border border-blue-600/30 p-4 rounded-2xl shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">Active Assignment</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                  Ready
                </span>
              </div>
              <h4 className="font-bold text-sm text-white mb-1">{selectedSite.name}</h4>
              <p className="text-xs text-slate-300 mb-3 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-orange-400" />
                {selectedSite.locationName}
              </p>

              <div className="flex items-center gap-2">
                <button
                  id="btn-mobile-start-inspection"
                  onClick={() => {
                    setWizardStep(1);
                    setCurrentScreen('inspection_wizard');
                  }}
                  className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-600/20 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Field Inspection</span>
                </button>

                <button
                  onClick={() => setCurrentScreen('site_selection')}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition-colors"
                  title="Change Site"
                >
                  Switch Site
                </button>
              </div>
            </div>

            {/* Quick Access: IoT Field Sensors & AI Decision Directives */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setCurrentScreen('iot_telemetry')}
                className="p-3 bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-2xl flex items-center gap-2.5 transition-all text-left shadow-sm group"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center flex-shrink-0 transition-all">
                  <Cpu className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <span className="font-bold text-xs text-white block truncate">IoT Nodes</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {mobileIotSensors.length} Field Nodes
                  </span>
                </div>
              </button>

              <button
                onClick={() => setCurrentScreen('decision_alerts')}
                className="p-3 bg-slate-900 border border-slate-800 hover:border-orange-500/50 rounded-2xl flex items-center gap-2.5 transition-all text-left shadow-sm group"
              >
                <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 group-hover:bg-orange-600 group-hover:text-white flex items-center justify-center flex-shrink-0 transition-all">
                  <BrainCircuit className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <span className="font-bold text-xs text-white block truncate">AI Directives</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {mobileDecisions.length} Active Directives
                  </span>
                </div>
              </button>
            </div>

            {/* Recent Inspection Records */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider">Recent Audits</h4>
                <button
                  onClick={() => {
                    setActiveTab('history');
                    setCurrentScreen('history');
                  }}
                  className="text-xs text-blue-400 hover:underline"
                >
                  View all ({inspectionsList.length})
                </button>
              </div>

              <div className="space-y-2">
                {inspectionsList.slice(0, 3).map((insp) => (
                  <div
                    key={insp.id}
                    onClick={() => {
                      setSelectedComparisonPair({
                        current: insp,
                        previous: inspectionsList[1] || insp,
                      });
                      setCurrentScreen('history_compare');
                    }}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-3 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">{insp.inspectionNumber}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            insp.status === 'COMPLETED'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {insp.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate max-w-[200px] mt-0.5">
                        {insp.siteName}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-blue-400 font-mono">{insp.score}%</span>
                      <p className="text-[9px] text-slate-500">Quality</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ============================================================ */}
        {/* SCREEN 4: SITE SELECTION & GEOFENCING */}
        {/* ============================================================ */}
        {currentScreen === 'site_selection' && (
          <div className="space-y-4 pb-10">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentScreen('dashboard')}
                className="p-1.5 bg-slate-900 rounded-lg text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h3 className="font-bold text-sm text-white">Select Site for Audit</h3>
            </div>

            {/* Geofence Status Card */}
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Current GPS Proximity:</span>
                <span className={`font-bold ${isGeofencePassed ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {currentDistance}m away
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Geofence Boundary:</span>
                <span className="text-slate-300 font-mono">Radius {selectedSite.geofenceRadiusMeters}m</span>
              </div>
              <div className="pt-1">
                {isGeofencePassed ? (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Geofence Verified: Within Authorized Zone
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-400 flex items-center gap-1 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" /> Outside Standard Geofence Boundary
                  </span>
                )}
              </div>
            </div>

            {/* Site List */}
            <div className="space-y-2.5">
              {DEMO_SITES.map((site) => {
                const dist = calculateDistanceMeters(
                  startGps.latitude,
                  startGps.longitude,
                  site.latitude,
                  site.longitude
                );
                const isSelected = selectedSite.id === site.id;

                return (
                  <div
                    key={site.id}
                    onClick={() => {
                      setSelectedSite(site);
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-950/40 border-blue-500 shadow-md'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-orange-400">
                          {site.code}
                        </span>
                        <h4 className="font-bold text-xs text-white mt-1">{site.name}</h4>
                        <p className="text-[11px] text-slate-400">{site.locationName}</p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold font-mono text-slate-300">{dist}m</span>
                        <p className="text-[10px] text-slate-500">Distance</p>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Health: <strong className="text-emerald-400">{site.healthScore}/100</strong></span>
                      <span className="text-slate-400">Active Defects: <strong className="text-orange-400">{site.activeDefectsCount}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => {
                setWizardStep(1);
                setCurrentScreen('inspection_wizard');
              }}
              className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-orange-600/20"
            >
              Confirm Site & Proceed
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* SCREEN 5: STEP-BY-STEP INSPECTION WIZARD */}
        {/* ============================================================ */}
        {currentScreen === 'inspection_wizard' && (
          <div className="space-y-4 pb-12">
            
            {/* Header with step progress */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentScreen('dashboard')}
                className="p-1.5 bg-slate-900 rounded-lg text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="text-center">
                <span className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider">
                  Step {wizardStep} of 4
                </span>
                <h3 className="font-bold text-xs text-white">
                  {wizardStep === 1 && 'GPS Verification & Check-In'}
                  {wizardStep === 2 && 'Mandatory Checklist Audit'}
                  {wizardStep === 3 && 'Evidence & Photo Verification'}
                  {wizardStep === 4 && 'Summary & Digital Sign-Off'}
                </h3>
              </div>
              <div className="w-6" />
            </div>

            {/* Progress Bars */}
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-colors ${
                    wizardStep >= s ? 'bg-orange-500' : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>

            {/* WIZARD STEP 1: GPS START VERIFICATION */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs text-slate-400">Target Site</span>
                    <span className="text-xs font-bold text-white">{selectedSite.name}</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Start Lat/Lng:</span>
                      <span className="font-mono text-slate-200">
                        {startGps.latitude.toFixed(6)}, {startGps.longitude.toFixed(6)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Signal Accuracy:</span>
                      <span className="font-mono text-emerald-400">±{startGps.accuracy} meters</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Geofence Proximity:</span>
                      <span className="font-mono text-slate-200">{currentDistance}m (Allowed: {selectedSite.geofenceRadiusMeters}m)</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Start Timestamp:</span>
                      <span className="font-mono text-[11px] text-slate-300">
                        {new Date(startGps.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                    <span>GPS Coordinates locked & cryptographically anchored.</span>
                  </div>
                </div>

                <button
                  id="btn-mobile-confirm-gps-start"
                  onClick={() => setWizardStep(2)}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-1.5"
                >
                  <span>Confirm GPS & Open Checklist</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* WIZARD STEP 2: DIGITAL CHECKLIST */}
            {wizardStep === 2 && (
              <div className="space-y-3">
                <div className="text-xs text-slate-400 flex items-center justify-between">
                  <span>Audit Questions ({checklist.length})</span>
                  <span className="text-orange-400 text-[11px]">All mandatory fields required</span>
                </div>

                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {checklist.map((item, idx) => (
                    <div
                      key={item.id}
                      className="bg-slate-900 border border-slate-800 p-3 rounded-2xl space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {item.category}
                        </span>
                        {item.isMandatory && (
                          <span className="text-[9px] text-red-400 font-bold">*MANDATORY</span>
                        )}
                      </div>

                      <p className="text-xs text-white font-medium">{item.question}</p>

                      {/* Status Toggle Buttons */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setChecklist((prev) =>
                              prev.map((c) => (c.id === item.id ? { ...c, status: 'PASS' } : c))
                            );
                          }}
                          className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            item.status === 'PASS'
                              ? 'bg-emerald-600 border-emerald-500 text-white'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          PASS
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setChecklist((prev) =>
                              prev.map((c) => (c.id === item.id ? { ...c, status: 'FAIL' } : c))
                            );
                          }}
                          className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            item.status === 'FAIL'
                              ? 'bg-red-600 border-red-500 text-white'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          FAIL
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setChecklist((prev) =>
                              prev.map((c) => (c.id === item.id ? { ...c, status: 'NA' } : c))
                            );
                          }}
                          className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            item.status === 'NA'
                              ? 'bg-slate-600 border-slate-500 text-white'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          N/A
                        </button>
                      </div>

                      {/* Remarks & Required Photo if Failed */}
                      {item.status === 'FAIL' && (
                        <div className="pt-2 border-t border-slate-800 space-y-2">
                          <input
                            type="text"
                            placeholder="Observation remarks (mandatory)..."
                            value={item.remarks || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setChecklist((prev) =>
                                prev.map((c) => (c.id === item.id ? { ...c, remarks: val } : c))
                              );
                            }}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-[11px] text-white focus:outline-none focus:border-red-500"
                          />

                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-amber-400">
                              {item.evidencePhotoId ? 'Photo Attached ✓' : 'Evidence photo required'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveChecklistIdForPhoto(item.id);
                                setShowCameraModal(true);
                              }}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[10px] rounded-lg flex items-center gap-1 font-semibold"
                            >
                              <Camera className="w-3 h-3 text-orange-400" />
                              <span>{item.evidencePhotoId ? 'Retake Photo' : 'Capture Photo'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setWizardStep(1)}
                    className="py-2.5 px-4 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                  >
                    Back
                  </button>

                  <button
                    onClick={() => setWizardStep(3)}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-md"
                  >
                    <span>Proceed to Evidence</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* WIZARD STEP 3: EVIDENCE & DEFECT FLAGGING */}
            {wizardStep === 3 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Attached Evidence ({sessionEvidence.length})</span>
                  <button
                    onClick={() => {
                      setActiveChecklistIdForPhoto(null);
                      setShowCameraModal(true);
                    }}
                    className="text-xs bg-orange-600 hover:bg-orange-500 text-white px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Photo</span>
                  </button>
                </div>

                {/* Evidence Grid */}
                {sessionEvidence.length === 0 ? (
                  <div className="p-6 bg-slate-900 border border-dashed border-slate-800 rounded-2xl text-center space-y-2">
                    <Camera className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">No photos attached yet</p>
                    <button
                      onClick={() => setShowCameraModal(true)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl font-medium"
                    >
                      Open Geo-Camera
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                    {sessionEvidence.map((ev) => (
                      <div
                        key={ev.id}
                        className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden text-[10px]"
                      >
                        <img src={ev.photoUrl} alt="evidence" className="w-full h-24 object-cover" />
                        <div className="p-1.5 space-y-0.5">
                          <p className="font-mono text-emerald-400 truncate">SHA: {ev.sha256Hash.substring(0, 10)}...</p>
                          <p className="text-slate-400 text-[9px]">{new Date(ev.timestamp).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Option to report a high-priority defect */}
                <div className="p-3 bg-red-950/30 border border-red-800/40 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span className="font-bold text-xs">Flag Identified Defect</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Found a critical flaw or safety breach? Report it now with AI defect vision diagnosis.
                  </p>
                  <button
                    onClick={() => setCurrentScreen('defect_reporting')}
                    className="w-full py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20 flex items-center justify-center gap-1.5"
                  >
                    <span>Launch Defect Reporting Form</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setWizardStep(2)}
                    className="py-2.5 px-4 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                  >
                    Back
                  </button>

                  <button
                    onClick={() => setWizardStep(4)}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-md"
                  >
                    <span>Review & Sign Off</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* WIZARD STEP 4: SUMMARY & DIGITAL SIGN-OFF */}
            {wizardStep === 4 && (
              <div className="space-y-4">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-slate-400">Site Code:</span>
                    <span className="font-mono font-bold text-orange-400">{selectedSite.code}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Total Checks:</span>
                    <span className="font-bold text-white">{checklist.length}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Failed / Defects:</span>
                    <span className="font-bold text-red-400">
                      {checklist.filter((c) => c.status === 'FAIL').length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Attached Photos:</span>
                    <span className="font-bold text-emerald-400">{sessionEvidence.length} geo-tagged</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">End GPS Capture:</span>
                    <span className="font-mono text-slate-300">
                      {(startGps.latitude + 0.0002).toFixed(6)}, {(startGps.longitude + 0.0003).toFixed(6)}
                    </span>
                  </div>

                  {/* Remarks */}
                  <div>
                    <label className="block text-slate-400 mb-1">Inspector Remarks</label>
                    <textarea
                      rows={2}
                      value={overallRemarks}
                      onChange={(e) => setOverallRemarks(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Digital Signature */}
                  <div>
                    <label className="block text-slate-400 mb-1">Digital Inspector Sign-Off</label>
                    <input
                      type="text"
                      value={inspectorSignature}
                      onChange={(e) => setInspectorSignature(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setWizardStep(3)}
                    className="py-3 px-4 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                  >
                    Back
                  </button>

                  <button
                    id="btn-mobile-submit-inspection"
                    onClick={handleSubmitInspection}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isOffline ? 'Save Offline (Queue)' : 'Submit Inspection'}</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ============================================================ */}
        {/* SCREEN 6: DEFECT REPORTING FORM */}
        {/* ============================================================ */}
        {currentScreen === 'defect_reporting' && (
          <div className="space-y-4 pb-12">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentScreen('inspection_wizard')}
                className="p-1.5 bg-slate-900 rounded-lg text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h3 className="font-bold text-sm text-white">Report Identified Defect</h3>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Defect Title</label>
                <input
                  type="text"
                  placeholder="e.g. Pier Cantilever Shear Crack"
                  value={defectTitle}
                  onChange={(e) => setDefectTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Detailed Description</label>
                <textarea
                  rows={2}
                  placeholder="Describe crack length, rebar exposure, thermal deformation..."
                  value={defectDescription}
                  onChange={(e) => setDefectDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Severity Selection & SLA Preview */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Severity Classification</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as DefectSeverity[]).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setDefectSeverity(sev)}
                      className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                        defectSeverity === sev
                          ? sev === 'CRITICAL'
                            ? 'bg-red-600 border-red-500 text-white'
                            : sev === 'HIGH'
                            ? 'bg-orange-600 border-orange-500 text-white'
                            : sev === 'MEDIUM'
                            ? 'bg-amber-600 border-amber-500 text-white'
                            : 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>

                <div className="mt-1.5 text-[11px] text-slate-400 bg-slate-950 p-2 rounded-lg font-mono">
                  SLA Target:{' '}
                  <span className="text-orange-400 font-bold">
                    {defectSeverity === 'CRITICAL' && 'Immediate (4h SLA) - Auto Escalates to Director'}
                    {defectSeverity === 'HIGH' && '24 Hours SLA - Supervisor Assigned'}
                    {defectSeverity === 'MEDIUM' && '72 Hours SLA - Team Lead Assigned'}
                    {defectSeverity === 'LOW' && '7 Days SLA - Standard Queue'}
                  </span>
                </div>
              </div>

              {/* Photo Evidence Attachment */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Defect Photo Evidence</label>
                {defectPhotoUrl ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-700">
                    <img src={defectPhotoUrl} alt="defect" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setShowCameraModal(true)}
                      className="absolute bottom-2 right-2 px-2.5 py-1 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] rounded-lg font-medium"
                    >
                      Retake
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCameraModal(true)}
                    className="w-full py-3 bg-slate-950 border border-dashed border-slate-700 rounded-xl text-xs text-slate-300 hover:text-white flex items-center justify-center gap-1.5"
                  >
                    <Camera className="w-4 h-4 text-orange-400" />
                    <span>Capture Geo-Tagged Photo</span>
                  </button>
                )}
              </div>

              {/* AI Vision Diagnosis Assistant Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleRunAIDiagnosis}
                  disabled={isAnalyzingAI}
                  className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{isAnalyzingAI ? 'Running Computer Vision...' : 'AI Defect Diagnosis & Risk Score'}</span>
                </button>
              </div>

              {/* AI Result Box */}
              {aiDiagnosis && (
                <div className="bg-purple-950/30 border border-purple-700/50 p-3 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-300">CV Diagnosis: {aiDiagnosis.detectedDefectType}</span>
                    <span className="font-mono text-emerald-400 text-[11px]">
                      {(aiDiagnosis.confidenceScore * 100).toFixed(0)}% Conf
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px]">{aiDiagnosis.recommendedAction}</p>
                  {aiDiagnosis.urgentSafetyNotice && (
                    <p className="text-red-400 text-[10px] font-bold">⚠️ {aiDiagnosis.urgentSafetyNotice}</p>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleSubmitDefect}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-red-600/20 flex items-center justify-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span>Submit Defect Report</span>
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* SCREEN 7: INSPECTION SUMMARY */}
        {/* ============================================================ */}
        {currentScreen === 'inspection_summary' && (
          <div className="space-y-4 py-4 text-center">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Inspection Registered Successfully</h3>
              <p className="text-xs text-slate-400 mt-1">
                Audit record anchored with immutable GPS telemetry & timestamp.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-left space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Site:</span>
                <strong className="text-white">{selectedSite.name}</strong>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Synchronization:</span>
                <strong className={isOffline ? 'text-amber-400' : 'text-emerald-400'}>
                  {isOffline ? 'Saved in Local Queue' : 'Synced to Central Cloud'}
                </strong>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Audit Trail:</span>
                <span className="font-mono text-emerald-400">SHA-256 Tamper Sealed</span>
              </div>
            </div>

            <button
              onClick={() => {
                setCurrentScreen('dashboard');
                setActiveTab('home');
              }}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold"
            >
              Back to Dashboard
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* SCREEN 8: OFFLINE SYNC MANAGER */}
        {/* ============================================================ */}
        {currentScreen === 'offline_sync' && (
          <div className="space-y-4 pb-12">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white">Offline Synchronization Engine</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isOffline ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {isOffline ? 'OFFLINE' : 'CONNECTED'}
              </span>
            </div>

            {/* Offline Simulation Switch */}
            <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Simulate Network Drop</span>
                <p className="text-[11px] text-slate-400">Test offline field data capture & conflict resolution</p>
              </div>
              <button
                onClick={onToggleOffline}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isOffline ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {isOffline ? 'Offline' : 'Online'}
              </button>
            </div>

            {/* Queue List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Queued Items ({syncQueue.length})</span>
                <span>Auto-Retry: Enabled</span>
              </div>

              {syncQueue.length === 0 ? (
                <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-2xl text-center text-xs text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  All records are synchronized with central repository.
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {syncQueue.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-white text-[11px] block">{item.type}</span>
                        <span className="text-[10px] text-slate-400">
                          Queued: {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400 font-mono">
                        PENDING
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {syncResultMsg && (
              <div className="p-3 bg-blue-950/40 border border-blue-800 rounded-xl text-xs text-blue-300">
                {syncResultMsg}
              </div>
            )}

            <button
              onClick={handlePerformSync}
              disabled={isSyncing || syncQueue.length === 0}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-lg flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Synchronizing with Central Server...' : 'Trigger Sync Now'}</span>
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* SCREEN 9: INSPECTION HISTORY & COMPARISON */}
        {/* ============================================================ */}
        {currentScreen === 'history' && (
          <div className="space-y-3 pb-12">
            <h3 className="font-bold text-sm text-white">Inspection History Log</h3>
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {inspectionsList.map((insp, idx) => (
                <div
                  key={insp.id}
                  onClick={() => {
                    const prev = inspectionsList[idx + 1] || insp;
                    setSelectedComparisonPair({ current: insp, previous: prev });
                    setCurrentScreen('history_compare');
                  }}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-3 rounded-2xl cursor-pointer transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">{insp.inspectionNumber}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(insp.startedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 truncate">{insp.siteName}</p>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
                    <span className="text-slate-400">Score: <strong className="text-blue-400">{insp.score}%</strong></span>
                    <span className="text-orange-400 font-semibold flex items-center gap-1">
                      Compare Audits <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SCREEN 10: HISTORICAL COMPARISON VIEW */}
        {/* ============================================================ */}
        {currentScreen === 'history_compare' && selectedComparisonPair && (
          <div className="space-y-4 pb-12">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentScreen('history')}
                className="p-1.5 bg-slate-900 rounded-lg text-slate-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h3 className="font-bold text-sm text-white">Audit Evolution Comparison</h3>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Previous */}
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Previous Audit</span>
                <p className="font-bold text-white text-[11px] truncate">{selectedComparisonPair.previous.inspectionNumber}</p>
                <p className="text-[10px] text-slate-400">{new Date(selectedComparisonPair.previous.startedAt).toLocaleDateString()}</p>
                <div className="pt-1">
                  <span className="text-xs font-mono font-bold text-blue-400">
                    {selectedComparisonPair.previous.score}% Quality
                  </span>
                </div>
              </div>

              {/* Current */}
              <div className="bg-blue-950/40 border border-blue-600/40 p-3 rounded-xl space-y-1">
                <span className="text-[10px] text-blue-300 uppercase tracking-wider font-semibold">Current Audit</span>
                <p className="font-bold text-white text-[11px] truncate">{selectedComparisonPair.current.inspectionNumber}</p>
                <p className="text-[10px] text-slate-400">{new Date(selectedComparisonPair.current.startedAt).toLocaleDateString()}</p>
                <div className="pt-1">
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {selectedComparisonPair.current.score}% Quality
                  </span>
                </div>
              </div>
            </div>

            {/* Delta Analysis */}
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-xs space-y-2">
              <span className="font-bold text-white text-xs block">Site Condition Variance</span>
              <div className="space-y-1 text-slate-300 text-[11px]">
                <div className="flex justify-between">
                  <span>Score Delta:</span>
                  <span className={selectedComparisonPair.current.score >= selectedComparisonPair.previous.score ? 'text-emerald-400' : 'text-red-400'}>
                    {selectedComparisonPair.current.score - selectedComparisonPair.previous.score > 0 ? '+' : ''}
                    {selectedComparisonPair.current.score - selectedComparisonPair.previous.score}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Defect Status:</span>
                  <span className="text-orange-400 font-bold">
                    {selectedComparisonPair.current.defectsCount} Active vs {selectedComparisonPair.previous.defectsCount} Prior
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setCurrentScreen('history')}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl"
            >
              Close Comparison
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* SCREEN 11: INSPECTOR PROFILE */}
        {/* ============================================================ */}
        {currentScreen === 'profile' && (
          <div className="space-y-4 pb-12">
            <h3 className="font-bold text-sm text-white">Inspector Profile & Digital ID</h3>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-center space-y-3">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-20 h-20 rounded-2xl object-cover mx-auto border-2 border-orange-500 shadow-md"
              />
              <div>
                <h4 className="font-bold text-base text-white">{currentUser.name}</h4>
                <p className="text-xs font-mono text-orange-400">{currentUser.inspectorId || 'INSP-BLR-101'}</p>
                <p className="text-[11px] text-slate-400">{currentUser.department || 'Infrastructure Audit Bureau'}</p>
              </div>

              {/* Digital Badge QR */}
              <div className="p-3 bg-white rounded-xl max-w-[140px] mx-auto">
                <QrCode className="w-28 h-28 text-slate-950 mx-auto" />
                <span className="text-[9px] font-mono text-slate-600 block mt-1">SIH-CERT-AUTH</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
                <div className="bg-slate-950 p-2 rounded-xl">
                  <span className="text-slate-400 text-[10px]">Total Audits</span>
                  <p className="font-bold text-white text-sm">84</p>
                </div>
                <div className="bg-slate-950 p-2 rounded-xl">
                  <span className="text-slate-400 text-[10px]">Quality Score</span>
                  <p className="font-bold text-emerald-400 text-sm">4.9 ★</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setCurrentScreen('login')}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-red-400 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* SCREEN 12: IOT TELEMETRY FIELD NODES (Base Paper Area 3) */}
        {/* ============================================================ */}
        {currentScreen === 'iot_telemetry' && (
          <div className="space-y-4 pb-12">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentScreen('dashboard')}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h3 className="font-bold text-sm text-white">IoT Field Sensor Telemetry</h3>
                <p className="text-[11px] text-slate-400">{selectedSite.name}</p>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-300 font-medium">Site Hardware Mesh</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Live Bluetooth / LoRaWAN
              </span>
            </div>

            <div className="space-y-3">
              {mobileIotSensors.map((sensor) => {
                const isCritical = sensor.status === 'CRITICAL';
                const isWarning = sensor.status === 'WARNING';
                const percentOfMax = Math.min(
                  100,
                  Math.max(
                    0,
                    ((sensor.currentValue - sensor.thresholdMin) /
                      (sensor.thresholdMax - sensor.thresholdMin)) *
                      100
                  )
                );

                return (
                  <div
                    key={sensor.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isCritical
                        ? 'bg-red-950/20 border-red-700/60 shadow-md'
                        : isWarning
                        ? 'bg-amber-950/20 border-amber-700/50'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-white">{sensor.code}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                            {sensor.type.replace('_', ' ')}
                          </span>
                        </div>
                        <h4 className="font-semibold text-xs text-slate-200 mt-1">{sensor.name}</h4>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono ${
                          isCritical
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                            : isWarning
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {sensor.status}
                      </span>
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-baseline justify-between mb-2">
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase">Field Reading</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span
                            className={`text-xl font-black font-mono ${
                              isCritical
                                ? 'text-red-400'
                                : isWarning
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {sensor.currentValue}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">{sensor.unit}</span>
                        </div>
                      </div>

                      <div className="text-right text-[10px] text-slate-400">
                        <span className="block text-[9px]">Normal Range</span>
                        <span className="font-mono text-slate-300">
                          {sensor.thresholdMin} – {sensor.thresholdMax} {sensor.unit}
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800 mb-2">
                      <div
                        className={`h-full rounded-full ${
                          isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(10, percentOfMax))}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Battery: {sensor.batteryLevel}%</span>
                      <span>Last: {sensor.lastReadingAt}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentScreen('dashboard')}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md"
            >
              Return to Inspection Workspace
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* SCREEN 13: DECISION SUPPORT DIRECTIVES (Base Paper Area 5) */}
        {/* ============================================================ */}
        {currentScreen === 'decision_alerts' && (
          <div className="space-y-4 pb-12">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentScreen('dashboard')}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h3 className="font-bold text-sm text-white">AI Decision Directives</h3>
                <p className="text-[11px] text-slate-400">Supervisor & Engineering Guidance</p>
              </div>
            </div>

            <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-2xl text-xs text-orange-300 flex items-start gap-2.5">
              <BrainCircuit className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Automated Decision Support</span>
                <p className="text-[11px] text-orange-200/80 mt-0.5">
                  Directives generated by correlating field visual defects with vibration sensors for prioritizing critical intervention.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {mobileDecisions.map((decision) => (
                <div
                  key={decision.id}
                  className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3 shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 font-mono font-black text-xs flex items-center justify-center border border-red-500/30">
                        {decision.riskScore}
                      </span>
                      <div>
                        <span className="font-mono text-xs font-bold text-white block">
                          {decision.defectCode}
                        </span>
                        <span className="text-[10px] text-slate-400">{decision.siteName}</span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase font-mono bg-red-500/20 text-red-400 border border-red-500/30">
                      {decision.urgencyLevel.replace('_', ' ')}
                    </span>
                  </div>

                  <h4 className="font-bold text-xs text-white leading-tight">{decision.title}</h4>

                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[11px] space-y-1.5">
                    <p className="text-slate-300 leading-relaxed">{decision.diagnosis}</p>
                    <div className="pt-1.5 border-t border-slate-900 text-emerald-400 font-medium">
                      Plan: {decision.recommendedAction}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="p-1.5 bg-slate-950 rounded-lg">
                      <span className="text-[9px] text-slate-500 block">Est. Cost</span>
                      <span className="font-mono font-bold text-emerald-400 text-xs">
                        {decision.estimatedCostInINR}
                      </span>
                    </div>
                    <div className="p-1.5 bg-slate-950 rounded-lg">
                      <span className="text-[9px] text-slate-500 block">Target SLA</span>
                      <span className="font-mono font-bold text-amber-400 text-xs">
                        {decision.targetSLADays} Day{decision.targetSLADays > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 truncate max-w-[170px]">{decision.requiredTeam}</span>
                    <span className="text-emerald-400 font-bold">{decision.status}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setCurrentScreen('dashboard')}
              className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl shadow-md"
            >
              Back to Audit Dashboard
            </button>
          </div>
        )}

      </div>

      {/* Camera Capture Modal with Geo-Watermark */}
      {showCameraModal && (
        <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md p-4 flex flex-col justify-center">
          <PhotoWatermarkCapture
            inspectorId={currentUser.inspectorId || 'INSP-BLR-101'}
            siteCode={selectedSite.code}
            latitude={startGps.latitude}
            longitude={startGps.longitude}
            onPhotoCaptured={handlePhotoCaptured}
            onCancel={() => setShowCameraModal(false)}
          />
        </div>
      )}

      {/* Bottom Tab Bar Navigation */}
      <div className="bg-slate-950 border-t border-slate-800 py-2 px-6 flex items-center justify-between text-slate-400 select-none">
        <button
          onClick={() => {
            setActiveTab('home');
            setCurrentScreen('dashboard');
          }}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'home' && currentScreen === 'dashboard' ? 'text-orange-500' : 'hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span className="text-[10px] font-semibold">Audit</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('history');
            setCurrentScreen('history');
          }}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'history' ? 'text-orange-500' : 'hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span className="text-[10px] font-semibold">History</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('sync');
            setCurrentScreen('offline_sync');
          }}
          className={`relative flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'sync' ? 'text-orange-500' : 'hover:text-white'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span className="text-[10px] font-semibold">Sync</span>
          {syncQueue.length > 0 && (
            <span className="absolute -top-1 right-2 w-3.5 h-3.5 bg-amber-500 text-slate-950 rounded-full text-[9px] font-bold flex items-center justify-center">
              {syncQueue.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('profile');
            setCurrentScreen('profile');
          }}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'profile' ? 'text-orange-500' : 'hover:text-white'
          }`}
        >
          <User className="w-4 h-4" />
          <span className="text-[10px] font-semibold">Profile</span>
        </button>
      </div>

    </div>
  );
};
