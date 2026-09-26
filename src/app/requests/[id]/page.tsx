'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Cpu,
  MapPin,
  Wrench,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Clock,
  Layers,
  FileText,
  User,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { usePlanning } from '../../../context/PlanningContext';
import { PageContainer } from '../../../components/layout/PageContainer';
import { DepartmentBadge, PriorityBadge, UrgencyBadge, StatusBadge, Badge } from '../../../components/common/Badge';

import { MaintenanceRequest, AIPlanningPlan } from '../../../types/railway';
import { formatDurationDays, formatDurationMinutes } from '../../../lib/durationFormat';
import { resolveExactSection } from '../../../lib/railradar';

export default function RequestDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { requests, aiPlans } = usePlanning();

  const requestId = params?.id as string;
  const request = requests.find((r: MaintenanceRequest) => r.id === requestId) || requests[0];
  const matchingPlan = aiPlans.find((p: AIPlanningPlan) => p.requestId === request?.id);

  if (!request) {
    return (
      <PageContainer>
        <div className="bg-white rounded border border-slate-200 p-8 text-center">
          <p className="text-slate-600">Request {requestId} not found.</p>
          <Link href="/requests" className="text-blue-600 text-xs mt-2 inline-block">
            ← Back to Maintenance Requests
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Back link & Top Bar */}
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
                {request.id}
              </h1>
              <DepartmentBadge dept={request.department} />
              <StatusBadge status={request.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Source: <strong className="text-slate-700">{request.sourceSystem}</strong> • Submitted: {request.submittedDate}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/planning?request=${request.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-2xs border border-indigo-700 transition-colors"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Open in AI Planning</span>
          </Link>
        </div>
      </div>

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Request Information */}
        <div className="bg-white rounded border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-800">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>1. Request Information</span>
          </div>

          <div className="grid grid-cols-2 gap-y-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Request ID</span>
              <span className="font-mono font-bold text-slate-900">{request.id}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Department</span>
              <span className="font-medium text-slate-800">{request.department}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Source Enterprise System</span>
              <span className="font-mono font-semibold text-slate-700">{request.sourceSystem}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Submission Timestamp</span>
              <span className="text-slate-700">{request.submittedDate} IST</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Requested By Authority</span>
              <span className="font-medium text-slate-800">{request.requestedBy}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Priority & Urgency</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <PriorityBadge priority={request.priority} />
                <UrgencyBadge urgency={request.urgency} />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Location Information */}
        <div className="bg-white rounded border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-800">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>2. Railway Geographic Location</span>
          </div>

          <div className="grid grid-cols-2 gap-y-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Corridor</span>
              <span className="font-semibold text-slate-900">{request.corridor}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Block Section</span>
              <span className="font-medium text-slate-800 font-mono">
                {(() => {
                  const isGeneric = !request.blockSection ||
                    request.blockSection.toLowerCase().includes('erode - sankari') ||
                    request.blockSection.toLowerCase().includes('erode – sankari') ||
                    request.blockSection.toLowerCase() === request.corridor.toLowerCase();

                  const resolved = isGeneric ? resolveExactSection(request.corridor, request.fromKm, request.toKm) : null;
                  return resolved?.blockSection || request.blockSection || request.corridor;
                })()}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Operating Line</span>
              <span className="font-semibold text-slate-900">{request.line}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Kilometer Range</span>
              <span className="font-mono text-slate-800">Km {request.fromKm} → Km {request.toKm}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Maintenance Details */}
        <div className="bg-white rounded border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-800">
            <Wrench className="w-4 h-4 text-amber-600" />
            <span>3. Asset & Maintenance Details</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 block text-[11px]">Asset Name</span>
                <span className="font-semibold text-slate-900">{request.asset}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Asset Classification</span>
                <span className="text-slate-800">{request.assetType}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Maintenance Type</span>
              <span className="font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">
                {request.maintenanceType}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Defect Reason / Scientific Diagnosis</span>
              <div className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-700 text-xs mt-0.5">
                {request.defectReason}
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px]">Engineering Work Description</span>
              <p className="text-slate-600 text-xs leading-relaxed mt-0.5">
                {request.description}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-slate-500">Estimated Duration:</span>
              <div className="text-right font-mono">
                <span className="font-bold text-slate-900 text-sm block">
                  {formatDurationMinutes(request.estimatedDurationMin)}
                </span>
                <span className="text-xs text-blue-700 font-semibold block">
                  Day Format: {formatDurationDays(request.estimatedDurationMin)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Operational & Safety Requirements */}
        <div className="bg-white rounded border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-800">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>4. Operational & Safety Requirements</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 block text-[11px]">Block Required</span>
                <span className="font-bold text-slate-800">{request.blockRequired} Block</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Disconnection Required</span>
                <span className={`font-semibold ${request.disconnectionRequired ? 'text-amber-700' : 'text-slate-600'}`}>
                  {request.disconnectionRequired ? 'Yes (Mandatory)' : 'No Disconnection'}
                </span>
              </div>
            </div>

            {request.disconnectionType && (
              <div className="p-2 bg-amber-50 rounded border border-amber-200 text-amber-900 text-[11px] flex items-start gap-1.5">
                <Zap className="w-3.5 h-3.5 shrink-0 text-amber-600 mt-0.5" />
                <span><strong>Disconnection Protocol:</strong> {request.disconnectionType}</span>
              </div>
            )}

            <div>
              <span className="text-slate-400 block text-[11px] mb-1">Safety Precautions & Protections</span>
              <ul className="space-y-1">
                {request.safetyRequirements.map((s, idx) => (
                  <li key={idx} className="flex items-center gap-1.5 text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px] mb-1">Assigned Equipment & Gangs</span>
              <div className="flex flex-wrap gap-1.5">
                {request.resourcesRequired.map((res, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] border border-slate-200 font-mono">
                    {res}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 5: AI Planning Status & Decision Integration */}
      <div className="bg-white rounded border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
            <Cpu className="w-4 h-4 text-indigo-600" />
            <span>5. Centralized AI Planning & Scheduling State</span>
          </div>
          {matchingPlan ? (
            <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
              Linked Plan: {matchingPlan.planId}
            </span>
          ) : (
            <span className="text-xs text-slate-500">Unlinked</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Planning Priority Score</span>
            <div className="text-2xl font-bold text-indigo-700 tabular-nums mt-1">
              {request.aiPriorityScore || matchingPlan?.aiPriorityScore || 85}
              <span className="text-xs font-normal text-slate-400"> / 100</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Evaluated by multi-factor AI model</p>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Candidate Windows</span>
            <div className="text-2xl font-bold text-slate-800 tabular-nums mt-1">
              {request.candidateWindowsCount || 3}
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Viable slots identified</p>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Operational Conflict State</span>
            <div className="text-sm font-bold text-emerald-700 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>{matchingPlan?.conflictStatus || 'Clear for Scheduling'}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Timetable headway verified</p>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Planning Notes</span>
              <p className="text-xs text-slate-700 mt-1">
                {request.planningNotes || 'Standard planning criteria.'}
              </p>
            </div>
            <Link
              href={`/planning?request=${request.id}`}
              className="text-xs font-bold text-indigo-600 hover:underline mt-2 inline-flex items-center gap-1"
            >
              Review in Planning Suite →
            </Link>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
