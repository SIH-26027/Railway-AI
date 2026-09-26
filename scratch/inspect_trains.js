const { createClient } = require('@supabase/supabase-js');

const url = 'https://nbtwgbmqjjhvlryvatdn.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idHdnYm1xampodmxyeXZhdGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NTcwMDEsImV4cCI6MjEwNTIzMzAwMX0._JMfAY5ntzI4CO9ACTyW0Gl4Cugfx1uCs648AVPayEM';

const sb = createClient(url, key);

async function main() {
  console.log('--- FETCHING TRAINS ---');
  const { data: trains, error: errT } = await sb.table('trains').select('*').limit(5);
  if (errT) console.error('Trains err:', errT);
  else {
    console.log('Total trains sample:', trains.length);
    if (trains.length > 0) {
      console.log('Train columns:', Object.keys(trains[0]));
      console.log(JSON.stringify(trains[0], null, 2));
    }
  }

  console.log('\n--- FETCHING TRAIN_MOVEMENTS ---');
  const { data: mv, error: errM } = await sb.table('train_movements').select('*').limit(5);
  if (errM) console.error('Movements err:', errM);
  else {
    console.log('Total movements sample:', mv.length);
    if (mv.length > 0) {
      console.log('Movements columns:', Object.keys(mv[0]));
      console.log(JSON.stringify(mv[0], null, 2));
    }
  }
}

main();
