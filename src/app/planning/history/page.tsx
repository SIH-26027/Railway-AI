'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PageContainer } from '../../../components/layout/PageContainer';
import { usePlanning } from '../../../context/PlanningContext';
import {
  History,
  Eye,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Calendar,
  Layers,
  ShieldCheck,
  TrendingDown,
  ArrowRight,
  Cpu,
} from 'lucide-react';
import { Modal } from '../../../components/common/Modal';
import { PlanningRunHistory } from '../../../types/railway';

export default function PlanningHistoryPage() {
  const { planningHistory, clearPlanningHistory } = usePlanning();
  const [selectedRun, setSelectedRun] = useState<PlanningRunHistory | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleInspectRun = (run: PlanningRunHistory) => {
    setSelectedRun(run);
    setModalOpen(true);
  };

  // Aggregate metrics
  const totalRuns = planningHistory.length;
  const totalRequests = planningHistory.reduce((acc, r) => acc + (r.requestsProcessed || 0), 0);
  const totalPlansRecommended = planningHistory.reduce((acc, r) => acc + (r.recommendedPlans || 0), 0);
  const totalDowntimeSaved = planningHistory.reduce((acc, r) => {
    const saved = (r.estimatedDowntimeHours || 0) - (r.optimizedDowntimeHours || 0);
    return acc + Math.max(0, saved);
  }, 0);

  return (
    <PageContainer>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  AI Planning Execution History
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  COA Audit Trail
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Regulatory record of AI optimization runs, corridor candidate slot evaluations, conflict resolutions, and controller decisions
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 bg-slate-100 rounded border border-slate-200 text-slate-700 font-medium">
            Retention: 365 Days Working History
          </span>
          {totalRuns > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded transition-colors"
              title="Clear old execution run records"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Dialog to Clear History */}
      {showClearConfirm && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-amber-900">
            <span className="font-bold">Clear all execution run history?</span>
            <span>This will remove all {totalRuns} audit run records from your local storage session.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowClearConfirm(false)}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                clearPlanningHistory();
                setShowClearConfirm(false);
              }}
              className="px-2.5 py-1 text-xs font-semibold text-white bg-rose-600 rounded hover:bg-rose-700"
            >
              Confirm Clear
            </button>
          </div>
        </div>
      )}

      {/* Executive Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Optimization Runs</span>
            <Cpu className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">{totalRuns}</div>
          <span className="text-[10px] text-slate-400">Audited algorithm iterations</span>
        </div>

        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Requests Evaluated</span>
            <Layers className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">{totalRequests}</div>
          <span className="text-[10px] text-slate-400">Departmental submissions</span>
        </div>

        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Plans Recommended</span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700">{totalPlansRecommended}</div>
          <span className="text-[10px] text-slate-400">Conflict-free block proposals</span>
        </div>

        <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Capacity Hours Saved</span>
            <TrendingDown className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-xl font-bold font-mono text-indigo-700">{totalDowntimeSaved.toFixed(1)} hrs</div>
          <span className="text-[10px] text-slate-400">Via multi-department coordination</span>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        {planningHistory.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <History className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">No Planning Runs Recorded Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              When the AI Auto-Planner is run to evaluate departmental requests against train timetables and corridor rules, detailed execution dossiers will appear here.
            </p>
            <Link
              href="/planning"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700 transition-colors"
            >
              <span>Go to AI Block Planning</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th className="w-48">Planning Run ID</th>
                  <th className="w-52">Execution Time</th>
                  <th className="w-32">Horizon</th>
                  <th className="w-44 text-center">Recommended Plans</th>
                  <th className="w-44">Controller Decisions</th>
                  <th className="w-28 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {planningHistory.map((run) => {
                  const hasPlans = run.recommendedPlans > 0;
                  return (
                    <tr key={run.runId} className="hover:bg-slate-50/80 transition-colors">
                      {/* Run ID */}
                      <td>
                        <span className="font-mono font-bold text-xs text-indigo-700">
                          {run.runId}
                        </span>
                      </td>

                      {/* Execution Time */}
                      <td>
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-semibold text-slate-800">
                            {run.date}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {run.createdAt}
                          </span>
                        </div>
                      </td>

                      {/* Horizon */}
                      <td>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200 whitespace-nowrap">
                          {run.planningHorizon}
                        </span>
                      </td>

                      {/* Recommended Plans */}
                      <td className="text-center">
                        {hasPlans ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {run.recommendedPlans} Plan{run.recommendedPlans > 1 ? 's' : ''} Generated
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            0 Plans
                          </span>
                        )}
                      </td>

                      {/* Controller Decision Status */}
                      <td>
                        <div className="flex items-center gap-1.5 text-xs">
                          {run.approvedPlans > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                              {run.approvedPlans} Approved
                            </span>
                          )}
                          {run.rejectedPlans > 0 && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
                              {run.rejectedPlans} Rejected
                            </span>
                          )}
                          {run.approvedPlans === 0 && run.rejectedPlans === 0 && (
                            <span className="text-[11px] text-slate-500">
                              {hasPlans ? 'Pending Decision' : 'N/A'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="text-right whitespace-nowrap">
                        <button
                          onClick={() => handleInspectRun(run)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded transition-colors"
                          title="Inspect run dossier and capacity metrics"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Every run preserves deterministic validation snapshots for railway regulatory compliance.</span>
          <span className="font-semibold text-slate-700">{planningHistory.length} Recorded Runs</span>
        </div>
      </div>

      {/* Inspect Run Modal ("Dossier") */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedRun ? `Planning Run Dossier: ${selectedRun.runId}` : 'Planning Run Details'}
        subtitle={selectedRun ? `Executed on ${selectedRun.date} at ${selectedRun.createdAt}` : ''}
        maxWidth="2xl"
      >
        {selectedRun && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Planning Horizon</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">{selectedRun.planningHorizon}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Requests Ingested</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">{selectedRun.requestsProcessed}</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded border border-emerald-200">
                <span className="text-emerald-800 text-[10px] uppercase font-bold block">Valid Windows</span>
                <span className="font-bold text-emerald-900 text-sm mt-0.5 block">{selectedRun.validWindows}</span>
              </div>
              <div className="p-3 bg-rose-50 rounded border border-rose-200">
                <span className="text-rose-800 text-[10px] uppercase font-bold block">Conflicts Cleared</span>
                <span className="font-bold text-rose-900 text-sm mt-0.5 block">{selectedRun.conflictingWindowsRemoved}</span>
              </div>
            </div>

            <div className="p-3.5 bg-indigo-50/60 rounded border border-indigo-200 space-y-2">
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider block">
                Optimization Outcome & Capacity Savings
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Uncoordinated Downtime:</span>
                  <span className="font-bold text-slate-800 font-mono text-sm">{selectedRun.estimatedDowntimeHours} hours</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Optimized Downtime:</span>
                  <span className="font-bold text-emerald-700 font-mono text-sm">{selectedRun.optimizedDowntimeHours} hours</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Multi-Dept Windows:</span>
                  <span className="font-bold text-blue-800 font-mono text-sm">{selectedRun.coordinationOpportunities} Coordinated</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
              <span className="text-slate-700 font-bold block">Controller Action Log:</span>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Total <strong>{selectedRun.recommendedPlans}</strong> plans were submitted for COA controller decision. <strong>{selectedRun.approvedPlans}</strong> approved into operational schedule, <strong>{selectedRun.rejectedPlans}</strong> returned with remarks.
              </p>
            </div>

            {/* Audit & Compliance Metadata */}
            <div className="p-2.5 bg-slate-100 rounded border border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-700">Audit Reference: </span>
                <span className="font-mono">{selectedRun.runId}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Executed At: </span>
                <span className="font-mono">{selectedRun.date} {selectedRun.createdAt}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded text-xs transition-colors"
              >
                Close Dossier
              </button>
            </div>
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}
