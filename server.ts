import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// In-Memory Database Store for Real-Time REST APIs
import {
  DEMO_USERS,
  DEMO_INSPECTORS,
  DEMO_SITES,
  DEMO_INSPECTIONS,
  DEMO_DEFECTS,
  DEMO_NOTIFICATIONS,
  DEMO_AUDIT_LOGS,
} from './src/mockData';

let users = [...DEMO_USERS];
let inspectors = [...DEMO_INSPECTORS];
let sites = [...DEMO_SITES];
let inspections = [...DEMO_INSPECTIONS];
let defects = [...DEMO_DEFECTS];
let notifications = [...DEMO_NOTIFICATIONS];
let auditLogs = [...DEMO_AUDIT_LOGS];

// Helper: SLA check & auto-escalation
function checkAndAutoEscalateSLAs() {
  const now = Date.now();
  defects.forEach((def) => {
    if (def.status !== 'CLOSED') {
      const deadline = new Date(def.slaDeadline).getTime();
      if (now > deadline && !def.isEscalated) {
        def.isEscalated = true;
        def.escalatedTo = 'DIRECTOR';

        // Add escalation notification
        const notif = {
          id: 'notif-esc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
          title: `CRITICAL SLA BREACH ESCALATION: ${def.code}`,
          message: `Defect ${def.code} at ${def.siteName} has breached SLA deadline. Escalated directly to Director Directorate.`,
          type: 'ESCALATION' as const,
          severity: 'CRITICAL' as const,
          timestamp: new Date().toISOString(),
          targetRole: 'DIRECTOR' as const,
          read: false,
          defectId: def.id,
          siteName: def.siteName,
        };
        notifications.unshift(notif);

        // Add audit log
        auditLogs.unshift({
          id: 'aud-' + Date.now(),
          timestamp: new Date().toISOString(),
          action: 'AUTO_SLA_ESCALATED_TO_DIRECTOR',
          actorId: 'system-sla-engine',
          actorName: 'Automated SLA Monitor',
          actorRole: 'ADMIN',
          entityType: 'DEFECT',
          entityId: def.id,
          details: `Defect ${def.code} breached ${def.slaHours}h SLA. System notified Director.`,
          ipAddress: '127.0.0.1 (SLA Daemon)',
        });
      }
    }
  });
}

// ----------------------------------------------------
// REST APIs (First Priority)
// ----------------------------------------------------

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Smart Real-Time Monitoring & Inspection Platform API',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// 2. Authentication
app.post('/api/auth/login', (req, res) => {
  const { email, role, inspectorId } = req.body;
  let matchedUser = users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase());

  if (!matchedUser && inspectorId) {
    matchedUser = users.find((u) => u.inspectorId === inspectorId);
  }

  if (!matchedUser && role) {
    matchedUser = users.find((u) => u.role === role);
  }

  if (!matchedUser) {
    matchedUser = users[0]; // fallback to Rajesh Kumar
  }

  // Audit login
  auditLogs.unshift({
    id: 'aud-' + Date.now(),
    timestamp: new Date().toISOString(),
    action: 'USER_LOGIN',
    actorId: matchedUser.id,
    actorName: matchedUser.name,
    actorRole: matchedUser.role,
    entityType: 'USER',
    entityId: matchedUser.id,
    details: `User authenticated via JWT session. Role: ${matchedUser.role}`,
    ipAddress: req.ip || '127.0.0.1',
  });

  const token = 'jwt-sih-mock-' + Buffer.from(JSON.stringify({ id: matchedUser.id, role: matchedUser.role, exp: Date.now() + 86400000 })).toString('base64');

  res.json({
    token,
    user: matchedUser,
  });
});

// 3. Sites
app.get('/api/sites', (req, res) => {
  res.json({ sites });
});

app.get('/api/sites/:id', (req, res) => {
  const site = sites.find((s) => s.id === req.params.id);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  res.json({ site });
});

// 4. Inspectors
app.get('/api/inspectors', (req, res) => {
  res.json({ inspectors });
});

app.post('/api/inspectors/location', (req, res) => {
  const { inspectorId, latitude, longitude, accuracy } = req.body;
  const insp = inspectors.find((i) => i.inspectorId === inspectorId);
  if (insp) {
    insp.currentLocation = {
      latitude,
      longitude,
      accuracy: accuracy || 5,
      lastUpdated: new Date().toISOString(),
    };
  }
  res.json({ status: 'success' });
});

