'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { AIPlanningPlan } from '../../types/railway';
import { Check, X } from 'lucide-react';
import { formatDurationDays, formatDurationMinutes } from '../../lib/durationFormat';

interface ModifyPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: AIPlanningPlan | null;
  onSave: (
    planId: string,
    updates: {
      date: string;
      startTime: string;
      endTime: string;
      durationMin: number;
      corridor: string;
      line: string;
      remarks: string;
    }
  ) => void;
}

export function ModifyPlanModal({
  isOpen,
  onClose,
  plan,
  onSave
}: ModifyPlanModalProps) {
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [durationMin, setDurationMin] = useState(120);
  const [corridor, setCorridor] = useState('');
  const [line, setLine] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (plan) {
      setDate(plan.recommendedDate);
      setStartTime(plan.startTime);
      setEndTime(plan.endTime);
      setDurationMin(plan.durationMin);
      setCorridor(plan.corridor);
      setLine(plan.line);
      setRemarks(plan.coaRemarks || 'Shifted by 30 mins to avoid express overtake buffer.');
    }
  }, [plan]);

  if (!plan) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(plan.planId, {
      date,
      startTime,
      endTime,
      durationMin,
      corridor,
      line,
      remarks
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Modify Planning Parameters: ${plan.planId}`}
      subtitle={`Request: ${plan.requestId} (${plan.department}) • Status will update to 'Modified – Pending Approval'`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-2 gap-3">
          {/* Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Scheduled Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
            />
          </div>

          {/* Operating Line */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Track Line
            </label>
            <select
              value={line}
              onChange={(e) => setLine(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
            >
              <option value="UP Line">UP Line</option>
              <option value="DN Line">DN Line</option>
              <option value="Single Line">Single Line</option>
              <option value="Both Lines">Both Lines</option>
            </select>
          </div>
        </div>

        {/* Timings */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Start Time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              End Time
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 font-mono"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold text-slate-700">
                Duration (mins)
              </label>
              <span className="text-[10px] font-mono text-blue-700 font-semibold" title="Day Format">
                {formatDurationDays(durationMin)}
              </span>
            </div>
            <input
              type="number"
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value))}
              min={15}
              max={14400}
              required
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 font-mono"
            />
          </div>
        </div>

        {/* Corridor */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            Corridor
          </label>
          <input
            type="text"
            value={corridor}
            onChange={(e) => setCorridor(e.target.value)}
            required
            className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
          />
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            COA Controller Operational Modification Remarks
          </label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={3}
            placeholder="Document reason for adjustment (e.g. alignment with freight path, siding clearance)..."
            required
            className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
          />
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded shadow-2xs transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save & Set Pending Approval</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
