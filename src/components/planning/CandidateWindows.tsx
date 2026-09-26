'use client';

import React from 'react';
import { Calendar, Clock, Check } from 'lucide-react';
import { AIPlanningPlan, CandidateWindow } from '../../types/railway';

interface CandidateWindowsProps {
  plan: AIPlanningPlan;
  selectedWindowId: string;
  onSelectWindow: (id: string) => void;
}

export function CandidateWindows({
  plan,
  selectedWindowId,
  onSelectWindow
}: CandidateWindowsProps) {
  const windows: CandidateWindow[] = plan.candidateWindows || [
    {
      id: 'CW-01',
      date: plan.recommendedDate,
      startTime: plan.startTime,
      endTime: plan.endTime,
      durationMin: plan.durationMin,
      trainImpact: plan.trainImpact,
      resourceAvailability: plan.resourceAvailability,
      suitability: 'Highly Suitable',
      conflicts: ['None. Recommended slot.'],
      isRecommended: true
    }
  ];

  return (
    <div className="bg-white rounded border border-slate-200 p-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Candidate Block Windows Comparison
          </h3>
          <p className="text-[11px] text-slate-500">
            Alternative maintenance windows identified across the timetable horizon
          </p>
        </div>
        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {windows.length} Candidate Windows
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {windows.map((window, idx) => {
          const isSelected = selectedWindowId === window.id || (idx === 0 && !selectedWindowId);
          const isRec = window.isRecommended;

          return (
            <div
              key={window.id}
              onClick={() => onSelectWindow(window.id)}
              className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                isSelected
                  ? 'border-slate-800 bg-white ring-2 ring-slate-800/15 shadow-xs'
                  : 'border-slate-200 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[11px] text-slate-800">
                    Candidate {idx + 1}
                  </span>
                  {isRec && (
                    <span className="text-[10px] font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 font-mono">
                      AI Preferred
                    </span>
                  )}
                </div>

                {/* Timing */}
                <div className="font-mono font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{window.startTime} – {window.endTime}</span>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>{window.date} ({window.durationMin} min)</span>
                </div>

                {/* Characteristics */}
                <div className="pt-2 border-t border-slate-200/60 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Suitability:</span>
                    <span className="font-semibold text-slate-800">{window.suitability}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Train Impact:</span>
                    <span className="font-medium text-slate-800">
                      {window.trainImpact}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Resources:</span>
                    <span className="text-slate-700 font-medium">{window.resourceAvailability}</span>
                  </div>
                </div>

                {/* Conflict note */}
                <div className="p-1.5 bg-slate-50 rounded border border-slate-200 text-[10px] text-slate-600">
                  {window.conflicts.join('; ')}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                <span className={isSelected ? 'text-slate-900 font-semibold' : 'text-slate-400'}>
                  {isSelected ? '✓ Selected Window' : 'Click to select'}
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 text-slate-900" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
