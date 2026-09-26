const { createClient } = require('@supabase/supabase-js');
const url = 'https://nbtwgbmqjjhvlryvatdn.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idHdnYm1xampodmxyeXZhdGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NTcwMDEsImV4cCI6MjEwNTIzMzAwMX0._JMfAY5ntzI4CO9ACTyW0Gl4Cugfx1uCs648AVPayEM';
const sb = createClient(url, key);

async function run() {
  const { data: cors } = await sb.from('corridors').select('id, corridor_name, block_section, line');
  for (const c of cors || []) {
    console.log(`${c.id} | ${c.corridor_name} | ${c.block_section} | ${c.line}`);
  }
  process.exit(0);
}
run();