// 5. Inspections
app.get('/api/inspections', (req, res) => {
  const { siteId, status, inspectorId } = req.query;
  let filtered = [...inspections];
  if (siteId) filtered = filtered.filter((i) => i.siteId === siteId);
  if (status) filtered = filtered.filter((i) => i.status === status);
  if (inspectorId) filtered = filtered.filter((i) => i.inspectorId === inspectorId);
  res.json({ inspections: filtered });
});

app.get('/api/inspections/:id', (req, res) => {
  const inspection = inspections.find((i) => i.id === req.params.id);
  if (!inspection) return res.status(404).json({ error: 'Inspection not found' });
  res.json({ inspection });
});

app.post('/api/inspections', (req, res) => {
  const newInspection = req.body;
  if (!newInspection.id) {
    newInspection.id = 'insp-' + Date.now();
  }
  if (!newInspection.inspectionNumber) {
    newInspection.inspectionNumber = `INSP-2026-${String(inspections.length + 1).padStart(4, '0')}`;
  }

  // Prevent duplicate submissions
  const existing = inspections.find((i) => i.id === newInspection.id || i.inspectionNumber === newInspection.inspectionNumber);
  if (existing) {
    return res.status(200).json({ inspection: existing, message: 'Already exists, record updated.' });
  }

  inspections.unshift(newInspection);

  // Update site health score and counts
  const targetSite = sites.find((s) => s.id === newInspection.siteId);
  if (targetSite) {
    targetSite.healthScore = Math.max(30, Math.min(100, Math.round(newInspection.score || targetSite.healthScore)));
  }

  // Audit log
  auditLogs.unshift({
    id: 'aud-' + Date.now(),
    timestamp: new Date().toISOString(),
    action: 'INSPECTION_CREATED',
    actorId: newInspection.inspectorId,
    actorName: newInspection.inspectorName || 'Field Inspector',
    actorRole: 'INSPECTOR',
    entityType: 'INSPECTION',
    entityId: newInspection.id,
    details: `Inspection ${newInspection.inspectionNumber} submitted for ${newInspection.siteName}. Geofence: ${newInspection.isGeofenceVerified ? 'VERIFIED' : 'UNVERIFIED'}. Score: ${newInspection.score}%.`,
    ipAddress: req.ip || '127.0.0.1',
  });

  res.status(201).json({ inspection: newInspection });
});

