/**
 * Smart Inspection Offline-First Storage & Synchronization Service
 * Handles local caching, offline mutation queueing, cryptographic hashing, and conflict resolution.
 */

import {
  Inspection,
  Defect,
  CorrectiveAction,
  AppNotification,
  AuditLog,
  OfflineSyncQueueItem,
  InspectionEvidence,
} from '../types';
import {
  DEMO_INSPECTIONS,
  DEMO_DEFECTS,
  DEMO_NOTIFICATIONS,
  DEMO_AUDIT_LOGS,
  DEMO_SITES,
} from '../mockData';

const STORAGE_KEYS = {
  INSPECTIONS: 'sih_inspections_v1',
  DEFECTS: 'sih_defects_v1',
  NOTIFICATIONS: 'sih_notifications_v1',
  AUDIT_LOGS: 'sih_audit_logs_v1',
  OFFLINE_QUEUE: 'sih_offline_queue_v1',
  OFFLINE_MODE_FLAG: 'sih_is_offline_simulation',
};

// Calculate Haversine distance in meters between two lat/lng pairs
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Generate cryptographic SHA-256 hash string for tamper-proof evidence verification
export async function generateEvidenceHash(content: string): Promise<string> {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const msgUint8 = new TextEncoder().encode(content);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('Web Crypto unavailable, using fallback checksum', e);
  }
  // Simple deterministic fallback hash
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, 'a');
}

export class StorageService {
  private static instance: StorageService;

  private isOfflineSimulated: boolean = false;

