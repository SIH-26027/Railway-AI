'use client';

import React from 'react';
import { SlidersHorizontal, Users2 } from 'lucide-react';
import { usePlanning } from '../../context/PlanningContext';

export function OptimizationSummary() {
  const { planningHistory, requests, aiPlans } = usePlanning();
  const latestRun = planningHistory[0];
  const hasRun = Boolean(latestRun);

  // Dynamic calculations from live data or historical execution run
  const requestsCount = hasRun
    ? latestRun.requestsProcessed
    : requests.length;

  const candidateSlotsCount = hasRun
    ? latestRun.candidateWindows
    : (aiPlans.length > 0
        ? aiPlans.reduce((sum, p) => sum + (p.candidateWindows?.length || 1), 0)
        : 0);

  const validSlotsCount = hasRun
    ? latestRun.validWindows
    : (aiPlans.length > 0
        ? aiPlans.filter(p => p.ruleValidation?.corridorAvailable !== false && p.ruleValidation?.durationValid !== false).length
        : 0);

  const conflictsRemovedCount = hasRun
    ? latestRun.conflictingWindowsRemoved
    : (aiPlans.length > 0
        ? aiPlans.filter(p => p.conflictStatus === 'No Conflict' && p.ruleValidation?.trainConflictChecked).length
        : 0);

  const recommendedPlansCount = hasRun
    ? latestRun.recommendedPlans
    : aiPlans.length;

  const baselineHours = hasRun
    ? (latestRun.estimatedDowntimeHours ?? 0)
    : Math.round(requests.reduce((sum, r) => sum + (r.estimatedDurationMin || 0), 0) / 60);

  const optimizedHours = hasRun
    ? (latestRun.optimizedDowntimeHours ?? 0)
    : Math.round(aiPlans.reduce((sum, p) => sum + (p.durationMin || 0), 0) / 60);

  const rawSavings = baselineHours - optimizedHours;
  const hoursSaved = Math.max(0, rawSavings);

  const coordinationCount = hasRun
    ? latestRun.coordinationOpportunities
    : aiPlans.filter(p => p.coordinationOpportunity?.isCoordinated).length;

  const metrics = [
    {
      label: 'Requests',
      value: `${requestsCount}`,
      subtext: hasRun ? 'Considered' : (requestsCount > 0 ? 'In Pool' : 'No Requests'),
    },
    {
      label: 'Candidate Slots',
      value: `${candidateSlotsCount}`,
      subtext: (hasRun || candidateSlotsCount > 0) ? 'Evaluated' : 'Awaiting Run',
    },
    {
      label: 'Valid Slots',
      value: `${validSlotsCount}`,
      subtext: 'Safety Cleared',
      dot: 'bg-emerald-500',
    },
    {
      label: 'Conflicts Removed',
      value: `${conflictsRemovedCount}`,
      subtext: 'De-conflicted',
      dot: 'bg-amber-500',
    },
    {
      label: 'Recommended',
      value: `${recommendedPlansCount}`,
      subtext: recommendedPlansCount > 0 ? 'Ready for Review' : 'Awaiting Run',
    },
    {
      label: 'Baseline Possession',
      value: `${baselineHours}h`,
      subtext: 'Uncoordinated',
    },
    {
      label: 'Optimized Time',
      value: `${optimizedHours}h`,
      subtext: hoursSaved > 0 ? `${hoursSaved}h Saved` : (baselineHours > 0 ? 'Baseline' : '0h Saved'),
      subtextColor: 'text-slate-700 font-semibold',
    },
    {
      label: 'Coordination',
      value: `${coordinationCount}`,
      subtext: 'Multi-Department',
      icon: Users2,
    },
  ];

  return (
    <div className="bg-white rounded border border-slate-200 p-3.5 shadow-2xs space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-700" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Optimization Engine Execution Summary
          </h3>
        </div>
        {hasRun && latestRun?.runId ? (
          <span className="text-[10px] text-slate-500 font-mono">
            Run ID: {latestRun.runId}
          </span>
        ) : (
          <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            Live Assessment (Pending Engine Run)
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-xs">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div
              key={idx}
              className="p-2.5 bg-slate-50/70 hover:bg-slate-50 rounded border border-slate-200/80 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider truncate" title={m.label}>
                  {m.label}
                </span>
                {m.dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${m.dot}`} />}
              </div>
              <div className="text-base font-bold text-slate-900 tabular-nums mt-1 flex items-center gap-1">
                {Icon && <Icon className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
                <span>{m.value}</span>
              </div>
              <span className={`text-[10px] block truncate mt-0.5 ${m.subtextColor || 'text-slate-500'}`} title={m.subtext}>
                {m.subtext}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
