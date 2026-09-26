'use client';

import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageContainer } from '../../components/layout/PageContainer';
import { PlanningControls } from '../../components/planning/PlanningControls';
import { OptimizationSummary } from '../../components/planning/OptimizationSummary';
import { PlanningBoxGrid } from '../../components/planning/PlanningBoxGrid';
import { PlanningTable } from '../../components/planning/PlanningTable';
import { AIRecommendation } from '../../components/planning/AIRecommendation';
import { PriorityScore } from '../../components/planning/PriorityScore';
import dynamic from 'next/dynamic';
import { usePlanning } from '../../context/PlanningContext';

const ModifyPlanModal = dynamic(
  () => import('../../components/planning/ModifyPlanModal').then(m => m.ModifyPlanModal),
  { ssr: false }
);
import { AIPlanningPlan } from '../../types/railway';
import Link from 'next/link';
import { Cpu, Check, Edit, X, LayoutGrid, TableProperties, ArrowRight } from 'lucide-react';
import PlanningLoading from './loading';

function AIPlanningContent() {
  const searchParams = useSearchParams();
  const requestParam = searchParams.get('request');

  const {
    aiPlans,
    selectedPlanId,
    setSelectedPlanId,
    selectedPlan,
    approvePlan,
    rejectPlan,
    modifyPlan,
    existingBlocks,
  } = usePlanning();

  const [horizon, setHorizon] = useState<'Today' | 'This Week' | 'This Month'>('This Week');
  const [selectedCorridor, setSelectedCorridor] = useState<string>('ALL');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [viewMode, setViewMode] = useState<'box' | 'table'>('box');

  const [modifyModalOpen, setModifyModalOpen] = useState(false);
  const [planToModify, setPlanToModify] = useState<AIPlanningPlan | null>(null);

  // If URL has ?request=BR-..., select the matching plan
  React.useEffect(() => {
    if (requestParam) {
      const match = aiPlans.find((p: AIPlanningPlan) => p.requestId === requestParam);
      if (match) {
        setSelectedPlanId(match.planId);
      }
    }
  }, [requestParam, aiPlans, setSelectedPlanId]);

  const filteredPlans = useMemo(() => {
    return aiPlans.filter((p: AIPlanningPlan) => {
      // Exclude approved plans from active AI candidate planning
      if (p.status === 'Approved') return false;
      if (selectedCorridor !== 'ALL' && !p.corridor.includes(selectedCorridor)) return false;
      if (selectedDept !== 'ALL') {
        if (selectedDept === 'Engineering' && p.departmentShort !== 'Engineering') return false;
        if (selectedDept === 'TRD' && p.departmentShort !== 'TRD') return false;
        if (selectedDept === 'S&T' && p.departmentShort !== 'S&T') return false;
      }
      return true;
    });
  }, [aiPlans, selectedCorridor, selectedDept]);

  const activePlan = filteredPlans.find(p => p.planId === selectedPlanId) || filteredPlans[0] || null;

  const handleOpenModify = (plan: AIPlanningPlan) => {
    setPlanToModify(plan);
    setModifyModalOpen(true);
  };

  return (
    <PageContainer>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-slate-700" />
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              AI Block Planning
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated conflict-aware block scheduling and multi-objective optimization for Control Office (COA)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 bg-slate-100 border border-slate-300 px-2.5 py-1 rounded font-medium">
            Optimization Engine: <strong className="text-slate-800">Operational Heuristic v2.4</strong>
          </span>
        </div>
      </div>

      {/* Top Planning Controls */}
      <PlanningControls
        horizon={horizon}
        setHorizon={setHorizon}
        selectedCorridor={selectedCorridor}
        setSelectedCorridor={setSelectedCorridor}
        selectedDept={selectedDept}
        setSelectedDept={setSelectedDept}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
      />

      {/* Optimization Summary Bar */}
      <OptimizationSummary />

      {/* Candidate Maintenance Block Plans Section */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Candidate Maintenance Block Plans
            </span>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 bg-slate-100 text-slate-800 rounded border border-slate-300">
              {filteredPlans.length} Pending Approval
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Link to Existing Blocks where approved plans reside */}
            <Link
              href="/blocks"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded border border-slate-300 text-xs font-semibold transition-colors"
              title="Open Existing Blocks to inspect scheduled and active blocks"
            >
              <span>View Approved in Existing Blocks ({existingBlocks.length})</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            </Link>

            {/* Single Button for View Type */}
            <button
              type="button"
              onClick={() => setViewMode(prev => (prev === 'box' ? 'table' : 'box'))}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded border border-slate-300 shadow-2xs transition-colors"
              title={`Switch layout to ${viewMode === 'box' ? 'Table View' : 'Box Design'}`}
            >
              {viewMode === 'box' ? (
                <>
                  <LayoutGrid className="w-3.5 h-3.5 text-slate-700" />
                  <span>View Type: Box Design</span>
                </>
              ) : (
                <>
                  <TableProperties className="w-3.5 h-3.5 text-slate-700" />
                  <span>View Type: Table View</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Render either Box UI or Table View */}
        {viewMode === 'box' ? (
          <PlanningBoxGrid
            plans={filteredPlans}
            selectedPlanId={activePlan?.planId}
            onSelectPlan={setSelectedPlanId}
            onApprove={approvePlan}
            onReject={rejectPlan}
            onOpenModify={handleOpenModify}
          />
        ) : (
          <PlanningTable
            plans={filteredPlans}
            selectedPlanId={activePlan?.planId}
            onSelectPlan={setSelectedPlanId}
            onApprove={approvePlan}
            onReject={rejectPlan}
            onOpenModify={handleOpenModify}
          />
        )}
      </div>

      {/* Detail Inspector Section for Selected Plan */}
      {activePlan && (
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200">
            <h2 className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <span>Operational Plan Inspection:</span>
              <span className="font-mono text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-300">
                {activePlan.planId} ({activePlan.department})
              </span>
            </h2>

            {/* Direct Approval Action Bar in Inspector */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => approvePlan(activePlan.planId)}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded shadow-2xs transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Approve Plan</span>
              </button>
              <button
                onClick={() => handleOpenModify(activePlan)}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded border border-slate-300 shadow-2xs transition-colors"
              >
                <Edit className="w-3.5 h-3.5 text-slate-500" />
                <span>Modify Parameters</span>
              </button>
              <button
                onClick={() => rejectPlan(activePlan.planId)}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-semibold rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
            </div>
          </div>

          {/* AI Recommendation Panel & Priority Score Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7">
              <AIRecommendation plan={activePlan} />
            </div>
            <div className="lg:col-span-5">
              <PriorityScore plan={activePlan} />
            </div>
          </div>
        </div>
      )}

      {/* Modify Plan Modal */}
      <ModifyPlanModal
        isOpen={modifyModalOpen}
        onClose={() => setModifyModalOpen(false)}
        plan={planToModify}
        onSave={modifyPlan}
      />
    </PageContainer>
  );
}

export default function AIPlanningPage() {
  return (
    <React.Suspense fallback={<PlanningLoading />}>
      <AIPlanningContent />
    </React.Suspense>
  );
}
