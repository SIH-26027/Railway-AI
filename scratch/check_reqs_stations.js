const { createClient } = require('@supabase/supabase-js');

const url = 'https://nbtwgbmqjjhvlryvatdn.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idHdnYm1xampodmxyeXZhdGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NTcwMDEsImV4cCI6MjEwNTIzMzAwMX0._JMfAY5ntzI4CO9ACTyW0Gl4Cugfx1uCs648AVPayEM';

const sb = createClient(url, key);

async function main() {
  const { data: reqs } = await sb
    .from('block_requests')
    .select(`
      id,
      request_id,
      corridor_id,
      requested_date,
      preferred_start_time,
      duration_minutes,
      status,
      corridors!block_requests_corridor_id_fkey(id, corridor_name, block_section, line)
    `);

  console.log(`TOTAL BLOCK REQUESTS: ${reqs.length}`);
  for (const r of reqs) {
    console.log(`[${r.status}] ${r.request_id} | Date: ${r.requested_date} @ ${r.preferred_start_time} (${r.duration_minutes}m) | Corridor: ${r.corridors?.corridor_name} - ${r.corridors?.block_section} (${r.corridors?.line}) | CorridorId: ${r.corridor_id}`);
  }

  const { data: stations } = await sb.table('stations').select('id, station_code, station_name');
  console.log(`\nSTATIONS COUNT: ${stations.length}`);
  for (const s of stations.slice(0, 10)) {
    console.log(`  ${s.station_code}: ${s.station_name} (${s.id})`);
  }
}

main();
