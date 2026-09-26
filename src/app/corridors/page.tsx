'use client';

import React, { useState, useMemo } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { usePlanning } from '../../context/PlanningContext';
import {
  GitFork,
  Search,
  ArrowUpDown,
  ShieldCheck,
  AlertCircle,
  TrainTrack,
  ArrowRight,
  Construction,
  CheckCircle2,
  Navigation
} from 'lucide-react';
import { CorridorSection } from '../../types/railway';

// Master Railway Corridor Route Sequence Order
const CORRIDOR_ROUTE_ORDER = [
  'erode – salem',
  'erode – tiruppur',
  'tiruppur – coimbatore',
  'coimbatore – palakkad',
  'salem – jolarpettai',
  'katpadi – jolarpettai',
];

// Physical station chain order along each railway line (Start Station → End Station)
const ROUTE_STATION_ORDER: Record<string, string[]> = {
  'erode – salem': ['ED', 'CV', 'ANU', 'SGE', 'SKD', 'MVPM', 'DC', 'VRPD', 'NEA', 'SA'],
  'salem – jolarpettai': ['SA', 'MGTC', 'KPPR', 'OML', 'TNT', 'DSPT', 'LCR', 'BQI', 'BDY', 'MAP', 'DST', 'SLY', 'TPT', 'JTJ'],
  'erode – tiruppur': ['ED', 'TPM', 'PY', 'IGR', 'VZ', 'UKL', 'TUP'],
  'tiruppur – coimbatore': ['TUP', 'VNJ', 'SNO', 'SUU', 'IGU', 'SHI', 'PLMD', 'CBF', 'CBE'],
  'coimbatore – palakkad': ['CBE', 'PTJ', 'MDKI', 'ETMD', 'WRA', 'KJKD', 'PGT'],
  'katpadi – jolarpettai': ['KPD', 'GYM', 'AB', 'VN', 'JTJ'],
};

const STATION_CODE_LOOKUP: Record<string, string> = {
  erode: 'ED',
  cauvery: 'CV',
  anangur: 'ANU',
  sankari: 'SGE',
  sankaridrug: 'SGE',
  mavelipalaiyam: 'MVPM',
  magudanchavadi: 'DC',
  virapandy: 'VRPD',
  neykkarappatti: 'NEA',
  salem: 'SA',
  totiyapalaiyam: 'TPM',
  totiyapalayam: 'TPM',
  perundurai: 'PY',
  ingur: 'IGR',
  vijayamangalam: 'VZ',
  uttukuli: 'UKL',
  tiruppur: 'TUP',
  vanjipalaiyam: 'VNJ',
  somanur: 'SNO',
  sulur: 'SUU',
  irugur: 'IGU',
  singanallur: 'SHI',
  pilamedu: 'PLMD',
  coimbatore: 'CBE',
  podanur: 'PTJ',
  madukkarai: 'MDKI',
  ettimadai: 'ETMD',
  walayar: 'WRA',
  kanjikode: 'KJKD',
  palakkad: 'PGT',
  magnesite: 'MGTC',
  karuppur: 'KPPR',
  tinnappatti: 'TNT',
  danishpet: 'DSPT',
  lokur: 'LCR',
  bommidi: 'BQI',
  buddireddipatti: 'BDY',
  morappur: 'MAP',
  dasampatti: 'DST',
  samalpatti: 'SLY',
  tirupattur: 'TPT',
  jolarpettai: 'JTJ',
};

function resolveStationCode(code?: string, name?: string): string {
  if (code && code.trim()) return code.trim().toUpperCase();
  const lower = (name || '').toLowerCase();
  for (const [key, val] of Object.entries(STATION_CODE_LOOKUP)) {
    if (lower.includes(key)) return val;
  }
  return '';
}

function parseSectionStations(sectionStr: string) {
  const parts = (sectionStr || '').split(/–|-/).map(s => s.trim());
  return {
    fromName: parts[0] || '',
    toName: parts[1] || ''
  };
}

