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

const supabase = createClient(supabaseUrl, serviceKey);

async function checkCorridorStatus() {
  const { data } = await supabase
    .from('corridors')
    .select('id, corridor_name, block_section, line, availability_status')
    .eq('id', '19c62a0e-6379-471f-9fa1-fde2a7aa5e8f')
    .single();
  return data;
}

async function run() {
  console.log("=== Initial Corridor Status ===");
  console.log(await checkCorridorStatus());

  console.log("\n=== Step 1: Reopen BLK-2026-001 via API (APPROVED) ===");
  const reopenRes = await fetch('http://localhost:3001/api/approved-blocks', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 'BLK-2026-001',
      status: 'APPROVED',
      remarks: 'Simulated reopening for site audit'
    })
  });
  console.log("Reopen response status:", reopenRes.status);
  console.log("Reopen json:", await reopenRes.json());

  console.log("\n=== Corridor Status after Reopening (Should be Blocked) ===");
  console.log(await checkCorridorStatus());

  console.log("\n=== Step 2: Complete BLK-2026-001 via API (COMPLETED) ===");
  const completeRes = await fetch('http://localhost:3001/api/approved-blocks', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 'BLK-2026-001',
      status: 'COMPLETED',
      officer: 'Sr. DEN / Open Line',
      remarks: 'Track fit certificate signed. Clearance complete. Track safe for 110 km/h traffic.',
      note: 'All equipment clear'
    })
  });
  console.log("Complete response status:", completeRes.status);
  console.log("Complete json:", await completeRes.json());

  console.log("\n=== Corridor Status after Completion (Should be Available) ===");
  console.log(await checkCorridorStatus());
}

run();
