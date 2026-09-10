/**
 * Smart Real-Time Monitoring & Inspection Platform
 * Domain Types & Schemas
 */

export type UserRole = 'INSPECTOR' | 'SUPERVISOR' | 'ADMIN' | 'DIRECTOR';

export type InspectionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FLAGGED';

export type DefectSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type CorrectiveActionStatus = 'DETECTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'PENDING_VERIFICATION' | 'CLOSED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  phone?: string;
  inspectorId?: string;
  department?: string;
}

export interface InspectorProfile {
  id: string;
  inspectorId: string;
  name: string;
  email: string;
  phone: string;
  badgeNumber: string;
  zone: string;
  assignedSiteIds: string[];
  totalInspections: number;
  qualityRating: number;
  currentStatus: 'ON_DUTY' | 'INSPECTING' | 'OFF_DUTY';
  currentLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    lastUpdated: string;
  };
}

export interface Site {
  id: string;
  code: string;
  name: string;
  type: 'INFRASTRUCTURE' | 'HIGHWAY' | 'METRO' | 'ENERGY' | 'WATER';
  locationName: string;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: number;
  supervisorName: string;
  supervisorId: string;
  healthScore: number;
  activeDefectsCount: number;
  criticalDefectsCount: number;
}

export interface ChecklistItem {
  id: string;
  category: string;
  question: string;
  status: 'PASS' | 'FAIL' | 'NA' | 'PENDING';
  remarks?: string;
  isMandatory: boolean;
  requiresPhotoOnFail: boolean;
  evidencePhotoId?: string;
}

export interface InspectionEvidence {
  id: string;
  inspectionId: string;
  checklistId?: string;
  photoUrl: string;
  caption: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  inspectorId: string;
  sha256Hash: string;
  isGeoTagged: boolean;
  type: 'INITIAL_EVIDENCE' | 'DEFECT' | 'BEFORE_CORRECTIVE' | 'AFTER_CORRECTIVE';
}

export interface Defect {
  id: string;
  code: string;
  inspectionId: string;
  siteId: string;
  siteName: string;
  inspectorId: string;
  inspectorName: string;
  title: string;
  description: string;
  severity: DefectSeverity;
  category: 'STRUCTURAL' | 'ELECTRICAL' | 'CIVIL' | 'SAFETY' | 'ENVIRONMENTAL';
  status: CorrectiveActionStatus;
  detectedAt: string;
  slaDeadline: string;
  slaHours: number;
  isEscalated: boolean;
  escalatedTo?: UserRole;
  latitude: number;
  longitude: number;
  evidencePhotos: InspectionEvidence[];
  aiAnalysis?: {
    detectedDefectType: string;
    confidenceScore: number;
    riskScore: number;
    recommendedAction: string;
  };
  assignedTo?: {
    userId: string;
    name: string;
    team: string;
    assignedAt: string;
    deadline: string;
  };
  correctiveAction?: CorrectiveAction;
}

export interface CorrectiveAction {
  id: string;
  defectId: string;
  defectCode: string;
  status: CorrectiveActionStatus;
  assignedToName: string;
  assignedTeam: string;
  assignedAt: string;
  deadline: string;
  actionPlan: string;
  workLogs: {
    timestamp: string;
    author: string;
    note: string;
  }[];
  beforePhotoUrl: string;
  afterPhotoUrl?: string;
  verificationNotes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  closedAt?: string;
}

export interface Inspection {
  id: string;
  inspectionNumber: string;
  siteId: string;
  siteName: string;
  siteCode: string;
  inspectorId: string;
  inspectorName: string;
  status: InspectionStatus;
  startedAt: string;
  completedAt?: string;
  startLatitude: number;
  startLongitude: number;
  endLatitude?: number;
  endLongitude?: number;
  isGeofenceVerified: boolean;
  distanceFromSiteMeters: number;
  checklists: ChecklistItem[];
  defectsCount: number;
  criticalCount: number;
  highCount: number;
  score: number; // 0 - 100
  overallRemarks: string;
  signatureUrl?: string;
  evidence: InspectionEvidence[];
  isSynced: boolean;
  syncTimestamp?: string;
  isDuplicateFlagged?: boolean;
}

