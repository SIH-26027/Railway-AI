const { createClient } = require('@supabase/supabase-js');

const url = 'https://nbtwgbmqjjhvlryvatdn.supabase.co';
// Service role key to allow writing and upserting directly
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idHdnYm1xampodmxyeXZhdGRuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTY1NzAwMSwiZXhwIjoyMTA1MjMzMDAxfQ.BpxBa3hV62xWfI_JMa7QGt3lLNetibWTmqJOGsso8K0';

const sb = createClient(url, serviceKey);

async function seed() {
  console.log('--- FETCHING REFERENCE STATIONS & CORRIDORS ---');
  const { data: stations } = await sb.from('stations').select('id, station_code, station_name');
  const stationMap = {};
  stations.forEach(s => {
    stationMap[s.station_code] = s.id;
  });

  const { data: corridors } = await sb.from('corridors').select('id, corridor_name, block_section, line');
  console.log(`Found ${stations.length} stations and ${corridors.length} corridors.`);

  // Find corridors for key sections
  const edSaUp = corridors.find(c => c.corridor_name.includes('Erode – Salem') && c.line === 'UP Line');
  const edSaDn = corridors.find(c => c.corridor_name.includes('Erode – Salem') && c.line === 'DN Line');
  const edTupUp = corridors.find(c => c.corridor_name.includes('Erode – Tiruppur') && c.line === 'UP Line');
  const edTupDn = corridors.find(c => c.corridor_name.includes('Erode – Tiruppur') && c.line === 'DN Line');
  const tupCbeUp = corridors.find(c => c.corridor_name.includes('Tiruppur – Coimbatore') && c.line === 'UP Line');
  const tupCbeDn = corridors.find(c => c.corridor_name.includes('Tiruppur – Coimbatore') && c.line === 'DN Line');
  const cbePgtUp = corridors.find(c => c.corridor_name.includes('Coimbatore – Palakkad') && c.line === 'UP Line');
  const cbePgtDn = corridors.find(c => c.corridor_name.includes('Coimbatore – Palakkad') && c.line === 'DN Line');
  const saJtjUp = corridors.find(c => c.corridor_name.includes('Salem – Jolarpettai') && c.line === 'UP Line');
  const saJtjDn = corridors.find(c => c.corridor_name.includes('Salem – Jolarpettai') && c.line === 'DN Line');

  console.log('\n--- 1. UPSERTING TRAINS OF ALL TYPES & PRIORITIES ---');
  const trainsToUpsert = [
    // 1. Vande Bharat (Priority: Highest)
    {
      train_number: '20643',
      train_name: 'Coimbatore – MGR Chennai Central Vande Bharat Express',
      train_type: 'Vande Bharat',
      priority: 'Highest',
      is_goods_train: false,
      source_station_id: stationMap['CBE'] || stations[0].id,
      destination_station_id: stationMap['SA'] || stations[1].id,
      running_days: 'Except Wed',
      is_active: true,
    },
    {
      train_number: '20644',
      train_name: 'MGR Chennai Central – Coimbatore Vande Bharat Express',
      train_type: 'Vande Bharat',
      priority: 'Highest',
      is_goods_train: false,
      source_station_id: stationMap['SA'] || stations[1].id,
      destination_station_id: stationMap['CBE'] || stations[0].id,
      running_days: 'Except Wed',
      is_active: true,
    },

    // 2. Superfast / Express (Priority: High)
    {
      train_number: '12675',
      train_name: 'Kovai Superfast Express (Chennai – Coimbatore)',
      train_type: 'Express',
      priority: 'High',
      is_goods_train: false,
      source_station_id: stationMap['SA'] || stations[1].id,
      destination_station_id: stationMap['CBE'] || stations[0].id,
      running_days: 'Daily',
      is_active: true,
    },
    {
      train_number: '12676',
      train_name: 'Kovai Superfast Express (Coimbatore – Chennai)',
      train_type: 'Express',
      priority: 'High',
      is_goods_train: false,
      source_station_id: stationMap['CBE'] || stations[0].id,
      destination_station_id: stationMap['SA'] || stations[1].id,
      running_days: 'Daily',
      is_active: true,
    },
    {
      train_number: '12671',
      train_name: 'Nilgiri Superfast Express (Blue Mountain)',
      train_type: 'Express',
      priority: 'High',
      is_goods_train: false,
      source_station_id: stationMap['SA'] || stations[1].id,
      destination_station_id: stationMap['CBE'] || stations[0].id,
      running_days: 'Daily',
      is_active: true,
    },
    {
      train_number: '12678',
      train_name: 'Ernakulam – KSR Bengaluru InterCity Superfast',
      train_type: 'Express',
      priority: 'High',
      is_goods_train: false,
      source_station_id: stationMap['PGT'] || stations[0].id,
      destination_station_id: stationMap['SA'] || stations[1].id,
      running_days: 'Daily',
      is_active: true,
    },

    // 3. Passenger / Inter-city (Priority: Medium)
    {
      train_number: '16609',
      train_name: 'Dindigul – Erode Express',
      train_type: 'Express',
      priority: 'Medium',
      is_goods_train: false,
      source_station_id: stationMap['ED'] || stations[0].id,
      destination_station_id: stationMap['SA'] || stations[1].id,
      running_days: 'Daily',
      is_active: true,
    },
    {
      train_number: '56846',
      train_name: 'Palakkad – Erode Passenger',
      train_type: 'Passenger',
      priority: 'Medium',
      is_goods_train: false,
      source_station_id: stationMap['PGT'] || stations[0].id,
      destination_station_id: stationMap['ED'] || stations[0].id,
      running_days: 'Daily',
      is_active: true,
    },
    {
      train_number: '56847',
      train_name: 'Erode – Palakkad Passenger',
      train_type: 'Passenger',
      priority: 'Medium',
      is_goods_train: false,
      source_station_id: stationMap['ED'] || stations[0].id,
      destination_station_id: stationMap['PGT'] || stations[0].id,
      running_days: 'Daily',
      is_active: true,
    },

    // 4. Goods / Freight (Priority: Low)
    {
      train_number: '70001',
      train_name: 'Container Freight Special (CONCOR Irugur)',
      train_type: 'Goods',
      priority: 'Low',
      is_goods_train: true,
      source_station_id: stationMap['ED'] || stations[0].id,
      destination_station_id: stationMap['CBE'] || stations[0].id,
      running_days: 'Daily',
      is_active: true,
    },
    {
      train_number: '70005',
      train_name: 'BOXN Coal Rake Special (Mettur Thermal)',
      train_type: 'Goods',
      priority: 'Low',
      is_goods_train: true,
      source_station_id: stationMap['SA'] || stations[1].id,
      destination_station_id: stationMap['ED'] || stations[0].id,
      running_days: 'As Needed',
      is_active: true,
    },
    {
      train_number: '70006',
      train_name: 'Cement Bulk Carrier (ACC Madukkarai)',
      train_type: 'Goods',
      priority: 'Low',
      is_goods_train: true,
      source_station_id: stationMap['CBE'] || stations[0].id,
      destination_station_id: stationMap['TUP'] || stations[0].id,
      running_days: 'Daily',
      is_active: true,
    },
  ];

  for (const t of trainsToUpsert) {
    const { data: existing } = await sb.from('trains').select('id').eq('train_number', t.train_number).maybeSingle();
    if (existing) {
      await sb.from('trains').update(t).eq('id', existing.id);
      console.log(`  Updated train ${t.train_number} - ${t.train_name} (${t.priority})`);
    } else {
      await sb.from('trains').insert(t);
      console.log(`  Inserted train ${t.train_number} - ${t.train_name} (${t.priority})`);
    }
  }

  // Fetch all trains to have full id mapping
  const { data: allTrains } = await sb.from('trains').select('id, train_number, priority, train_type, train_name');
  const trainMap = {};
  allTrains.forEach(t => {
    trainMap[t.train_number] = t;
  });

  console.log('\n--- 2. CREATING REALISTIC TRAIN MOVEMENTS FOR PLANNING HORIZON ---');
  // Dates across current horizon: 2026-09-20 through 2026-09-26
  const dates = ['2026-09-20', '2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26'];

  // Movement templates across timetable
  const movementTemplates = [
    // ─── High-Priority Vande Bharat Expresses ───
    {
      train_number: '20643', // CBE -> Chennai Central (UP)
      corridor: edTupUp,
      arrival: '06:30:00',
      departure: '06:45:00',
      direction: 'UP',
      is_forecast: false,
    },
    {
      train_number: '20643',
      corridor: edSaUp,
      arrival: '07:15:00',
      departure: '07:30:00',
      direction: 'UP',
      is_forecast: false,
    },
    {
      train_number: '20644', // Chennai -> CBE (DN)
      corridor: edSaDn,
      arrival: '18:20:00',
      departure: '18:35:00',
      direction: 'DN',
      is_forecast: false,
    },
    {
      train_number: '20644',
      corridor: edTupDn,
      arrival: '19:10:00',
      departure: '19:25:00',
      direction: 'DN',
      is_forecast: false,
    },

    // ─── Superfast Expresses (High Priority) ───
    {
      train_number: '12675', // Kovai SF (DN)
      corridor: edSaDn,
      arrival: '10:50:00',
      departure: '11:05:00',
      direction: 'DN',
      is_forecast: false,
    },
    {
      train_number: '12675',
      corridor: edTupDn,
      arrival: '11:40:00',
      departure: '11:55:00',
      direction: 'DN',
      is_forecast: false,
    },
    {
      train_number: '12676', // Kovai SF (UP)
      corridor: edTupUp,
      arrival: '15:20:00',
      departure: '15:35:00',
      direction: 'UP',
      is_forecast: false,
    },
    {
      train_number: '12676',
      corridor: edSaUp,
      arrival: '16:05:00',
      departure: '16:20:00',
      direction: 'UP',
      is_forecast: false,
    },
    {
      train_number: '12671', // Nilgiri SF (DN Early Morning)
      corridor: edSaDn,
      arrival: '04:45:00',
      departure: '05:00:00',
      direction: 'DN',
      is_forecast: false,
    },
    {
      train_number: '12671',
      corridor: edTupDn,
      arrival: '05:35:00',
      departure: '05:50:00',
      direction: 'DN',
      is_forecast: false,
    },

    // ─── Passenger Trains (Medium Priority) ───
    {
      train_number: '56703', // ED - SA Passenger
      corridor: edSaUp,
      arrival: '08:45:00',
      departure: '09:05:00',
      direction: 'UP',
      is_forecast: false,
    },
    {
      train_number: '56704', // SA - ED Passenger
      corridor: edSaDn,
      arrival: '13:15:00',
      departure: '13:35:00',
      direction: 'DN',
      is_forecast: false,
    },
    {
      train_number: '56846', // PGT - ED Passenger
      corridor: edTupUp,
      arrival: '11:10:00',
      departure: '11:30:00',
      direction: 'UP',
      is_forecast: false,
    },
    {
      train_number: '56847', // ED - PGT Passenger
      corridor: edTupDn,
      arrival: '16:15:00',
      departure: '16:35:00',
      direction: 'DN',
      is_forecast: false,
    },

    // ─── Goods / Freight Rakes (Low Priority - Night & Off-Peak Slots) ───
    {
      train_number: '70001', // CONCOR Container Special
      corridor: edTupUp,
      arrival: '02:00:00',
      departure: '02:20:00',
      direction: 'UP',
      is_forecast: true,
    },
    {
      train_number: '70002', // Mettur Coal Rake
      corridor: edSaUp,
      arrival: '03:10:00',
      departure: '03:30:00',
      direction: 'UP',
      is_forecast: true,
    },
    {
      train_number: '70005', // BOXN Coal Special
      corridor: edSaDn,
      arrival: '22:15:00',
      departure: '22:40:00',
      direction: 'DN',
      is_forecast: true,
    },
    {
      train_number: '70006', // Cement Bulk Carrier
      corridor: edTupDn,
      arrival: '23:30:00',
      departure: '23:55:00',
      direction: 'DN',
      is_forecast: true,
    },
  ];

  let insertedCount = 0;
  for (const date of dates) {
    for (const tmpl of movementTemplates) {
      if (!tmpl.corridor) continue;
      const train = trainMap[tmpl.train_number];
      if (!train) continue;

      const movementRecord = {
        train_id: train.id,
        corridor_id: tmpl.corridor.id,
        movement_date: date,
        arrival_time: tmpl.arrival,
        departure_time: tmpl.departure,
        direction: tmpl.direction,
        movement_type: tmpl.is_forecast ? 'Forecast' : 'Scheduled',
        is_forecast: tmpl.is_forecast,
        delay_minutes: 0,
        status: tmpl.is_forecast ? 'Scheduled' : 'On Time',
      };

      // Check if movement already exists for this train on this corridor and date
      const { data: existingMv } = await sb
        .from('train_movements')
        .select('id')
        .eq('train_id', train.id)
        .eq('corridor_id', tmpl.corridor.id)
        .eq('movement_date', date)
        .maybeSingle();

      if (existingMv) {
        await sb.from('train_movements').update(movementRecord).eq('id', existingMv.id);
      } else {
        await sb.from('train_movements').insert(movementRecord);
        insertedCount++;
      }
    }
  }

  console.log(`\nSuccessfully populated train movements across ${dates.length} days! Inserted/updated movements.`);

  // 3. Check and adjust block requests for seamless AI testing
  console.log('\n--- 3. VERIFYING PENDING BLOCK REQUESTS FOR TEST CASES ---');
  const { data: pendingReqs } = await sb
    .from('block_requests')
    .select('id, request_id, duration_minutes, status, corridor_id');

  for (const req of pendingReqs) {
    // If duration was 480 minutes (8 hrs) which exceeded max single block duration (360m), adjust to 150m
    if (req.duration_minutes > 300) {
      await sb
        .from('block_requests')
        .update({
          duration_minutes: 150,
          status: 'Pending Planning',
          preferred_start_time: '00:30:00',
        })
        .eq('id', req.id);
      console.log(`  Optimized ${req.request_id} duration to 150 min (within safe block limits).`);
    } else if (req.status === 'Under Planning') {
      await sb
        .from('block_requests')
        .update({ status: 'Pending Planning' })
        .eq('id', req.id);
      console.log(`  Reset ${req.request_id} status to Pending Planning.`);
    }
  }

  console.log('\n=== SEEDING COMPLETED SUCCESSFULLY ===');
}

seed().catch(err => console.error('Seed error:', err));
