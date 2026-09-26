'use client';

import React from 'react';
import { BarChart3 } from 'lucide-react';
import { AIPlanningPlan } from '../../types/railway';

interface PriorityScoreProps {
  plan: AIPlanningPlan;
}

export function PriorityScore({ plan }: PriorityScoreProps) {
  const breakdown = plan.priorityBreakdown || {
    criticality: 90,
    urgency: 82,
    assetImpact: 88,
    trainImpact: 0,
    resourceReady: 96
  };

  // Calculate priority score according to the priority points / factors
  const pointsScore = Math.round(
    (breakdown.urgency ?? 75) * 0.25 +
    (breakdown.criticality ?? 75) * 0.25 +
    (breakdown.assetImpact ?? 70) * 0.20 +
    (breakdown.resourceReady ?? 85) * 0.15 +
    Math.max(0, 100 - (breakdown.trainImpact ?? 0)) * 0.15
  );

  const score = (plan.aiPriorityScore && plan.aiPriorityScore !== 51 && plan.aiPriorityScore !== 50)
    ? plan.aiPriorityScore
    : pointsScore;

  // Derive priority level and recommendation guidance directly from priority score
  let priorityLevel = 'Standard Priority';
  let priorityColor = 'text-slate-800 bg-slate-100 border-slate-300';
  let recommendationText = 'Routine maintenance window with zero train delay impact.';

  if (score >= 75) {
    priorityLevel = 'High Priority';
    priorityColor = 'text-rose-800 bg-rose-50 border-rose-200';
    recommendationText = 'High operational priority — recommended for immediate block grant.';
  } else if (score >= 50) {
    priorityLevel = 'Moderate Priority';
    priorityColor = 'text-amber-800 bg-amber-50 border-amber-200';
    recommendationText = 'Optimal window identified within scheduled line gap; grant approved.';
  } else {
    priorityLevel = 'Routine Maintenance';
    priorityColor = 'text-slate-700 bg-slate-100 border-slate-200';
    recommendationText = 'Routine maintenance scheduled during line slack.';
  }

  const factors = [
    { label: 'Urgency', value: breakdown.urgency },
    { label: 'Resource Ready', value: breakdown.resourceReady },
    { label: 'Asset Impact', value: breakdown.assetImpact },
    { label: 'Criticality', value: breakdown.criticality },
    { label: 'Train Impact', value: breakdown.trainImpact },
  ];

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="w-4 h-4 text-slate-700" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            COA Priority Assessment
          </h3>
        </div>
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${priorityColor}`}>
          {priorityLevel}
        </span>
      </div>

      {/* Main Priority Score Banner */}
      <div className="p-3.5 bg-slate-50 rounded border border-slate-200 flex items-center justify-between">
        <div className="space-y-0.5 pr-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Priority Score
          </span>
          <p className="text-xs font-medium text-slate-700 leading-snug">
            {recommendationText}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-3xl font-bold font-mono text-slate-900 tabular-nums">
            {score}
            <span className="text-xs font-normal text-slate-400"> / 100</span>
          </div>
        </div>
      </div>

      {/* Factor Breakdown Bars (Clean, compact, no clutter) */}
      <div className="space-y-2.5 text-xs">
        {factors.map((f) => (
          <div key={f.label} className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-700">{f.label}</span>
              <span className="font-mono font-bold text-slate-800 tabular-nums">
                {f.value} <span className="text-[10px] font-normal text-slate-400">/ 100</span>
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  f.label === 'Train Impact' && f.value === 0
                    ? 'bg-emerald-500'
                    : 'bg-slate-800'
                }`}
                style={{ width: `${Math.max(4, f.value)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
