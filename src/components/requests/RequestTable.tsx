'use client';

import React from 'react';
import Link from 'next/link';
import { ExternalLink, Eye, ArrowUpDown } from 'lucide-react';
import { MaintenanceRequest } from '../../types/railway';
import { DepartmentBadge, PriorityBadge, UrgencyBadge, StatusBadge, Badge } from '../common/Badge';
import { resolveExactSection } from '../../lib/railradar';
import { formatDurationDays, formatDurationMinutes } from '../../lib/durationFormat';

interface RequestTableProps {
  requests: MaintenanceRequest[];
  onSelectPlan?: (requestId: string) => void;
}

export function RequestTable({ requests }: RequestTableProps) {
  if (requests.length === 0) {
    return (
      <div className="bg-white rounded border border-slate-200 p-12 text-center shadow-2xs">
        <div className="text-slate-400 font-mono text-sm">No maintenance requests match the selected filters.</div>
        <p className="text-xs text-slate-500 mt-1">Try resetting the department, corridor or status filters above.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded border border-slate-200 shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Department</th>
              <th>Source</th>
              <th>Corridor & Section</th>
              <th>Asset</th>
              <th>Maintenance Type</th>
              <th>Req. Date</th>
              <th>Duration (Min / Day)</th>
              <th>Priority</th>
              <th>Urgency</th>
              <th>Op Impact</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map((req) => (
              <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                {/* Request ID */}
                <td className="font-mono font-bold text-slate-900 text-xs whitespace-nowrap">
                  <Link
                    href={`/requests/${req.id}`}
                    className="hover:text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {req.id}
                  </Link>
                </td>

                {/* Department */}
                <td className="whitespace-nowrap">
                  <DepartmentBadge dept={req.department} />
                </td>

                {/* Source System */}
                <td className="whitespace-nowrap">
                  <span className="font-mono text-[11px] font-semibold text-slate-600 px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">
                    {req.sourceSystem}
                  </span>
                </td>

                {/* Corridor & Section */}
                <td className="whitespace-nowrap">
                  {(() => {
                    const isGeneric = !req.blockSection ||
                      req.blockSection.toLowerCase().includes('erode - sankari') ||
                      req.blockSection.toLowerCase().includes('erode – sankari') ||
                      req.blockSection.toLowerCase() === req.corridor.toLowerCase();

                    const resolved = isGeneric ? resolveExactSection(req.corridor, req.fromKm, req.toKm) : null;
                    const exactSection = resolved?.blockSection || req.blockSection || req.corridor;

                    return (
                      <>
                        <div className="font-semibold text-slate-900 text-xs">{req.corridor}</div>
                        <div className="text-[11px] text-slate-600 font-medium flex items-center gap-1.5 mt-0.5">
                          <span
                            className="px-1.5 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200 text-[10px] font-mono font-medium"
                            title={`Exact Inter-Station Block Section: ${exactSection}`}
                          >
                            {exactSection}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500 font-mono text-[10px]">{req.line}</span>
                        </div>
                      </>
                    );
                  })()}
                </td>

                {/* Asset */}
                <td className="max-w-[220px] truncate" title={req.asset}>
                  <div className="font-medium text-slate-800 text-xs truncate">{req.asset}</div>
                  <div className="text-[11px] text-slate-600 font-mono flex items-center gap-1 mt-0.5">
                    <span className="text-slate-700 font-semibold">Km {req.fromKm} – {req.toKm}</span>
                    <span className="text-slate-400 text-[10px]">({Math.round(Math.abs(req.toKm - req.fromKm) * 10) / 10} km)</span>
                  </div>
                </td>

                {/* Maintenance Type */}
                <td className="max-w-[180px] truncate" title={req.maintenanceType}>
                  <span className="text-slate-700 text-xs">{req.maintenanceType}</span>
                </td>

                {/* Requested Date */}
                <td className="font-mono text-xs text-slate-700 whitespace-nowrap">
                  {req.requestedDate}
                </td>

                {/* Duration — Dual Format: Minutes & Days */}
                <td className="whitespace-nowrap font-mono text-xs">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900">
                      {formatDurationMinutes(req.estimatedDurationMin)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {formatDurationDays(req.estimatedDurationMin)}
                    </span>
                  </div>
                </td>

                {/* Priority */}
                <td className="whitespace-nowrap">
                  <PriorityBadge priority={req.priority} />
                </td>

                {/* Urgency */}
                <td className="whitespace-nowrap">
                  <UrgencyBadge urgency={req.urgency} />
                </td>

                {/* Operational Impact */}
                <td className="whitespace-nowrap">
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.2 rounded uppercase ${
                      req.operationalImpact === 'High'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : req.operationalImpact === 'Medium'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {req.operationalImpact}
                  </span>
                </td>

                {/* Status */}
                <td className="whitespace-nowrap">
                  <StatusBadge status={req.status} />
                </td>

                {/* Actions */}
                <td className="text-right whitespace-nowrap">
                  <div className="flex items-center justify-end">
                    <Link
                      href={`/requests/${req.id}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded shadow-2xs transition-colors"
                      title="View full request dossier"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>View</span>
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
        <div>
          Showing <span className="font-semibold text-slate-700">{requests.length}</span> departmental maintenance records.
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span> TMS (Engineering)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> TDMS (TRD)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span> SMMS (S&T)
          </span>
        </div>
      </div>
    </div>
  );
}
