const { createClient } = require('@supabase/supabase-js');
const url = 'https://nbtwgbmqjjhvlryvatdn.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idHdnYm1xampodmxyeXZhdGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NTcwMDEsImV4cCI6MjEwNTIzMzAwMX0._JMfAY5ntzI4CO9ACTyW0Gl4Cugfx1uCs648AVPayEM';
const sb = createClient(url, key);

async function run() {
  const { data, error } = await sb.from('block_plans').select('*, block_requests(request_id), corridors(corridor_name)').neq('status', 'Approved');
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Plans count:', data?.length);
  for (const p of (data || [])) {
    console.log(p.plan_id, p.status, p.recommended_date, p.recommended_start_time, p.recommended_end_time, p.corridors?.corridor_name);
  }
  process.exit(0);
}
run();
