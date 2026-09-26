const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://nbtwgbmqjjhvlryvatdn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idHdnYm1xampodmxyeXZhdGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NTcwMDEsImV4cCI6MjEwNTIzMzAwMX0._JMfAY5ntzI4CO9ACTyW0Gl4Cugfx1uCs648AVPayEM";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log("Testing update via supabase-js...");
  const res1 = await supabase
    .from('corridors')
    .update({ availability_status: 'Available' })
    .eq('id', '19c62a0e-6379-471f-9fa1-fde2a7aa5e8f')
    .select();

  console.log("Update 19c62a0e res:", res1.error, res1.data);

  const res2 = await supabase
    .from('existing_blocks')
    .update({ status: 'Completed' })
    .eq('block_id', 'BLK-2026-001')
    .select();

  console.log("Update existing_blocks BLK-2026-001 res:", res2.error, res2.data);
}

run();
