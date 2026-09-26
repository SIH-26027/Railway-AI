/**
 * lib/railradar.ts
 *
 * RailRadar Developer API Client & Railway Block Section Extraction Engine
 * API Docs: https://railradar.in/developers
 * Base URL: https://api.railradar.in/v1
 *
 * Extracts exact consecutive block sections between stations with chainages
 * so maintenance requests can be targeted with precision to actual block sections.
 */

export interface RailRadarStation {
  stationCode: string;
  stationName: string;
  distanceKm: number;
  arrivalTime?: string;
  departureTime?: string;
  platform?: string;
  haltMinutes?: number;
}

export interface ExactBlockSection {
  id: string;
  corridorName: string;
  blockSection: string;
  fromStationCode: string;
  fromStationName: string;
  fromKm: number;
  toStationCode: string;
  toStationName: string;
  toKm: number;
  distanceKm: number;
  lines: ('UP Line' | 'DN Line')[];
  maxSpeedKmph: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. EXACT RAILRADAR STATION DATA FOR SALEM DIVISION (SOUTHERN RAILWAY)
// Derived from RailRadar Train Timetable Route APIs (e.g. 06802, 06819, 06846)
// ─────────────────────────────────────────────────────────────────────────────

export const RAILRADAR_ERODE_SALEM_STATIONS: RailRadarStation[] = [
  { stationCode: 'ED',   stationName: 'Erode Jn',       distanceKm: 100.6, platform: '1' },
  { stationCode: 'CV',   stationName: 'Cauvery',        distanceKm: 105.4, platform: '1' },
  { stationCode: 'ANU',  stationName: 'Anangur',        distanceKm: 113.9, platform: '1' },
  { stationCode: 'SGE',  stationName: 'Sankaridrug',    distanceKm: 121.8, platform: '2' },
  { stationCode: 'MVPM', stationName: 'Mavelipalaiyam', distanceKm: 126.8, platform: '1' },
  { stationCode: 'DC',   stationName: 'Magudanchavadi', distanceKm: 139.3, platform: '2' },
  { stationCode: 'VRPD', stationName: 'Virapandy Road', distanceKm: 150.0, platform: '1' },
  { stationCode: 'NEA',  stationName: 'Neykkarappatti', distanceKm: 153.0, platform: '1' },
  { stationCode: 'SA',   stationName: 'Salem Jn',       distanceKm: 160.0, platform: '5' },
];

export const RAILRADAR_ERODE_TIRUPPUR_STATIONS: RailRadarStation[] = [
  { stationCode: 'ED',   stationName: 'Erode Jn',        distanceKm: 0.0,   platform: '3' },
  { stationCode: 'TPM',  stationName: 'Totiyapalaiyam',  distanceKm: 6.8,   platform: '1' },
  { stationCode: 'PY',   stationName: 'Perundurai',      distanceKm: 13.7,  platform: '1' },
  { stationCode: 'IGR',  stationName: 'Ingur',           distanceKm: 19.3,  platform: '1' },
  { stationCode: 'VZ',   stationName: 'Vijayamangalam',  distanceKm: 27.2,  platform: '2' },
  { stationCode: 'UKL',  stationName: 'Uttukuli',        distanceKm: 36.4,  platform: '1' },
  { stationCode: 'TUP',  stationName: 'Tiruppur',        distanceKm: 50.3,  platform: '2' },
];

export const RAILRADAR_TIRUPPUR_COIMBATORE_STATIONS: RailRadarStation[] = [
  { stationCode: 'TUP',  stationName: 'Tiruppur',        distanceKm: 50.3,  platform: '2' },
  { stationCode: 'VNJ',  stationName: 'Vanjipalaiyam',   distanceKm: 58.6,  platform: '1' },
  { stationCode: 'SNO',  stationName: 'Somanur',         distanceKm: 68.1,  platform: '2' },
  { stationCode: 'SUU',  stationName: 'Sulur Road',      distanceKm: 76.9,  platform: '1' },
  { stationCode: 'IGU',  stationName: 'Irugur Jn',       distanceKm: 83.8,  platform: '1' },
  { stationCode: 'SHI',  stationName: 'Singanallur',     distanceKm: 87.2,  platform: '1' },
  { stationCode: 'PLMD', stationName: 'Pilamedu',        distanceKm: 92.1,  platform: '2' },
  { stationCode: 'CBF',  stationName: 'Coimbatore North',distanceKm: 97.4,  platform: '1' },
  { stationCode: 'CBE',  stationName: 'Coimbatore Jn',   distanceKm: 100.2, platform: '1' },
];

export const RAILRADAR_COIMBATORE_PALAKKAD_STATIONS: RailRadarStation[] = [
  { stationCode: 'CBE',  stationName: 'Coimbatore Jn',   distanceKm: 100.2, platform: '1' },
  { stationCode: 'PTJ',  stationName: 'Podanur Jn',      distanceKm: 106.0, platform: '3' },
  { stationCode: 'MDKI', stationName: 'Madukkarai',      distanceKm: 116.1, platform: '1' },
  { stationCode: 'ETMD', stationName: 'Ettimadai',       distanceKm: 125.2, platform: '1' },
  { stationCode: 'WRA',  stationName: 'Walayar',         distanceKm: 134.1, platform: '1' },
  { stationCode: 'KJKD', stationName: 'Kanjikode',       distanceKm: 146.4, platform: '2' },
  { stationCode: 'PGT',  stationName: 'Palakkad Jn',     distanceKm: 154.2, platform: '1' },
];

export const RAILRADAR_SALEM_JOLARPETTAI_STATIONS: RailRadarStation[] = [
  { stationCode: 'SA',   stationName: 'Salem Jn',        distanceKm: 0.0,   platform: '5' },
  { stationCode: 'MGTC', stationName: 'Magnesite Jn',    distanceKm: 3.5,   platform: '1' },
  { stationCode: 'KPPR', stationName: 'Karuppur',        distanceKm: 10.8,  platform: '1' },
  { stationCode: 'TNT',  stationName: 'Tinnappatti',     distanceKm: 21.6,  platform: '1' },
  { stationCode: 'DSPT', stationName: 'Danishpet',       distanceKm: 28.3,  platform: '2' },
  { stationCode: 'LCR',  stationName: 'Lokur',           distanceKm: 37.9,  platform: '1' },
  { stationCode: 'BQI',  stationName: 'Bommidi',         distanceKm: 48.0,  platform: '1' },
  { stationCode: 'BDY',  stationName: 'Buddireddipatti', distanceKm: 58.2,  platform: '1' },
  { stationCode: 'MAP',  stationName: 'Morappur',        distanceKm: 69.1,  platform: '2' },
  { stationCode: 'DST',  stationName: 'Dasampatti',      distanceKm: 77.4,  platform: '1' },
  { stationCode: 'SLY',  stationName: 'Samalpatti',      distanceKm: 85.8,  platform: '1' },
  { stationCode: 'TPT',  stationName: 'Tirupattur',      distanceKm: 107.8, platform: '1' },
  { stationCode: 'JTJ',  stationName: 'Jolarpettai Jn',  distanceKm: 120.4, platform: '2' },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. BLOCK SECTION GENERATOR (CONSECUTIVE STATION PAIRS)
// ─────────────────────────────────────────────────────────────────────────────

export function deriveBlockSections(
  corridorName: string,
  stations: RailRadarStation[],
  prefix: string
): ExactBlockSection[] {
  const sections: ExactBlockSection[] = [];

  for (let i = 0; i < stations.length - 1; i++) {
    const from = stations[i];
    const to = stations[i + 1];
    const dist = Math.round((to.distanceKm - from.distanceKm) * 10) / 10;

    sections.push({
      id: `${prefix}-${from.stationCode}-${to.stationCode}`,
      corridorName,
      blockSection: `${from.stationName} – ${to.stationName}`,
      fromStationCode: from.stationCode,
      fromStationName: from.stationName,
      fromKm: from.distanceKm,
      toStationCode: to.stationCode,
      toStationName: to.stationName,
      toKm: to.distanceKm,
      distanceKm: dist,
      lines: ['UP Line', 'DN Line'],
      maxSpeedKmph: 110
    });
  }

  return sections;
}

// Master collection of exact block sections across Salem Division
export const ALL_SALEM_BLOCK_SECTIONS: ExactBlockSection[] = [
  ...deriveBlockSections('Erode – Salem', RAILRADAR_ERODE_SALEM_STATIONS, 'SEC-ED-SA'),
  ...deriveBlockSections('Erode – Tiruppur', RAILRADAR_ERODE_TIRUPPUR_STATIONS, 'SEC-ED-TUP'),
  ...deriveBlockSections('Tiruppur – Coimbatore', RAILRADAR_TIRUPPUR_COIMBATORE_STATIONS, 'SEC-TUP-CBE'),
  ...deriveBlockSections('Coimbatore – Palakkad', RAILRADAR_COIMBATORE_PALAKKAD_STATIONS, 'SEC-CBE-PGT'),
  ...deriveBlockSections('Salem – Jolarpettai', RAILRADAR_SALEM_JOLARPETTAI_STATIONS, 'SEC-SA-JTJ'),
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. SECTION RESOLVER BASED ON KM CHAINAGE
// ─────────────────────────────────────────────────────────────────────────────

export function normalizeCorridorString(name: string): string {
  return (name || '')
    .replace(/[\u2010-\u2015\u2212-]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Finds the exact block section for a given corridor and Km chainage range.
 * E.g., for Erode - Salem at Km 100.6 → 105.4, returns 'Erode Jn – Cauvery'.
 */
export function resolveExactSection(
  corridorName: string,
  fromKm: number,
  toKm: number
): ExactBlockSection | null {
  const target = normalizeCorridorString(corridorName);

  let matchingCorridorSections = ALL_SALEM_BLOCK_SECTIONS.filter(s => {
    const candidate = normalizeCorridorString(s.corridorName);
    return candidate === target || candidate.includes(target) || target.includes(candidate);
  });

  // Fallback: match by station endpoint keywords (e.g. "erode" & "salem")
  if (matchingCorridorSections.length === 0 && target) {
    const parts = target.split('-').map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      matchingCorridorSections = ALL_SALEM_BLOCK_SECTIONS.filter(s => {
        const c = normalizeCorridorString(s.corridorName);
        return parts.every(p => c.includes(p));
      });
    }
  }

  if (matchingCorridorSections.length === 0) return null;

  const minKm = Math.min(fromKm, toKm);
  const maxKm = Math.max(fromKm, toKm);

  // Search for the section that envelopes or overlaps the requested chainage
  const found = matchingCorridorSections.find(s => {
    const sMin = Math.min(s.fromKm, s.toKm);
    const sMax = Math.max(s.fromKm, s.toKm);
    const overlapStart = Math.max(minKm, sMin);
    const overlapEnd = Math.min(maxKm, sMax);
    return overlapStart <= overlapEnd;
  });

  if (found) return found;

  // If no direct overlap, find nearest section by midpoint distance
  const midKm = (minKm + maxKm) / 2;
  let closest = matchingCorridorSections[0];
  let minDiff = Infinity;
  for (const s of matchingCorridorSections) {
    const sMid = (s.fromKm + s.toKm) / 2;
    const diff = Math.abs(sMid - midKm);
    if (diff < minDiff) {
      minDiff = diff;
      closest = s;
    }
  }

  return closest;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. LIVE RAILRADAR API FETCHER (WITH AUTOMATIC FALLBACK)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch live route & station halting sequence from RailRadar REST API.
 * Endpoint: GET https://api.railradar.in/v1/trains/{trainNumber}?haltsOnly=false
 */
export async function fetchRailRadarTrainSchedule(
  trainNumber: string,
  apiKey?: string
): Promise<{ success: boolean; stations: RailRadarStation[]; source: 'api' | 'fallback' }> {
  const key = apiKey || process.env.RAILRADAR_API_KEY || process.env.NEXT_PUBLIC_RAILRADAR_API_KEY;

  if (key) {
    try {
      const response = await fetch(`https://api.railradar.in/v1/trains/${trainNumber}?haltsOnly=false`, {
        headers: {
          'Authorization': `Bearer ${key}`,
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const rawHalts = data?.data?.halts || data?.halts || [];

        if (Array.isArray(rawHalts) && rawHalts.length > 0) {
          const stations: RailRadarStation[] = rawHalts.map((h: any) => ({
            stationCode: h.station_code || h.code || '',
            stationName: h.station_name || h.name || '',
            distanceKm: Number(h.distance_km || h.distance || 0),
            arrivalTime: h.arrival_time || h.scheduled_arrival || undefined,
            departureTime: h.departure_time || h.scheduled_departure || undefined,
            platform: h.platform ? String(h.platform) : undefined,
            haltMinutes: h.halt_duration_minutes || undefined,
          }));

          return { success: true, stations, source: 'api' };
        }
      }
    } catch (err) {
      console.warn('RailRadar live API request error:', err);
    }
  }

  // Graceful fallback to verified timetable stations
  let fallbackStations = RAILRADAR_ERODE_SALEM_STATIONS;
  if (['06819', '06801', '12676'].includes(trainNumber)) {
    fallbackStations = [...RAILRADAR_ERODE_TIRUPPUR_STATIONS, ...RAILRADAR_TIRUPPUR_COIMBATORE_STATIONS.slice(1)];
  }

  return { success: true, stations: fallbackStations, source: 'fallback' };
}
