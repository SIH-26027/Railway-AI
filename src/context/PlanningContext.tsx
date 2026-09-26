'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  MaintenanceRequest,
  AIPlanningPlan,
  ExistingBlock,
  CorridorSection,
  TrainSchedule,
  ResourceItem,
  PlanningRunHistory
} from '../types/railway';
import {
  fetchBlockRequests,
  fetchBlockPlans,
  fetchExistingBlocks,
  fetchCorridors,
  fetchTrains,
  createBlockRequest,
} from '../lib/fetchData';
import { determineBlockStatus } from '../lib/blockStatus';
import { supabase } from '../lib/supabase';

interface PlanningContextType {
  requests: MaintenanceRequest[];
  aiPlans: AIPlanningPlan[];
  existingBlocks: ExistingBlock[];
  corridors: CorridorSection[];
  trains: TrainSchedule[];
  resources: ResourceItem[];
  planningHistory: PlanningRunHistory[];

  isLoading: boolean;
  loadError: string | null;

  selectedPlanId: string;
  setSelectedPlanId: (id: string) => void;
  selectedPlan: AIPlanningPlan | undefined;

  approvePlan: (planId: string) => void;
  rejectPlan: (planId: string, remarks?: string) => void;
  modifyPlan: (
    planId: string,
    updates: {
      date: string;
      startTime: string;
      endTime: string;
      durationMin: number;
      corridor: string;
      line: string;
      remarks: string;
    }
  ) => void;

  addMaintenanceRequest: (reqData: any) => Promise<boolean>;

  selectedCandidateWindowId: string;
  setSelectedCandidateWindowId: (id: string) => void;

  generateRecommendations: () => void;
  isGenerating: boolean;
  notificationMessage: string | null;
  dismissNotification: () => void;

  refreshData: () => void;
  clearPlanningHistory: () => void;
}

const PlanningContext = createContext<PlanningContextType | undefined>(undefined);

