const { createClient } = require('@supabase/supabase-js');
const url = 'https://nbtwgbmqjjhvlryvatdn.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idHdnYm1xampodmxyeXZhdGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NTcwMDEsImV4cCI6MjEwNTIzMzAwMX0._JMfAY5ntzI4CO9ACTyW0Gl4Cugfx1uCs648AVPayEM';
const sb = createClient(url, key);

async function run() {
  const { count: trainCount } = await sb.from('trains').select('*', { count: 'exact', head: true });
  const { count: tmCount } = await sb.from('train_movements').select('*', { count: 'exact', head: true });
  console.log(`Trains: ${trainCount}, Train Movements: ${tmCount}`);

  const { data: tm } = await sb.from('train_movements').select('corridor_id, movement_date').limit(10);
  console.log('Sample train movements:', tm);
  process.exit(0);
}
run();
