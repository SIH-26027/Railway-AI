'use client';

import React from 'react';
import {
  Inbox,
  Sparkles,
  ShieldAlert,
  SlidersHorizontal,
  UserCheck,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { usePlanning } from '../../context/PlanningContext';

export function PlanningPipeline() {
  const { requests, aiPlans, existingBlocks } = usePlanning();

  const requestsReceivedCount = requests.length;
  const aiPrioritizedCount = requests.length; // all requests are prioritized by AI
  const ruleCheckedCount = aiPlans.length;
  const optimizationCount = aiPlans.filter(p => p.recommendation === 'Recommended').length;
  const coaReviewCount = aiPlans.filter(p => p.status === 'AI Recommended' || p.status === 'Modified – Pending Approval').length;
  const approvedCount = existingBlocks.length + aiPlans.filter(p => p.status === 'Approved').length;

  const stages = [
    {
      step: '1',
      title: 'Requests Received',
      count: requestsReceivedCount,
      sublabel: 'TMS, TDMS, SMMS',
      icon: Inbox,
      color: 'bg-slate-100 text-slate-700 border-slate-300'
    },
    {
      step: '2',
      title: 'AI Prioritization',
      count: aiPrioritizedCount,
      sublabel: 'Multi-factor scoring',
      icon: Sparkles,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    },
    {
      step: '3',
      title: 'Conflict & Rule Check',
      count: ruleCheckedCount,
      sublabel: 'Timetable & headways',
      icon: ShieldAlert,
      color: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    {
      step: '4',
      title: 'Optimization',
      count: optimizationCount,
      sublabel: 'Shadow coordinated',
      icon: SlidersHorizontal,
      color: 'bg-sky-50 text-sky-700 border-sky-200'
    },
    {
      step: '5',
      title: 'COA Review',
      count: coaReviewCount,
      sublabel: 'Awaiting controller action',
      icon: UserCheck,
      color: 'bg-purple-50 text-purple-700 border-purple-200'
    },
    {
      step: '6',
      title: 'Approved Plan',
      count: approvedCount,
      sublabel: 'Active schedule',
      icon: CheckCircle2,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-300'
    }
  ];

  return (
    <div className="bg-white rounded border border-slate-200 p-4 shadow-2xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            End-to-End Planning Pipeline Status
          </h2>
          <p className="text-xs text-slate-500">
            Decentralized Department Requests → Centralized COA Approved Timetable
          </p>
        </div>
        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          Live Central Pipeline
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 pt-3">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          return (
            <div
              key={idx}
              className="relative p-3 rounded border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-slate-400 font-mono">
                    STAGE 0{stage.step}
                  </span>
                  <div className={`p-1 rounded border ${stage.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xl font-bold text-slate-900 tabular-nums">
                  {stage.count}
                </div>
                <div className="text-xs font-semibold text-slate-800 leading-tight mt-0.5">
                  {stage.title}
                </div>
              </div>
              <div className="text-[10px] text-slate-500 mt-2 pt-1 border-t border-slate-200/60 truncate">
                {stage.sublabel}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