export interface GPSLog {
  id: string;
  inspectorId: string;
  siteId?: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  speed?: number;
  heading?: number;
  timestamp: string;
  action: 'CHECK_IN' | 'INSPECTION_START' | 'PHOTO_CAPTURE' | 'DEFECT_LOGGED' | 'INSPECTION_END';
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'CRITICAL_ALERT' | 'ESCALATION' | 'ASSIGNMENT' | 'VERIFICATION_REQUEST' | 'SYNC_COMPLETE';
  severity: DefectSeverity | 'INFO';
  timestamp: string;
  targetRole: UserRole;
  read: boolean;
  defectId?: string;
  inspectionId?: string;
  siteName?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  entityType: 'INSPECTION' | 'DEFECT' | 'EVIDENCE' | 'CORRECTIVE_ACTION' | 'USER';
  entityId: string;
  details: string;
  ipAddress: string;
  evidenceHash?: string;
}

export interface DashboardMetrics {
  totalInspections: number;
  pendingInspections: number;
  inProgressInspections: number;
  completedInspections: number;
  criticalDefects: number;
  highDefects: number;
  mediumDefects: number;
  lowDefects: number;
  overallQualityScore: number;
  completionRatePercent: number;
  averageResponseHours: number;
  pendingCorrectiveActions: {
    total: number;
    dueSoon: number;
    overdue: number;
    closed: number;
  };
}

export interface OfflineSyncQueueItem {
  id: string;
  type: 'CREATE_INSPECTION' | 'REPORT_DEFECT' | 'UPLOAD_EVIDENCE' | 'STATUS_UPDATE';
  timestamp: string;
  data: any;
  status: 'PENDING' | 'SYNCING' | 'SUCCESS' | 'CONFLICT';
  retries: number;
  errorMessage?: string;
}

// Base Paper Area 3: IoT and Real-Time Monitoring
export interface IoTSensorNode {
  id: string;
  siteId: string;
  siteName: string;
  code: string;
  type: 'VIBRATION' | 'STRUCTURAL_TILT' | 'STRAIN_GAUGE' | 'CRACK_DISPLACEMENT' | 'HUMIDITY_CORROSION';
  name: string;
  currentValue: number;
  unit: string;
  thresholdMin: number;
  thresholdMax: number;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL';
  batteryLevel: number;
  lastPing: string;
  history: { timestamp: string; value: number }[];
}

// Base Paper Area 5: Decision Support Systems
export interface DecisionSupportItem {
  id: string;
  siteId: string;
  siteName: string;
  defectId?: string;
  defectCode?: string;
  riskScore: number; // 0 - 100
  urgencyLevel: 'IMMEDIATE' | 'HIGH_PRIORITY' | 'SCHEDULED' | 'MONITOR';
  title: string;
  diagnosis: string;
  recommendedAction: string;
  estimatedCostInINR?: string;
  requiredTeam: string;
  targetSLADays: number;
  status: 'PENDING_DECISION' | 'APPROVED' | 'DISPATCHED' | 'REJECTED';
  rationale: string;
}

// Management Flow: Reports & Download
export interface InspectionReportSummary {
  id: string;
  reportNumber: string;
  title: string;
  siteId: string;
  siteName: string;
  inspectorName: string;
  generatedDate: string;
  inspectionDate: string;
  overallScore: number;
  status: 'COMPLIANT' | 'FLAGGED' | 'NON_COMPLIANT';
  geofenceVerified: boolean;
  gpsCoordinates: { lat: number; lng: number };
  evidenceCount: number;
  criticalDefects: number;
  highDefects: number;
  summaryRemarks: string;
}
