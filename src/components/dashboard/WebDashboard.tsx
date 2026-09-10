import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  MapPin,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Users,
  Building2,
  ShieldCheck,
  TrendingUp,
  Download,
  Filter,
  Search,
  Eye,
  ArrowUpRight,
  Sparkles,
  ChevronRight,
  Radio,
  BarChart3,
  Calendar,
  AlertOctagon,
  Printer,
  ExternalLink,
  Cpu,
  BrainCircuit,
  Bell,
  Sliders,
  Check,
  CheckSquare,
  FileCheck,
  Activity,
  Zap,
} from 'lucide-react';
import {
  Inspection,
  Defect,
  Site,
  InspectorProfile,
  DashboardMetrics,
  AuditLog,
  User,
  DefectSeverity,
  IoTSensorNode,
  DecisionSupportItem,
  InspectionReportSummary,
  AppNotification,
} from '../../types';
import { LiveRadarMap } from './LiveRadarMap';
import { CorrectiveActionModal } from './CorrectiveActionModal';
import { StorageService } from '../../services/storageService';
import { ApiService } from '../../services/apiService';

interface WebDashboardProps {
  currentUser: User;
  onRefreshData?: () => void;
}

type DashboardTab =
  | 'overview'
  | 'iot_sensors'
  | 'defects'
  | 'decision_support'
  | 'alerts'
  | 'reports'
  | 'inspections'
  | 'corrective_actions'
  | 'sites'
  | 'inspectors'
  | 'audit_logs';

