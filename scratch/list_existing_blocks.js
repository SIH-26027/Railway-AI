const { createClient } = require('@supabase/supabase-js');

const url = 'https://nbtwgbmqjjhvlryvatdn.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idHdnYm1xampodmxyeXZhdGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NTcwMDEsImV4cCI6MjEwNTIzMzAwMX0._JMfAY5ntzI4CO9ACTyW0Gl4Cugfx1uCs648AVPayEM';

const sb = createClient(url, key);

async function main() {
  const { data, error } = await sb
    .from('existing_blocks')
    .select(`
      id,
      block_id,
      corridor_id,
      department_id,
      purpose,
      block_date,
      start_time,
      end_time,
      line,
      status,
      corridors!existing_blocks_corridor_id_fkey(corridor_name, block_section, line)
    `);

  if (error) {
    console.error(error);
    return;
  }

  console.log(`EXISTING BLOCKS COUNT: ${data.length}`);
  for (const b of data) {
    console.log(`[${b.status}] ${b.block_id} | Corridor: ${b.corridors?.corridor_name} | Section: ${b.corridors?.block_section} | Line: ${b.line} | Date: ${b.block_date} ${b.start_time}-${b.end_time} | CorridorId: ${b.corridor_id}`);
  }
}

main();