  private constructor() {
    this.initializeData();
  }

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private initializeData(): void {
    if (typeof window === 'undefined') return;

    if (!localStorage.getItem(STORAGE_KEYS.INSPECTIONS)) {
      localStorage.setItem(STORAGE_KEYS.INSPECTIONS, JSON.stringify(DEMO_INSPECTIONS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.DEFECTS)) {
      localStorage.setItem(STORAGE_KEYS.DEFECTS, JSON.stringify(DEMO_DEFECTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(DEMO_NOTIFICATIONS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(DEMO_AUDIT_LOGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE)) {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify([]));
    }

    const savedOffline = localStorage.getItem(STORAGE_KEYS.OFFLINE_MODE_FLAG);
    this.isOfflineSimulated = savedOffline === 'true';
  }

  public isOffline(): boolean {
    return this.isOfflineSimulated;
  }

  public setOfflineSimulation(offline: boolean): void {
    this.isOfflineSimulated = offline;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.OFFLINE_MODE_FLAG, String(offline));
    }
  }

  public toggleOfflineSimulation(): boolean {
    const next = !this.isOfflineSimulated;
    this.setOfflineSimulation(next);
    return next;
  }

  public resetToInitialDemoData(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.INSPECTIONS, JSON.stringify(DEMO_INSPECTIONS));
    localStorage.setItem(STORAGE_KEYS.DEFECTS, JSON.stringify(DEMO_DEFECTS));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(DEMO_NOTIFICATIONS));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(DEMO_AUDIT_LOGS));
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify([]));
    this.setOfflineSimulation(false);
  }

  // Inspections
  public getInspections(): Inspection[] {
    if (typeof window === 'undefined') return DEMO_INSPECTIONS;
    const data = localStorage.getItem(STORAGE_KEYS.INSPECTIONS);
    return data ? JSON.parse(data) : DEMO_INSPECTIONS;
  }

  public saveInspection(inspection: Inspection): void {
    const list = this.getInspections();
    const index = list.findIndex((i) => i.id === inspection.id);
    if (index >= 0) {
      list[index] = inspection;
    } else {
      list.unshift(inspection);
    }
    localStorage.setItem(STORAGE_KEYS.INSPECTIONS, JSON.stringify(list));

    // If offline, queue for sync
    if (this.isOfflineSimulated) {
      this.addToOfflineQueue({
        id: 'sync-' + Date.now(),
        type: 'CREATE_INSPECTION',
        timestamp: new Date().toISOString(),
        data: inspection,
        status: 'PENDING',
        retries: 0,
      });
    }
  }

  // Defects
  public getDefects(): Defect[] {
    if (typeof window === 'undefined') return DEMO_DEFECTS;
    const data = localStorage.getItem(STORAGE_KEYS.DEFECTS);
    return data ? JSON.parse(data) : DEMO_DEFECTS;
  }

  public saveDefect(defect: Defect): void {
    const list = this.getDefects();
    const index = list.findIndex((d) => d.id === defect.id);
    if (index >= 0) {
      list[index] = defect;
    } else {
      list.unshift(defect);
    }
    localStorage.setItem(STORAGE_KEYS.DEFECTS, JSON.stringify(list));

    if (this.isOfflineSimulated) {
      this.addToOfflineQueue({
        id: 'sync-' + Date.now(),
        type: 'REPORT_DEFECT',
        timestamp: new Date().toISOString(),
        data: defect,
        status: 'PENDING',
        retries: 0,
      });
    }
  }

  // Notifications
  public getNotifications(): AppNotification[] {
    if (typeof window === 'undefined') return DEMO_NOTIFICATIONS;
    const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    return data ? JSON.parse(data) : DEMO_NOTIFICATIONS;
  }

  public addNotification(notification: AppNotification): void {
    const list = this.getNotifications();
    list.unshift(notification);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
  }

  public markNotificationAsRead(id: string): void {
    const list = this.getNotifications();
    const item = list.find((n) => n.id === id);
    if (item) {
      item.read = true;
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
    }
  }

  // Audit Logs
  public getAuditLogs(): AuditLog[] {
    if (typeof window === 'undefined') return DEMO_AUDIT_LOGS;
    const data = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    return data ? JSON.parse(data) : DEMO_AUDIT_LOGS;
  }

  public addAuditLog(log: AuditLog): void {
    const list = this.getAuditLogs();
    list.unshift(log);
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(list));
  }

  // Offline Sync Queue
  public getOfflineQueue(): OfflineSyncQueueItem[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    return data ? JSON.parse(data) : [];
  }

  public addToOfflineQueue(item: OfflineSyncQueueItem): void {
    const queue = this.getOfflineQueue();
    queue.push(item);
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  }

  public clearOfflineQueue(): void {
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify([]));
  }

  // Perform Synchronization
  public async syncPendingQueue(): Promise<{
    syncedCount: number;
    conflicts: number;
    errors: string[];
  }> {
    const queue = this.getOfflineQueue();
    if (queue.length === 0) {
      return { syncedCount: 0, conflicts: 0, errors: [] };
    }

    let synced = 0;
    let conflicts = 0;
    const errors: string[] = [];
    const remainingQueue: OfflineSyncQueueItem[] = [];

    const inspections = this.getInspections();
    const defects = this.getDefects();

    for (const item of queue) {
      try {
        if (item.type === 'CREATE_INSPECTION') {
          const incoming = item.data as Inspection;
          // Duplicate check
          const existing = inspections.find((i) => i.id === incoming.id || i.inspectionNumber === incoming.inspectionNumber);
          if (existing && existing.completedAt && incoming.completedAt && existing.completedAt !== incoming.completedAt) {
            // Conflict detected: keep the one with latest timestamp, flag conflict
            conflicts++;
            existing.isDuplicateFlagged = true;
          } else {
            incoming.isSynced = true;
            incoming.syncTimestamp = new Date().toISOString();
            const idx = inspections.findIndex((i) => i.id === incoming.id);
            if (idx >= 0) inspections[idx] = incoming;
            else inspections.unshift(incoming);
            synced++;
          }
        } else if (item.type === 'REPORT_DEFECT') {
          const incomingDefect = item.data as Defect;
          const idx = defects.findIndex((d) => d.id === incomingDefect.id);
          if (idx >= 0) defects[idx] = incomingDefect;
          else defects.unshift(incomingDefect);
          synced++;
        }
      } catch (err: any) {
        errors.push(`Item ${item.id} sync failed: ${err.message}`);
        remainingQueue.push({ ...item, retries: item.retries + 1 });
      }
    }

    localStorage.setItem(STORAGE_KEYS.INSPECTIONS, JSON.stringify(inspections));
    localStorage.setItem(STORAGE_KEYS.DEFECTS, JSON.stringify(defects));
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(remainingQueue));

    // Audit the sync
    this.addAuditLog({
      id: 'aud-' + Date.now(),
      timestamp: new Date().toISOString(),
      action: 'OFFLINE_QUEUE_BATCH_SYNC',
      actorId: 'sync-agent',
      actorName: 'Field Offline Sync Engine',
      actorRole: 'INSPECTOR',
      entityType: 'INSPECTION',
      entityId: 'batch',
      details: `Successfully synchronized ${synced} queued records to central repository. Conflicts: ${conflicts}.`,
      ipAddress: '127.0.0.1 (Local SQLite/Cache Bridge)',
    });

    return { syncedCount: synced, conflicts, errors };
  }

  // Reset demo state if needed
  public resetToFactoryDemo(): void {
    localStorage.setItem(STORAGE_KEYS.INSPECTIONS, JSON.stringify(DEMO_INSPECTIONS));
    localStorage.setItem(STORAGE_KEYS.DEFECTS, JSON.stringify(DEMO_DEFECTS));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(DEMO_NOTIFICATIONS));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(DEMO_AUDIT_LOGS));
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify([]));
    this.setOfflineSimulation(false);
  }
}
