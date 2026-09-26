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

async function testFetchCorridors() {
  const [corridorRes, blocksRes] = await Promise.all([
    supabase
      .from('corridors')
      .select(`
        id,
        corridor_name,
        block_section,
        line,
        distance_km,
        availability_status,
        from_station:stations!corridors_from_station_id_fkey (
          station_code,
          station_name
        ),
        to_station:stations!corridors_to_station_id_fkey (
          station_code,
          station_name
        )
      `)
      .order('corridor_name', { ascending: true }),
    supabase
      .from('existing_blocks')
      .select(`
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
      `)
      .order('created_at', { ascending: false })
  ]);

  const existingBlocks = blocksRes.data || [];

  const results = (corridorRes.data ?? []).map((row) => {
    const matchingBlocks = existingBlocks.filter((b) => {
      if (b.corridor_id === row.id) return true;
      const bCor = b.corridors;
      if (
        bCor &&
        bCor.corridor_name === row.corridor_name &&
        bCor.block_section === row.block_section &&
        (b.line === row.line || bCor.line === row.line)
      ) {
        return true;
      }
      return false;
    });

    const activeBlock = matchingBlocks.find((b) => b.status === 'Active');
    const scheduledBlock = matchingBlocks.find((b) => b.status === 'Scheduled');
    const completedBlock = matchingBlocks.find((b) => b.status === 'Completed');

    const isBlocked = !!activeBlock;
    const isRestricted = row.availability_status === 'Restricted Speed';

    let currentAvailability = 'Available';
    if (isBlocked) {
      currentAvailability = 'Blocked';
    } else if (isRestricted) {
      currentAvailability = 'Restricted Speed';
    }

    let status = 'Operational';
    if (isBlocked) {
      status = 'Under Maintenance';
    } else if (isRestricted) {
      status = 'Caution Order';
    }

    return {
      id: row.id,
      corridor: row.corridor_name,
      section: row.block_section,
      line: row.line,
      currentAvailability,
      status,
      maxSpeedKmph: isBlocked ? 0 : isRestricted ? 45 : 110,
      activeBlock: activeBlock ? activeBlock.block_id : null,
      upcomingBlock: scheduledBlock ? scheduledBlock.block_id : null,
      completedBlock: completedBlock ? completedBlock.block_id : null,
    };
  });

  console.log(`Total corridors processed: ${results.length}`);

  console.log("\n=== SPECIFIC SECTIONS CHECK ===");
  const targetSections = [
    'Totiyapalaiyam – Perundurai',
    'Erode – Sankari Durg',
    'Perundurai – Uttukuli',
    'Podanur – Madukkarai'
  ];

  for (const t of targetSections) {
    const found = results.filter(r => r.section.includes(t.split('–')[0].trim()));
    for (const f of found) {
      console.log(`[${f.corridor}] ${f.section} (${f.line}): availability=${f.currentAvailability}, status=${f.status}, speed=${f.maxSpeedKmph} km/h, activeBlock=${f.activeBlock}, completedBlock=${f.completedBlock}`);
    }
  }

  const blocked = results.filter(r => r.currentAvailability === 'Blocked');
  const restricted = results.filter(r => r.currentAvailability === 'Restricted Speed');
  const available = results.filter(r => r.currentAvailability === 'Available');

  console.log(`\nSummary: Available: ${available.length}, Blocked: ${blocked.length}, Restricted Speed: ${restricted.length}`);
}

testFetchCorridors();
