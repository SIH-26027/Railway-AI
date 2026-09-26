'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, TrainTrack, MapPin, Calendar, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Department, DepartmentShort, Priority, Urgency } from '../../types/railway';
import { ALL_SALEM_BLOCK_SECTIONS, ExactBlockSection, resolveExactSection } from '../../lib/railradar';
import { formatDurationDays, formatDurationMinutes } from '../../lib/durationFormat';

interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newRequest: any) => Promise<void>;
}

const CORRIDORS = [
  'Erode – Salem',
  'Erode – Tiruppur',
  'Tiruppur – Coimbatore',
  'Coimbatore – Palakkad',
  'Salem – Jolarpettai',
  'Katpadi – Jolarpettai',
];

export function NewRequestModal({ isOpen, onClose, onSubmit }: NewRequestModalProps) {
  const [department, setDepartment] = useState<Department>('Engineering');
  const [corridor, setCorridor] = useState<string>('Erode – Salem');
  const [availableSections, setAvailableSections] = useState<ExactBlockSection[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [line, setLine] = useState<'UP Line' | 'DN Line' | 'Both Lines'>('UP Line');
  const [fromKm, setFromKm] = useState<number>(105.4);
  const [toKm, setToKm] = useState<number>(113.9);
  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState('Track & P-Way');
  const [maintenanceType, setMaintenanceType] = useState('Rail Replacement & Welding');
  const [defectReason, setDefectReason] = useState('Ultrasonic flaw detection detected rail head defect');
  const [requestedDate, setRequestedDate] = useState(new Date().toISOString().slice(0, 10));
  const [preferredStartTime, setPreferredStartTime] = useState('01:30');
  const [durationFormat, setDurationFormat] = useState<'minutes' | 'days'>('minutes');
  const [durationDays, setDurationDays] = useState<string>('0.08');
  const [durationMinutes, setDurationMinutes] = useState<number>(120);
  const [priority, setPriority] = useState<Priority>('High');
  const [urgency, setUrgency] = useState<Urgency>('Urgent');
  const [blockRequired] = useState<'Absolute' | 'Shadow'>('Absolute');
  const [disconnectionRequired, setDisconnectionRequired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMinutesChange = (mins: number) => {
    const valid = Math.max(15, mins || 0);
    setDurationMinutes(valid);
    setDurationDays((valid / 1440).toFixed(2));
  };

  const handleDaysChange = (daysStr: string) => {
    setDurationDays(daysStr);
    const d = parseFloat(daysStr);
    if (!isNaN(d) && d > 0) {
      setDurationMinutes(Math.round(d * 1440));
    }
  };

  // Filter exact block sections whenever corridor changes
  useEffect(() => {
    const matching = ALL_SALEM_BLOCK_SECTIONS.filter(
      s => s.corridorName.toLowerCase() === corridor.toLowerCase()
    );
    setAvailableSections(matching);

    if (matching.length > 0) {
      setSelectedSectionId(matching[0].id);
      setFromKm(matching[0].fromKm);
      setToKm(matching[0].toKm);
    } else {
      setSelectedSectionId('');
    }
  }, [corridor]);

  // When a section is chosen, auto-update chainages
  const handleSectionChange = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    const sec = availableSections.find(s => s.id === sectionId);
    if (sec) {
      setFromKm(sec.fromKm);
      setToKm(sec.toKm);
    }
  };

  // If user adjusts Km manually, auto-detect section
  const handleKmChange = (newFrom: number, newTo: number) => {
    setFromKm(newFrom);
    setToKm(newTo);
    const autoSec = resolveExactSection(corridor, newFrom, newTo);
    if (autoSec && autoSec.id !== selectedSectionId) {
      setSelectedSectionId(autoSec.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const activeSec = availableSections.find(s => s.id === selectedSectionId);

    const payload = {
      department,
      corridor,
      blockSection: activeSec ? activeSec.blockSection : corridor,
      fromKm,
      toKm,
      line,
      assetName: assetName || `${maintenanceType} - Section ${activeSec ? activeSec.blockSection : corridor}`,
      assetType,
      maintenanceType,
      defectReason,
      requestedDate,
      preferredStartTime: preferredStartTime.length === 5 ? `${preferredStartTime}:00` : preferredStartTime,
      durationMinutes: Number(durationMinutes),
      priority,
      urgency,
      blockRequired,
      disconnectionRequired,
      status: 'Pending Planning'
    };

    try {
      await onSubmit(payload);
      onClose();
    } catch (err) {
      console.error('Submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentSection = availableSections.find(s => s.id === selectedSectionId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/70 backdrop-blur-xs overflow-hidden">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header (Pinned at top, never clipped) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
              <TrainTrack className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Create Maintenance Block Request</h2>
              <p className="text-[11px] text-slate-300">
                Target block requests directly to exact RailRadar station-to-station block sections
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Department & Corridor Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as Department)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                <option value="Engineering">Engineering (Track / P-Way)</option>
                <option value="Traction Distribution">Traction Distribution (TRD / OHE)</option>
                <option value="Signal & Telecommunication">Signal & Telecom (S&T / Interlocking)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Corridor
              </label>
              <select
                value={corridor}
                onChange={(e) => setCorridor(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                {CORRIDORS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* EXACT BLOCK SECTION (RailRadar Data) */}
          <div className="p-3.5 bg-blue-50/60 rounded-lg border border-blue-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <MapPin className="w-4 h-4 text-blue-700" />
                <span>Exact Station-to-Station Block Section (RailRadar Network)</span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded border border-blue-200">
                {availableSections.length} Sections Available
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Select Exact Target Block Section
              </label>
              <select
                value={selectedSectionId}
                onChange={(e) => handleSectionChange(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableSections.map(sec => (
                  <option key={sec.id} value={sec.id}>
                    {sec.blockSection} ({sec.fromStationCode} → {sec.toStationCode}) • {sec.distanceKm} km [Km {sec.fromKm} - {sec.toKm}]
                  </option>
                ))}
              </select>
            </div>

            {/* Km Chainage Row */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                  From Chainage (Km)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={fromKm}
                  onChange={(e) => handleKmChange(Number(e.target.value), toKm)}
                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                  To Chainage (Km)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={toKm}
                  onChange={(e) => handleKmChange(fromKm, Number(e.target.value))}
                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                  Line Direction
                </label>
                <select
                  value={line}
                  onChange={(e) => setLine(e.target.value as any)}
                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-900"
                >
                  <option value="UP Line">UP Line</option>
                  <option value="DN Line">DN Line</option>
                  <option value="Both Lines">Both Lines</option>
                </select>
              </div>
            </div>

            {currentSection && (
              <div className="text-[11px] text-slate-600 bg-white/80 p-2 rounded border border-blue-100 flex items-center justify-between">
                <span>Active Target: <strong>{currentSection.blockSection}</strong></span>
                <span>Inter-Station Span: <strong>{currentSection.distanceKm} km</strong></span>
                <span>Speed Cap: <strong>{currentSection.maxSpeedKmph} km/h</strong></span>
              </div>
            )}
          </div>

          {/* Asset & Maintenance Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Asset Name / Identification
              </label>
              <input
                type="text"
                placeholder="e.g. 60kg UIC Rail (Turnout 102B)"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Maintenance Activity Type
              </label>
              <input
                type="text"
                placeholder="e.g. Deep Screening & Tamping"
                value={maintenanceType}
                onChange={(e) => setMaintenanceType(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                required
              />
            </div>
          </div>

          {/* Date, Start Time & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Requested Date
              </label>
              <input
                type="date"
                value={requestedDate}
                onChange={(e) => setRequestedDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-900 font-mono font-medium focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Preferred Start Time
              </label>
              <input
                type="time"
                value={preferredStartTime}
                onChange={(e) => setPreferredStartTime(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-900 font-mono font-medium focus:bg-white"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Block Duration
                </label>
                {/* Format Toggle Switch: Minutes Format vs Day Format */}
                <div className="inline-flex items-center p-0.5 bg-slate-100 rounded border border-slate-200 text-[10px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setDurationFormat('minutes')}
                    className={`px-2 py-0.5 rounded transition-all ${
                      durationFormat === 'minutes'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Minutes Format
                  </button>
                  <button
                    type="button"
                    onClick={() => setDurationFormat('days')}
                    className={`px-2 py-0.5 rounded transition-all ${
                      durationFormat === 'days'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Day Format
                  </button>
                </div>
              </div>

              {durationFormat === 'minutes' ? (
                <div className="space-y-1.5">
                  <div className="relative">
                    <input
                      type="number"
                      step="15"
                      min="15"
                      max="14400"
                      value={durationMinutes}
                      onChange={(e) => handleMinutesChange(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-900 font-mono font-bold focus:bg-white"
                      required
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono font-medium text-slate-500 pointer-events-none">
                      minutes
                    </span>
                  </div>

                  {/* Equivalent Display in Day Format */}
                  <div className="flex items-center justify-between text-[10px] text-slate-600 font-mono bg-blue-50/80 border border-blue-100 px-2 py-1 rounded">
                    <span>Day Format: <strong className="text-blue-900 font-bold">{formatDurationDays(durationMinutes)}</strong></span>
                    <span className="text-slate-500">{Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m</span>
                  </div>

                  {/* Quick Minute Preset Chips */}
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {[60, 120, 240, 360, 480, 1440].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleMinutesChange(m)}
                        className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                          durationMinutes === m
                            ? 'bg-slate-900 text-white border-slate-900 font-bold'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {m >= 1440 ? '1 Day (1440m)' : `${m}m (${m / 60}h)`}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="relative">
                    <input
                      type="number"
                      step="0.05"
                      min="0.01"
                      max="10"
                      value={durationDays}
                      onChange={(e) => handleDaysChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-900 font-mono font-bold focus:bg-white"
                      required
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono font-medium text-slate-500 pointer-events-none">
                      days
                    </span>
                  </div>

                  {/* Equivalent Display in Minutes Format */}
                  <div className="flex items-center justify-between text-[10px] text-slate-600 font-mono bg-emerald-50/80 border border-emerald-100 px-2 py-1 rounded">
                    <span>Minutes Format: <strong className="text-emerald-900 font-bold">{formatDurationMinutes(durationMinutes)}</strong></span>
                    <span className="text-slate-500">{Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m</span>
                  </div>

                  {/* Quick Day Preset Chips */}
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {[
                      { label: '0.25 Day (6h)', d: '0.25', m: 360 },
                      { label: '0.33 Day (8h)', d: '0.33', m: 480 },
                      { label: '0.5 Day (12h)', d: '0.5', m: 720 },
                      { label: '1 Day (24h)', d: '1.0', m: 1440 },
                      { label: '2 Days (48h)', d: '2.0', m: 2880 },
                    ].map((item) => (
                      <button
                        key={item.d}
                        type="button"
                        onClick={() => {
                          setDurationDays(item.d);
                          setDurationMinutes(item.m);
                        }}
                        className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                          durationMinutes === item.m
                            ? 'bg-slate-900 text-white border-slate-900 font-bold'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Operational Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Urgency
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as Urgency)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                <option value="Emergency">Emergency</option>
                <option value="Urgent">Urgent</option>
                <option value="Normal">Normal</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pinned Modal Footer */}
        <div className="shrink-0 bg-slate-50 px-5 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>
              Duration: <strong className="text-slate-900">{formatDurationMinutes(durationMinutes)}</strong>
              <span className="mx-1 text-slate-400">·</span>
              <strong className="text-blue-800">{formatDurationDays(durationMinutes)}</strong>
            </span>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg shadow-2xs transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Submitting to Section...' : 'Submit Exact Block Request'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
);
}