export const WebDashboard: React.FC<WebDashboardProps> = ({ currentUser }) => {
  const storage = StorageService.getInstance();

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  // Core Data
  const [inspections, setInspections] = useState<Inspection[]>(storage.getInspections());
  const [defects, setDefects] = useState<Defect[]>(storage.getDefects());
  const [sites, setSites] = useState<Site[]>([]);
  const [inspectors, setInspectors] = useState<InspectorProfile[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(storage.getAuditLogs());
  const [iotSensors, setIotSensors] = useState<IoTSensorNode[]>([]);
  const [decisionSupport, setDecisionSupport] = useState<DecisionSupportItem[]>([]);
  const [reportsList, setReportsList] = useState<InspectionReportSummary[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Modals & Drawers
  const [selectedInspectionForDetails, setSelectedInspectionForDetails] = useState<Inspection | null>(null);
  const [selectedDefectForAction, setSelectedDefectForAction] = useState<Defect | null>(null);
  const [selectedReportForView, setSelectedReportForView] = useState<InspectionReportSummary | null>(null);
  const [showCertificateModal, setShowCertificateModal] = useState<boolean>(false);

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [sensorTypeFilter, setSensorTypeFilter] = useState<string>('ALL');
  const [alertFilter, setAlertFilter] = useState<string>('ALL');

  // Load live data from API
  const loadDashboardData = async () => {
    try {
      const [s, insp, ins, def, m, logs, iot, dec, reps, notifs] = await Promise.all([
        ApiService.getSites(),
        ApiService.getInspectors(),
        ApiService.getInspections(),
        ApiService.getDefects(),
        ApiService.getAnalytics(),
        ApiService.getAuditLogs(),
        ApiService.getIoTSensors(),
        ApiService.getDecisionSupport(),
        ApiService.getReports(),
        ApiService.getNotifications(),
      ]);

      setSites(s);
      setInspectors(insp);
      setInspections(ins);
      setDefects(def);
      setMetrics(m);
      setAuditLogs(logs);
      setIotSensors(iot);
      setDecisionSupport(dec);
      setReportsList(reps);
      setNotifications(notifs);
    } catch (err) {
      console.warn('Dashboard data refresh warning', err);
    }
  };

  const handleSimulateSensorSpike = (sensorId: string) => {
    setIotSensors((prev) =>
      prev.map((s) => {
        if (s.id === sensorId) {
          const spiked = +(s.currentValue * 1.55).toFixed(2);
          return {
            ...s,
            currentValue: spiked,
            status: 'CRITICAL',
            history: [...s.history.slice(1), { timestamp: 'Now', value: spiked }],
          };
        }
        return s;
      })
    );
  };

  const handleUpdateDecisionStatus = async (
    id: string,
    status: 'APPROVED' | 'DISPATCHED' | 'REJECTED'
  ) => {
    await ApiService.updateDecisionStatus(id, status);
    setDecisionSupport((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status } : d))
    );
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Filtered Inspections
  const filteredInspections = inspections.filter((i) => {
    const matchSearch =
      i.inspectionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.siteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.inspectorName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  // Filtered Defects
  const filteredDefects = defects.filter((d) => {
    const matchSeverity = severityFilter === 'ALL' || d.severity === severityFilter;
    const matchSearch =
      d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.siteName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSeverity && matchSearch;
  });

  // Handlers for Corrective Actions
  const handleAssignAction = async (payload: any) => {
    await ApiService.assignCorrectiveAction(payload);
    loadDashboardData();
  };

  const handleVerifyAction = async (payload: any) => {
    await ApiService.verifyAndCloseCorrectiveAction(payload);
    loadDashboardData();
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = 'InspectionNumber,Site,Inspector,Status,Score,DefectsCount,Date\n';
    const rows = inspections
      .map(
        (i) =>
          `"${i.inspectionNumber}","${i.siteName}","${i.inspectorName}","${i.status}",${i.score},${i.defectsCount},"${i.startedAt}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SIH-Inspection-Audit-Report-${new Date().toISOString().substring(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto px-4 py-6 text-slate-100">
      
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 flex-shrink-0 space-y-4">
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-800">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-xs text-white uppercase tracking-wider">Command Center</span>
          </div>

          <nav className="space-y-1 text-xs">
            {[
              { id: 'overview', label: 'Overview & GIS Map', icon: LayoutDashboard },
              {
                id: 'iot_sensors',
                label: 'IoT Telemetry Stream',
                icon: Cpu,
                count: iotSensors.filter((s) => s.status !== 'NORMAL').length,
                badgeColor: 'text-amber-400 bg-amber-500/20',
              },
              {
                id: 'defects',
                label: 'Computer Vision Defects',
                icon: Eye,
                count: defects.filter((d) => d.status !== 'CLOSED').length,
                badgeColor: 'text-red-400 bg-red-500/20',
              },
              {
                id: 'decision_support',
                label: 'Decision Support System',
                icon: BrainCircuit,
                count: decisionSupport.filter((d) => d.status === 'PENDING_DECISION').length,
                badgeColor: 'text-orange-400 bg-orange-500/20',
              },
              {
                id: 'alerts',
                label: 'System Alert Engine',
                icon: Bell,
                count: notifications.filter((n) => !n.read).length,
                badgeColor: 'text-red-400 bg-red-500/20',
              },
              {
                id: 'reports',
                label: 'Reports & Dossiers',
                icon: FileCheck,
                count: reportsList.length,
              },
              {
                id: 'inspections',
                label: 'Inspections Ledger',
                icon: ClipboardList,
                count: inspections.length,
              },
              {
                id: 'corrective_actions',
                label: 'Corrective Action Hub',
                icon: CheckCircle2,
              },
              {
                id: 'sites',
                label: 'Infrastructure Sites',
                icon: Building2,
                count: sites.length,
              },
              {
                id: 'inspectors',
                label: 'Field Inspectors Fleet',
                icon: Users,
                count: inspectors.length,
              },
              {
                id: 'audit_logs',
                label: 'Immutable Audit Trail',
                icon: ShieldCheck,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as DashboardTab)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </div>
                  {tab.count !== undefined && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-blue-700 text-white'
                          : tab.badgeColor || 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Quick System Health Box */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl text-xs space-y-2">
          <span className="font-bold text-slate-300 text-[11px] block uppercase tracking-wider">
            Verification Protocol
          </span>
          <div className="flex items-center justify-between text-slate-400">
            <span>GPS Geofencing:</span>
            <span className="text-emerald-400 font-semibold">Active (300m)</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>SLA Auto-Escalate:</span>
            <span className="text-emerald-400 font-semibold">Director Level</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Evidence Ledger:</span>
            <span className="text-blue-400 font-mono">SHA-256</span>
          </div>
        </div>

      </aside>

      {/* Main Workspace Viewport */}
      <main className="flex-1 min-w-0 space-y-6">

        {/* ============================================================== */}
        {/* TAB 1: EXECUTIVE OVERVIEW & KPIS */}
        {/* ============================================================== */}
        {activeTab === 'overview' && metrics && (
          <div className="space-y-6">
            
            {/* Top 4 Hero Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              {/* Total Inspections */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Audits</span>
                  <ClipboardList className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl font-extrabold text-white font-mono">{metrics.totalInspections}</div>
                <div className="flex items-center gap-2 mt-2 text-[11px] text-emerald-400">
                  <span>{metrics.completedInspections} Completed</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-amber-400">{metrics.inProgressInspections} In-Prog</span>
                </div>
              </div>

              {/* Critical Defects Flashing Alert */}
              <div className="bg-slate-900 border border-red-800/40 p-4 rounded-2xl shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Critical Defects</span>
                  <AlertOctagon className="w-4 h-4 text-red-500 animate-pulse" />
                </div>
                <div className="text-2xl font-extrabold text-red-400 font-mono">{metrics.criticalDefects}</div>
                <p className="text-[10px] text-slate-400 mt-2">Immediate 4h SLA Escalated</p>
              </div>

              {/* Quality Compliance Score */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Quality Score</span>
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-extrabold text-emerald-400 font-mono">{metrics.overallQualityScore}%</div>
                <p className="text-[10px] text-slate-400 mt-2">National Infrastructure Standard</p>
              </div>

              {/* Mean Response SLA */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Avg Response</span>
                  <Clock className="w-4 h-4 text-orange-400" />
                </div>
                <div className="text-2xl font-extrabold text-white font-mono">{metrics.averageResponseHours} hrs</div>
                <p className="text-[10px] text-slate-400 mt-2">Turnaround for remedial actions</p>
              </div>

            </div>

            {/* Middle Section: Live Radar Map + Defect Breakdown */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              
              {/* Radar Map (2 cols) */}
              <div className="xl:col-span-2">
                <LiveRadarMap
                  sites={sites}
                  inspectors={inspectors}
                  defects={defects}
                  onSelectDefect={(d) => setSelectedDefectForAction(d)}
                />
              </div>

              {/* Defect Severity & Remediation Status (1 col) */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-white mb-1">Defect Triage & SLA Status</h3>
                  <p className="text-xs text-slate-400 mb-3">Live breakdown of flagged anomalies</p>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-red-950/30 border border-red-800/40">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        <span className="font-semibold text-white">Critical Severity</span>
                      </div>
                      <span className="font-mono font-bold text-red-400">{metrics.criticalDefects} items</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-orange-950/30 border border-orange-800/40">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                        <span className="font-semibold text-white">High Severity (24h)</span>
                      </div>
                      <span className="font-mono font-bold text-orange-400">{metrics.highDefects} items</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/40">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span className="font-semibold text-white">Medium Severity (72h)</span>
                      </div>
                      <span className="font-mono font-bold text-amber-400">{metrics.mediumDefects} items</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-950/30 border border-blue-800/40">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <span className="font-semibold text-white">Low Severity (7d)</span>
                      </div>
                      <span className="font-mono font-bold text-blue-400">{metrics.lowDefects} items</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Corrective Action Progress</span>
                    <span className="font-bold text-emerald-400">
                      {metrics.pendingCorrectiveActions.closed} Closed
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          (metrics.pendingCorrectiveActions.closed /
                            Math.max(1, metrics.pendingCorrectiveActions.total + metrics.pendingCorrectiveActions.closed)) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Site Performance Matrix */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-sm text-white">National Infrastructure Sites Performance</h3>
                  <p className="text-xs text-slate-400">Health scores and geofenced inspection status</p>
                </div>
                <button
                  onClick={() => setActiveTab('sites')}
                  className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                >
                  Manage Sites <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {sites.map((s) => (
                  <div key={s.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-orange-400 text-[10px]">{s.code}</span>
                      <span className="text-emerald-400 font-bold">{s.healthScore}%</span>
                    </div>
                    <h4 className="font-semibold text-white truncate text-xs">{s.name}</h4>
                    <p className="text-slate-400 text-[10px] truncate">{s.locationName}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                      <span>Defects: {s.activeDefectsCount}</span>
                      <span className="text-blue-400">Geofence: {s.geofenceRadiusMeters}m</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: IOT AND REAL-TIME MONITORING (Base Paper Area 3) */}
        {/* ============================================================== */}
        {activeTab === 'iot_sensors' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    Base Paper Area 3 • Continuous Sensor Telemetry
                  </span>
                </div>
                <h3 className="font-bold text-base text-white">
                  IoT Real-Time Structural Health Monitoring Network
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automated telemetry nodes measuring vibration acceleration, tilt, strain, crack displacement & corrosion
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleSimulateSensorSpike('iot-1')}
                  className="px-3 py-1.5 bg-amber-600/90 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
                  title="Simulate sudden vibration harmonic breach on Pier P-14"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Simulate Harmonic Spike</span>
                </button>
              </div>
            </div>

            {/* Filter Tabs by Sensor Type */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'ALL', label: 'All Telemetry Nodes' },
                { id: 'VIBRATION', label: 'Vibration / Accelerometers' },
                { id: 'CRACK_DISPLACEMENT', label: 'Crack Displacement' },
                { id: 'STRUCTURAL_TILT', label: 'Tilt / Inclinometers' },
                { id: 'STRAIN_GAUGE', label: 'Strain Gauges' },
                { id: 'HUMIDITY_CORROSION', label: 'Corrosion Probes' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setSensorTypeFilter(filter.id)}
                  className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all ${
                    sensorTypeFilter === filter.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Sensor Nodes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {iotSensors
                .filter((s) => sensorTypeFilter === 'ALL' || s.type === sensorTypeFilter)
                .map((sensor) => {
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
                      className={`p-4 rounded-2xl border transition-all ${
                        isCritical
                          ? 'bg-red-950/20 border-red-700/60 shadow-lg shadow-red-950/30'
                          : isWarning
                          ? 'bg-amber-950/20 border-amber-700/50 shadow-md'
                          : 'bg-slate-900 border-slate-800 shadow-md'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-white">
                              {sensor.code}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                              {sensor.type.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[200px]">
                            {sensor.siteName}
                          </p>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
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

                      <h4 className="font-bold text-sm text-slate-100 mb-3">{sensor.name}</h4>

                      {/* Current Reading Hero */}
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 mb-3 flex items-baseline justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase tracking-wider">
                            Live Telemetry Value
                          </span>
                          <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span
                              className={`text-2xl font-extrabold font-mono ${
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

                        <div className="text-right text-[11px] text-slate-400">
                          <span className="block text-[10px]">Safe Threshold</span>
                          <span className="font-mono font-medium text-slate-300">
                            {sensor.thresholdMin} – {sensor.thresholdMax} {sensor.unit}
                          </span>
                        </div>
                      </div>

                      {/* Gauge / Progress Indicator */}
                      <div className="space-y-1 mb-3">
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                          <span>Min: {sensor.thresholdMin}</span>
                          <span>Gauge: {Math.round(percentOfMax)}%</span>
                          <span>Max: {sensor.thresholdMax}</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(8, percentOfMax))}%` }}
                          />
                        </div>
                      </div>

                      {/* Sparkline History */}
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Activity className="w-3 h-3 text-blue-400" />
                          <span>Last 5 readings:</span>
                          <span className="text-slate-300">
                            {sensor.history.map((h) => h.value).join(' → ')}
                          </span>
                        </div>
                        <span className="text-slate-500">Bat: {sensor.batteryLevel}%</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: DECISION SUPPORT SYSTEMS (Base Paper Area 5) */}
        {/* ============================================================== */}
        {activeTab === 'decision_support' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <BrainCircuit className="w-4 h-4 text-orange-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/20">
                    Base Paper Area 5 • Decision Support Systems
                  </span>
                </div>
                <h3 className="font-bold text-base text-white">
                  Predictive Risk Prioritization & Remediation Directives
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  AI-synthesized directives combining Computer Vision defect severity with IoT vibration models for executive decisions
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                  <span className="text-slate-400 text-[10px] block">Pending Decision</span>
                  <span className="font-bold font-mono text-orange-400">
                    {decisionSupport.filter((d) => d.status === 'PENDING_DECISION').length} cases
                  </span>
                </div>
              </div>
            </div>

            {/* Decision Support Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {decisionSupport.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-md flex flex-col justify-between space-y-4"
                >
                  <div>
                    {/* Top Row: Risk Score & Urgency */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-sm ${
                            item.riskScore >= 85
                              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                              : item.riskScore >= 70
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                          }`}
                        >
                          {item.riskScore}
                        </span>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Risk Priority Index
                          </span>
                          <span className="text-xs font-bold text-white font-mono">{item.defectCode}</span>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase font-mono ${
                          item.urgencyLevel === 'IMMEDIATE'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse'
                            : item.urgencyLevel === 'HIGH_PRIORITY'
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {item.urgencyLevel.replace('_', ' ')}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white mb-1.5">{item.title}</h4>
                    <p className="text-xs text-blue-400 font-medium mb-3">{item.siteName}</p>

                    {/* AI Diagnosis */}
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2 mb-3">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">
                          Multi-Modal Diagnosis (Vision + Telemetry)
                        </span>
                        <p className="text-slate-300 leading-relaxed">{item.diagnosis}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-900">
                        <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mb-0.5">
                          Prescribed Structural Action Plan
                        </span>
                        <p className="text-slate-200 leading-relaxed">{item.recommendedAction}</p>
                      </div>
                    </div>

                    {/* Specification Metadata Grid */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 bg-slate-950 rounded-xl border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 block">Est. Cost</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {item.estimatedCostInINR}
                        </span>
                      </div>
                      <div className="p-2 bg-slate-950 rounded-xl border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 block">Target SLA</span>
                        <span className="font-mono font-bold text-amber-400">
                          {item.targetSLADays} Day{item.targetSLADays > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="p-2 bg-slate-950 rounded-xl border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 block">Status</span>
                        <span
                          className={`font-mono font-bold text-[11px] ${
                            item.status === 'APPROVED'
                              ? 'text-emerald-400'
                              : item.status === 'DISPATCHED'
                              ? 'text-blue-400'
                              : 'text-orange-400'
                          }`}
                        >
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Decision Action Controls */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                      Team: <strong className="text-slate-300">{item.requiredTeam}</strong>
                    </span>

                    <div className="flex items-center gap-2">
                      {item.status === 'PENDING_DECISION' ? (
                        <>
                          <button
                            onClick={() => handleUpdateDecisionStatus(item.id, 'APPROVED')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-md transition-all"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve Directive</span>
                          </button>
                          <button
                            onClick={() => handleUpdateDecisionStatus(item.id, 'DISPATCHED')}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-md transition-all"
                          >
                            <span>Dispatch Team</span>
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Executive Authorization Recorded</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: ALERT ENGINE (Architecture Flowchart) */}
        {/* ============================================================== */}
        {activeTab === 'alerts' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Bell className="w-4 h-4 text-red-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                    Architecture Flowchart • System Alert Engine
                  </span>
                </div>
                <h3 className="font-bold text-sm text-white">
                  Real-Time Alert Dispatch & Automated Escalations
                </h3>
                <p className="text-xs text-slate-400">
                  Instant triggers on critical defect detection, geofence breaches, SLA countdowns, and IoT threshold violations
                </p>
              </div>

              <div className="flex items-center gap-2">
                {['ALL', 'CRITICAL', 'WARNING', 'INFO'].map((filt) => (
                  <button
                    key={filt}
                    onClick={() => setAlertFilter(filt)}
                    className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                      alertFilter === filt
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {filt}
                  </button>
                ))}
              </div>
            </div>

            {/* Alert List */}
            <div className="space-y-2.5">
              {notifications
                .filter((n) => alertFilter === 'ALL' || n.type === alertFilter)
                .map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                      notif.type === 'CRITICAL'
                        ? 'bg-red-950/20 border-red-800/60'
                        : notif.type === 'WARNING'
                        ? 'bg-amber-950/20 border-amber-800/50'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`p-2 rounded-xl mt-0.5 ${
                          notif.type === 'CRITICAL'
                            ? 'bg-red-500/20 text-red-400'
                            : notif.type === 'WARNING'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}
                      >
                        <AlertOctagon className="w-4 h-4" />
                      </span>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs text-white">{notif.title}</h4>
                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(notif.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1">{notif.message}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                      )}
                      <button
                        onClick={() => storage.markNotificationAsRead(notif.id)}
                        className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
                      >
                        Acknowledge
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: INSPECTIONS LEDGER */}
        {/* ============================================================== */}
        {activeTab === 'inspections' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-4">
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-white">Certified Field Inspections Ledger</h3>
                <p className="text-xs text-slate-400">Immutable records with dual GPS & SHA-256 seal</p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by code, site, inspector..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
              </div>
            </div>

            {/* Inspections Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="pb-3 px-3">Audit ID</th>
                    <th className="pb-3 px-3">Target Site</th>
                    <th className="pb-3 px-3">Inspector</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3">Quality Score</th>
                    <th className="pb-3 px-3">Defects</th>
                    <th className="pb-3 px-3">GPS Verified</th>
                    <th className="pb-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredInspections.map((insp) => (
                    <tr key={insp.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-white">{insp.inspectionNumber}</td>
                      <td className="py-3 px-3 text-slate-300 font-medium">{insp.siteName}</td>
                      <td className="py-3 px-3 text-slate-400">{insp.inspectorName}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            insp.status === 'COMPLETED'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {insp.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-blue-400">{insp.score}%</td>
                      <td className="py-3 px-3">
                        {insp.defectsCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/20 text-red-400 font-bold">
                            {insp.defectsCount} Flagged
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-medium">None</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> ±{insp.distanceFromSiteMeters}m
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setSelectedInspectionForDetails(insp)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white rounded-lg transition-colors font-medium text-[11px]"
                        >
                          View Audit Dossier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: DEFECT & SLA ESCALATION MATRIX */}
        {/* ============================================================== */}
        {activeTab === 'defects' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-4">
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-white">Defect & SLA Escalation Matrix</h3>
                <p className="text-xs text-slate-400">Automated triage & directorate escalation engine</p>
              </div>

              {/* Severity Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                      severityFilter === sev
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>

            {/* Defects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDefects.map((def) => (
                <div
                  key={def.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    def.severity === 'CRITICAL'
                      ? 'bg-red-950/20 border-red-800/60'
                      : def.severity === 'HIGH'
                      ? 'bg-orange-950/20 border-orange-800/50'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-white block">{def.code}</span>
                      <span className="text-[10px] text-slate-400">{def.siteName}</span>
                    </div>

                    <div className="text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          def.severity === 'CRITICAL'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : def.severity === 'HIGH'
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}
                      >
                        {def.severity} ({def.slaHours}h SLA)
                      </span>
                    </div>
                  </div>

                  <h4 className="font-bold text-sm text-white mb-1">{def.title}</h4>
                  <p className="text-xs text-slate-300 line-clamp-2 mb-3">{def.description}</p>

                  {/* Photo thumbnail */}
                  {def.evidencePhotos?.[0] && (
                    <div className="aspect-video w-full rounded-xl overflow-hidden mb-3 border border-slate-800">
                      <img
                        src={def.evidencePhotos[0].photoUrl}
                        alt={def.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* SLA & Status footer */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      Status: <strong className="text-orange-400">{def.status}</strong>
                    </span>

                    <button
                      onClick={() => setSelectedDefectForAction(def)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-1 shadow-md"
                    >
                      <span>Remediation Workflow</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: CORRECTIVE ACTION HUB */}
        {/* ============================================================== */}
        {activeTab === 'corrective_actions' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md">
              <h3 className="font-bold text-sm text-white mb-1">
                Remediation Lifecycle: Detect → Assign → Prioritize → Track → Verify & Close
              </h3>
              <p className="text-xs text-slate-400">
                End-to-end audit tracking with photographic before-and-after verification.
              </p>
            </div>

            {/* Kanban columns */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Column 1: DETECTED */}
              <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-2xl space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>1. Detected</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
                    {defects.filter((d) => d.status === 'DETECTED').length}
                  </span>
                </div>
                {defects
                  .filter((d) => d.status === 'DETECTED')
                  .map((def) => (
                    <div
                      key={def.id}
                      onClick={() => setSelectedDefectForAction(def)}
                      className="p-3 bg-slate-950 border border-slate-800 hover:border-blue-500 rounded-xl cursor-pointer text-xs space-y-1"
                    >
                      <span className="font-mono text-[10px] text-orange-400 font-bold">{def.code}</span>
                      <p className="font-semibold text-white truncate">{def.title}</p>
                      <span className="text-[10px] text-red-400 font-bold">{def.severity}</span>
                    </div>
                  ))}
              </div>

              {/* Column 2: ASSIGNED */}
              <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-2xl space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>2. Assigned</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
                    {defects.filter((d) => d.status === 'ASSIGNED').length}
                  </span>
                </div>
                {defects
                  .filter((d) => d.status === 'ASSIGNED')
                  .map((def) => (
                    <div
                      key={def.id}
                      onClick={() => setSelectedDefectForAction(def)}
                      className="p-3 bg-slate-950 border border-slate-800 hover:border-blue-500 rounded-xl cursor-pointer text-xs space-y-1"
                    >
                      <span className="font-mono text-[10px] text-blue-400 font-bold">{def.code}</span>
                      <p className="font-semibold text-white truncate">{def.title}</p>
                      <p className="text-[10px] text-slate-400 truncate">Lead: {def.assignedTo?.name}</p>
                    </div>
                  ))}
              </div>

              {/* Column 3: PENDING VERIFICATION */}
              <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-2xl space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>3. Verify Repair</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-emerald-400">
                    {defects.filter((d) => d.status === 'PENDING_VERIFICATION' || d.status === 'IN_PROGRESS').length}
                  </span>
                </div>
                {defects
                  .filter((d) => d.status === 'PENDING_VERIFICATION' || d.status === 'IN_PROGRESS')
                  .map((def) => (
                    <div
                      key={def.id}
                      onClick={() => setSelectedDefectForAction(def)}
                      className="p-3 bg-slate-950 border border-emerald-500/40 rounded-xl cursor-pointer text-xs space-y-1"
                    >
                      <span className="font-mono text-[10px] text-emerald-400 font-bold">{def.code}</span>
                      <p className="font-semibold text-white truncate">{def.title}</p>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                        Ready For Before/After Audit
                      </span>
                    </div>
                  ))}
              </div>

              {/* Column 4: CLOSED */}
              <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-2xl space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>4. Closed & Verified</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
                    {defects.filter((d) => d.status === 'CLOSED').length}
                  </span>
                </div>
                {defects
                  .filter((d) => d.status === 'CLOSED')
                  .map((def) => (
                    <div
                      key={def.id}
                      onClick={() => setSelectedDefectForAction(def)}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer text-xs space-y-1 opacity-75"
                    >
                      <span className="font-mono text-[10px] text-slate-500 font-bold">{def.code}</span>
                      <p className="font-semibold text-slate-300 truncate">{def.title}</p>
                      <span className="text-[10px] text-emerald-400 font-bold">Closed ✓</span>
                    </div>
                  ))}
              </div>

            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 6: INSPECTORS FLEET */}
        {/* ============================================================== */}
        {activeTab === 'inspectors' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-4">
            <h3 className="font-bold text-sm text-white">Certified Field Inspector Fleet</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inspectors.map((insp) => (
                <div key={insp.id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={insp.avatarUrl}
                      alt={insp.name}
                      className="w-12 h-12 rounded-xl object-cover border-2 border-orange-500"
                    />
                    <div>
                      <h4 className="font-bold text-xs text-white">{insp.name}</h4>
                      <p className="text-[11px] font-mono text-orange-400">{insp.inspectorId}</p>
                      <p className="text-[10px] text-slate-400">{insp.zone}</p>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Current Status:</span>
                      <span className="text-emerald-400 font-bold">{insp.currentStatus}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Completed Audits:</span>
                      <span className="font-mono font-bold text-white">{insp.completedInspectionsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Rating:</span>
                      <span className="text-amber-400 font-bold">{insp.rating} ★</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Live GPS Accuracy:</span>
                      <span>±{insp.currentLocation?.accuracy}m</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 7: INFRASTRUCTURE SITES */}
        {/* ============================================================== */}
        {activeTab === 'sites' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-4">
            <h3 className="font-bold text-sm text-white">National Infrastructure Sites & Geofences</h3>
            <div className="space-y-3">
              {sites.map((site) => (
                <div
                  key={site.id}
                  className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-orange-400 px-2 py-0.5 rounded bg-slate-900">
                        {site.code}
                      </span>
                      <h4 className="font-bold text-sm text-white">{site.name}</h4>
                    </div>
                    <p className="text-xs text-slate-400">{site.locationName}</p>
                    <p className="text-[11px] font-mono text-slate-500">
                      Coordinates: {site.latitude.toFixed(4)}° N, {site.longitude.toFixed(4)}° E
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-center p-2 bg-slate-900 rounded-xl">
                      <span className="text-slate-400 text-[10px] block">Health Score</span>
                      <span className="font-bold text-emerald-400 text-sm">{site.healthScore}/100</span>
                    </div>

                    <div className="text-center p-2 bg-slate-900 rounded-xl">
                      <span className="text-slate-400 text-[10px] block">Geofence Radius</span>
                      <span className="font-bold text-blue-400 text-sm">{site.geofenceRadiusMeters}m</span>
                    </div>

                    <div className="text-center p-2 bg-slate-900 rounded-xl">
                      <span className="text-slate-400 text-[10px] block">Active Defects</span>
                      <span className="font-bold text-red-400 text-sm">{site.activeDefectsCount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 8: COMPLIANCE REPORTS & DOSSIER GENERATOR */}
        {/* ============================================================== */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    Architecture Flowchart • Certified Reports & Dossiers
                  </span>
                </div>
                <h3 className="font-bold text-base text-white">
                  Executive Quality Audits & Inspection Dossiers
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tamper-evident structural compliance reports with dual GPS stamps, timestamp verification, and SHA-256 evidence seals
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Audit CSV</span>
                </button>

                <button
                  onClick={() => setShowCertificateModal(true)}
                  className="px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>Generate Certified Dossier</span>
                </button>
              </div>
            </div>

            {/* Compliance Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-xs space-y-2 shadow-md">
                <span className="font-bold text-white text-xs block">National Standard Compliance</span>
                <div className="text-3xl font-extrabold text-emerald-400 font-mono">96.4%</div>
                <p className="text-slate-400 text-[11px]">Calculated across 84 mandatory structural checkpoints</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-xs space-y-2 shadow-md">
                <span className="font-bold text-white text-xs block">Defect Resolution Turnaround</span>
                <div className="text-3xl font-extrabold text-blue-400 font-mono">18.2 hrs</div>
                <p className="text-slate-400 text-[11px]">Average duration from detection to supervisor sign-off</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl text-xs space-y-2 shadow-md">
                <span className="font-bold text-white text-xs block">GPS Telemetry Integrity</span>
                <div className="text-3xl font-extrabold text-orange-400 font-mono">100.0%</div>
                <p className="text-slate-400 text-[11px]">Zero geofence anomalies or spoofed audits detected</p>
              </div>
            </div>

            {/* Certified Reports Ledger */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h4 className="font-bold text-sm text-white">Generated Inspection Dossiers</h4>
                  <p className="text-xs text-slate-400">Official digitally signed quality verification packets</p>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Total Dossiers: <strong className="text-white">{reportsList.length}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reportsList.map((report) => (
                  <div
                    key={report.id}
                    className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="font-mono font-bold text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                          {report.reportNumber}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            report.status === 'COMPLIANT'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {report.status}
                        </span>
                      </div>

                      <h5 className="font-bold text-sm text-white">{report.title}</h5>
                      <p className="text-xs text-slate-400 mt-0.5">{report.siteName}</p>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 bg-slate-900 rounded-lg">
                          <span className="text-[10px] text-slate-500 block">Score</span>
                          <span className="font-mono font-bold text-emerald-400">{report.overallScore}%</span>
                        </div>
                        <div className="p-2 bg-slate-900 rounded-lg">
                          <span className="text-[10px] text-slate-500 block">Defects</span>
                          <span className="font-mono font-bold text-red-400">{report.defectsIdentified}</span>
                        </div>
                        <div className="p-2 bg-slate-900 rounded-lg">
                          <span className="text-[10px] text-slate-500 block">Evidence</span>
                          <span className="font-mono font-bold text-blue-400">{report.evidenceCount} Photos</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400">
                        By: <strong className="text-slate-300">{report.inspectorName}</strong>
                      </span>

                      <button
                        onClick={() => setSelectedReportForView(report)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-1.5 text-xs shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Dossier</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 9: TAMPER-PROOF AUDIT LOGS */}
        {/* ============================================================== */}
        {activeTab === 'audit_logs' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-white">Immutable Security Audit Ledger</h3>
                <p className="text-xs text-slate-400">Cryptographically verifiable actions with SHA-256 evidence hashing</p>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                Tamper-Seal Engine: Active
              </span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-slate-950 border border-slate-800/80 p-3 rounded-xl text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-orange-400">{log.action}</span>
                      <span className="text-slate-300 font-semibold">{log.userName}</span>
                      <span className="text-[10px] text-slate-500">({log.userRole})</span>
                    </div>
                    <span className="text-slate-500 font-mono text-[10px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-slate-400 text-[11px]">{log.details}</p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px] font-mono text-slate-500">
                    <span>IP: {log.ipAddress}</span>
                    {log.evidenceHash && (
                      <span className="text-emerald-400 truncate max-w-[250px]">
                        HASH: {log.evidenceHash}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* MODAL 1: INSPECTION DOSSIER & COMPLETE CHECKLIST VIEW */}
      {selectedInspectionForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full text-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">
                  Audit Dossier: {selectedInspectionForDetails.inspectionNumber}
                </h3>
                <p className="text-xs text-slate-400">{selectedInspectionForDetails.siteName}</p>
              </div>
              <button
                onClick={() => setSelectedInspectionForDetails(null)}
                className="text-slate-400 hover:text-white font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Telemetry metadata */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 text-[10px]">Auditor</span>
                  <p className="font-bold text-white">{selectedInspectionForDetails.inspectorName}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Quality Score</span>
                  <p className="font-bold text-emerald-400">{selectedInspectionForDetails.score}%</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Start GPS</span>
                  <p className="font-mono text-blue-400 text-[11px]">
                    {selectedInspectionForDetails.startLatitude?.toFixed(4)}°,{' '}
                    {selectedInspectionForDetails.startLongitude?.toFixed(4)}°
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Geofence Status</span>
                  <p className="text-emerald-400 font-semibold">Verified within authorized boundary</p>
                </div>
              </div>

              {/* Checklist results */}
              <div>
                <span className="font-bold text-white block mb-2">Checklist Questions & Verdicts</span>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedInspectionForDetails.checklists.map((chk) => (
                    <div
                      key={chk.id}
                      className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between"
                    >
                      <div className="max-w-[360px]">
                        <span className="text-[10px] text-slate-500 font-mono block">{chk.category}</span>
                        <p className="text-slate-200 text-xs font-medium">{chk.question}</p>
                        {chk.remarks && (
                          <p className="text-amber-400 text-[10px] mt-0.5">Remark: {chk.remarks}</p>
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          chk.status === 'PASS'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : chk.status === 'FAIL'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {chk.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Photos attached */}
              {selectedInspectionForDetails.evidence.length > 0 && (
                <div>
                  <span className="font-bold text-white block mb-2">Geo-Tagged Evidence Photos</span>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedInspectionForDetails.evidence.map((ev) => (
                      <div key={ev.id} className="rounded-xl overflow-hidden border border-slate-800">
                        <img src={ev.photoUrl} alt="evidence" className="w-full h-32 object-cover" />
                        <div className="p-2 bg-slate-950 font-mono text-[9px] text-emerald-400">
                          SEAL: {ev.sha256Hash.substring(0, 20)}...
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CORRECTIVE ACTION WORKFLOW */}
      {selectedDefectForAction && (
        <CorrectiveActionModal
          defect={selectedDefectForAction}
          supervisorName={currentUser.name}
          onClose={() => setSelectedDefectForAction(null)}
          onAssign={handleAssignAction}
          onVerifyAndClose={handleVerifyAction}
        />
      )}

      {/* MODAL 3: CERTIFIED QUALITY CERTIFICATE PREVIEW */}
      {showCertificateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-orange-600" />
                <div>
                  <h3 className="font-bold text-base text-slate-900">National Infrastructure Audit Certificate</h3>
                  <p className="text-[11px] text-slate-500">Certified by Smart Inspector Platform • SIH 2026</p>
                </div>
              </div>
              <button
                onClick={() => setShowCertificateModal(false)}
                className="text-slate-400 hover:text-slate-800 font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-700">
              <p>
                This certifies that all field audit records, GPS geofencing telemetry, and digital checklists
                conducted on Indian infrastructure sites have met the National Quality Standard.
              </p>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px]">Verified Inspections</span>
                  <p className="font-bold text-slate-900">{inspections.length} Projects</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Quality Compliance</span>
                  <p className="font-bold text-emerald-600">{metrics?.overallQualityScore || 88}% Certified</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Auditing Bureau</span>
                  <p className="font-bold text-slate-900">Infrastructure Vigilance Authority</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Cryptographic Seal</span>
                  <p className="font-mono text-[10px] text-slate-600">SHA256: 4f9b8c2e...</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setShowCertificateModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl"
              >
                Close Preview
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Certificate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CERTIFIED INSPECTION DOSSIER REPORT VIEWER */}
      {selectedReportForView && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full text-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                  {selectedReportForView.reportNumber}
                </span>
                <h3 className="font-bold text-sm text-white mt-1">
                  {selectedReportForView.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReportForView(null)}
                className="text-slate-400 hover:text-white font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-2 bg-slate-900/60 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Overall Score</span>
                  <span className="text-xl font-black font-mono text-emerald-400">
                    {selectedReportForView.overallScore}%
                  </span>
                </div>
                <div className="p-2 bg-slate-900/60 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Defects</span>
                  <span className="text-xl font-black font-mono text-red-400">
                    {selectedReportForView.defectsIdentified}
                  </span>
                </div>
                <div className="p-2 bg-slate-900/60 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Evidence Photos</span>
                  <span className="text-xl font-black font-mono text-blue-400">
                    {selectedReportForView.evidenceCount}
                  </span>
                </div>
                <div className="p-2 bg-slate-900/60 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Status</span>
                  <span
                    className={`text-xs font-bold font-mono mt-1 block ${
                      selectedReportForView.status === 'COMPLIANT'
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {selectedReportForView.status}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
                  <span className="text-slate-400">Infrastructure Site:</span>
                  <span className="font-semibold text-white">{selectedReportForView.siteName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
                  <span className="text-slate-400">Auditing Inspector:</span>
                  <span className="font-semibold text-white">{selectedReportForView.inspectorName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
                  <span className="text-slate-400">Audit Completion Date:</span>
                  <span className="font-mono text-slate-300">{selectedReportForView.completedAt}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
                  <span className="text-slate-400">Geofence Compliance:</span>
                  <span className="text-emerald-400 font-semibold">100% Boundary Verified (Dual GPS)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800 text-slate-300">
                  <span className="text-slate-400">SHA-256 Tamper Hash:</span>
                  <span className="font-mono text-[10px] text-blue-400 truncate max-w-[280px]">
                    {selectedReportForView.sha256Hash}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-950/20 border border-blue-800/40 rounded-xl text-blue-300 text-[11px] leading-relaxed">
                <strong>Certified Digital Audit Record:</strong> This dossier was compiled automatically by the
                Smart Real-Time Monitoring & Inspection Engine with synchronized hardware telemetry, computer vision
                structural checks, and offline sync cryptographic validation.
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedReportForView(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Dossier</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
