'use client';

import React from 'react';
import {
  ClipboardList,
  AlertTriangle,
  Cpu,
  CheckCircle2,
  CalendarCheck2,
  AlertOctagon,
  Clock,
  TrendingDown
} from 'lucide-react';
import { usePlanning } from '../../context/PlanningContext';

export function KPIOverview() {
  const { requests, aiPlans, existingBlocks } = usePlanning();

  const pendingRequests = requests.filter(r => r.status === 'Pending Planning').length;
  const highPriorityRequests = requests.filter(r => r.priority === 'High').length;
  const aiRecommendedBlocks = aiPlans.filter(p => p.status === 'AI Recommended').length;
  const existingApproved = existingBlocks.filter(b => b.status === 'Scheduled' || b.source.includes('Approved')).length;
  const today = new Date().toISOString().slice(0, 10);
  const blocksToday = existingBlocks.filter(b => b.status === 'Active' || b.date === today).length;

  const conflictingRequests = aiPlans.filter(p => p.conflictStatus !== 'No Conflict').length;
  
  // Total planned hours: purely from AI-recommended/approved plans + existing scheduled blocks
  const plannedHours = Math.round(
    (
      aiPlans
        .filter(p => p.status === 'Approved' || p.status === 'AI Recommended')
        .reduce((acc, curr) => acc + curr.durationMin, 0)
      +
      existingBlocks
        .filter(b => b.status === 'Scheduled' || b.status === 'Active')
        .reduce((acc, curr) => acc + curr.durationMin, 0)
    ) / 60
  );

  // Downtime avoided = sum of estimated - optimized from plans with coordination opportunities
  const downtimeAvoidedHours = Math.round(
    aiPlans
      .filter(p => p.coordinationOpportunity?.isCoordinated)
      .reduce((acc, curr) => acc + curr.durationMin * 0.25, 0) / 60
  );

  const kpis = [
    {
      title: 'Pending Requests',
      value: pendingRequests,
      subtext: 'Across TMS, TDMS, SMMS',
      icon: ClipboardList,
      color: 'text-amber-700 bg-amber-50 border-amber-200'
    },
    {
      title: 'High Priority Requests',
      value: highPriorityRequests,
      subtext: 'Critical P-Way & OHE defects',
      icon: AlertTriangle,
      color: 'text-rose-700 bg-rose-50 border-rose-200'
    },
    {
      title: 'AI Recommended Blocks',
      value: aiRecommendedBlocks,
      subtext: 'Awaiting COA review & action',
      icon: Cpu,
      color: 'text-indigo-700 bg-indigo-50 border-indigo-200'
    },
    {
      title: 'Existing Approved Blocks',
      value: existingApproved,
      subtext: 'Scheduled in operational timetable',
      icon: CheckCircle2,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200'
    },
    {
      title: 'Blocks Today',
      value: blocksToday,
      subtext: `${existingBlocks.filter(b => b.status === 'Active').length} Active, ${existingBlocks.filter(b => b.date === today && b.status === 'Scheduled').length} Scheduled today`,

      icon: CalendarCheck2,
      color: 'text-sky-700 bg-sky-50 border-sky-200'
    },
    {
      title: 'Conflicting Requests',
      value: conflictingRequests,
      subtext: 'Headway or traction overlaps',
      icon: AlertOctagon,
      color: 'text-amber-800 bg-amber-50 border-amber-300'
    },
    {
      title: 'Maintenance Hours Planned',
      value: `${plannedHours}h`,
      subtext: 'This week horizon',
      icon: Clock,
      color: 'text-slate-800 bg-slate-100 border-slate-300'
    },
    {
      title: 'Asset Downtime Avoided',
      value: `${downtimeAvoidedHours}h`,
      subtext: 'Via multi-dept shadow blocks',
      icon: TrendingDown,
      color: 'text-emerald-800 bg-emerald-50 border-emerald-300'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded border border-slate-200 p-3.5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
                  {kpi.title}
                </span>
                <span className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums mt-1 block">
                  {kpi.value}
                </span>
              </div>
              <div className={`p-2 rounded border ${kpi.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500 truncate">
              {kpi.subtext}
            </div>
          </div>
        );
      })}
    </div>
  );
}
