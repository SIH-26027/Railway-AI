'use client';

import React from 'react';
import Link from 'next/link';
import {
  Activity,
  Calendar,
  AlertCircle,
  GitBranch,
  ArrowRight,
  TrainTrack
} from 'lucide-react';
import { usePlanning } from '../../context/PlanningContext';
import { DepartmentBadge, StatusBadge } from '../common/Badge';

export function OperationalSummary() {
  const { existingBlocks, aiPlans, corridors } = usePlanning();

  const activeBlocks = existingBlocks.filter(b => b.status === 'Active');
  const upcomingBlocks = existingBlocks.filter(b => b.status === 'Scheduled').slice(0, 3);
  const highPriorityPlans = aiPlans.filter(p => p.aiPriorityScore >= 90);
  const trainConflicts = aiPlans.filter(p => p.conflictStatus === 'Train Conflict');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Active & Upcoming Operational Blocks */}
      <div className="bg-white rounded border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Active & Upcoming Operational Blocks
              </h3>
            </div>
            <Link
              href="/blocks"
              className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
            >
              View Schedule <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {/* Active Block */}
            {activeBlocks.map(block => (
              <div key={block.blockId} className="py-2.5 flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">{block.blockId}</span>
                    <span className="px-1.5 py-0.2 text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-800 rounded">
                      LIVE ACTIVE
                    </span>
                    <DepartmentBadge dept={block.department} />
                  </div>
                  <div className="text-xs text-slate-700 font-medium">{block.purpose}</div>
                  <div className="text-[11px] text-slate-500">
                    {block.corridor} ({block.blockSection}) • {block.line}
                  </div>
                </div>
                <div className="text-right text-xs">
                  <div className="font-mono font-bold text-slate-900">{block.startTime} – {block.endTime}</div>
                  <div className="text-[10px] text-slate-400">Duration: {block.durationMin}m</div>
                </div>
              </div>
            ))}

            {/* Upcoming Blocks */}
            {upcomingBlocks.map(block => (
              <div key={block.blockId} className="py-2.5 flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-700">{block.blockId}</span>
                    <StatusBadge status={block.status} />
                    <DepartmentBadge dept={block.department} />
                  </div>
                  <div className="text-xs text-slate-700">{block.purpose}</div>
                  <div className="text-[11px] text-slate-500">
                    {block.corridor} • {block.date}
                  </div>
                </div>
                <div className="text-right text-xs">
                  <div className="font-mono text-slate-700">{block.startTime} – {block.endTime}</div>
                  <div className="text-[10px] text-slate-400">{block.durationMin} min</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-3 mt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
          <span>All active blocks coordinated with Section Traffic Controller.</span>
          <span className="font-semibold text-slate-700">{existingBlocks.length} Scheduled Total</span>
        </div>
      </div>

      {/* Corridor Availability & Operational Constraints */}
      <div className="bg-white rounded border border-slate-200 p-4 shadow-2xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <TrainTrack className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Corridor Section Availability & Headway Constraints
              </h3>
            </div>
            <Link
              href="/corridors"
              className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
            >
              All Corridors <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 mt-2">
            {corridors.slice(0, 4).map(sec => {
              const isBlocked = sec.currentAvailability === 'Blocked';
              const isRestricted = sec.currentAvailability === 'Restricted Speed';

              return (
                <div key={sec.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900">{sec.section}</span>
                      <span className="text-[10px] font-mono text-slate-500">({sec.line})</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Corridor: {sec.corridor} • Max Speed: {sec.maxSpeedKmph} km/h
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${
                        isBlocked
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : isRestricted
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {sec.currentAvailability}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-0.5">{sec.trainDensity}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* High priority notice */}
        <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
          <span className="text-amber-700 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {trainConflicts.length} corridor conflict flagged by AI optimization
          </span>
          <Link href="/planning" className="font-medium text-blue-600 hover:underline">
            Resolve in Planning →
          </Link>
        </div>
      </div>
    </div>
  );
}
