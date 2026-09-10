import React, { useState } from 'react';
import {
  X,
  Clock,
  AlertTriangle,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Send,
  Camera,
  Check,
  RotateCcw,
} from 'lucide-react';
import { Defect } from '../../types';

interface CorrectiveActionModalProps {
  defect: Defect;
  supervisorName: string;
  onClose: () => void;
  onAssign: (payload: {
    defectId: string;
    assignedToName: string;
    assignedTeam: string;
    deadline: string;
    actionPlan: string;
    supervisorName: string;
  }) => void;
  onVerifyAndClose: (payload: {
    defectId: string;
    afterPhotoUrl?: string;
    verificationNotes: string;
    supervisorName: string;
    approved: boolean;
  }) => void;
}

export const CorrectiveActionModal: React.FC<CorrectiveActionModalProps> = ({
  defect,
  supervisorName,
  onClose,
  onAssign,
  onVerifyAndClose,
}) => {
  // Modal tabs: 'details' | 'assign' | 'verify'
  const [activeTab, setActiveTab] = useState<'details' | 'assign' | 'verify'>(
    defect.status === 'PENDING_VERIFICATION' ? 'verify' : defect.status === 'DETECTED' ? 'assign' : 'details'
  );

  // Assign form state
  const [assignedPerson, setAssignedPerson] = useState(defect.assignedTo?.name || 'Suresh Patil');
  const [assignedTeam, setAssignedTeam] = useState(defect.assignedTo?.team || 'Heavy Civil Rapid Response Unit');
  const [deadline, setDeadline] = useState(
    defect.assignedTo?.deadline || new Date(Date.now() + 24 * 3600 * 1000).toISOString().substring(0, 16)
  );
  const [actionPlan, setActionPlan] = useState(
    defect.correctiveAction?.actionPlan || 'Mobilize site crew, erect structural shoring, inject epoxy grouting, and re-test with ultrasonic velocity gauge.'
  );

  // Verify form state
  const [verificationNotes, setVerificationNotes] = useState(
    'Photographic evidence verified against repair standard. Structural clearance certified.'
  );
  const [comparisonSliderPos, setComparisonSliderPos] = useState(50);
  const [afterPhotoInput, setAfterPhotoInput] = useState(
    defect.correctiveAction?.afterPhotoUrl || 'https://images.unsplash.com/photo-1517581177682-a085bb7ffb15?w=600&auto=format&fit=crop&q=80'
  );

  const beforePhoto = defect.evidencePhotos?.[0]?.photoUrl || 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=600&auto=format&fit=crop&q=80';

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAssign({
      defectId: defect.id,
      assignedToName: assignedPerson,
      assignedTeam,
      deadline,
      actionPlan,
      supervisorName,
    });
    onClose();
  };

  const handleVerifySubmit = (approved: boolean) => {
    onVerifyAndClose({
      defectId: defect.id,
      afterPhotoUrl: afterPhotoInput,
      verificationNotes,
      supervisorName,
      approved,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full text-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Top Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                defect.severity === 'CRITICAL'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              }`}
            >
              {defect.severity} SLA
            </span>
            <span className="font-mono text-xs font-bold text-white">{defect.code}</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/50 px-4 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-all ${
              activeTab === 'details'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Defect Details & SLA
          </button>

          <button
            onClick={() => setActiveTab('assign')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-all ${
              activeTab === 'assign'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Assign Responsible Team
          </button>

          <button
            onClick={() => setActiveTab('verify')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'verify'
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Before / After Verification</span>
            {defect.status === 'PENDING_VERIFICATION' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-4 text-xs">
              <div>
                <h3 className="text-base font-bold text-white mb-1">{defect.title}</h3>
                <p className="text-slate-300 leading-relaxed">{defect.description}</p>
              </div>

              {/* SLA Banner */}
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider">SLA Resolution Target</span>
                  <span className="font-bold text-orange-400 text-sm">
                    {defect.slaHours} Hours Window
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Current Escalation</span>
                  <span className={defect.isEscalated ? 'text-red-400 font-bold' : 'text-emerald-400 font-medium'}>
                    {defect.isEscalated ? `DIRECTORATE ESCALATED` : 'Supervisor Queue'}
                  </span>
                </div>
              </div>

              {/* Photo Evidence & Metadata */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block font-semibold text-slate-400 mb-1">Field Evidence Photo</span>
                  <div className="aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
                    <img src={beforePhoto} alt="Evidence" className="w-full h-full object-cover" />
                  </div>
                </div>

                <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px]">
                  <span className="font-semibold text-white block">Audit Telemetry Stamp</span>
                  <div>
                    <span className="text-slate-400">Site:</span>
                    <p className="text-slate-200 font-medium">{defect.siteName}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Inspector:</span>
                    <p className="text-slate-200 font-medium">{defect.inspectorName} ({defect.inspectorId})</p>
                  </div>
                  <div>
                    <span className="text-slate-400">GPS Coordinates:</span>
                    <p className="font-mono text-blue-400">{defect.latitude.toFixed(4)}°, {defect.longitude.toFixed(4)}°</p>
                  </div>
                </div>
              </div>

              {/* AI Analysis Card */}
              {defect.aiAnalysis && (
                <div className="bg-purple-950/20 border border-purple-800/40 p-3.5 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-300">AI Computer Vision Diagnosis</span>
                    <span className="text-emerald-400 font-mono">
                      {(defect.aiAnalysis.confidenceScore * 100).toFixed(0)}% Confidence
                    </span>
                  </div>
                  <p className="text-slate-300">{defect.aiAnalysis.detectedDefectType}</p>
                  <p className="text-slate-400 text-[11px]">{defect.aiAnalysis.recommendedAction}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ASSIGN WORKFLOW */}
          {activeTab === 'assign' && (
            <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
              <div className="bg-blue-950/30 border border-blue-800/40 p-3 rounded-2xl text-blue-300">
                <span>Supervisor Dispatch Directive: Assign remediation engineer and mandate turnaround SLA.</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Assigned Lead Engineer</label>
                  <input
                    type="text"
                    required
                    value={assignedPerson}
                    onChange={(e) => setAssignedPerson(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Contractor / Agency Unit</label>
                  <input
                    type="text"
                    required
                    value={assignedTeam}
                    onChange={(e) => setAssignedTeam(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Mandatory Completion Deadline</label>
                <input
                  type="datetime-local"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Corrective Action Plan & Instructions</label>
                <textarea
                  rows={3}
                  required
                  value={actionPlan}
                  onChange={(e) => setActionPlan(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-1.5 transition-colors"
              >
                <UserCheck className="w-4 h-4" />
                <span>Confirm Assignment & Notify Field Team</span>
              </button>
            </form>
          )}

          {/* TAB 3: VERIFY BEFORE / AFTER PHOTOS */}
          {activeTab === 'verify' && (
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-white mb-1">Visual Repair Comparison Inspection</h4>
                <p className="text-slate-400">
                  Compare pre-remediation defect photo against submitted after-repair evidence.
                </p>
              </div>

              {/* Interactive Before/After Split Viewer */}
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-700 select-none">
                {/* Background Image (After Repair) */}
                <img
                  src={afterPhotoInput}
                  alt="After repair"
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Foreground Clipped Image (Before Repair) */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${comparisonSliderPos}%` }}
                >
                  <img
                    src={beforePhoto}
                    alt="Before repair"
                    className="absolute inset-0 w-full h-full object-cover max-w-none"
                    style={{ width: '100%', height: '100%' }}
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-red-600/90 text-white text-[10px] font-bold">
                    BEFORE (Defect)
                  </div>
                </div>

                <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-emerald-600/90 text-white text-[10px] font-bold">
                  AFTER (Remediated)
                </div>

                {/* Slider divider line */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize z-10"
                  style={{ left: `${comparisonSliderPos}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-md font-bold text-[10px]">
                    ↔
                  </div>
                </div>

                {/* Hidden slider input */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={comparisonSliderPos}
                  onChange={(e) => setComparisonSliderPos(Number(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>← Drag slider to inspect repair alignment</span>
                <span>Position: {comparisonSliderPos}%</span>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Supervisor Audit Observations</label>
                <textarea
                  rows={2}
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Verification Decisions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleVerifySubmit(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-red-400 font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reject & Mandate Rework</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleVerifySubmit(true)}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve & Close Defect</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