export function PlanningProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [aiPlans, setAiPlans] = useState<AIPlanningPlan[]>([]);
  const [existingBlocks, setExistingBlocks] = useState<ExistingBlock[]>([]);
  const [corridors, setCorridors] = useState<CorridorSection[]>([]);
  const [trains, setTrains] = useState<TrainSchedule[]>([]);
  const [resources] = useState<ResourceItem[]>([]);
  const [planningHistory, setPlanningHistory] = useState<PlanningRunHistory[]>([]);

  // Load persistent planning history from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('railway_planning_history');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPlanningHistory(parsed);
          }
        }
      } catch (e) {
        console.error('Failed to load planningHistory from localStorage:', e);
      }
    }
  }, []);

  const clearPlanningHistory = React.useCallback(() => {
    setPlanningHistory([]);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('railway_planning_history');
      } catch (e) {
        console.error('Failed to clear planningHistory from localStorage:', e);
      }
    }
  }, []);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedCandidateWindowId, setSelectedCandidateWindowId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);

  // ─── Load all data from Supabase on mount ───────────────────────────────────
  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [reqData, plansData, blocksData, corridorData, trainData] = await Promise.all([
        fetchBlockRequests(),
        fetchBlockPlans(),
        fetchExistingBlocks(),
        fetchCorridors(),
        fetchTrains(),
      ]);

      const blocksWithLiveStatus = blocksData.map(b => {
        if (b.status === 'Scheduled' || b.status === 'Active') {
          const s = determineBlockStatus(b.date, b.startTime, b.endTime);
          return { ...b, status: s };
        }
        return b;
      });

      setRequests(reqData);
      setAiPlans(plansData);
      setExistingBlocks(blocksWithLiveStatus);
      setCorridors(corridorData);
      setTrains(trainData);

      // Auto-select first plan if any
      if (plansData.length > 0 && !selectedPlanId) {
        setSelectedPlanId(plansData[0].planId);
      }
    } catch (err: any) {
      console.error('Failed to load data from Supabase:', err);
      setLoadError(err?.message ?? 'Failed to connect to database.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedPlan = React.useMemo(
    () => aiPlans.find(p => p.planId === selectedPlanId),
    [aiPlans, selectedPlanId]
  );

  // ─── COA Actions — persisted to Supabase ──────────────────────────────────

  const approvePlan = React.useCallback(async (planId: string) => {
    const targetPlan = aiPlans.find(p => p.planId === planId)
      || aiPlans.find(p => p.planId.startsWith(planId) || planId.startsWith(p.planId));
    if (!targetPlan) return;

    // Calculate whether status is 'Active' or 'Scheduled' according to date & time
    const computedStatus = determineBlockStatus(
      targetPlan.recommendedDate,
      targetPlan.startTime,
      targetPlan.endTime
    );

    const actualPlanId = targetPlan.planId;
    const cleanId = actualPlanId.replace(/^PLAN-/, '').replace(/^BP-/, '');
    const newBlockId = `BLK-${cleanId}`;

    let corridorId: string | null = targetPlan.corridorId ?? null;

    // 1. Persist to Supabase
    try {
      // a. Update block_plans status to Approved
      const { error: planErr } = await supabase
        .from('block_plans')
        .update({
          status: 'Approved',
          approved_at: new Date().toISOString(),
        })
        .or(`plan_id.eq.${actualPlanId},plan_id.eq.${planId}`);

      if (planErr) {
        console.error('approvePlan Supabase plan error:', planErr.message);
      }

      // b. Query plan metadata (corridor_id, request_id, department_id)
      const { data: planRow } = await supabase
        .from('block_plans')
        .select(`
          corridor_id,
          request_id,
          block_requests!block_plans_request_id_fkey (
            department_id
          )
        `)
        .or(`plan_id.eq.${actualPlanId},plan_id.eq.${planId}`)
        .maybeSingle();

      if (!corridorId) {
        corridorId = planRow?.corridor_id ?? null;
      }
      let departmentId = (planRow?.block_requests as any)?.department_id;

      // Robust fallback resolution for corridorId and departmentId so existing_blocks insertion never fails
      if (!corridorId && targetPlan.corridor) {
        const { data: corData } = await supabase
          .from('corridors')
          .select('id')
          .ilike('corridor_name', `%${targetPlan.corridor}%`)
          .limit(1)
          .maybeSingle();
        if (corData) corridorId = corData.id;
      }
      if (!departmentId && targetPlan.department) {
        const { data: deptData } = await supabase
          .from('departments')
          .select('id')
          .ilike('name', `%${targetPlan.department}%`)
          .limit(1)
          .maybeSingle();
        if (deptData) departmentId = deptData.id;
      }
      if (!corridorId) {
        const { data: cFallback } = await supabase.from('corridors').select('id').limit(1).maybeSingle();
        if (cFallback) corridorId = cFallback.id;
      }
      if (!departmentId) {
        const { data: dFallback } = await supabase.from('departments').select('id').limit(1).maybeSingle();
        if (dFallback) departmentId = dFallback.id;
      }

      // c. Upsert into existing_blocks table in Supabase
      if (corridorId && departmentId) {
        const purpose = targetPlan.requestIds && targetPlan.requestIds.length > 1
          ? `Coordinated Block (${targetPlan.requestIds.join(', ')}) - ${targetPlan.maintenanceType} - ${targetPlan.asset}`
          : `${targetPlan.maintenanceType} - ${targetPlan.asset}`;

        const startTimeFormatted = targetPlan.startTime.length === 5 ? `${targetPlan.startTime}:00` : targetPlan.startTime;
        const endTimeFormatted = targetPlan.endTime.length === 5 ? `${targetPlan.endTime}:00` : targetPlan.endTime;

        const { error: insErr } = await supabase
          .from('existing_blocks')
          .upsert({
            block_id: newBlockId,
            corridor_id: corridorId,
            department_id: departmentId,
            purpose,
            block_date: targetPlan.recommendedDate,
            start_time: startTimeFormatted,
            end_time: endTimeFormatted,
            duration_minutes: targetPlan.durationMin,
            line: targetPlan.line || 'UP Line',
            status: computedStatus,
            source: 'COA Schedule',
            remarks: `Approved from Plan ${actualPlanId} by COA Chief Controller`,
          }, { onConflict: 'block_id' });

        if (insErr) {
          console.error('approvePlan upsert existing_blocks error:', insErr.message);
        }
      }

      // d. Update block_requests status to Planned for all constituent requests
      const targetReqIds = targetPlan.requestIds && targetPlan.requestIds.length > 0
        ? targetPlan.requestIds
        : [targetPlan.requestId];

      for (const rid of targetReqIds) {
        if (rid) {
          await supabase
            .from('block_requests')
            .update({
              status: 'Planned',
              updated_at: new Date().toISOString()
            })
            .eq('request_id', rid);
        }
      }
      if (planRow?.request_id) {
        await supabase
          .from('block_requests')
          .update({
            status: 'Planned',
            updated_at: new Date().toISOString()
          })
          .eq('id', planRow.request_id);
      }

      // e. Update corridor status to 'Blocked' in Supabase
      if (corridorId) {
        const { error: corErr } = await supabase
          .from('corridors')
          .update({ availability_status: 'Blocked' })
          .eq('id', corridorId);
        if (corErr) console.error('approvePlan corridor update error:', corErr.message);
      } else if (targetPlan.corridor && targetPlan.blockSection) {
        await supabase
          .from('corridors')
          .update({ availability_status: 'Blocked' })
          .ilike('corridor_name', `%${targetPlan.corridor}%`)
          .ilike('block_section', `%${targetPlan.blockSection}%`);
      }

      // Optionally call planner API approve endpoint to keep backend synchronized
      const PLANNER_URL = process.env.NEXT_PUBLIC_PLANNER_API_URL || 'http://localhost:8000';
      try {
        await fetch(`${PLANNER_URL}/api/planning/plans/${actualPlanId}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ remarks: 'Approved by COA Controller' })
        });
      } catch (apiErr) {
        // Backend notification non-blocking
      }
    } catch (err: any) {
      console.error('approvePlan persistence error:', err);
    }

    // 2. Update local state
    const allApprovedIds = new Set(
      targetPlan.requestIds && targetPlan.requestIds.length > 0
        ? targetPlan.requestIds
        : [targetPlan.requestId]
    );

    setRequests(prevRequests =>
      prevRequests.map(r =>
        allApprovedIds.has(r.id) ? { ...r, status: 'Planned' } : r
      )
    );

    const newBlock: ExistingBlock = {
      blockId: newBlockId,
      corridor: targetPlan.corridor,
      blockSection: targetPlan.blockSection,
      line: (targetPlan.line as any) || 'UP Line',
      department: targetPlan.department,
      departmentShort: targetPlan.departmentShort,
      purpose: `${targetPlan.maintenanceType} - ${targetPlan.asset}`,
      date: targetPlan.recommendedDate,
      startTime: targetPlan.startTime,
      endTime: targetPlan.endTime,
      durationMin: targetPlan.durationMin,
      status: computedStatus,
      source: 'COA Schedule (AI Approved)',
      approvedBy: 'Chief Controller / Salem COA',
      approvalDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
      trainMovementsAffected: targetPlan.ruleValidation?.details?.affectedTrains?.length
        ? targetPlan.ruleValidation.details.affectedTrains
        : ['Nil (Slot optimized for low freight buffer)'],
      adjacentLineStatus: 'Open with standard caution precautions',
      resourcesAssigned: [`Team assigned for ${targetPlan.departmentShort}`],
      safetyRequirements: ['Banner flag protection', 'Traction discharge where applicable'],
      disconnectionRequirements: targetPlan.conflictStatus.includes('Power')
        ? 'TPC Power isolation memo approved'
        : 'Standard safety clearance'
    };

    setExistingBlocks(prevBlocks => [
      newBlock,
      ...prevBlocks.filter(b => b.blockId !== newBlockId)
    ]);

    // Update corridors state immediately: mark section as Blocked
    setCorridors(prevCorridors =>
      prevCorridors.map(c => {
        const norm = (s: string) => (s || '').toLowerCase().replace(/[\u2010-\u2015-]/g, '-').trim();
        const matchesCorridor =
          (corridorId && c.id === corridorId) ||
          (norm(c.corridor) === norm(targetPlan.corridor) &&
            (norm(c.section).includes(norm(targetPlan.blockSection)) ||
             norm(targetPlan.blockSection).includes(norm(c.section))) &&
            (!targetPlan.line || c.line === targetPlan.line));

        if (matchesCorridor) {
          return {
            ...c,
            currentAvailability: 'Blocked' as const,
            activeBlock: newBlockId,
            status: 'Under Maintenance' as const,
            maxSpeedKmph: 0,
          };
        }
        return c;
      })
    );

    // Remove approved plan from AI Planning so it is no longer listed as a candidate
    setAiPlans(prevPlans => prevPlans.filter(p => p.planId !== actualPlanId && p.planId !== planId));

    // Automatically advance active selection to the next candidate plan
    setSelectedPlanId(prevId => {
      if (prevId === planId || prevId === actualPlanId) {
        const next = aiPlans.find(p => p.planId !== planId && p.planId !== actualPlanId);
        return next ? next.planId : '';
      }
      return prevId;
    });

    setNotificationMessage(
      `✓ Plan ${actualPlanId} approved! Moved to Existing Blocks as ${newBlockId} (${computedStatus}).`
    );

    // Re-sync with Supabase to keep all views current
    loadData().catch(e => console.error('Error re-syncing data after approval:', e));
  }, [aiPlans, selectedPlanId, loadData]);

  const rejectPlan = React.useCallback(async (planId: string, remarks?: string) => {
    // 1. Persist to Supabase
    try {
      const { error } = await supabase
        .from('block_plans')
        .update({
          status: 'Rejected',
          coa_remarks: remarks || 'Rejected by COA Controller',
        })
        .eq('plan_id', planId);

      if (error) {
        console.error('rejectPlan Supabase error:', error.message);
        setNotificationMessage(`Error rejecting plan ${planId}: ${error.message}`);
        return;
      }
    } catch (err: any) {
      console.error('rejectPlan network error:', err);
      setNotificationMessage(`Network error rejecting plan ${planId}`);
      return;
    }

    // 2. Update local state
    setAiPlans(prevPlans => {
      const targetPlan = prevPlans.find(p => p.planId === planId);
      if (!targetPlan) return prevPlans;

      setRequests(prevRequests =>
        prevRequests.map(r =>
          r.id === targetPlan.requestId
            ? { ...r, status: 'Pending Planning', planningNotes: `AI plan rejected: ${remarks || 'Re-planning requested'}` }
            : r
        )
      );

      setNotificationMessage(`Plan ${planId} marked as Rejected. Returned to Pending Planning pool.`);

      return prevPlans.map(p =>
        p.planId === planId
          ? { ...p, status: 'Rejected', coaRemarks: remarks || 'Rejected by COA Controller' }
          : p
      );
    });
  }, []);

  const modifyPlan = React.useCallback(async (
    planId: string,
    updates: {
      date: string;
      startTime: string;
      endTime: string;
      durationMin: number;
      corridor: string;
      line: string;
      remarks: string;
    }
  ) => {
    // 1. Persist to Supabase
    try {
      const { error } = await supabase
        .from('block_plans')
        .update({
          status: 'Modified – Pending Approval',
          recommended_date: updates.date,
          recommended_start_time: updates.startTime,
          recommended_end_time: updates.endTime,
          duration_minutes: updates.durationMin,
          coa_remarks: updates.remarks,
        })
        .eq('plan_id', planId);

      if (error) {
        console.error('modifyPlan Supabase error:', error.message);
        setNotificationMessage(`Error modifying plan ${planId}: ${error.message}`);
        return;
      }
    } catch (err: any) {
      console.error('modifyPlan network error:', err);
      setNotificationMessage(`Network error modifying plan ${planId}`);
      return;
    }

    // 2. Update local state
    setAiPlans(prev =>
      prev.map(p => {
        if (p.planId !== planId) return p;
        return {
          ...p,
          recommendedDate: updates.date,
          startTime: updates.startTime,
          endTime: updates.endTime,
          durationMin: updates.durationMin,
          corridor: updates.corridor,
          line: updates.line,
          status: 'Modified – Pending Approval',
          coaRemarks: updates.remarks
        };
      })
    );

    setNotificationMessage(`Plan ${planId} modified. Status set to Modified – Pending Approval.`);
  }, []);

  const addMaintenanceRequest = React.useCallback(async (reqData: any): Promise<boolean> => {
    try {
      const res = await createBlockRequest(reqData);
      if (res.success && res.data) {
        setRequests(prev => [res.data!, ...prev]);
        setNotificationMessage(`Block Request ${res.data.id} submitted for exact section: ${res.data.blockSection} (Km ${res.data.fromKm} - ${res.data.toKm})`);
        return true;
      } else {
        setNotificationMessage(`Error creating block request: ${res.error || 'Unknown error'}`);
        return false;
      }
    } catch (e: any) {
      console.error('addMaintenanceRequest error:', e);
      return false;
    }
  }, []);

  const generateRecommendations = React.useCallback(async () => {
    const PLANNER_URL = process.env.NEXT_PUBLIC_PLANNER_API_URL || 'http://localhost:8000';
    setIsGenerating(true);
    setNotificationMessage(`AI Optimization Engine executing: Evaluating ${requests.length} request(s) against corridor headways...`);

    try {
      const res = await fetch(`${PLANNER_URL}/api/planning/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Planner API error ${res.status}: ${errText}`);
      }

      const result = await res.json();
      const plansGenerated: number = result.plans_generated ?? result.plansGenerated ?? 0;
      const runId: string = result.run_id ?? result.runId ?? `RUN-${new Date().toISOString().slice(0, 10)}`;

      setNotificationMessage(
        plansGenerated > 0
          ? `✓ AI Planning complete — ${plansGenerated} block plan(s) generated. Refreshing...`
          : '⚠ AI Planning complete — no new feasible windows found for current requests.'
      );

      // Re-fetch real data from Supabase
      await loadData();

      setPlanningHistory(prev => {
        const newRun: PlanningRunHistory = {
          runId,
          date: new Date().toISOString().slice(0, 10),
          planningHorizon: 'This Week',
          requestsProcessed: result.requests_processed ?? requests.length,
          candidateWindows: result.candidate_windows ?? 0,
          validWindows: result.valid_windows ?? 0,
          conflictingWindowsRemoved: result.conflicts_removed ?? 0,
          recommendedPlans: plansGenerated,
          approvedPlans: aiPlans.filter(p => p.status === 'Approved').length,
          rejectedPlans: aiPlans.filter(p => p.status === 'Rejected').length,
          conflictsDetected: result.conflicts_detected ?? 0,
          estimatedDowntimeHours: result.baseline_hours ?? 0,
          optimizedDowntimeHours: result.optimized_hours ?? 0,
          coordinationOpportunities: result.coordination_opportunities ?? 0,
          createdAt: new Date().toLocaleTimeString() + ' IST',
          executedBy: 'AI Engine v2.4 (Real Planner API)',
        };
        const updated = [newRun, ...prev];
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('railway_planning_history', JSON.stringify(updated));
          } catch (e) {
            console.error('Failed to save planningHistory to localStorage:', e);
          }
        }
        return updated;
      });
    } catch (err: any) {
      console.error('Planner API error:', err);
      setNotificationMessage(
        `⚠ Planner API unreachable: ${err.message}. Make sure the Python planner is running on port 8000 (cd planner-api && uvicorn main:app --reload).`
      );
    } finally {
      setIsGenerating(false);
    }
  }, [requests, aiPlans, loadData]);

  const dismissNotification = React.useCallback(() => {
    setNotificationMessage(null);
  }, []);

  const contextValue = React.useMemo(() => ({
    requests,
    aiPlans,
    existingBlocks,
    corridors,
    trains,
    resources,
    planningHistory,
    isLoading,
    loadError,
    selectedPlanId,
    setSelectedPlanId,
    selectedPlan,
    approvePlan,
    rejectPlan,
    modifyPlan,
    addMaintenanceRequest,
    selectedCandidateWindowId,
    setSelectedCandidateWindowId,
    generateRecommendations,
    isGenerating,
    notificationMessage,
    dismissNotification,
    refreshData: loadData,
    clearPlanningHistory,
  }), [
    requests,
    aiPlans,
    existingBlocks,
    corridors,
    trains,
    resources,
    planningHistory,
    isLoading,
    loadError,
    selectedPlanId,
    selectedPlan,
    approvePlan,
    rejectPlan,
    modifyPlan,
    addMaintenanceRequest,
    selectedCandidateWindowId,
    generateRecommendations,
    isGenerating,
    notificationMessage,
    dismissNotification,
    loadData,
    clearPlanningHistory,
  ]);

  return (
    <PlanningContext.Provider value={contextValue}>
      {children}
    </PlanningContext.Provider>
  );
}

export function usePlanning() {
  const context = useContext(PlanningContext);
  if (!context) {
    throw new Error('usePlanning must be used within a PlanningProvider');
  }
  return context;
}
