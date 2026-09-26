'use client';

import React from 'react';
import Link from 'next/link';
import {
  Check,
  Edit,
  X,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Users2,
  ChevronRight,
  ShieldCheck,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { AIPlanningPlan } from '../../types/railway';
import { DepartmentBadge, StatusBadge } from '../common/Badge';
import { formatDurationDays, formatDurationMinutes } from '../../lib/durationFormat';

interface PlanningBoxGridProps {
  plans: AIPlanningPlan[];
  selectedPlanId: string;
  onSelectPlan: (id: string) => void;
  onApprove: (planId: string) => void;
  onReject: (planId: string) => void;
  onOpenModify: (plan: AIPlanningPlan) => void;
}

export function PlanningBoxGrid({
  plans,
  selectedPlanId,
  onSelectPlan,
  onApprove,
  onReject,
  onOpenModify
}: PlanningBoxGridProps) {
  if (plans.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-10 text-center text-slate-500 text-xs shadow-2xs space-y-3">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-700">
          <CheckCircle2 className="w-5 h-5 text-slate-700" />
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-800">All Candidate Plans Scheduled or Filtered</div>
          <p className="text-slate-500 mt-1 max-w-md mx-auto">
            All pending maintenance block recommendations have been approved and moved to Existing Blocks, or filtered out by current corridor/department criteria.
          </p>
        </div>
        <div>
          <Link
            href="/blocks"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-2xs transition-colors"
          >
            <span>Open Existing Blocks Dashboard</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {plans.map((plan) => {
        const isSelected = plan.planId === selectedPlanId;
        const isApproved = plan.status === 'Approved';
        const isRejected = plan.status === 'Rejected';

        return (
          <div
            key={plan.planId}
            onClick={() => onSelectPlan(plan.planId)}
            className={`rounded-lg border text-xs cursor-pointer transition-all flex flex-col justify-between bg-white shadow-2xs ${
              isSelected
                ? 'border-slate-800 ring-2 ring-slate-800/15 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
            }`}
          >
            {/* Box Header */}
            <div className="p-3.5 border-b border-slate-100 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <span className="font-mono font-bold text-sm text-slate-900 tracking-tight">
                    {plan.planId}
                  </span>
                  {(plan.departments && plan.departments.length > 1 ? plan.departments : [plan.department]).map((dept, i) => (
                    <DepartmentBadge key={i} dept={dept} />
                  ))}
                </div>
                <StatusBadge status={plan.status} />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1 font-mono flex-wrap">
                  <span>Req:</span>
                  {(plan.requestIds && plan.requestIds.length > 0 ? plan.requestIds : [plan.requestId]).map((rid, idx, arr) => (
                    <span key={rid} className="inline-flex items-center">
                      <Link
                        href={`/requests/${rid}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-slate-700 font-semibold hover:text-blue-600 hover:underline"
                      >
                        {rid}
                      </Link>
                      {idx < arr.length - 1 && <span className="mx-0.5 text-slate-400">+</span>}
                    </span>
                  ))}
                </div>
                {plan.coordinationOpportunity?.isCoordinated && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                    <Users2 className="w-3 h-3 text-slate-600" />
                    <span>COORDINATED</span>
                  </span>
                )}
                {(plan.operationalRegulationRequired || plan.status === 'COA Approval Required') && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-300 shrink-0">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    <span>REGULATION PROPOSED</span>
                  </span>
                )}
              </div>
            </div>

            {/* Box Content */}
            <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
              {/* Corridor, Section & Asset */}
              <div className="space-y-1">
                <div className="font-semibold text-slate-900 text-xs">
                  {plan.corridor}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {plan.blockSection} • {plan.line}
                </div>
                <div className="pt-1.5 border-t border-slate-100 flex items-baseline justify-between text-[11px]">
                  <span className="font-medium text-slate-800 truncate" title={plan.asset}>
                    {plan.asset}
                  </span>
                  <span className="text-slate-500 truncate ml-2 text-[10px] shrink-0">
                    {plan.maintenanceType}
                  </span>
                </div>
              </div>

              {/* Operational Window Inset Box */}
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{plan.recommendedDate}</span>
                  </div>
                  <span
                    className="font-mono text-[10px] text-slate-700 font-semibold bg-white px-1.5 py-0.5 rounded border border-slate-200"
                    title={`Minutes: ${formatDurationMinutes(plan.durationMin)} | Day format: ${formatDurationDays(plan.durationMin)}`}
                  >
                    {plan.durationMin}m · {formatDurationDays(plan.durationMin)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 text-xs">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{plan.startTime} – {plan.endTime}</span>
                </div>
              </div>

              {/* Assessment Metrics Strip */}
              <div className="grid grid-cols-3 gap-1.5 pt-1 text-[10px]">
                {/* AI Priority */}
                <div className="p-1.5 bg-slate-50 rounded border border-slate-200/60">
                  <span className="text-slate-400 font-semibold block uppercase text-[9px]">Priority</span>
                  <span className="font-mono font-bold text-slate-800 text-xs">{plan.aiPriorityScore}/100</span>
                </div>

                {/* Train Impact */}
                <div className="p-1.5 bg-slate-50 rounded border border-slate-200/60">
                  <span className="text-slate-400 font-semibold block uppercase text-[9px]">Train Impact</span>
                  <span className="font-semibold text-slate-800 text-[11px] truncate block">{plan.trainImpact}</span>
                </div>

                {/* Conflict Status */}
                <div className="p-1.5 bg-slate-50 rounded border border-slate-200/60">
                  <span className="text-slate-400 font-semibold block uppercase text-[9px]">Safety Rules</span>
                  {plan.conflictStatus === 'No Conflict' || plan.conflictStatus === 'Clear' ? (
                    <span className="inline-flex items-center gap-0.5 text-emerald-700 font-semibold text-[10px]">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Clear
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-amber-700 font-semibold text-[10px] truncate" title={plan.conflictStatus}>
                      <AlertCircle className="w-2.5 h-2.5 shrink-0" /> {plan.conflictStatus || 'Conflict'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Box Footer Actions */}
            <div
              className="px-3.5 py-2.5 bg-slate-50/70 border-t border-slate-200/80 rounded-b-lg flex items-center justify-between gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => onSelectPlan(plan.planId)}
                className={`text-[11px] font-medium flex items-center gap-1 transition-colors ${
                  isSelected ? 'text-slate-900 font-semibold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>{isSelected ? '✓ Selected' : 'Inspect'}</span>
                <ChevronRight className="w-3 h-3" />
              </button>

              <div className="flex items-center gap-1.5">
                {isApproved ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-emerald-800 px-2 py-0.5 bg-emerald-50 rounded border border-emerald-200">
                      ✓ Moved to Existing
                    </span>
                    <Link
                      href="/blocks"
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded shadow-2xs transition-colors"
                      title="View in Existing Operational Blocks"
                    >
                      <span>View in Blocks →</span>
                    </Link>
                  </div>
                ) : isRejected ? (
                  <span className="text-[11px] font-semibold text-rose-800 px-2 py-0.5 bg-rose-50 rounded border border-rose-200">
                    Rejected
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onApprove(plan.planId)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded shadow-2xs transition-colors"
                      title="Approve candidate block plan"
                    >
                      <Check className="w-3 h-3" />
                      <span>Approve</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenModify(plan)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded shadow-2xs transition-colors"
                      title="Modify plan parameters"
                    >
                      <Edit className="w-3 h-3 text-slate-500" />
                      <span>Modify</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onReject(plan.planId)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded border border-transparent hover:border-rose-200 transition-colors"
                      title="Reject candidate plan"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
