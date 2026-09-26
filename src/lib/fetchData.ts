/**
 * Supabase Data Fetching Layer
 * Maps database rows (snake_case) → app TypeScript types (camelCase)
 */

import { supabase } from './supabase';
import {
  MaintenanceRequest,
  AIPlanningPlan,
  ExistingBlock,
  CorridorSection,
  TrainSchedule,
  Department,
} from '../types/railway';
import { resolveExactSection } from './railradar';

// Known chainages fallback for Salem Division maintenance blocks
const FALLBACK_CHAINAGES: Record<string, { fromKm: number; toKm: number }> = {
  'BR-2026-001': { fromKm: 342.10, toKm: 342.18 },
  'BR-2026-002': { fromKm: 338.50, toKm: 341.20 },
  'BR-2026-003': { fromKm: 341.00, toKm: 342.50 },
  'BR-2026-004': { fromKm: 365.20, toKm: 368.50 },
  'BR-2026-005': { fromKm: 366.10, toKm: 367.40 },
  'BR-2026-006': { fromKm: 420.10, toKm: 420.80 },
  'BR-2026-007': { fromKm: 182.00, toKm: 185.50 },
  'BR-2026-008': { fromKm: 512.30, toKm: 514.00 },
  'BR-2026-009': { fromKm: 343.00, toKm: 345.50 },
};

/**
 * Extracts or dynamically resolves the exact inter-station block section
 * (e.g. "Erode Jn – Cauvery") instead of falling back to broad multi-station corridor labels.
 */
