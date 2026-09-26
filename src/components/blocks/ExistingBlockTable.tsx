'use client';

import React from 'react';
import Link from 'next/link';
import { Layers, Eye, ShieldCheck, Clock } from 'lucide-react';
import { ExistingBlock } from '../../types/railway';
import { DepartmentBadge, StatusBadge } from '../common/Badge';

interface ExistingBlockTableProps {
  blocks: ExistingBlock[];
}

export function ExistingBlockTable({ blocks }: ExistingBlockTableProps) {
  return (
    <div className="bg-white rounded border border-slate-200 shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Block ID</th>
              <th>Corridor & Section</th>
              <th>Line</th>
              <th>Department</th>
              <th>Purpose</th>
              <th>Date</th>
              <th>Start</th>
              <th>End</th>
              <th>Duration</th>
              <th>Status</th>
              <th>Authority / Source</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {blocks.map((block) => {
              const isActive = block.status === 'Active';

              return (
                <tr
                  key={block.blockId}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    isActive ? 'bg-emerald-50/30' : ''
                  }`}
                >
                  {/* Block ID */}
                  <td className="whitespace-nowrap">
                    <Link
                      href={`/blocks/${block.blockId}`}
                      className="font-mono font-bold text-xs text-slate-900 hover:text-blue-600 hover:underline flex items-center gap-1.5"
                    >
                      <span>{block.blockId}</span>
                      {isActive && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      )}
                    </Link>
                  </td>

                  {/* Corridor & Section */}
                  <td className="whitespace-nowrap">
                    <div className="font-semibold text-slate-900 text-xs">{block.corridor}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{block.blockSection}</div>
                  </td>

                  {/* Line */}
                  <td className="whitespace-nowrap font-mono text-xs text-slate-700">
                    {block.line}
                  </td>

                  {/* Department */}
                  <td className="whitespace-nowrap">
                    <DepartmentBadge dept={block.department} />
                  </td>

                  {/* Purpose */}
                  <td className="max-w-[200px] truncate" title={block.purpose}>
                    <span className="text-slate-800 text-xs font-medium">{block.purpose}</span>
                  </td>

                  {/* Date */}
                  <td className="whitespace-nowrap font-mono text-xs text-slate-700">
                    {block.date}
                  </td>

                  {/* Start */}
                  <td className="whitespace-nowrap font-mono text-xs font-bold text-slate-900">
                    {block.startTime}
                  </td>

                  {/* End */}
                  <td className="whitespace-nowrap font-mono text-xs font-bold text-slate-900">
                    {block.endTime}
                  </td>

                  {/* Duration */}
                  <td className="whitespace-nowrap font-mono text-xs text-slate-700">
                    {block.durationMin} min
                  </td>

                  {/* Status */}
                  <td className="whitespace-nowrap">
                    <StatusBadge status={block.status} />
                  </td>

                  {/* Source */}
                  <td className="whitespace-nowrap">
                    <span className="text-[11px] text-slate-600 font-medium">
                      {block.source}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="text-right whitespace-nowrap">
                    <Link
                      href={`/blocks/${block.blockId}`}
                      className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded border border-transparent hover:border-slate-200 transition-colors inline-block"
                      title="Inspect full operational block record"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
        <span>Displaying confirmed and live blocks in the railway operational schedule.</span>
        <span className="font-semibold text-slate-700">{blocks.length} Recorded Blocks</span>
      </div>
    </div>
  );
}
