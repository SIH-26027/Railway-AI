const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

let serviceKey = '';
let supabaseUrl = 'https://nbtwgbmqjjhvlryvatdn.supabase.co';

for (const line of envContent.split('\n')) {
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    serviceKey = line.split('=')[1].trim();
  }
}

console.log("Using service key:", serviceKey.slice(0, 20) + "...");

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log("\n1. Updating BLK-2026-001 to Completed...");
  const { data: bData, error: bErr } = await supabase
    .from('existing_blocks')
    .update({
      status: 'Completed',
      remarks: 'Block completed at site. Staff, machines and equipment clear of track. Track certified safe for traffic.'
    })
    .eq('block_id', 'BLK-2026-001')
    .select();

  console.log("Block update error:", bErr);
  console.log("Block update data:", bData);

  console.log("\n2. Updating corridors to Available...");
  const staleCorridorIds = [
    '19c62a0e-6379-471f-9fa1-fde2a7aa5e8f', // Totiyapalaiyam – Perundurai
    '7146a727-90f2-48a7-838e-3072d8258a0d', // Perundurai – Uttukuli
    'ffbdba83-1569-4023-b6ba-084ded8acd7f'  // Erode – Sankari Durg
  ];

  for (const id of staleCorridorIds) {
    const { data: cData, error: cErr } = await supabase
      .from('corridors')
      .update({ availability_status: 'Available' })
      .eq('id', id)
      .select();

    console.log(`Corridor ${id} error:`, cErr);
    console.log(`Corridor ${id} data:`, cData);
  }

  console.log("\n3. Querying non-available corridors:");
  const { data: nonAvail } = await supabase
    .from('corridors')
    .select('id, corridor_name, block_section, line, availability_status')
    .neq('availability_status', 'Available');

  console.log(JSON.stringify(nonAvail, null, 2));
}

run();
