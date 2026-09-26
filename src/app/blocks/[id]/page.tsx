'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Layers,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  Train,
  CheckCircle2,
  FileCheck2,
  Zap,
  Users
} from 'lucide-react';
import { usePlanning } from '../../../context/PlanningContext';
import { PageContainer } from '../../../components/layout/PageContainer';
import { DepartmentBadge, StatusBadge } from '../../../components/common/Badge';

import { ExistingBlock } from '../../../types/railway';

export default function ExistingBlockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { existingBlocks } = usePlanning();

  const blockId = params?.id as string;
  const block = existingBlocks.find((b: ExistingBlock) => b.blockId === blockId) || existingBlocks[0];

  if (!block) {
    return (
      <PageContainer>
        <div className="bg-white rounded border border-slate-200 p-8 text-center">
          <p className="text-slate-600">Block record {blockId} not found.</p>
          <Link href="/blocks" className="text-blue-600 text-xs mt-2 inline-block">
            ← Back to Existing Blocks
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1.5 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded transition-colors"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 font-mono">
                {block.blockId}
              </h1>
              <StatusBadge status={block.status} />
              <DepartmentBadge dept={block.department} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Source: <strong className="text-slate-700">{block.source}</strong> • Approved on {block.approvalDate}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Official Working Timetable Item
          </span>
        </div>
      </div>

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Section 1: Block Information */}
        <div className="bg-white rounded border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-800">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>1. Block Information</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Corridor</span>
              <span className="font-bold text-slate-900">{block.corridor}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Block Section</span>
              <span className="font-semibold text-slate-800">{block.blockSection}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Track Line</span>
              <span className="font-mono font-semibold text-slate-800">{block.line}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Maintenance Purpose</span>
              <p className="font-medium text-slate-800 mt-0.5">{block.purpose}</p>
            </div>
            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 block text-[11px]">Scheduled Date</span>
                <span className="font-mono font-bold text-slate-900">{block.date}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Time Window</span>
                <span className="font-mono font-bold text-slate-900">{block.startTime} – {block.endTime}</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-500">
              Authorized Block Duration: <strong>{block.durationMin} minutes</strong>
            </div>
          </div>
        </div>

        {/* Section 2: Operational Information */}
        <div className="bg-white rounded border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-800">
            <Train className="w-4 h-4 text-purple-600" />
            <span>2. Operational & Safety Details</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px] mb-1">Train Movements Affected</span>
              <ul className="space-y-1">
                {block.trainMovementsAffected.map((t: string, idx: number) => (
                  <li key={idx} className="p-1.5 bg-slate-50 rounded border border-slate-200 text-slate-800 text-[11px] font-mono">
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Adjacent Line Status</span>
              <div className="p-2 bg-slate-50 rounded border border-slate-200 font-medium text-slate-700 text-[11px] mt-0.5">
                {block.adjacentLineStatus}
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px] mb-1">Assigned Maintenance Resources</span>
              <div className="flex flex-wrap gap-1">
                {block.resourcesAssigned.map((res: string, idx: number) => (
                  <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] border border-slate-200 font-mono">
                    {res}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Disconnection Authority</span>
              <span className="font-semibold text-slate-800 block mt-0.5">{block.disconnectionRequirements}</span>
            </div>
          </div>
        </div>

        {/* Section 3: Approval & Log */}
        <div className="bg-white rounded border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-800">
            <FileCheck2 className="w-4 h-4 text-emerald-600" />
            <span>3. COA Approval & Audit Log</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-emerald-50/60 rounded border border-emerald-200 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 block">
                Official Authorization
              </span>
              <div>
                <span className="text-slate-500 text-[11px] block">Approved By Authority:</span>
                <span className="font-bold text-slate-900">{block.approvedBy}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">Approval Timestamp:</span>
                <span className="font-mono text-slate-800">{block.approvalDate} IST</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px] mb-1">Current Operational Status</span>
              <div className="flex items-center gap-2">
                <StatusBadge status={block.status} />
                <span className="text-slate-500 text-[11px]">Committed to control charts</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px] mb-1">Modification History</span>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                Initial schedule created through automatic block planning optimization. No active deviations logged.
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
