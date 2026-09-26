const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://nbtwgbmqjjhvlryvatdn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idHdnYm1xampodmxyeXZhdGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NTcwMDEsImV4cCI6MjEwNTIzMzAwMX0._JMfAY5ntzI4CO9ACTyW0Gl4Cugfx1uCs648AVPayEM";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  const blocksRes = await supabase
    .from('existing_blocks')
    .select(`
      id,
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
    `);

  console.log("blocksRes error:", blocksRes.error);
  console.log("blocksRes data:", blocksRes.data);
}

test();
