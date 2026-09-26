'use client';

import React from 'react';
import Link from 'next/link';
import {
  Check,
  Edit,
  X,
  Eye,
  AlertCircle,
  CheckCircle2,
  Users2
} from 'lucide-react';
import { AIPlanningPlan } from '../../types/railway';
import { DepartmentBadge, StatusBadge } from '../common/Badge';
import { formatDurationDays, formatDurationMinutes } from '../../lib/durationFormat';

interface PlanningTableProps {
  plans: AIPlanningPlan[];
  selectedPlanId: string;
  onSelectPlan: (id: string) => void;
  onApprove: (planId: string) => void;
  onReject: (planId: string) => void;
  onOpenModify: (plan: AIPlanningPlan) => void;
}

export function PlanningTable({
  plans,
  selectedPlanId,
  onSelectPlan,
  onApprove,
  onReject,
  onOpenModify
}: PlanningTableProps) {
  if (plans.length === 0) {
    return (
      <div className="bg-white rounded border border-slate-200 p-8 text-center text-slate-500 text-xs">
        No candidate plans found for the selected horizon and corridor.
      </div>
    );
  }

  return (
    <div className="bg-white rounded border border-slate-200 shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Plan ID</th>
              <th>Request ID</th>
              <th>Dept</th>
              <th>Corridor</th>
              <th>Asset</th>
              <th>Rec. Date</th>
              <th>Window</th>
              <th>Duration (Min / Day)</th>
              <th>Planning Priority</th>
              <th>Train Impact</th>
              <th>Resources</th>
              <th>Conflict Status</th>
              <th>Verdict</th>
              <th className="text-right">COA Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {plans.map((plan) => {
              const isSelected = plan.planId === selectedPlanId;
              const isApproved = plan.status === 'Approved';
              const isRejected = plan.status === 'Rejected';

              return (
                <tr
                  key={plan.planId}
                  onClick={() => onSelectPlan(plan.planId)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'active-row' : 'hover:bg-slate-50/80'
                  }`}
                >
                  {/* Plan ID */}
                  <td className="whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs text-slate-900">
                        {plan.planId}
                      </span>
                      {plan.coordinationOpportunity?.isCoordinated && (
                        <span
                          title="Multi-Department Coordination Window"
                          className="px-1.5 py-0.5 bg-slate-100 text-slate-800 text-[10px] font-semibold rounded border border-slate-200 flex items-center gap-0.5 font-mono"
                        >
                          <Users2 className="w-2.5 h-2.5 text-slate-600" /> COORD
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Request ID */}
                  <td className="whitespace-nowrap font-mono text-xs text-slate-700">
                    <div className="flex items-center gap-1 flex-wrap">
                      {(plan.requestIds && plan.requestIds.length > 0 ? plan.requestIds : [plan.requestId]).map((rid, idx, arr) => (
                        <span key={rid} className="inline-flex items-center">
                          <Link
                            href={`/requests/${rid}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:text-blue-600 hover:underline"
                          >
                            {rid}
                          </Link>
                          {idx < arr.length - 1 && <span className="mx-0.5 text-slate-400">+</span>}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Department */}
                  <td className="whitespace-nowrap">
                    <div className="flex items-center gap-1 flex-wrap">
                      {(plan.departments && plan.departments.length > 1 ? plan.departments : [plan.department]).map((dept, i) => (
                        <DepartmentBadge key={i} dept={dept} />
                      ))}
                    </div>
                  </td>

                  {/* Corridor */}
                  <td className="whitespace-nowrap">
                    <div className="font-medium text-slate-900 text-xs">{plan.corridor}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{plan.blockSection}</div>
                  </td>

                  {/* Asset */}
                  <td className="max-w-[170px] truncate" title={plan.asset}>
                    <div className="text-xs text-slate-800 font-medium truncate">{plan.asset}</div>
                    <div className="text-[10px] text-slate-400 truncate">{plan.maintenanceType}</div>
                  </td>

                  {/* Recommended Date */}
                  <td className="whitespace-nowrap font-mono text-xs text-slate-700">
                    {plan.recommendedDate}
                  </td>

                  {/* Window */}
                  <td className="whitespace-nowrap font-mono text-xs font-bold text-slate-900">
                    {plan.startTime} – {plan.endTime}
                  </td>

                  {/* Duration — Dual Format: Minutes & Days */}
                  <td className="whitespace-nowrap font-mono text-xs">
                    <span className="font-bold text-slate-900 block">
                      {formatDurationMinutes(plan.durationMin)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium block">
                      {formatDurationDays(plan.durationMin)}
                    </span>
                  </td>

                  {/* AI Planning Priority Score */}
                  <td className="whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs text-slate-900">
                        {plan.aiPriorityScore}/100
                      </span>
                      <div className="w-12 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-slate-800 h-full rounded-full"
                          style={{ width: `${plan.aiPriorityScore}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Train Impact */}
                  <td className="whitespace-nowrap">
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.2 rounded uppercase ${
                        plan.trainImpact === 'Low'
                          ? 'bg-slate-100 text-slate-700 border border-slate-200'
                          : plan.trainImpact === 'Moderate'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {plan.trainImpact}
                    </span>
                  </td>

                  {/* Resource Availability */}
                  <td className="whitespace-nowrap">
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
                        plan.resourceAvailability === 'Available'
                          ? 'text-slate-800 bg-slate-100'
                          : 'text-amber-800 bg-amber-50'
                      }`}
                    >
                      {plan.resourceAvailability}
                    </span>
                  </td>

                  {/* Conflict Status */}
                  <td className="whitespace-nowrap">
                    {plan.conflictStatus === 'No Conflict' || plan.conflictStatus === 'Clear' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Clear
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> {plan.conflictStatus}
                      </span>
                    )}
                  </td>

                  {/* Recommendation Verdict */}
                  <td className="whitespace-nowrap">
                    <StatusBadge status={plan.status} />
                  </td>

                  {/* Actions */}
                  <td className="text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {isApproved ? (
                        <span className="text-[11px] font-bold text-emerald-700 px-2 py-0.5 bg-emerald-50 rounded border border-emerald-200">
                          Approved
                        </span>
                      ) : isRejected ? (
                        <span className="text-[11px] font-bold text-rose-700 px-2 py-0.5 bg-rose-50 rounded border border-rose-200">
                          Rejected
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => onApprove(plan.planId)}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded shadow-2xs transition-colors"
                            title="Approve plan and commit to operational schedule"
                          >
                            <Check className="w-3 h-3" />
                            <span>Approve</span>
                          </button>

                          <button
                            onClick={() => onOpenModify(plan)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors"
                            title="Modify timings, date or line"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Modify</span>
                          </button>

                          <button
                            onClick={() => onReject(plan.planId)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Reject candidate plan"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
