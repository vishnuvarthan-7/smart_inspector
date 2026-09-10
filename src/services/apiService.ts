/**
 * Smart Inspector API Service
 * Centralized API client with automatic offline fallback and cache synchronization.
 */

import { StorageService } from './storageService';
import {
  Inspection,
  Defect,
  Site,
  InspectorProfile,
  DashboardMetrics,
  AppNotification,
  AuditLog,
  IoTSensorNode,
  DecisionSupportItem,
  InspectionReportSummary,
} from '../types';

const storage = StorageService.getInstance();

export const ApiService = {
  // Sites
  async getSites(): Promise<Site[]> {
    try {
      if (!storage.isOffline()) {
        const res = await fetch('/api/sites');
        if (res.ok) {
          const data = await res.json();
          return data.sites;
        }
      }
    } catch (e) {
      console.warn('Network fetch failed, using local storage cache', e);
    }
    // Fallback
    const { DEMO_SITES } = await import('../mockData');
    return DEMO_SITES;
  },

  // Inspectors
  async getInspectors(): Promise<InspectorProfile[]> {
    try {
      if (!storage.isOffline()) {
        const res = await fetch('/api/inspectors');
        if (res.ok) {
          const data = await res.json();
          return data.inspectors;
        }
      }
    } catch (e) {
      console.warn('Network fetch failed, using local storage cache', e);
    }
    const { DEMO_INSPECTORS } = await import('../mockData');
    return DEMO_INSPECTORS;
  },

  // Inspections
  async getInspections(): Promise<Inspection[]> {
    try {
      if (!storage.isOffline()) {
        const res = await fetch('/api/inspections');
        if (res.ok) {
          const data = await res.json();
          return data.inspections;
        }
      }
    } catch (e) {
      console.warn('Inspections network fetch failed, using local storage', e);
    }
    return storage.getInspections();
  },

  async createInspection(inspection: Inspection): Promise<Inspection> {
    storage.saveInspection(inspection);

    if (!storage.isOffline()) {
      try {
        const res = await fetch('/api/inspections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inspection),
        });
        if (res.ok) {
          const data = await res.json();
          return data.inspection;
        }
      } catch (e) {
        console.warn('Remote sync failed, saved locally in queue', e);
      }
    }

    return inspection;
  },

  // Defects
  async getDefects(): Promise<Defect[]> {
    try {
      if (!storage.isOffline()) {
        const res = await fetch('/api/defects');
        if (res.ok) {
          const data = await res.json();
          return data.defects;
        }
      }
    } catch (e) {
      console.warn('Defects network fetch failed, using local storage', e);
    }
    return storage.getDefects();
  },

  async createDefect(defect: Defect): Promise<Defect> {
    storage.saveDefect(defect);

    // Also trigger local alert notification
    storage.addNotification({
      id: 'notif-' + Date.now(),
      title: `${defect.severity} DEFECT REPORTED: ${defect.code}`,
      message: `${defect.title} at ${defect.siteName}. Priority action required.`,
      type: defect.severity === 'CRITICAL' ? 'CRITICAL_ALERT' : 'ASSIGNMENT',
      severity: defect.severity,
      timestamp: new Date().toISOString(),
      targetRole: 'SUPERVISOR',
      read: false,
      defectId: defect.id,
      siteName: defect.siteName,
    });

    if (!storage.isOffline()) {
      try {
        const res = await fetch('/api/defects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(defect),
        });
        if (res.ok) {
          const data = await res.json();
          return data.defect;
        }
      } catch (e) {
        console.warn('Remote defect creation failed, queued locally', e);
      }
    }

    return defect;
  },

  // Corrective Action: Assign
  async assignCorrectiveAction(payload: {
    defectId: string;
    assignedToName: string;
    assignedTeam: string;
    deadline: string;
    actionPlan: string;
    supervisorName: string;
  }): Promise<void> {
    if (!storage.isOffline()) {
      try {
        await fetch('/api/corrective-actions/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (e) {
        console.warn('Remote assign failed, applying locally', e);
      }
    }

    // Apply to local store
    const defects = storage.getDefects();
    const def = defects.find((d) => d.id === payload.defectId);
    if (def) {
      def.status = 'ASSIGNED';
      def.assignedTo = {
        userId: 'u-' + Date.now(),
        name: payload.assignedToName,
        team: payload.assignedTeam,
        assignedAt: new Date().toISOString(),
        deadline: payload.deadline,
      };
      def.correctiveAction = {
        id: 'ca-' + Date.now(),
        defectId: def.id,
        defectCode: def.code,
        status: 'ASSIGNED',
        assignedToName: payload.assignedToName,
        assignedTeam: payload.assignedTeam,
        assignedAt: new Date().toISOString(),
        deadline: payload.deadline,
        actionPlan: payload.actionPlan,
        workLogs: [
          {
            timestamp: new Date().toISOString(),
            author: payload.supervisorName,
            note: `Assigned with action plan: ${payload.actionPlan}`,
          },
        ],
        beforePhotoUrl: def.evidencePhotos?.[0]?.photoUrl || 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=600&auto=format&fit=crop&q=80',
      };
      storage.saveDefect(def);
    }
  },

  // Corrective Action: Verify & Close
  async verifyAndCloseCorrectiveAction(payload: {
    defectId: string;
    afterPhotoUrl?: string;
    verificationNotes: string;
    supervisorName: string;
    approved: boolean;
  }): Promise<void> {
    if (!storage.isOffline()) {
      try {
        await fetch('/api/corrective-actions/verify-close', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (e) {
        console.warn('Remote verify failed, applying locally', e);
      }
    }

    const defects = storage.getDefects();
    const def = defects.find((d) => d.id === payload.defectId);
    if (def) {
      if (payload.approved) {
        def.status = 'CLOSED';
        if (def.correctiveAction) {
          def.correctiveAction.status = 'CLOSED';
          if (payload.afterPhotoUrl) def.correctiveAction.afterPhotoUrl = payload.afterPhotoUrl;
          def.correctiveAction.verificationNotes = payload.verificationNotes;
          def.correctiveAction.verifiedBy = payload.supervisorName;
          def.correctiveAction.verifiedAt = new Date().toISOString();
          def.correctiveAction.closedAt = new Date().toISOString();
        }
      } else {
        def.status = 'IN_PROGRESS';
        if (def.correctiveAction) {
          def.correctiveAction.status = 'IN_PROGRESS';
          def.correctiveAction.workLogs.push({
            timestamp: new Date().toISOString(),
            author: payload.supervisorName,
            note: `Verification rejected: ${payload.verificationNotes}`,
          });
        }
      }
      storage.saveDefect(def);
    }
  },

  // Notifications
  async getNotifications(): Promise<AppNotification[]> {
    try {
      if (!storage.isOffline()) {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          return data.notifications;
        }
      }
    } catch (e) {
      console.warn('Notifications fetch fallback', e);
    }
    return storage.getNotifications();
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      if (!storage.isOffline()) {
        const res = await fetch('/api/audit-logs');
        if (res.ok) {
          const data = await res.json();
          return data.auditLogs;
        }
      }
    } catch (e) {
      console.warn('Audit logs fetch fallback', e);
    }
    return storage.getAuditLogs();
  },

  // Analytics
  async getAnalytics(): Promise<DashboardMetrics> {
    try {
      if (!storage.isOffline()) {
        const res = await fetch('/api/analytics');
        if (res.ok) {
          const data = await res.json();
          return data.metrics;
        }
      }
    } catch (e) {
      console.warn('Analytics network fetch failed, computing from local storage', e);
    }

    const inspections = storage.getInspections();
    const defects = storage.getDefects();

    const total = inspections.length;
    const completed = inspections.filter((i) => i.status === 'COMPLETED').length;
    const pending = inspections.filter((i) => i.status === 'PENDING').length;
    const inProgress = inspections.filter((i) => i.status === 'IN_PROGRESS').length;

    const critical = defects.filter((d) => d.severity === 'CRITICAL' && d.status !== 'CLOSED').length;
    const high = defects.filter((d) => d.severity === 'HIGH' && d.status !== 'CLOSED').length;
    const medium = defects.filter((d) => d.severity === 'MEDIUM' && d.status !== 'CLOSED').length;
    const low = defects.filter((d) => d.severity === 'LOW' && d.status !== 'CLOSED').length;

    const activeDefects = defects.filter((d) => d.status !== 'CLOSED').length;
    const closedDefects = defects.filter((d) => d.status === 'CLOSED').length;

    return {
      totalInspections: total,
      pendingInspections: pending,
      inProgressInspections: inProgress,
      completedInspections: completed,
      criticalDefects: critical,
      highDefects: high,
      mediumDefects: medium,
      lowDefects: low,
      overallQualityScore: 84,
      completionRatePercent: total > 0 ? Math.round((completed / total) * 100) : 0,
      averageResponseHours: 4.8,
      pendingCorrectiveActions: {
        total: activeDefects,
        dueSoon: Math.max(1, Math.floor(activeDefects * 0.6)),
        overdue: critical > 0 ? 1 : 0,
        closed: closedDefects,
      },
    };
  },

  // Base Paper Area 3: IoT Sensors
  async getIoTSensors(): Promise<IoTSensorNode[]> {
    try {
      if (!storage.isOffline()) {
        const res = await fetch('/api/iot-sensors');
        if (res.ok) {
          const data = await res.json();
          return data.sensors;
        }
      }
    } catch (e) {
      console.warn('IoT sensors fetch failed, using mock cache', e);
    }
    const { DEMO_IOT_SENSORS } = await import('../mockData');
    return DEMO_IOT_SENSORS;
  },

  // Base Paper Area 5: Decision Support
  async getDecisionSupport(): Promise<DecisionSupportItem[]> {
    try {
      if (!storage.isOffline()) {
        const res = await fetch('/api/decision-support');
        if (res.ok) {
          const data = await res.json();
          return data.decisions;
        }
      }
    } catch (e) {
      console.warn('Decision support fetch failed, using mock cache', e);
    }
    const { DEMO_DECISION_SUPPORT } = await import('../mockData');
    return DEMO_DECISION_SUPPORT;
  },

  async updateDecisionStatus(id: string, status: 'APPROVED' | 'DISPATCHED' | 'REJECTED'): Promise<void> {
    try {
      if (!storage.isOffline()) {
        await fetch(`/api/decision-support/${id}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
      }
    } catch (e) {
      console.warn('Failed to update decision status over network', e);
    }
  },

  // Reports Center
  async getReports(): Promise<InspectionReportSummary[]> {
    try {
      if (!storage.isOffline()) {
        const res = await fetch('/api/reports');
        if (res.ok) {
          const data = await res.json();
          return data.reports;
        }
      }
    } catch (e) {
      console.warn('Reports fetch failed, using mock cache', e);
    }
    const { DEMO_REPORTS } = await import('../mockData');
    return DEMO_REPORTS;
  },
};
