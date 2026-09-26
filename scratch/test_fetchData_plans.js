const { createClient } = require('@supabase/supabase-js');
const url = 'https://nbtwgbmqjjhvlryvatdn.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idHdnYm1xampodmxyeXZhdGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NTcwMDEsImV4cCI6MjEwNTIzMzAwMX0._JMfAY5ntzI4CO9ACTyW0Gl4Cugfx1uCs648AVPayEM';
const sb = createClient(url, key);

async function run() {
  const { data, error } = await sb
    .from('block_plans')
    .select(`
      id,
      plan_id,
      request_id,
      corridor_id,
      recommended_date,
      recommended_start_time,
      recommended_end_time,
      duration_minutes,
      priority_score,
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
    console.error('Error:', error);
    return;
  }

  const rawPlans = (data ?? []).map((row) => {
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
    let deptsList = [];
    if (deptMatch && deptMatch[1]) {
      deptsList = deptMatch[1].split(/[,/]/).map(d => d.trim()).filter(Boolean);
    }
    const isCoaReg = row.status === 'COA Approval Required' ||
      combinedText.toLowerCase().includes('coa approval') ||
      Boolean(row.planning_reason?.toLowerCase().includes('operational regulation'));

    let computedFinalStatus = 'PLANNED';
    if (isCoaReg) {
      computedFinalStatus = 'COA_APPROVAL_REQUIRED';
    } else if (deptsList.length > 1 || requestIds.length > 1) {
      computedFinalStatus = 'COMBINED_BLOCK';
    }

    return {
      planId: row.plan_id,
      requestId: req?.request_id || row.request_id,
      requestIds: requestIds,
      corridor: cor?.corridor_name || 'Erode – Salem',
      blockSection: cor?.block_section || 'Erode – Sankari Durg',
      line: cor?.line || 'UP Line',
      department: (dept?.name || 'Engineering'),
      departmentShort: (dept?.system_name === 'TMS' ? 'Engineering' : dept?.system_name === 'TDMS' ? 'TRD' : 'S&T'),
      departments: deptsList.length > 0 ? deptsList : [dept?.name || 'Engineering'],
      asset: req?.asset_name || 'Track & P-Way',
      maintenanceType: req?.maintenance_type || 'Track Maintenance',
      recommendedDate: row.recommended_date,
      startTime: (row.recommended_start_time || '00:00').slice(0, 5),
      endTime: (row.recommended_end_time || '00:00').slice(0, 5),
      durationMin: row.duration_minutes || 120,
      priorityScore: row.priority_score || 0,
      status: row.status,
      finalStatus: computedFinalStatus,
    };
  });

  console.log('Processed plans:', rawPlans);
  process.exit(0);
}

run();
