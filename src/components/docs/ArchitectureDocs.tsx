import React, { useState } from 'react';
import {
  Database,
  Server,
  Smartphone,
  ShieldCheck,
  Cpu,
  Layers,
  Code2,
  FileText,
  Award,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';

export const ArchitectureDocs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'schema' | 'apis' | 'pitch'>('architecture');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const POSTGRES_SCHEMA = `-- ==========================================================
-- SMART INSPECTOR PLATFORM - POSTGRESQL PRODUCTION DDL
-- Smart India Hackathon 2026 Reference Implementation
-- ==========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('INSPECTOR', 'SUPERVISOR', 'ADMIN', 'DIRECTOR')),
    inspector_id VARCHAR(50) UNIQUE,
    phone VARCHAR(20),
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. SITES TABLE
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    geofence_radius_meters INTEGER NOT NULL DEFAULT 300,
    health_score INTEGER DEFAULT 85 CHECK (health_score BETWEEN 0 AND 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. INSPECTIONS TABLE
CREATE TABLE inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_number VARCHAR(100) UNIQUE NOT NULL,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    inspector_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(50) NOT NULL CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    start_latitude DECIMAL(10, 8) NOT NULL,
    start_longitude DECIMAL(11, 8) NOT NULL,
    end_latitude DECIMAL(10, 8),
    end_longitude DECIMAL(11, 8),
    is_geofence_verified BOOLEAN DEFAULT FALSE,
    score INTEGER CHECK (score BETWEEN 0 AND 100),
    overall_remarks TEXT,
    signature_url TEXT,
    is_synced BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. CHECKLIST_ITEMS TABLE
CREATE TABLE checklist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    question TEXT NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PASS', 'FAIL', 'NA')),
    remarks TEXT,
    is_mandatory BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. EVIDENCE_PHOTOS TABLE
CREATE TABLE evidence_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    defect_id UUID,
    photo_url TEXT NOT NULL,
    caption TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    sha256_hash VARCHAR(64) NOT NULL,
    is_geo_tagged BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. DEFECTS TABLE
CREATE TABLE defects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    inspection_id UUID REFERENCES inspections(id) ON DELETE SET NULL,
    site_id UUID NOT NULL REFERENCES sites(id),
    inspector_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('DETECTED', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_VERIFICATION', 'CLOSED')),
    sla_hours INTEGER NOT NULL,
    sla_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    is_escalated BOOLEAN DEFAULT FALSE,
    escalated_to VARCHAR(50),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. CORRECTIVE_ACTIONS TABLE
CREATE TABLE corrective_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    defect_id UUID UNIQUE NOT NULL REFERENCES defects(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    assigned_to_name VARCHAR(255) NOT NULL,
    assigned_team VARCHAR(255) NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    action_plan TEXT NOT NULL,
    before_photo_url TEXT,
    after_photo_url TEXT,
    verification_notes TEXT,
    verified_by VARCHAR(255),
    verified_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE
);

-- 8. AUDIT_LOGS TABLE
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    ip_address VARCHAR(50) NOT NULL,
    evidence_hash VARCHAR(64),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR HIGH-THROUGHPUT REAL-TIME RETRIEVAL
CREATE INDEX idx_inspections_site_id ON inspections(site_id);
CREATE INDEX idx_inspections_inspector_id ON inspections(inspector_id);
CREATE INDEX idx_defects_site_id ON defects(site_id);
CREATE INDEX idx_defects_severity ON defects(severity);
CREATE INDEX idx_defects_status ON defects(status);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 text-slate-100 space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
              SIH 2026 Reference Architecture
            </span>
            <span className="text-xs text-slate-400">Software Edition 2.4</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white">Project Blueprint, Schemas & Pitch</h2>
          <p className="text-xs text-slate-400 mt-1">
            Complete technical specification prepared for Smart India Hackathon jury evaluation.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
          {[
            { id: 'architecture', label: 'System Architecture', icon: Layers },
            { id: 'schema', label: 'PostgreSQL DDL', icon: Database },
            { id: 'apis', label: 'REST API Specs', icon: Server },
            { id: 'pitch', label: 'SIH Presentation', icon: Award },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold transition-all ${
                  isActive ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: SYSTEM ARCHITECTURE */}
      {activeTab === 'architecture' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Layer 1 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-blue-400">
                <Smartphone className="w-5 h-5" />
                <h3 className="font-bold text-sm text-white">1. Mobile Client Layer</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Offline-first client built for rugged field inspection. Captures GPS start/end anchors,
                validates 300m site geofences, stamps cryptographic SHA-256 watermarks onto photo pixels,
                and stores queued records in encrypted local memory until connectivity resumes.
              </p>
              <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-800 space-y-1">
                <div>• Hardware GPS Telemetry (±3.2m accuracy)</div>
                <div>• Offline Sync Engine & Conflict Resolver</div>
                <div>• Biometric & Badge ID Authentication</div>
              </div>
            </div>

            {/* Layer 2 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-orange-400">
                <Server className="w-5 h-5" />
                <h3 className="font-bold text-sm text-white">2. Backend & SLA Engine</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Node.js & Express RESTful API microservice. Manages real-time data ingestion, executes
                the 5-stage corrective action lifecycle (Detect → Assign → Prioritize → Track → Verify),
                and automatically escalates critical SLA breaches to the Directorate.
              </p>
              <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-800 space-y-1">
                <div>• Auto SLA Escalation Countdown Engine</div>
                <div>• Tamper-Proof Audit Logging Stream</div>
                <div>• JWT Role-Based Access Control (RBAC)</div>
              </div>
            </div>

            {/* Layer 3 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-purple-400">
                <Cpu className="w-5 h-5" />
                <h3 className="font-bold text-sm text-white">3. AI Computer Vision Layer</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Integrated Google Gemini 2.5 Flash neural vision models with a deterministic heuristic
                fallback. Analyzes evidence photos to classify structural anomalies (shear cracks, spalling,
                rebar corrosion) and outputs recommended engineering remediations.
              </p>
              <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-800 space-y-1">
                <div>• Defect Severity Auto-Classification</div>
                <div>• Risk Index & Safety Hazard Warning</div>
                <div>• Predictive Remediation Directives</div>
              </div>
            </div>

          </div>

          {/* Verification Protocol Diagram */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="font-bold text-sm text-white">Anti-Fraud Field Verification Flow</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-orange-400 text-[10px]">STAGE 1</span>
                <h4 className="font-bold text-white">Geofence Check</h4>
                <p className="text-slate-400 text-[11px]">Inspector distance calculated via Haversine against site origin.</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-blue-400 text-[10px]">STAGE 2</span>
                <h4 className="font-bold text-white">Digital Checklist</h4>
                <p className="text-slate-400 text-[11px]">Mandatory fields enforced. Failed items require remarks & evidence.</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-purple-400 text-[10px]">STAGE 3</span>
                <h4 className="font-bold text-white">Canvas Watermark</h4>
                <p className="text-slate-400 text-[11px]">Pixel-level burn of Lat/Lng, inspector ID, UTC time & SHA-256 seal.</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-emerald-400 text-[10px]">STAGE 4</span>
                <h4 className="font-bold text-white">AI Vision Analysis</h4>
                <p className="text-slate-400 text-[11px]">Automatic severity recommendation & risk score assignment.</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="font-bold text-amber-400 text-[10px]">STAGE 5</span>
                <h4 className="font-bold text-white">Dual Verification</h4>
                <p className="text-slate-400 text-[11px]">Supervisor approves closure using interactive Before/After slider.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: POSTGRESQL SCHEMA */}
      {activeTab === 'schema' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white">Complete PostgreSQL Production DDL</h3>
              <p className="text-xs text-slate-400">All 8 relational tables with constraints and foreign keys</p>
            </div>
            <button
              onClick={() => handleCopy(POSTGRES_SCHEMA, 'schema')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700"
            >
              {copiedSection === 'schema' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSection === 'schema' ? 'Copied!' : 'Copy SQL'}</span>
            </button>
          </div>

          <pre className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-xs font-mono text-emerald-400 overflow-x-auto max-h-[500px]">
            {POSTGRES_SCHEMA}
          </pre>
        </div>
      )}

      {/* TAB 3: REST API ENDPOINTS */}
      {activeTab === 'apis' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 className="font-bold text-sm text-white">Central Backend REST API Endpoints</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="pb-3 px-3">Method</th>
                  <th className="pb-3 px-3">Endpoint Route</th>
                  <th className="pb-3 px-3">Description</th>
                  <th className="pb-3 px-3">Auth / Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {[
                  { m: 'POST', r: '/api/auth/login', d: 'Inspector / Supervisor JWT authentication', a: 'Public' },
                  { m: 'GET', r: '/api/sites', d: 'List all infrastructure sites & geofence metadata', a: 'All Users' },
                  { m: 'GET', r: '/api/inspections', d: 'Fetch all certified audits with evidence', a: 'All Users' },
                  { m: 'POST', r: '/api/inspections', d: 'Submit new inspection with dual GPS & checklist', a: 'INSPECTOR' },
                  { m: 'GET', r: '/api/defects', d: 'Fetch defect queue with active SLA status', a: 'All Users' },
                  { m: 'POST', r: '/api/defects', d: 'Report new defect with severity & AI diagnosis', a: 'INSPECTOR' },
                  { m: 'POST', r: '/api/corrective-actions/assign', d: 'Assign lead engineer & deadline', a: 'SUPERVISOR' },
                  { m: 'POST', r: '/api/corrective-actions/verify-close', d: 'Verify Before/After photo & close', a: 'SUPERVISOR' },
                  { m: 'POST', r: '/api/sync', d: 'Batch offline mutations sync & conflict check', a: 'INSPECTOR' },
                  { m: 'GET', r: '/api/analytics', d: 'Executive quality metrics & defect density', a: 'SUPERVISOR / ADMIN' },
                  { m: 'GET', r: '/api/audit-logs', d: 'Cryptographically sealed activity stream', a: 'DIRECTOR / ADMIN' },
                ].map((ep, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ep.m === 'GET' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {ep.m}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-white font-bold">{ep.r}</td>
                    <td className="py-2.5 px-3 text-slate-300 font-sans">{ep.d}</td>
                    <td className="py-2.5 px-3 text-orange-400">{ep.a}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SIH PITCH DECK */}
      {activeTab === 'pitch' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div>
            <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">
              Smart India Hackathon 2026 Evaluation Framework
            </span>
            <h3 className="text-xl font-bold text-white mt-1">
              Field-Tested Digital Verification vs. Traditional Paper Audits
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-red-950/20 border border-red-800/40 p-4 rounded-2xl space-y-2">
              <span className="font-bold text-red-400 block uppercase tracking-wider">Traditional Problem</span>
              <p className="text-slate-300 leading-relaxed">
                Paper inspection forms are routinely filed days after the visit, prone to geographic
                spoofing ("desk audits"), lack verified photographic timestamps, and allow critical defects
                to languish without automated SLA accountability.
              </p>
            </div>

            <div className="bg-emerald-950/20 border border-emerald-800/40 p-4 rounded-2xl space-y-2">
              <span className="font-bold text-emerald-400 block uppercase tracking-wider">Our Smart Solution</span>
              <p className="text-slate-300 leading-relaxed">
                Zero-trust mobile platform enforcing strict 300m GPS geofencing, automatic canvas
                watermarking, SHA-256 tamper-seals, automated directorate SLA escalations, and interactive
                Before/After repair verification before any defect can be marked closed.
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
            <span className="font-bold text-white block">Key Hackathon Innovations</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
              <div>• <strong>Dual GPS Anchor:</strong> Lat/Lng recorded at start and completion.</div>
              <div>• <strong>Offline Sync Engine:</strong> Zero data loss in zero-connectivity tunnels.</div>
              <div>• <strong>AI Defect Diagnostics:</strong> Gemini CV vision classification.</div>
              <div>• <strong>Before/After Visual Slider:</strong> Supervisor verifies structural fix.</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