function getStationIndex(corridorName: string, stationCode?: string, stationName?: string): number {
  const normCorridor = corridorName.toLowerCase().replace(/--|-/g, '–').trim();
  const stationList = ROUTE_STATION_ORDER[normCorridor] || [];

  const code = resolveStationCode(stationCode, stationName);
  if (code) {
    const idx = stationList.indexOf(code);
    if (idx !== -1) return idx;
  }
  return 999;
}

function compareCorridorsByRouteOrder(a: CorridorSection, b: CorridorSection): number {
  const normA = a.corridor.toLowerCase().replace(/--|-/g, '–').trim();
  const normB = b.corridor.toLowerCase().replace(/--|-/g, '–').trim();

  let cIdxA = CORRIDOR_ROUTE_ORDER.indexOf(normA);
  let cIdxB = CORRIDOR_ROUTE_ORDER.indexOf(normB);
  if (cIdxA === -1) cIdxA = 999;
  if (cIdxB === -1) cIdxB = 999;

  if (cIdxA !== cIdxB) return cIdxA - cIdxB;

  const secA = parseSectionStations(a.section);
  const secB = parseSectionStations(b.section);

  const fromIdxA = getStationIndex(normA, a.fromStationCode, secA.fromName);
  const fromIdxB = getStationIndex(normB, b.fromStationCode, secB.fromName);

  const toIdxA = getStationIndex(normA, a.toStationCode, secA.toName);
  const toIdxB = getStationIndex(normB, b.toStationCode, secB.toName);

  const spanA = Math.abs(toIdxA - fromIdxA);
  const spanB = Math.abs(toIdxB - fromIdxB);

  // Consecutive inter-station block sections (span <= 2) before composite division spans
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

export default function CorridorsPage() {
  const { corridors } = usePlanning();
  const [searchTerm, setSearchTerm] = useState('');
  const [corridorFilter, setCorridorFilter] = useState('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState('ALL');

  // Filter & sort strictly in railway physical route order
  const filteredCorridors = useMemo(() => {
    const filtered = corridors.filter((c: CorridorSection) => {
      if (corridorFilter !== 'ALL' && !c.corridor.toLowerCase().includes(corridorFilter.toLowerCase())) {
        return false;
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const match =
          c.corridor.toLowerCase().includes(q) ||
          c.section.toLowerCase().includes(q) ||
          c.fromStation.toLowerCase().includes(q) ||
          c.toStation.toLowerCase().includes(q) ||
          (c.fromStationCode && c.fromStationCode.toLowerCase().includes(q)) ||
          (c.toStationCode && c.toStationCode.toLowerCase().includes(q)) ||
          (c.activeBlock && c.activeBlock.toLowerCase().includes(q));
        if (!match) return false;
      }
      if (availabilityFilter !== 'ALL' && c.currentAvailability !== availabilityFilter) return false;
      return true;
    });

    return [...filtered].sort(compareCorridorsByRouteOrder);
  }, [corridors, corridorFilter, searchTerm, availabilityFilter]);

  // Statistics counters
  const totalCount = corridors.length;
  const blockedCount = corridors.filter(c => c.currentAvailability === 'Blocked').length;
  const restrictedCount = corridors.filter(c => c.currentAvailability === 'Restricted Speed').length;
  const availableCount = corridors.filter(c => c.currentAvailability === 'Available').length;

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <GitFork className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              Railway Corridors & Block Sections
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational line capacity, real-time possession status, inter-station block sections in chronological route order
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 font-medium inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            RailRadar API Integrated
          </span>
          <span className="px-2.5 py-1 bg-blue-50 text-blue-800 rounded border border-blue-200 font-medium inline-flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-blue-600" />
            Station Route Sequence Active
          </span>
          <span className="px-2.5 py-1 bg-slate-100 rounded border border-slate-200 text-slate-700 font-medium">
            Salem Division (Southern Railway)
          </span>
        </div>
      </div>

      {/* Corridor Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <button
          onClick={() => setAvailabilityFilter('ALL')}
          className={`p-2.5 rounded border text-left transition-all cursor-pointer ${
            availabilityFilter === 'ALL'
              ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="text-slate-500 block text-[11px] font-medium">Total Corridors & Sections</span>
          <div className="text-base font-bold text-slate-800 mt-0.5">{totalCount} Sections</div>
          <span className="text-[10px] text-slate-400">Click to show all states</span>
        </button>

        <button
          onClick={() => setAvailabilityFilter('Available')}
          className={`p-2.5 rounded border text-left transition-all cursor-pointer ${
            availabilityFilter === 'Available'
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="text-emerald-700 font-medium block text-[11px] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Available (Unoccupied)
          </span>
          <div className="text-base font-bold text-emerald-700 mt-0.5">{availableCount} Sections</div>
          <span className="text-[10px] text-emerald-600 font-medium">Filter available sections</span>
        </button>

        <button
          onClick={() => setAvailabilityFilter('Blocked')}
          className={`p-2.5 rounded border text-left transition-all cursor-pointer ${
            availabilityFilter === 'Blocked'
              ? 'bg-rose-100/90 border-rose-400 ring-2 ring-rose-500/30 shadow-xs'
              : blockedCount > 0
              ? 'bg-rose-50/80 border-rose-300 ring-1 ring-rose-200 hover:bg-rose-100/60'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="text-rose-700 font-semibold block text-[11px] flex items-center gap-1">
            <Construction className="w-3 h-3 text-rose-600" /> Blocked (Under Maintenance)
          </span>
          <div className="text-base font-bold text-rose-700 mt-0.5">{blockedCount} Blocked</div>
          <span className="text-[10px] text-rose-600 font-medium">
            {blockedCount > 0 ? 'Click to view active possession' : 'No active block possessions'}
          </span>
        </button>

        <button
          onClick={() => setAvailabilityFilter('Restricted Speed')}
          className={`p-2.5 rounded border text-left transition-all cursor-pointer ${
            availabilityFilter === 'Restricted Speed'
              ? 'bg-amber-100/90 border-amber-400 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="text-amber-700 font-medium block text-[11px] flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-amber-600" /> Caution / Restricted Speed
          </span>
          <div className="text-base font-bold text-amber-700 mt-0.5">{restrictedCount} Sections</div>
          <span className="text-[10px] text-amber-600 font-medium">Speed restrictions applied</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded border border-slate-200 p-3 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search corridor, exact block section, station codes (e.g. ED, CV, ANU, SGE, BLK-2026-001)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-500 font-medium">Corridor:</span>
          <select
            value={corridorFilter}
            onChange={(e) => setCorridorFilter(e.target.value)}
            className="py-1 px-2.5 bg-slate-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 font-medium"
          >
            <option value="ALL">All Corridors ({corridors.length})</option>
            <option value="Erode – Salem">Erode – Salem</option>
            <option value="Erode – Tiruppur">Erode – Tiruppur</option>
            <option value="Tiruppur – Coimbatore">Tiruppur – Coimbatore</option>
            <option value="Coimbatore – Palakkad">Coimbatore – Palakkad</option>
            <option value="Salem – Jolarpettai">Salem – Jolarpettai</option>
            <option value="Katpadi – Jolarpettai">Katpadi – Jolarpettai</option>
          </select>

          <span className="text-slate-500 font-medium ml-2">Availability:</span>
          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            className="py-1 px-2.5 bg-slate-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 font-medium"
          >
            <option value="ALL">All States</option>
            <option value="Available">Available (Unoccupied)</option>
            <option value="Blocked">Blocked (Active Maintenance)</option>
            <option value="Restricted Speed">Restricted Speed (Caution)</option>
          </select>
        </div>
      </div>

      {/* Corridors Table */}
      <div className="bg-white rounded border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th className="w-16">Route Seq</th>
                <th>Corridor</th>
                <th>Exact Block Section</th>
                <th>Station Chain (Route Direction)</th>
                <th>Line</th>
                <th>Span (km)</th>
                <th>Speed Limit</th>
                <th>Current Availability</th>
                <th>Active Block ID</th>
                <th>Upcoming Block</th>
                <th>Train Density</th>
                <th>Operational Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCorridors.map((c, index) => {
                const isBlocked = c.currentAvailability === 'Blocked';
                const isRestricted = c.currentAvailability === 'Restricted Speed';

                return (
                  <tr
                    key={c.id}
                    className={`transition-colors ${
                      isBlocked
                        ? 'bg-rose-50/50 hover:bg-rose-50/80 border-l-4 border-l-rose-500'
                        : isRestricted
                        ? 'bg-amber-50/30 hover:bg-amber-50/60'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Route Sequence */}
                    <td className="whitespace-nowrap font-mono text-center">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-semibold border border-slate-200">
                        #{index + 1}
                      </span>
                    </td>

                    {/* Corridor */}
                    <td className="font-semibold text-slate-900 text-xs whitespace-nowrap">
                      {c.corridor}
                    </td>

                    {/* Section */}
                    <td className="font-semibold text-blue-900 text-xs whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded font-mono text-[11px] border ${
                        isBlocked
                          ? 'bg-rose-100 text-rose-900 border-rose-300 font-bold'
                          : 'bg-slate-100 text-slate-800 border-slate-200'
                      }`}>
                        {c.section}
                      </span>
                    </td>

                    {/* Station Chain (Route Traversal) */}
                    <td className="text-slate-700 text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-medium">
                        {c.fromStationCode && (
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 text-[10px]">
                            {c.fromStationCode}
                          </span>
                        )}
                        <span className="text-slate-800 font-semibold">{c.fromStation}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 mx-0.5 shrink-0" />
                        {c.toStationCode && (
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 text-[10px]">
                            {c.toStationCode}
                          </span>
                        )}
                        <span className="text-slate-800 font-semibold">{c.toStation}</span>
                      </div>
                    </td>

                    {/* Line */}
                    <td className="whitespace-nowrap">
                      <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded border ${
                        c.line === 'UP Line'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : c.line === 'DN Line'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {c.line}
                      </span>
                    </td>

                    {/* Distance */}
                    <td className="font-mono text-xs text-slate-700 whitespace-nowrap">
                      {c.distanceKm} km
                    </td>

                    {/* Max Speed */}
                    <td className="font-mono text-xs whitespace-nowrap">
                      {isBlocked ? (
                        <span className="text-rose-600 font-bold">0 km/h (Blocked)</span>
                      ) : (
                        <span className="text-slate-800 font-semibold">{c.maxSpeedKmph} km/h</span>
                      )}
                    </td>

                    {/* Availability */}
                    <td className="whitespace-nowrap">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded border inline-flex items-center gap-1.5 shadow-2xs ${
                          isBlocked
                            ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                            : isRestricted
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        {isBlocked ? (
                          <>
                            <Construction className="w-3 h-3" />
                            Blocked (Maintenance)
                          </>
                        ) : isRestricted ? (
                          <>
                            <AlertCircle className="w-3 h-3 text-amber-700" />
                            Restricted Speed
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Available
                          </>
                        )}
                      </span>
                    </td>

                    {/* Active Block */}
                    <td className="whitespace-nowrap font-mono text-xs">
                      {c.activeBlock ? (
                        <span className="text-rose-800 font-bold bg-rose-100 px-2 py-0.5 rounded border border-rose-300 inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
                          {c.activeBlock}
                        </span>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>

                    {/* Upcoming Block */}
                    <td className="whitespace-nowrap font-mono text-xs text-slate-600">
                      {c.upcomingBlock ? (
                        <span className="text-blue-700 font-medium bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          {c.upcomingBlock}
                        </span>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>

                    {/* Train Density */}
                    <td className="whitespace-nowrap">
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${
                          c.trainDensity === 'Peak Traffic'
                            ? 'bg-rose-100 text-rose-800'
                            : c.trainDensity === 'High Traffic'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {c.trainDensity}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="whitespace-nowrap">
                      <span className={`text-xs font-semibold ${
                        isBlocked
                          ? 'text-rose-700'
                          : isRestricted
                          ? 'text-amber-700'
                          : 'text-slate-700'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span>Track line clearances synchronized with SCADA and Control Office Timetable Feeds in physical route chainage.</span>
          <span className="font-semibold text-slate-700">{filteredCorridors.length} Sections Listed</span>
        </div>
      </div>
    </PageContainer>
  );
}
