const { createClient } = require('@supabase/supabase-js');

const url = 'https://nbtwgbmqjjhvlryvatdn.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idHdnYm1xampodmxyeXZhdGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NTcwMDEsImV4cCI6MjEwNTIzMzAwMX0._JMfAY5ntzI4CO9ACTyW0Gl4Cugfx1uCs648AVPayEM';

const sb = createClient(url, key);

async function main() {
  const { data, error } = await sb
    .from('corridors')
    .select(`
      id,
      corridor_name,
      block_section,
      line,
      distance_km,
      availability_status,
      from_station:stations!corridors_from_station_id_fkey(station_code, station_name),
      to_station:stations!corridors_to_station_id_fkey(station_code, station_name)
    `);

  if (error) {
    console.error(error);
    return;
  }

  console.log(`TOTAL ROWS: ${data.length}`);
  const groups = {};
  for (const r of data) {
    if (!groups[r.corridor_name]) groups[r.corridor_name] = [];
    groups[r.corridor_name].push(r);
  }

  for (const [name, rows] of Object.entries(groups)) {
    console.log(`\n=== Corridor: ${name} (${rows.length} sections) ===`);
    for (const r of rows) {
      console.log(`  [${r.line}] ${r.block_section} | ${r.from_station?.station_code} -> ${r.to_station?.station_code} (${r.distance_km} km) | Status: ${r.availability_status}`);
    }
  }
}

main();