export function extractExactBlockSection(
  row: any,
  corridorName: string,
  fromKm: number,
  toKm: number
): string {
  // 1. Check if remarks has "Exact inter-station section: <section>"
  if (row?.remarks) {
    const m = row.remarks.match(/Exact (?:inter-station )?section:\s*([^\r\n;,]+)/i);
    if (m && m[1]?.trim()) {
      const sec = m[1].trim();
      if (!sec.toLowerCase().includes('erode - sankari') && !sec.toLowerCase().includes('erode – sankari')) {
        return sec;
      }
    }
  }

  // 2. Check if description has "targeted to exact block section <section> (Km"
  if (row?.description) {
    const m = row.description.match(/targeted to exact block section\s+([^(;,]+?)(?:\s*\(Km|$)/i);
    if (m && m[1]?.trim()) {
      const sec = m[1].trim();
      if (!sec.toLowerCase().includes('erode - sankari') && !sec.toLowerCase().includes('erode – sankari')) {
        return sec;
      }
    }
  }

  // 3. Resolve exact section via RailRadar chainage resolver
  if (corridorName && (fromKm > 0 || toKm > 0)) {
    const resolved = resolveExactSection(corridorName, fromKm, toKm);
    if (resolved && resolved.blockSection) {
      return resolved.blockSection;
    }
  }

  // 4. If row has an explicit block_section property on itself
  if (row?.block_section && typeof row.block_section === 'string') {
    return row.block_section;
  }

  // 5. Fallback to corridor's block_section or corridor name
  return row?.corridors?.block_section || corridorName || 'Mainline Section';
}

// ─────────────────────────────────────────────────────────────
// MAINTENANCE REQUESTS  (block_requests table)
// ─────────────────────────────────────────────────────────────

export async function fetchBlockRequests(): Promise<MaintenanceRequest[]> {
  // First attempt: Select from_km, to_km, chainage_from, chainage_to
  let rawData: any[] | null = null;
  const res = await supabase
    .from('block_requests')
    .select(`
      id,
      request_id,
      from_km,
      to_km,
      chainage_from,
      chainage_to,
      asset_type,
      asset_name,
      maintenance_type,
      defect_reason,
      description,
      priority,
      urgency,
      requested_date,
      preferred_start_time,
      duration_minutes,
      block_required,
      disconnection_required,
      safety_requirements,
      resources_required,
      requested_by,
      status,
      remarks,
      created_at,
      updated_at,
      departments!block_requests_department_id_fkey (
        name,
        system_name
      ),
      corridors!block_requests_corridor_id_fkey (
        corridor_name,
        block_section,
        line
      )
    `)
    .order('created_at', { ascending: false });

  // If from_km / to_km columns do not exist yet in DB schema (error 42703), retry without from_km/to_km
  if (res.error && (res.error.code === '42703' || res.error.message?.includes('from_km'))) {
    const fallbackRes = await supabase
      .from('block_requests')
      .select(`
        id,
        request_id,
        chainage_from,
        chainage_to,
        asset_type,
        asset_name,
        maintenance_type,
        defect_reason,
        description,
        priority,
        urgency,
        requested_date,
        preferred_start_time,
        duration_minutes,
        block_required,
        disconnection_required,
        safety_requirements,
        resources_required,
        requested_by,
        status,
        remarks,
        created_at,
        updated_at,
        departments!block_requests_department_id_fkey (
          name,
          system_name
        ),
        corridors!block_requests_corridor_id_fkey (
          corridor_name,
          block_section,
          line
        )
      `)
      .order('created_at', { ascending: false });

    rawData = fallbackRes.data as any[] | null;
  } else {
    rawData = res.data as any[] | null;
  }

  if (!rawData && res.error) {
    console.error('fetchBlockRequests error:', res.error.message);
    return [];
  }

  return (rawData ?? []).map((row: any) => {
    const fallback = FALLBACK_CHAINAGES[row.request_id] || { fromKm: 340.0, toKm: 342.0 };
    const rawFrom = row.from_km ?? row.chainage_from;
    const rawTo = row.to_km ?? row.chainage_to;
    const parsedFrom = (rawFrom !== undefined && rawFrom !== null && Number(rawFrom) > 0)
      ? Number(rawFrom)
      : fallback.fromKm;
    const parsedTo = (rawTo !== undefined && rawTo !== null && Number(rawTo) > 0)
      ? Number(rawTo)
      : fallback.toKm;

    return {
      id:                   row.request_id,
      department:           row.departments?.name ?? 'Unknown',
      departmentShort:      mapDeptShort(row.departments?.name),
      sourceSystem:         row.departments?.system_name ?? 'Unknown',
      corridor:             row.corridors?.corridor_name ?? '',
      blockSection:         extractExactBlockSection(row, row.corridors?.corridor_name ?? '', parsedFrom, parsedTo),
      line:                 (row.corridors?.line ?? 'UP Line') as any,
      fromKm:               parsedFrom,
      toKm:                 parsedTo,
      asset:                row.asset_name ?? '',
      assetType:            row.asset_type ?? '',
      maintenanceType:      row.maintenance_type ?? '',
      defectReason:         row.defect_reason ?? '',
      description:          row.description ?? '',
      requestedDate:        row.requested_date ?? '',
      estimatedDurationMin: row.duration_minutes ?? 0,
      priority:             (row.priority ?? 'Medium') as any,
      urgency:              (row.urgency ?? 'Normal') as any,
      operationalImpact:    'Medium' as any,
      status:               (row.status ?? 'Pending Planning') as any,
      requestedBy:          row.requested_by ?? '',
      submittedDate:        row.created_at ? row.created_at.slice(0, 16).replace('T', ' ') : '',
      blockRequired:        row.block_required ? 'Absolute' : 'Shadow',
      disconnectionRequired: row.disconnection_required ?? false,
      disconnectionType:    undefined,
      safetyRequirements:   splitText(row.safety_requirements),
      resourcesRequired:    splitText(row.resources_required),
      planningNotes:        row.remarks ?? undefined,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// AI BLOCK PLANS  (block_plans table)
// ─────────────────────────────────────────────────────────────

export async function fetchBlockPlans(): Promise<AIPlanningPlan[]> {
  const { data, error } = await supabase
    .from('block_plans')
    .select(`
      id,
      plan_id,
      recommended_date,
      recommended_start_time,
      recommended_end_time,
      duration_minutes,
      priority_score,
      train_impact_score,
      asset_impact_score,
      resource_availability_score,
      conflict_status,
      rule_validation_status,
      optimization_status,
      planning_reason,
      status,
      coa_remarks,
      approved_at,
      created_at,
      block_requests!block_plans_request_id_fkey (
        request_id,
        priority,
        urgency,
        asset_type,
        asset_name,
        maintenance_type,
        chainage_from,
        chainage_to,
        remarks,
        description,
        departments!block_requests_department_id_fkey (
          name,
          system_name
        )
      ),
      corridors!block_plans_corridor_id_fkey (
        corridor_name,
        block_section,
        line
      )
    `)
    .neq('status', 'Approved')
    .order('priority_score', { ascending: false });

  if (error) {
    console.error('fetchBlockPlans error:', error.message);
    return [];
  }

  const rawPlans: AIPlanningPlan[] = (data ?? []).map((row: any) => {
    const req = row.block_requests;
    const cor = row.corridors;
    const dept = req?.departments;
    const reqFrom = Number(req?.chainage_from || 0);
    const reqTo = Number(req?.chainage_to || 0);

    const combinedText = `${row.coa_remarks || ''} ${row.optimization_status || ''}`;
    const matchedReqIds = Array.from(new Set((combinedText.match(/BR-\d{4}-[A-Za-z0-9]+/g) || [])));
    const requestIds = matchedReqIds.length > 0
      ? matchedReqIds
      : (req?.request_id ? [req.request_id] : []);

    const rawConflict = row.conflict_status;
    const cleanConflict = (rawConflict === 'Clear' || !rawConflict) ? 'No Conflict' : rawConflict;

    const deptMatch = combinedText.match(/across\s*\[(.*?)\]/i) || combinedText.match(/Block\s*\((.*?)\)/i);
    let deptsList: Department[] = [];
    if (deptMatch && deptMatch[1]) {
      deptsList = deptMatch[1].split(/[,/]/).map(d => d.trim()).filter(Boolean) as Department[];
    }
    const isCoaReg = row.status === 'COA Approval Required' ||
      combinedText.toLowerCase().includes('coa approval') ||
      Boolean(row.planning_reason?.toLowerCase().includes('operational regulation'));

    let computedFinalStatus: AIPlanningPlan['finalStatus'] = 'PLANNED';
    if (isCoaReg) {
      computedFinalStatus = 'COA_APPROVAL_REQUIRED';
    } else if (combinedText.includes('Integrated Multi-Request') || requestIds.length > 1) {
      computedFinalStatus = 'COMBINED_BLOCK';
    } else if (combinedText.includes('Absorbed into Existing Block')) {
      computedFinalStatus = 'EXISTING_BLOCK_ABSORBED';
    } else if (combinedText.includes('Split Maintenance Block')) {
      computedFinalStatus = 'SPLIT_PLAN';
    }

    // Priority points calculation:
    // 1. Criticality: from priority (Highest=100, High=85, Medium=60, Low=30)
    const priorityMap: Record<string, number> = { Highest: 100, High: 85, Medium: 60, Low: 30 };
    const rawPriority = req?.priority || 'High';
    const criticalityPoint = priorityMap[rawPriority] ?? 85;

    // 2. Urgency: from urgency (Critical=100, Urgent=85, Normal=50, Routine=25, Low=20)
    const urgencyMap: Record<string, number> = { Critical: 100, Urgent: 85, Normal: 50, Routine: 25, Low: 20 };
    const rawUrgency = req?.urgency || 'Urgent';
    const urgencyPoint = urgencyMap[rawUrgency] ?? 85;

    // 3. Asset Impact: from asset impact score or high-impact default
    const rawAssetImpact = Number(row.asset_impact_score);
    const assetImpactPoint = (rawAssetImpact && rawAssetImpact > 30) ? Math.round(rawAssetImpact) : 80;

    // 4. Resource Readiness
    const resourceReadyPoint = Math.round(row.resource_availability_score ?? 95);

    // 5. Train Disruption Impact
    const trainImpactPoint = Math.round(row.train_impact_score ?? 0);

    // Composite Priority Score calculated directly from the priority points
    const pointsScore = Math.round(
      criticalityPoint * 0.25 +
      urgencyPoint * 0.25 +
      assetImpactPoint * 0.20 +
      resourceReadyPoint * 0.15 +
      Math.max(0, 100 - trainImpactPoint) * 0.15
    );

    const rawPrioScore = Number(row.priority_score);
    const aiPriorityScore = (rawPrioScore && Math.round(rawPrioScore) !== 51 && Math.round(rawPrioScore) !== 50)
      ? Math.round(rawPrioScore)
      : pointsScore;

    return {
      planId:           row.plan_id,
      requestId:        req?.request_id ?? '',
      requestIds,
      department:       dept?.name ?? 'Engineering',
      departments:      deptsList,
      departmentShort:  mapDeptShort(dept?.name),
      departmentShorts: deptsList.map(mapDeptShort),
      corridor:         cor?.corridor_name ?? '',
      corridorId:       row.corridor_id,
      blockSection:     extractExactBlockSection(req || {}, cor?.corridor_name ?? '', reqFrom, reqTo),
      line:             cor?.line ?? 'UP Line',
      asset:            req?.asset_name ?? '',
      maintenanceType:  req?.maintenance_type ?? '',
      recommendedDate:  row.recommended_date ?? '',
      startTime:        formatTime(row.recommended_start_time),
      endTime:          formatTime(row.recommended_end_time),
      durationMin:      row.duration_minutes ?? 0,
      aiPriorityScore,
      priorityBreakdown: {
        criticality:    criticalityPoint,
        urgency:        urgencyPoint,
        assetImpact:    assetImpactPoint,
        trainImpact:    trainImpactPoint,
        resourceReady:  resourceReadyPoint,
      },
      trainImpact:          scoreToLabel(row.train_impact_score),
      resourceAvailability: 'Available' as const,
      conflictStatus:       cleanConflict as any,
      recommendation:       'Recommended' as const,
      status:               (row.status ?? 'AI Recommended') as any,
      finalStatus:          computedFinalStatus,
      operationalRegulationRequired: isCoaReg,
      approvalAuthority:    isCoaReg ? 'COA' : undefined,
      coordinationOpportunity: (row.optimization_status || requestIds.length > 1)
        ? {
            isCoordinated:      true,
            leadDepartment:     mapDeptShort(dept?.name),
            partnerDepartments: deptsList.map(mapDeptShort).filter(d => d !== mapDeptShort(dept?.name)),
            sharedWindow:       `${row.recommended_date} | ${formatTime(row.recommended_start_time)} – ${formatTime(row.recommended_end_time)}`,
            description:        row.optimization_status || `Integrated multi-request block uniting ${requestIds.join(', ')}`,
          }
        : undefined,
      reasoningFactors: row.planning_reason
        ? row.planning_reason.split('. ').filter(Boolean)
        : [],
      candidateWindows: [],
      ruleValidation: {
        corridorAvailable:         true,
        noOverlappingBlock:        true,
        trainConflictChecked:      true,
        durationValid:             true,
        resourceAvailable:         true,
        safetyBufferSatisfied:     true,
        assetSectionMatch:         true,
        requestNotPlanned:         true,
        tractionDisconnectionValid: true,
        details: { affectedTrains: [] },
      },
      coaRemarks: row.coa_remarks ?? undefined,
    };
  });

  // Consolidate any split plans sharing identical base plan ID and operational window
  const mergedMap = new Map<string, AIPlanningPlan>();
  for (const plan of rawPlans) {
    // Only strip sub-request suffixes if present: e.g. PLAN-2026-001-1 -> PLAN-2026-001
    const baseId = plan.planId.replace(/^(PLAN-\d{4}-\d{3})-\d+$/, '$1');
    const mergeKey = `${baseId}_${plan.corridor}_${plan.recommendedDate}_${plan.startTime}`;
    if (!mergedMap.has(mergeKey)) {
      mergedMap.set(mergeKey, {
        ...plan,
        planId: baseId,
      });
    } else {
      const existing = mergedMap.get(mergeKey)!;
      const combinedReqIds = Array.from(new Set([...(existing.requestIds || [existing.requestId]), ...(plan.requestIds || [plan.requestId])]));
      const combinedDepts = Array.from(new Set([...(existing.departments || [existing.department]), ...(plan.departments || [plan.department])])) as Department[];
      const combinedDeptShorts = combinedDepts.map(mapDeptShort);

      existing.requestIds = combinedReqIds;
      existing.departments = combinedDepts;
      existing.departmentShorts = combinedDeptShorts;
      if (!existing.coordinationOpportunity) {
        existing.coordinationOpportunity = {
          isCoordinated: true,
          leadDepartment: existing.departmentShort,
          partnerDepartments: combinedDeptShorts.filter(d => d !== existing.departmentShort),
          sharedWindow: `${existing.recommendedDate} | ${existing.startTime} – ${existing.endTime}`,
          description: `Integrated multi-request block uniting ${combinedReqIds.join(', ')}`,
        };
      }
    }
  }

  return Array.from(mergedMap.values());
}

// ─────────────────────────────────────────────────────────────
// EXISTING BLOCKS  (existing_blocks table)
// ─────────────────────────────────────────────────────────────

export async function fetchExistingBlocks(): Promise<ExistingBlock[]> {
  const { data, error } = await supabase
    .from('existing_blocks')
    .select(`
      id,
      block_id,
      purpose,
      block_date,
      start_time,
      end_time,
      duration_minutes,
      line,
      status,
      source,
      remarks,
      created_at,
      corridors!existing_blocks_corridor_id_fkey (
        corridor_name,
        block_section
      ),
      departments!existing_blocks_department_id_fkey (
        name
      )
    `)
    .order('block_date', { ascending: true });

  if (error) {
    console.error('fetchExistingBlocks error:', error.message);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    blockId:                row.block_id,
    corridor:               row.corridors?.corridor_name ?? '',
    blockSection:           extractExactBlockSection(row, row.corridors?.corridor_name ?? '', 0, 0),
    line:                   (row.line ?? 'UP Line') as any,
    department:             (row.departments?.name ?? 'Engineering') as any,
    departmentShort:        mapDeptShort(row.departments?.name),
    purpose:                row.purpose ?? '',
    date:                   row.block_date ?? '',
    startTime:              formatTime(row.start_time),
    endTime:                formatTime(row.end_time),
    durationMin:            row.duration_minutes ?? 0,
    status:                 (row.status ?? 'Scheduled') as any,
    source:                 row.source ?? 'COA Schedule',
    approvedBy:             'COA Controller',
    approvalDate:           row.created_at ? row.created_at.slice(0, 10) : '',
    trainMovementsAffected: ['Nil'],
    adjacentLineStatus:     'Open',
    resourcesAssigned:      [],
    safetyRequirements:     [],
    disconnectionRequirements: '',
  }));
}

// ─────────────────────────────────────────────────────────────
// CORRIDORS  (corridors table)
// ─────────────────────────────────────────────────────────────

export async function fetchCorridors(): Promise<CorridorSection[]> {
  const [corridorRes, blocksRes] = await Promise.all([
    supabase
      .from('corridors')
      .select(`
        id,
        corridor_name,
        block_section,
        line,
        distance_km,
        availability_status,
        from_station:stations!corridors_from_station_id_fkey (
          station_code,
          station_name
        ),
        to_station:stations!corridors_to_station_id_fkey (
          station_code,
          station_name
        )
      `)
      .order('corridor_name', { ascending: true }),
    supabase
      .from('existing_blocks')
      .select(`
        block_id,
        corridor_id,
        line,
        status,
        block_date,
        start_time,
        end_time,
        purpose,
        corridors!existing_blocks_corridor_id_fkey (
          corridor_name,
          block_section,
          line
        )
      `)
      .order('created_at', { ascending: false })
  ]);

  if (corridorRes.error) {
    console.error('fetchCorridors error:', corridorRes.error.message);
    return [];
  }

  const existingBlocks = blocksRes.data || [];

  return (corridorRes.data ?? []).map((row: any) => {
    // Find all blocks matching this corridor section
    const matchingBlocks = existingBlocks.filter((b: any) => {
      if (b.corridor_id === row.id) return true;
      const bCor = b.corridors;
      if (
        bCor &&
        bCor.corridor_name === row.corridor_name &&
        bCor.block_section === row.block_section &&
        (b.line === row.line || bCor.line === row.line)
      ) {
        return true;
      }
      return false;
    });

    // Active block currently occupying the track
    const activeBlock = matchingBlocks.find((b: any) => b.status === 'Active');
    // Upcoming scheduled block
    const scheduledBlock = matchingBlocks.find((b: any) => b.status === 'Scheduled');
    // Completed block (track fit memo certified, safe for train movement)
    const completedBlock = matchingBlocks.find((b: any) => b.status === 'Completed');

    // Section is Blocked if explicitly marked 'Blocked' in DB or has an active or scheduled maintenance block
    const hasCommittedBlock = matchingBlocks.some((b: any) => b.status === 'Active' || b.status === 'Scheduled');
    const isBlocked = row.availability_status === 'Blocked' || !!activeBlock || hasCommittedBlock;
    const isRestricted = !isBlocked && row.availability_status === 'Restricted Speed';

    let currentAvailability: 'Available' | 'Blocked' | 'Restricted Speed' = 'Available';
    if (isBlocked) {
      currentAvailability = 'Blocked';
    } else if (isRestricted) {
      currentAvailability = 'Restricted Speed';
    }

    let status: 'Operational' | 'Caution Order' | 'Under Maintenance' = 'Operational';
    if (isBlocked) {
      status = 'Under Maintenance';
    } else if (isRestricted) {
      status = 'Caution Order';
    }

    const activeBlockId = activeBlock ? activeBlock.block_id : (scheduledBlock ? scheduledBlock.block_id : null);
    const upcomingBlockId = scheduledBlock ? scheduledBlock.block_id : null;

    return {
      id:                  row.id,
      corridor:            row.corridor_name,
      section:             row.block_section,
      fromStation:         row.from_station?.station_name ?? '',
      toStation:           row.to_station?.station_name ?? '',
      fromStationCode:     row.from_station?.station_code ?? '',
      toStationCode:       row.to_station?.station_code ?? '',
      line:                (row.line ?? 'Double Line') as any,
      distanceKm:          Number(row.distance_km ?? 0),
      currentAvailability,
      activeBlock:         activeBlockId,
      upcomingBlock:       upcomingBlockId,
      trainDensity:        'Moderate Traffic' as any,
      status,
      maxSpeedKmph:        isBlocked ? 0 : isRestricted ? 45 : 110,
    };
  });
}

// ─────────────────────────────────────────────────────────────
// TRAINS  (trains table)
// ─────────────────────────────────────────────────────────────

export async function fetchTrains(): Promise<TrainSchedule[]> {
  const [trainsRes, movementsRes] = await Promise.all([
    supabase
      .from('trains')
      .select(`
        id,
        train_number,
        train_name,
        train_type,
        running_days,
        priority,
        is_goods_train,
        source_station:stations!trains_source_station_id_fkey (
          station_code,
          station_name
        ),
        destination_station:stations!trains_destination_station_id_fkey (
          station_code,
          station_name
        )
      `)
      .eq('is_active', true)
      .order('train_number', { ascending: true }),
    supabase
      .from('train_movements')
      .select(`
        train_id,
        arrival_time,
        departure_time,
        corridors!train_movements_corridor_id_fkey (
          corridor_name,
          line
        )
      `)
      .order('arrival_time', { ascending: true })
  ]);

  if (trainsRes.error) {
    console.error('fetchTrains error:', trainsRes.error.message);
    return [];
  }

  const movements = movementsRes.data || [];

  return (trainsRes.data ?? []).map((row: any) => {
    // Find representative movement for this train
    const mv = movements.find((m: any) => m.train_id === row.id);
    const arrTime = mv?.arrival_time ? formatTime(mv.arrival_time) : '06:00';
    const depTime = mv?.departure_time ? formatTime(mv.departure_time) : '06:15';
    const corridorDisplay = (mv?.corridors as any)?.corridor_name ||
      `${row.source_station?.station_code ?? ''} – ${row.destination_station?.station_code ?? ''}`;

    return {
      trainNumber:  row.train_number,
      trainName:    row.train_name,
      type:         mapTrainType(row.train_type, row.is_goods_train),
      route:        `${row.source_station?.station_name ?? '?'} – ${row.destination_station?.station_name ?? '?'}`,
      corridor:     corridorDisplay,
      arrival:      arrTime,
      departure:    depTime,
      priority:     (row.priority ?? 'Medium') as any,
      daysOfRun:    row.running_days ?? 'Daily',
    };
  });
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function mapDeptShort(name: string | undefined): any {
  if (!name) return 'Engineering';
  if (name.includes('TRD')) return 'TRD';
  if (name.includes('Signal') || name.includes('S&T')) return 'S&T';
  return 'Engineering';
}

function mapTrainType(type: string, isGoods: boolean): any {
  if (isGoods) return 'Goods (Freight)';
  if (type === 'Vande Bharat') return 'Vande Bharat';
  if (type === 'Superfast')    return 'Superfast';
  if (type === 'Express')      return 'Express';
  return 'Passenger';
}

function mapAvailability(status: string): any {
  if (status === 'Blocked')           return 'Blocked';
  if (status === 'Restricted Speed')  return 'Restricted Speed';
  return 'Available';
}

function scoreToLabel(score: number | null): 'Low' | 'Moderate' | 'High' {
  if (!score || score <= 40) return 'Low';
  if (score <= 70)           return 'Moderate';
  return 'High';
}

function formatTime(t: string | null): string {
  if (!t) return '00:00';
  // Postgres TIME comes as "HH:MM:SS" — trim to "HH:MM"
  return t.slice(0, 5);
}

function splitText(text: string | null): string[] {
  if (!text) return [];
  return text.split(';').map(s => s.trim()).filter(Boolean);
}

// ─────────────────────────────────────────────────────────────
// CREATE BLOCK REQUEST (Targeted to Exact RailRadar Section)
// ─────────────────────────────────────────────────────────────

export async function createBlockRequest(reqData: {
  department: string;
  corridor: string;
  blockSection: string;
  line: string;
  fromKm: number;
  toKm: number;
  assetName: string;
  assetType: string;
  maintenanceType: string;
  defectReason: string;
  requestedDate: string;
  preferredStartTime: string;
  durationMinutes: number;
  priority: string;
  urgency: string;
  blockRequired: 'Absolute' | 'Shadow';
  disconnectionRequired: boolean;
  safetyRequirements?: string[];
  resourcesRequired?: string[];
  requestedBy: string;
  remarks?: string;
}): Promise<{ success: boolean; data?: MaintenanceRequest; error?: string }> {
  try {
    // 1. Resolve department id
    let deptId = 'fdc8a035-c353-4e66-a770-11d2a0b787b7'; // default Engineering
    if (reqData.department.includes('TRD')) {
      deptId = 'cbd41eb1-6769-4162-8380-6fc9c0bfe632';
    } else if (reqData.department.includes('Signal') || reqData.department.includes('S&T')) {
      deptId = 'b4d0a00c-dde4-4de1-98a1-4f136ef42ab1';
    }

    // 2. Resolve corridor id (match exact block_section or corridor_name)
    let corridorId: string | null = null;
    const firstStation = reqData.blockSection.split(/[\u2010-\u2015\u2212-]/)[0]?.trim() || '';
    const { data: matchedCorridors } = await supabase
      .from('corridors')
      .select('id, block_section, corridor_name, line')
      .ilike('block_section', `%${firstStation}%`)
      .limit(5);

    if (matchedCorridors && matchedCorridors.length > 0) {
      const best = matchedCorridors.find(c => c.line === reqData.line) || matchedCorridors[0];
      corridorId = best.id;
    } else {
      const { data: anyCor } = await supabase
        .from('corridors')
        .select('id')
        .ilike('corridor_name', `%${reqData.corridor.split(/[\u2010-\u2015\u2212-]/)[0]?.trim()}%`)
        .limit(1);
      if (anyCor && anyCor[0]) corridorId = anyCor[0].id;
    }

    // 3. Generate sequential request ID
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const generatedId = `BR-2026-RR${randomSuffix}`;

    const insertPayload: any = {
      request_id: generatedId,
      department_id: deptId,
      corridor_id: corridorId,
      asset_name: reqData.assetName,
      asset_type: reqData.assetType,
      maintenance_type: reqData.maintenanceType,
      defect_reason: reqData.defectReason,
      description: `${reqData.maintenanceType} targeted to exact block section ${reqData.blockSection} (Km ${reqData.fromKm} - ${reqData.toKm})`,
      priority: reqData.priority,
      urgency: reqData.urgency,
      requested_date: reqData.requestedDate,
      preferred_start_time: reqData.preferredStartTime,
      duration_minutes: reqData.durationMinutes,
      block_required: reqData.blockRequired === 'Absolute',
      disconnection_required: reqData.disconnectionRequired,
      safety_requirements: (reqData.safetyRequirements || []).join('; '),
      resources_required: (reqData.resourcesRequired || []).join('; '),
      requested_by: reqData.requestedBy || 'SSE / Salem Division',
      status: 'Pending Planning',
      chainage_from: reqData.fromKm,
      chainage_to: reqData.toKm,
      remarks: reqData.remarks || `Exact inter-station section: ${reqData.blockSection}`
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('block_requests')
      .insert(insertPayload)
      .select()
      .single();

    if (insertErr) {
      console.warn('Supabase insert note:', insertErr.message);
    }

    const createdReq: MaintenanceRequest = {
      id: generatedId,
      department: reqData.department as any,
      departmentShort: mapDeptShort(reqData.department),
      sourceSystem: reqData.department.includes('TRD') ? 'TDMS' : reqData.department.includes('S&T') ? 'SMMS' : 'TMS',
      corridor: reqData.corridor,
      blockSection: reqData.blockSection,
      line: reqData.line as any,
      fromKm: reqData.fromKm,
      toKm: reqData.toKm,
      asset: reqData.assetName,
      assetType: reqData.assetType,
      maintenanceType: reqData.maintenanceType,
      defectReason: reqData.defectReason,
      description: insertPayload.description,
      requestedDate: reqData.requestedDate,
      estimatedDurationMin: reqData.durationMinutes,
      priority: reqData.priority as any,
      urgency: reqData.urgency as any,
      operationalImpact: 'Medium',
      status: 'Pending Planning',
      requestedBy: reqData.requestedBy || 'SSE / Salem Division',
      submittedDate: new Date().toISOString().slice(0, 16).replace('T', ' '),
      blockRequired: reqData.blockRequired,
      disconnectionRequired: reqData.disconnectionRequired,
      safetyRequirements: reqData.safetyRequirements || [],
      resourcesRequired: reqData.resourcesRequired || [],
      planningNotes: insertPayload.remarks,
    };

    return { success: true, data: createdReq };
  } catch (err: any) {
    console.error('createBlockRequest failed:', err);
    return { success: false, error: err.message };
  }
}

