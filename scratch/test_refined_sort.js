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

// Friendly name / partial name to station code
const STATION_CODE_LOOKUP = {
  'erode': 'ED',
  'cauvery': 'CV',
  'anangur': 'ANU',
  'sankari': 'SGE',
  'sankaridrug': 'SGE',
  'mavelipalaiyam': 'MVPM',
  'magudanchavadi': 'DC',
  'virapandy': 'VRPD',
  'neykkarappatti': 'NEA',
  'salem': 'SA',
  'totiyapalaiyam': 'TPM',
  'totiyapalayam': 'TPM',
  'perundurai': 'PY',
  'ingur': 'IGR',
  'vijayamangalam': 'VZ',
  'uttukuli': 'UKL',
  'tiruppur': 'TUP',
  'vanjipalaiyam': 'VNJ',
  'somanur': 'SNO',
  'sulur': 'SUU',
  'irugur': 'IGU',
  'singanallur': 'SHI',
  'pilamedu': 'PLMD',
  'coimbatore north': 'CBF',
  'coimbatore': 'CBE',
  'podanur': 'PTJ',
  'madukkarai': 'MDKI',
  'ettimadai': 'ETMD',
  'walayar': 'WRA',
  'kanjikode': 'KJKD',
  'palakkad': 'PGT',
  'magnesite': 'MGTC',
  'karuppur': 'KPPR',
  'tinnappatti': 'TNT',
  'danishpet': 'DSPT',
  'lokur': 'LCR',
  'bommidi': 'BQI',
  'buddireddipatti': 'BDY',
  'morappur': 'MAP',
  'dasampatti': 'DST',
  'samalpatti': 'SLY',
  'tirupattur': 'TPT',
  'jolarpettai': 'JTJ',
};

function resolveStationCode(code, name) {
  if (code && code.trim()) return code.trim().toUpperCase();
  const lower = (name || '').toLowerCase();
  for (const [key, val] of Object.entries(STATION_CODE_LOOKUP)) {
    if (lower.includes(key)) return val;
  }
  return '';
}

function getStationIndex(corridorName, stationCode, stationName) {
  const normCorridor = corridorName.toLowerCase().replace(/--|-/g, '–').trim();
  const stationList = ROUTE_STATION_ORDER[normCorridor] || [];
  
  const code = resolveStationCode(stationCode, stationName);
  if (code) {
    const idx = stationList.indexOf(code);
    if (idx !== -1) return idx;
  }
  return 999;
}

function parseSectionStations(sectionStr) {
  const parts = (sectionStr || '').split(/–|-/).map(s => s.trim());
  return {
    fromName: parts[0] || '',
    toName: parts[1] || ''
  };
}

function compareCorridors(a, b) {
  const normA = (a.corridor_name || a.corridor || '').toLowerCase().replace(/--|-/g, '–').trim();
  const normB = (b.corridor_name || b.corridor || '').toLowerCase().replace(/--|-/g, '–').trim();

  let cIdxA = CORRIDOR_ROUTE_ORDER.indexOf(normA);
  let cIdxB = CORRIDOR_ROUTE_ORDER.indexOf(normB);
  if (cIdxA === -1) cIdxA = 999;
  if (cIdxB === -1) cIdxB = 999;

  if (cIdxA !== cIdxB) return cIdxA - cIdxB;

  const secA = parseSectionStations(a.block_section || a.section);
  const secB = parseSectionStations(b.block_section || b.section);

  const fromCodeA = a.from_station?.station_code || a.fromStationCode;
  const toCodeA = a.to_station?.station_code || a.toStationCode;

  const fromCodeB = b.from_station?.station_code || b.fromStationCode;
  const toCodeB = b.to_station?.station_code || b.toStationCode;

  const fromIdxA = getStationIndex(normA, fromCodeA, secA.fromName);
  const fromIdxB = getStationIndex(normB, fromCodeB, secB.fromName);

  const toIdxA = getStationIndex(normA, toCodeA, secA.toName);
  const toIdxB = getStationIndex(normB, toCodeB, secB.toName);

  const spanA = Math.abs(toIdxA - fromIdxA);
  const spanB = Math.abs(toIdxB - fromIdxB);

  // Consecutive block sections (span <= 2) before large composite division spans
  const isCompositeA = spanA > 2 ? 1 : 0;
  const isCompositeB = spanB > 2 ? 1 : 0;
  if (isCompositeA !== isCompositeB) return isCompositeA - isCompositeB;

  if (fromIdxA !== fromIdxB) return fromIdxA - fromIdxB;
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

async function testErodeSalem() {
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
    `)
    .ilike('corridor_name', '%Erode – Salem%');

  const sorted = [...data].sort(compareCorridors);

  console.log('--- REFINED SORT: Erode – Salem ---');
  sorted.forEach((c, idx) => {
    console.log(`${idx + 1}. [${c.line}] ${c.block_section} | Status: ${c.availability_status}`);
  });
}

testErodeSalem();
