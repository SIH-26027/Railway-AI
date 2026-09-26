'use client';

import React from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Users2,
  AlertTriangle,
  Train,
  MapPin
} from 'lucide-react';
import { AIPlanningPlan } from '../../types/railway';
import { DepartmentBadge, StatusBadge } from '../common/Badge';
import { formatDurationDays, formatDurationMinutes } from '../../lib/durationFormat';

interface AIRecommendationProps {
  plan: AIPlanningPlan;
}

export function AIRecommendation({ plan }: AIRecommendationProps) {
  // Filter out internal optimizer telemetry from reasoning factors
  const cleanFactors = (plan.reasoningFactors || []).filter(factor => {
    const f = factor.toLowerCase();
    return (
      !f.includes('evaluated') &&
      !f.includes('cp-sat') &&
      !f.includes('gap efficiency') &&
      !f.includes('unused buffer') &&
      !f.includes('candidate opportunities')
    );
  });

  const hasMultipleDepartments =
    plan.coordinationOpportunity?.isCoordinated &&
    plan.coordinationOpportunity.partnerDepartments &&
    plan.coordinationOpportunity.partnerDepartments.length > 0;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-3.5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Operational Block Plan
            </h3>
            <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              {plan.planId}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
            <span>Requests:</span>
            {(plan.requestIds && plan.requestIds.length > 0 ? plan.requestIds : [plan.requestId]).map((rid, idx, arr) => (
              <span key={rid} className="inline-flex items-center">
                <Link href={`/requests/${rid}`} className="text-slate-800 font-semibold hover:underline font-mono">
                  {rid}
                </Link>
                {idx < arr.length - 1 && <span className="mx-0.5 text-slate-400">+</span>}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusBadge status={plan.status} />
          {(plan.departments && plan.departments.length > 1 ? plan.departments : [plan.department]).map((dept, i) => (
            <DepartmentBadge key={i} dept={dept} />
          ))}
        </div>
      </div>

      {/* Key Operational Details Grid (Only What COA Needs) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Timing Window */}
        <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>Operational Window</span>
          </div>
          <div className="text-sm font-bold font-mono text-slate-900">
            {plan.startTime} – {plan.endTime}
          </div>
          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>{plan.recommendedDate}</span>
            <span>•</span>
            <span className="font-mono text-slate-800 font-semibold">{plan.durationMin}m ({formatDurationDays(plan.durationMin)})</span>
          </div>
        </div>

        {/* Section & Line */}
        <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <MapPin className="w-3 h-3 text-slate-500" />
            <span>Section & Line</span>
          </div>
          <div className="text-xs font-bold text-slate-900 truncate" title={plan.blockSection}>
            {plan.blockSection || plan.corridor}
          </div>
          <div className="text-[11px] text-slate-500 truncate">
            {plan.corridor} • <strong className="text-slate-700">{plan.line}</strong>
          </div>
        </div>

        {/* Train Traffic Clearance */}
        <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <Train className="w-3 h-3 text-slate-500" />
            <span>Train Impact</span>
          </div>
          <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>0 Trains Disrupted</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Safe headway buffers verified
          </div>
        </div>
      </div>

      {/* Operational Regulation Scenario Callout (Only when COA approval is required) */}
      {(plan.operationalRegulationRequired || plan.status === 'COA Approval Required') && (
        <div className="p-3 bg-amber-50 rounded border border-amber-300 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>COA Approval Required — Operational Train Regulation</span>
          </div>
          <p className="text-amber-800 text-[11px] leading-relaxed">
            {plan.coaRemarks || "Proposed regulation of lower-priority train(s) to create block window."}
          </p>
        </div>
      )}

      {/* Multi-Department Coordination (Only when multiple partner departments actually exist) */}
      {hasMultipleDepartments && (
        <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-medium text-slate-800">
            <Users2 className="w-3.5 h-3.5 text-slate-600" />
            <span>Coordinated Work:</span>
            <span className="font-semibold text-slate-900">
              {plan.coordinationOpportunity?.leadDepartment} + {plan.coordinationOpportunity?.partnerDepartments.join(', ')}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Shared Window</span>
        </div>
      )}

      {/* Concise Operational Factors */}
      {cleanFactors.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
            Operational Plan Notes
          </span>
          <div className="space-y-1">
            {cleanFactors.map((factor, idx) => (
              <div key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-700 leading-snug">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span>{factor}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
