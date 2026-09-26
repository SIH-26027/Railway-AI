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
    console.error('Fetch error:', error);
    return;
  }
  console.log('Fetched plans count:', data.length);
  console.log(JSON.stringify(data[0], null, 2));
  process.exit(0);
}
run();
