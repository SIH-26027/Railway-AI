const { createClient } = require('@supabase/supabase-js');

const url = 'https://nbtwgbmqjjhvlryvatdn.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idHdnYm1xampodmxyeXZhdGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NTcwMDEsImV4cCI6MjEwNTIzMzAwMX0._JMfAY5ntzI4CO9ACTyW0Gl4Cugfx1uCs648AVPayEM';

const sb = createClient(url, key);

async function verify() {
  const { data: trains } = await sb.from('trains').select('train_number, train_name, train_type, priority');
  console.log(`TOTAL TRAINS: ${trains.length}`);
  const priorities = {};
  const types = {};
  trains.forEach(t => {
    priorities[t.priority] = (priorities[t.priority] || 0) + 1;
    types[t.train_type] = (types[t.train_type] || 0) + 1;
  });
  console.log('Priorities breakdown:', priorities);
  console.log('Types breakdown:', types);

  const { data: mv, count } = await sb.from('train_movements').select('id, movement_date, arrival_time, departure_time, direction, trains(train_number, priority, train_type)', { count: 'exact' });
  console.log(`\nTOTAL TRAIN MOVEMENTS: ${mv.length}`);

  // Sample movements on 2026-09-20
  const sample = mv.filter(m => m.movement_date === '2026-09-20');
  console.log(`\nMovements on 2026-09-20 (${sample.length} movements):`);
  sample.slice(0, 10).forEach(m => {
    console.log(`  [${m.trains?.priority}] Train ${m.trains?.train_number} (${m.trains?.train_type}) | Arr: ${m.arrival_time} Dep: ${m.departure_time} | Dir: ${m.direction}`);
  });
}

verify();
