const { createClient } = require('@supabase/supabase-js');

const url = 'https://nbtwgbmqjjhvlryvatdn.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idHdnYm1xampodmxyeXZhdGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NTcwMDEsImV4cCI6MjEwNTIzMzAwMX0._JMfAY5ntzI4CO9ACTyW0Gl4Cugfx1uCs648AVPayEM';

const sb = createClient(url, key);

async function main() {
  const { data: stations, error } = await sb.from('stations').select('id, station_code, station_name');
  if (error) console.error(error);
  else {
    console.log('STATIONS:');
    stations.forEach(s => console.log(`  ${s.station_code}: ${s.id} (${s.station_name})`));
  }

  const { data: corridors } = await sb.from('corridors').select('id, corridor_name, block_section, line');
  console.log('\nCORRIDORS SAMPLE:');
  corridors.slice(0, 10).forEach(c => console.log(`  ${c.id} | ${c.corridor_name} | ${c.block_section} | ${c.line}`));
}

main();