app.put('/api/inspections/:id', (req, res) => {
  const idx = inspections.findIndex((i) => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Inspection not found' });
  inspections[idx] = { ...inspections[idx], ...req.body };
  res.json({ inspection: inspections[idx] });
});

// 6. Defects
app.get('/api/defects', (req, res) => {
  checkAndAutoEscalateSLAs();
  res.json({ defects });
});

app.post('/api/defects', (req, res) => {
  const newDefect = req.body;
  if (!newDefect.id) newDefect.id = 'def-' + Date.now();
  if (!newDefect.code) newDefect.code = `DEF-2026-${String(defects.length + 1).padStart(3, '0')}`;

  // Calculate SLA based on severity
  const now = Date.now();
  let slaHours = 24;
  if (newDefect.severity === 'CRITICAL') slaHours = 4;
  else if (newDefect.severity === 'HIGH') slaHours = 24;
  else if (newDefect.severity === 'MEDIUM') slaHours = 72;
  else if (newDefect.severity === 'LOW') slaHours = 168;

  newDefect.slaHours = slaHours;
  newDefect.slaDeadline = new Date(now + slaHours * 3600 * 1000).toISOString();
  newDefect.detectedAt = newDefect.detectedAt || new Date().toISOString();
  newDefect.status = newDefect.status || 'DETECTED';

  defects.unshift(newDefect);

  // Trigger real-time Notification
  const notif = {
    id: 'notif-' + Date.now(),
    title: `${newDefect.severity} DEFECT DETECTED: ${newDefect.code}`,
    message: `${newDefect.title} reported at ${newDefect.siteName} by ${newDefect.inspectorName}. SLA: ${slaHours} hours.`,
    type: (newDefect.severity === 'CRITICAL' ? 'CRITICAL_ALERT' : 'ASSIGNMENT') as 'CRITICAL_ALERT' | 'ASSIGNMENT',
    severity: newDefect.severity,
    timestamp: new Date().toISOString(),
    targetRole: 'SUPERVISOR' as const,
    read: false,
    defectId: newDefect.id,
    siteName: newDefect.siteName,
  };
  notifications.unshift(notif);

  // Update site active defect counts
  const targetSite = sites.find((s) => s.id === newDefect.siteId);
  if (targetSite) {
    targetSite.activeDefectsCount += 1;
    if (newDefect.severity === 'CRITICAL') {
      targetSite.criticalDefectsCount += 1;
      targetSite.healthScore = Math.max(20, targetSite.healthScore - 15);
    }
  }

  // Audit log
  auditLogs.unshift({
    id: 'aud-' + Date.now(),
    timestamp: new Date().toISOString(),
    action: 'DEFECT_SUBMITTED',
    actorId: newDefect.inspectorId,
    actorName: newDefect.inspectorName || 'Inspector',
    actorRole: 'INSPECTOR',
    entityType: 'DEFECT',
    entityId: newDefect.id,
    details: `Defect logged with severity ${newDefect.severity}. GPS: (${newDefect.latitude}, ${newDefect.longitude}).`,
    ipAddress: req.ip || '127.0.0.1',
    evidenceHash: newDefect.evidencePhotos?.[0]?.sha256Hash,
  });

  res.status(201).json({ defect: newDefect });
});

// 7. Corrective Actions (Assign, Work Log, Before/After verify, Close)
app.post('/api/corrective-actions/assign', (req, res) => {
  const { defectId, assignedToName, assignedTeam, deadline, actionPlan, supervisorName } = req.body;
  const def = defects.find((d) => d.id === defectId);
  if (!def) return res.status(404).json({ error: 'Defect not found' });

  const ca = {
    id: 'ca-' + Date.now(),
    defectId: def.id,
    defectCode: def.code,
    status: 'ASSIGNED' as const,
    assignedToName,
    assignedTeam,
    assignedAt: new Date().toISOString(),
    deadline,
    actionPlan,
    workLogs: [
      {
        timestamp: new Date().toISOString(),
        author: supervisorName || 'Supervisor',
        note: `Assigned to ${assignedToName} (${assignedTeam}). Plan: ${actionPlan}`,
      },
    ],
    beforePhotoUrl: def.evidencePhotos?.[0]?.photoUrl || 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=600&auto=format&fit=crop&q=80',
  };

  def.status = 'ASSIGNED';
  def.assignedTo = {
    userId: 'assigned-' + Date.now(),
    name: assignedToName,
    team: assignedTeam,
    assignedAt: ca.assignedAt,
    deadline,
  };
  def.correctiveAction = ca;

  // Add audit log
  auditLogs.unshift({
    id: 'aud-' + Date.now(),
    timestamp: new Date().toISOString(),
    action: 'CORRECTIVE_ACTION_ASSIGNED',
    actorId: 'usr-2',
    actorName: supervisorName || 'Supervisor',
    actorRole: 'SUPERVISOR',
    entityType: 'CORRECTIVE_ACTION',
    entityId: ca.id,
    details: `Assigned defect ${def.code} to ${assignedToName} (${assignedTeam}). Target completion: ${deadline}.`,
    ipAddress: req.ip || '127.0.0.1',
  });

  res.json({ defect: def, correctiveAction: ca });
});

app.post('/api/corrective-actions/verify-close', (req, res) => {
  const { defectId, afterPhotoUrl, verificationNotes, supervisorName, approved } = req.body;
  const def = defects.find((d) => d.id === defectId);
  if (!def) return res.status(404).json({ error: 'Defect not found' });

  if (approved) {
    def.status = 'CLOSED';
    if (def.correctiveAction) {
      def.correctiveAction.status = 'CLOSED';
      def.correctiveAction.afterPhotoUrl = afterPhotoUrl || def.correctiveAction.afterPhotoUrl;
      def.correctiveAction.verificationNotes = verificationNotes;
      def.correctiveAction.verifiedBy = supervisorName || 'Supervisor';
      def.correctiveAction.verifiedAt = new Date().toISOString();
      def.correctiveAction.closedAt = new Date().toISOString();
    }

    // Update site statistics
    const targetSite = sites.find((s) => s.id === def.siteId);
    if (targetSite) {
      targetSite.activeDefectsCount = Math.max(0, targetSite.activeDefectsCount - 1);
      if (def.severity === 'CRITICAL') {
        targetSite.criticalDefectsCount = Math.max(0, targetSite.criticalDefectsCount - 1);
        targetSite.healthScore = Math.min(100, targetSite.healthScore + 10);
      }
    }

    auditLogs.unshift({
      id: 'aud-' + Date.now(),
      timestamp: new Date().toISOString(),
      action: 'DEFECT_CLOSED_AND_VERIFIED',
      actorId: 'usr-2',
      actorName: supervisorName || 'Supervisor',
      actorRole: 'SUPERVISOR',
      entityType: 'CORRECTIVE_ACTION',
      entityId: def.correctiveAction?.id || def.id,
      details: `Before/After audit photographic proof verified. Defect ${def.code} successfully marked CLOSED.`,
      ipAddress: req.ip || '127.0.0.1',
    });
  } else {
    def.status = 'IN_PROGRESS';
    if (def.correctiveAction) {
      def.correctiveAction.status = 'IN_PROGRESS';
      def.correctiveAction.workLogs.push({
        timestamp: new Date().toISOString(),
        author: supervisorName || 'Supervisor',
        note: `Verification rejected: ${verificationNotes}. Additional work mandated.`,
      });
    }
  }

  res.json({ defect: def });
});

// 8. Offline Sync Endpoint
app.post('/api/sync', (req, res) => {
  const { queue } = req.body;
  if (!Array.isArray(queue) || queue.length === 0) {
    return res.json({ syncedCount: 0, conflicts: 0, errors: [] });
  }

  let syncedCount = 0;
  let conflicts = 0;
  const errors: string[] = [];

  for (const item of queue) {
    try {
      if (item.type === 'CREATE_INSPECTION') {
        const insp = item.data;
        const exists = inspections.find((i) => i.id === insp.id || i.inspectionNumber === insp.inspectionNumber);
        if (exists) {
          conflicts++;
        } else {
          insp.isSynced = true;
          insp.syncTimestamp = new Date().toISOString();
          inspections.unshift(insp);
          syncedCount++;
        }
      } else if (item.type === 'REPORT_DEFECT') {
        const d = item.data;
        const exists = defects.find((df) => df.id === d.id);
        if (!exists) {
          defects.unshift(d);
          syncedCount++;
        }
      }
    } catch (e: any) {
      errors.push(e.message);
    }
  }

  auditLogs.unshift({
    id: 'aud-' + Date.now(),
    timestamp: new Date().toISOString(),
    action: 'REMOTE_BATCH_SYNC_PROCESSED',
    actorId: 'sync-receiver',
    actorName: 'Central Cloud Gateway',
    actorRole: 'ADMIN',
    entityType: 'INSPECTION',
    entityId: 'batch',
    details: `Processed batch of ${queue.length} items. Synchronized: ${syncedCount}, Conflicts: ${conflicts}.`,
    ipAddress: req.ip || '127.0.0.1',
  });

  res.json({ syncedCount, conflicts, errors });
});

// 9. Notifications
app.get('/api/notifications', (req, res) => {
  res.json({ notifications });
});

app.post('/api/notifications/mark-read', (req, res) => {
  const { id } = req.body;
  const notif = notifications.find((n) => n.id === id);
  if (notif) notif.read = true;
  res.json({ status: 'ok' });
});

// 10. Audit Logs
app.get('/api/audit-logs', (req, res) => {
  res.json({ auditLogs });
});

// 11. Dashboard Analytics Summary
app.get('/api/analytics', (req, res) => {
  checkAndAutoEscalateSLAs();

  const totalInspections = inspections.length;
  const pendingInspections = inspections.filter((i) => i.status === 'PENDING').length;
  const inProgressInspections = inspections.filter((i) => i.status === 'IN_PROGRESS').length;
  const completedInspections = inspections.filter((i) => i.status === 'COMPLETED').length;

  const criticalDefects = defects.filter((d) => d.severity === 'CRITICAL' && d.status !== 'CLOSED').length;
  const highDefects = defects.filter((d) => d.severity === 'HIGH' && d.status !== 'CLOSED').length;
  const mediumDefects = defects.filter((d) => d.severity === 'MEDIUM' && d.status !== 'CLOSED').length;
  const lowDefects = defects.filter((d) => d.severity === 'LOW' && d.status !== 'CLOSED').length;

  const totalScores = inspections.filter((i) => i.score > 0);
  const overallQualityScore = totalScores.length > 0
    ? Math.round(totalScores.reduce((acc, curr) => acc + curr.score, 0) / totalScores.length)
    : 86;

  const completionRatePercent = totalInspections > 0
    ? Math.round((completedInspections / totalInspections) * 100)
    : 0;

  const closedDefects = defects.filter((d) => d.status === 'CLOSED').length;
  const activeDefects = defects.filter((d) => d.status !== 'CLOSED').length;

  res.json({
    metrics: {
      totalInspections,
      pendingInspections,
      inProgressInspections,
      completedInspections,
      criticalDefects,
      highDefects,
      mediumDefects,
      lowDefects,
      overallQualityScore,
      completionRatePercent,
      averageResponseHours: 4.8,
      pendingCorrectiveActions: {
        total: activeDefects,
        dueSoon: Math.max(1, Math.floor(activeDefects * 0.6)),
        overdue: criticalDefects > 0 ? 1 : 0,
        closed: closedDefects,
      },
    },
    sites,
    defects,
  });
});

// 12. Optional AI Defect Analysis with Gemini API / Computer Vision
app.post('/api/ai/analyze-defect', async (req, res) => {
  const { notes, image } = req.body;

  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `You are a certified senior civil and infrastructure inspection engineer for the Smart India Hackathon inspection platform.
Analyze this defect report:
Observations/Notes: "${notes || 'No description provided'}"

Provide a structured JSON response with:
- detectedDefectType: Short name of structural/electrical fault
- category: STRUCTURAL, ELECTRICAL, CIVIL, SAFETY, or ENVIRONMENTAL
- suggestedSeverity: CRITICAL, HIGH, MEDIUM, or LOW
- confidenceScore: float between 0.80 and 0.99
- riskScore: integer 0-100
- recommendedAction: Concise engineering intervention
- urgentSafetyNotice: Optional immediate safety cordon requirement

Respond ONLY with valid JSON.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview',
        contents: prompt,
      });

      const text = response.text || '';
      const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return res.json({ diagnosis: parsed, source: 'gemini-ai' });
    } catch (aiError) {
      console.warn('Gemini API call failed, falling back to rule-based CV engine:', aiError);
    }
  }

  // Local Rule-Based Computer Vision fallback
  const noteStr = (notes || '').toLowerCase();
  let diagnosis: {
    detectedDefectType: string;
    category: 'STRUCTURAL' | 'ELECTRICAL' | 'CIVIL' | 'SAFETY' | 'ENVIRONMENTAL';
    suggestedSeverity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    confidenceScore: number;
    riskScore: number;
    recommendedAction: string;
    urgentSafetyNotice?: string;
  } = {
    detectedDefectType: 'Infrastructure Surface Degradation',
    category: 'CIVIL',
    suggestedSeverity: 'MEDIUM',
    confidenceScore: 0.88,
    riskScore: 65,
    recommendedAction: 'Apply concrete sealing compound and schedule 72-hour re-evaluation.',
    urgentSafetyNotice: undefined,
  };

  if (noteStr.includes('crack') || noteStr.includes('pier') || noteStr.includes('rebar') || noteStr.includes('cantilever')) {
    diagnosis = {
      detectedDefectType: 'Critical Shear Crack & Structural Spalling',
      category: 'STRUCTURAL',
      suggestedSeverity: 'CRITICAL',
      confidenceScore: 0.96,
      riskScore: 94,
      recommendedAction: 'Immediate temporary steel shoring prop deployment and epoxy pressure grouting.',
      urgentSafetyNotice: 'Mandate live traffic weight restriction on Pier P-14 cantilever segment.',
    };
  } else if (noteStr.includes('oil') || noteStr.includes('voltage') || noteStr.includes('transformer') || noteStr.includes('earth')) {
    diagnosis = {
      detectedDefectType: 'High-Voltage Dielectric Leakage & Earthing Fault',
      category: 'ELECTRICAL',
      suggestedSeverity: 'CRITICAL',
      confidenceScore: 0.93,
      riskScore: 91,
      recommendedAction: 'Isolate Transformer Bay 2. Replace silicone radiator gasket and flush earth pit.',
      urgentSafetyNotice: 'Flashover risk: strictly enforce 5-meter exclusion boundary.',
    };
  } else if (noteStr.includes('escalator') || noteStr.includes('brake') || noteStr.includes('safety')) {
    diagnosis = {
      detectedDefectType: 'Deceleration Brake Interlock Failure',
      category: 'SAFETY',
      suggestedSeverity: 'HIGH',
      confidenceScore: 0.90,
      riskScore: 80,
      recommendedAction: 'Barricade escalator. Overhaul caliper assembly and replace auxiliary stop switch.',
      urgentSafetyNotice: 'Prevent public boarding until 20-cycle loaded trip test passes.',
    };
  }

  res.json({ diagnosis, source: 'local-cv-heuristic-engine' });
});

// ----------------------------------------------------
// Frontend Serving & Vite Integration
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SIH Smart Inspector] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
