import React, { useState } from 'react';
import { MapPin, ShieldAlert, Radio, Navigation, Eye, CheckCircle2 } from 'lucide-react';
import { Site, InspectorProfile, Defect } from '../../types';

interface LiveRadarMapProps {
  sites: Site[];
  inspectors: InspectorProfile[];
  defects: Defect[];
  onSelectSite?: (site: Site) => void;
  onSelectDefect?: (defect: Defect) => void;
}

export const LiveRadarMap: React.FC<LiveRadarMapProps> = ({
  sites,
  inspectors,
  defects,
  onSelectSite,
  onSelectDefect,
}) => {
  const [selectedPin, setSelectedPin] = useState<{
    type: 'SITE' | 'INSPECTOR' | 'DEFECT';
    data: any;
  } | null>(null);

  // Map coordinates (India bounds roughly: Lat 8°N - 32°N, Lon 68°E - 88°E)
  // We can project lat/lon cleanly onto SVG viewBox 0 0 800 600
  const projectCoords = (lat: number, lon: number) => {
    // Lat: 32 -> 8 (Y: 50 to 550)
    // Lon: 68 -> 86 (X: 50 to 750)
    const minLat = 10;
    const maxLat = 30;
    const minLon = 70;
    const maxLon = 82;

    const x = ((lon - minLon) / (maxLon - minLon)) * 700 + 50;
    const y = ((maxLat - lat) / (maxLat - minLat)) * 480 + 60;
    return { x: Math.max(40, Math.min(760, x)), y: Math.max(40, Math.min(540, y)) };
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl text-slate-100 flex flex-col">
      {/* Map Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <h3 className="font-bold text-sm text-white">National Infrastructure Real-Time Telemetry Map</h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-slate-400">Sites (5)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-slate-400">Live Inspectors (5)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-slate-400">Critical Defects</span>
          </div>
        </div>
      </div>

      {/* SVG Interactive Radar Canvas */}
      <div className="relative w-full aspect-[16/9] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
        <svg
          viewBox="0 0 800 600"
          className="w-full h-full select-none"
        >
          {/* Subtle Grid Lines */}
          <defs>
            <pattern id="radar-grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1e293b" strokeWidth="0.75" />
            </pattern>
            <radialGradient id="radar-sweep" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width="800" height="600" fill="#020617" />
          <rect width="800" height="600" fill="url(#radar-grid)" />

          {/* India Continental Contour Representation */}
          <path
            d="M 280 90 L 380 95 L 420 160 L 490 200 L 510 260 L 460 320 L 410 400 L 370 520 L 320 480 L 270 380 L 220 280 L 210 200 Z"
            fill="none"
            stroke="#334155"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="opacity-40"
          />

          {/* Radar Scanner Circle Animation */}
          <circle cx="400" cy="300" r="240" fill="none" stroke="#0369a1" strokeWidth="1" strokeOpacity="0.2" />
          <circle cx="400" cy="300" r="160" fill="none" stroke="#0369a1" strokeWidth="1" strokeOpacity="0.2" />
          <circle cx="400" cy="300" r="80" fill="none" stroke="#0369a1" strokeWidth="1" strokeOpacity="0.2" />

          {/* 1. Sites with Geofence Rings */}
          {sites.map((site) => {
            const { x, y } = projectCoords(site.latitude, site.longitude);
            return (
              <g key={site.id} className="cursor-pointer" onClick={() => setSelectedPin({ type: 'SITE', data: site })}>
                {/* Geofence Ring */}
                <circle
                  cx={x}
                  cy={y}
                  r={site.geofenceRadiusMeters / 12}
                  fill="rgba(14, 165, 233, 0.12)"
                  stroke="#38bdf8"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                {/* Site Hub Core */}
                <circle cx={x} cy={y} r="8" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
                <text
                  x={x + 12}
                  y={y + 4}
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="sans-serif"
                  fontWeight="bold"
                >
                  {site.code}
                </text>
              </g>
            );
          })}

          {/* 2. Live Inspector Coordinates */}
          {inspectors.map((insp) => {
            if (!insp.currentLocation) return null;
            const { x, y } = projectCoords(
              insp.currentLocation.latitude,
              insp.currentLocation.longitude
            );
            return (
              <g key={insp.id} className="cursor-pointer" onClick={() => setSelectedPin({ type: 'INSPECTOR', data: insp })}>
                {/* Pulsing beacon */}
                <circle cx={x} cy={y} r="16" fill="rgba(34, 197, 94, 0.25)" className="animate-ping" />
                <circle cx={x} cy={y} r="6" fill="#22c55e" stroke="#ffffff" strokeWidth="2" />
                <text
                  x={x}
                  y={y - 10}
                  fill="#86efac"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="middle"
                  fontWeight="600"
                >
                  {insp.inspectorId}
                </text>
              </g>
            );
          })}

          {/* 3. Defects Markers */}
          {defects.map((def) => {
            const { x, y } = projectCoords(def.latitude, def.longitude);
            const isCritical = def.severity === 'CRITICAL';
            return (
              <g
                key={def.id}
                className="cursor-pointer"
                onClick={() => setSelectedPin({ type: 'DEFECT', data: def })}
              >
                <polygon
                  points={`${x},${y - 12} ${x + 8},${y + 4} ${x - 8},${y + 4}`}
                  fill={isCritical ? '#ef4444' : '#f97316'}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              </g>
            );
          })}
        </svg>

        {/* Floating Selected Pin Details Card */}
        {selectedPin && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700 p-3 rounded-xl shadow-2xl z-30 text-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-1.5">
              <span className="font-bold text-white text-[11px]">
                {selectedPin.type === 'SITE' && `Site: ${selectedPin.data.name}`}
                {selectedPin.type === 'INSPECTOR' && `Inspector: ${selectedPin.data.name}`}
                {selectedPin.type === 'DEFECT' && `Defect: ${selectedPin.data.code}`}
              </span>
              <button
                onClick={() => setSelectedPin(null)}
                className="text-slate-400 hover:text-white px-1 font-bold"
              >
                ×
              </button>
            </div>

            {selectedPin.type === 'SITE' && (
              <div className="space-y-1 text-slate-300">
                <p className="text-[11px] text-slate-400">{selectedPin.data.locationName}</p>
                <div className="flex justify-between">
                  <span>Health Score:</span>
                  <strong className="text-emerald-400">{selectedPin.data.healthScore}/100</strong>
                </div>
                <div className="flex justify-between">
                  <span>Geofence Radius:</span>
                  <span className="font-mono text-slate-200">{selectedPin.data.geofenceRadiusMeters}m</span>
                </div>
              </div>
            )}

            {selectedPin.type === 'INSPECTOR' && (
              <div className="space-y-1 text-slate-300">
                <p className="font-mono text-orange-400">{selectedPin.data.inspectorId}</p>
                <p className="text-[11px]">Zone: {selectedPin.data.zone}</p>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="text-emerald-400 font-bold">{selectedPin.data.currentStatus}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>GPS Accuracy:</span>
                  <span>±{selectedPin.data.currentLocation?.accuracy}m</span>
                </div>
              </div>
            )}

            {selectedPin.type === 'DEFECT' && (
              <div className="space-y-1 text-slate-300">
                <p className="font-semibold text-white truncate">{selectedPin.data.title}</p>
                <div className="flex justify-between">
                  <span>Severity:</span>
                  <span
                    className={`font-bold ${
                      selectedPin.data.severity === 'CRITICAL' ? 'text-red-400' : 'text-orange-400'
                    }`}
                  >
                    {selectedPin.data.severity} (SLA: {selectedPin.data.slaHours}h)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="text-blue-400 font-mono">{selectedPin.data.status}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
