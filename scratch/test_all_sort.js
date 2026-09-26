const { createClient } = require('@supabase/supabase-js');

const url = 'https://nbtwgbmqjjhvlryvatdn.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idHdnYm1xampodmxyeXZhdGRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NTcwMDEsImV4cCI6MjEwNTIzMzAwMX0._JMfAY5ntzI4CO9ACTyW0Gl4Cugfx1uCs648AVPayEM';

const sb = createClient(url, key);

const CORRIDOR_ROUTE_ORDER = [
  'erode – salem',
  'erode – tiruppur',
  'tiruppur – coimbatore',
  'coimbatore – palakkad',
  'salem – jolarpettai',
  'katpadi – jolarpettai',
];

const ROUTE_STATION_ORDER = {
  'erode – salem': ['ED', 'CV', 'ANU', 'SGE', 'SKD', 'MVPM', 'DC', 'VRPD', 'NEA', 'SA'],
  'salem – jolarpettai': ['SA', 'MGTC', 'KPPR', 'OML', 'TNT', 'DSPT', 'LCR', 'BQI', 'BDY', 'MAP', 'DST', 'SLY', 'TPT', 'JTJ'],
  'erode – tiruppur': ['ED', 'TPM', 'PY', 'IGR', 'VZ', 'UKL', 'TUP'],
  'tiruppur – coimbatore': ['TUP', 'VNJ', 'SNO', 'SUU', 'IGU', 'SHI', 'PLMD', 'CBF', 'CBE'],
  'coimbatore – palakkad': ['CBE', 'PTJ', 'MDKI', 'ETMD', 'WRA', 'KJKD', 'PGT'],
  'katpadi – jolarpettai': ['KPD', 'GYM', 'AB', 'VN', 'JTJ'],
};

function getStationIndex(corridorName, stationCode, stationName) {
  const normCorridor = corridorName.toLowerCase().replace(/--|-/g, '–').trim();
  const stationList = ROUTE_STATION_ORDER[normCorridor] || [];
  
  if (stationCode) {
    const idx = stationList.indexOf(stationCode.toUpperCase());
    if (idx !== -1) return idx;
  }
  
  const normName = (stationName || '').toLowerCase();
  for (let i = 0; i < stationList.length; i++) {
    const code = stationList[i].toLowerCase();
    if (normName.includes(code)) return i;
  }
  return 999;
}

function compareCorridors(a, b) {
  const normA = (a.corridor_name || a.corridor || '').toLowerCase().replace(/--|-/g, '–').trim();
  const normB = (b.corridor_name || b.corridor || '').toLowerCase().replace(/--|-/g, '–').trim();

  let cIdxA = CORRIDOR_ROUTE_ORDER.indexOf(normA);
  let cIdxB = CORRIDOR_ROUTE_ORDER.indexOf(normB);
  if (cIdxA === -1) cIdxA = 999;
  if (cIdxB === -1) cIdxB = 999;

  if (cIdxA !== cIdxB) return cIdxA - cIdxB;

  const fromCodeA = a.from_station?.station_code || a.fromStationCode;
  const fromNameA = a.from_station?.station_name || a.fromStation;
  const toCodeA = a.to_station?.station_code || a.toStationCode;
  const toNameA = a.to_station?.station_name || a.toStation;

  const fromCodeB = b.from_station?.station_code || b.fromStationCode;
  const fromNameB = b.from_station?.station_name || b.fromStation;
  const toCodeB = b.to_station?.station_code || b.toStationCode;
  const toNameB = b.to_station?.station_name || b.toStation;

  const fromIdxA = getStationIndex(normA, fromCodeA, fromNameA);
  const fromIdxB = getStationIndex(normB, fromCodeB, fromNameB);

  if (fromIdxA !== fromIdxB) return fromIdxA - fromIdxB;

  // Prefer consecutive block sections (span === 1) before composite spans (span > 1)
  const toIdxA = getStationIndex(normA, toCodeA, toNameA);
  const toIdxB = getStationIndex(normB, toCodeB, toNameB);
  const spanA = Math.abs(toIdxA - fromIdxA);
  const spanB = Math.abs(toIdxB - fromIdxB);
  if (spanA !== spanB) return spanA - spanB;

  if (toIdxA !== toIdxB) return toIdxA - toIdxB;

  // UP line first then DN line
  const lineA = a.line || '';
  const lineB = b.line || '';
  if (lineA !== lineB) {
    if (lineA.includes('UP')) return -1;
    if (lineB.includes('UP')) return 1;
  }

  return 0;
}

async function testAll() {
  const { data } = await sb
    .from('corridors')
    .select(`
      id,
      corridor_name,
      block_section,
      line,
      distance_km,
      availability_status,
      from_station:stations!corridors_from_station_id_fkey(station_code, station_name),
      to_station:stations!corridors_to_station_id_fkey(station_code, station_name)
    `);

  const sorted = [...data].sort(compareCorridors);

  for (const cName of CORRIDOR_ROUTE_ORDER) {
    const list = sorted.filter(c => c.corridor_name.toLowerCase().replace(/--|-/g, '–').trim() === cName);
    console.log(`\n=== Corridor: ${cName} (${list.length} sections) ===`);
    list.forEach((c, idx) => {
      console.log(`  ${idx + 1}. [${c.line}] ${c.block_section} (${c.from_station?.station_code} -> ${c.to_station?.station_code})`);
    });
  }
}

testAll();
