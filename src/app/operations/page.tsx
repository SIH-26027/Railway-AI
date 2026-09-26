'use client';

import React, { useState } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { usePlanning } from '../../context/PlanningContext';
import { Train, Clock, ArrowRight, BarChart2, ShieldAlert, Sparkles, Filter } from 'lucide-react';
import { TrainSchedule } from '../../types/railway';

export default function OperationsPage() {
  const { trains, corridors } = usePlanning();
  const [typeFilter, setTypeFilter] = useState('ALL');

  const filteredTrains = trains.filter((t: TrainSchedule) => {
    if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;
    return true;
  });

  // Derive corridor traffic summary from context data — grouped by corridor name
  const corridorGroups = React.useMemo(() => {
    const map = new Map<string, typeof corridors>();
    corridors.forEach(c => {
      if (!map.has(c.corridor)) map.set(c.corridor, []);
      map.get(c.corridor)!.push(c);
    });
    return Array.from(map.entries()).map(([corridor, sections]) => {
      const blocked = sections.filter(s => s.currentAvailability === 'Blocked').length;
      const restricted = sections.filter(s => s.currentAvailability === 'Restricted Speed').length;
      const peakSections = sections.filter(
        s => s.trainDensity === 'Peak Traffic' || s.trainDensity === 'High Traffic'
      ).length;
      const suitability =
        blocked > 0
          ? 'Maintenance Active'
          : restricted > 0
          ? 'Caution Orders Active'
          : peakSections > sections.length / 2
          ? 'High Traffic Corridor'
          : 'Available for Scheduling';

      return { corridor, sections, blocked, restricted, peakSections, suitability };
    });
  }, [corridors]);


  return (
    <PageContainer>
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Train className="w-5 h-5 text-indigo-600" />
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              Trains & Operational Timetable Feeds
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Timetable headways, freight forecasts, and corridor traffic patterns ingested by the automatic block planning engine
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded font-medium">
            AI Engine Timetable Constraint Sync: Active
          </span>
        </div>
      </div>

      {/* Section 1: Corridor Traffic Analysis & Maintenance Windows */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            1. Corridor Traffic Density &amp; Operational Availability
          </h2>
          <span className="text-[11px] text-slate-500">
            {corridorGroups.length > 0
              ? `${corridorGroups.length} Monitored Railway Corridor${corridorGroups.length > 1 ? 's' : ''}`
              : 'No corridor data loaded'}
          </span>
        </div>

        {corridorGroups.length === 0 ? (
          <div className="bg-white rounded border border-slate-200 p-8 flex flex-col items-center justify-center gap-2 text-slate-400 shadow-2xs">
            <BarChart2 className="w-8 h-8 text-slate-300" />
            <p className="text-xs font-medium">No corridor data available.</p>
            <p className="text-[11px] text-slate-400">Corridor sections will appear here once loaded from the operational database.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {corridorGroups.map((cg, idx) => (
              <div
                key={idx}
                className="bg-white rounded border border-slate-200 p-3.5 shadow-2xs hover:border-slate-300 transition-all space-y-2.5 text-xs"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="font-bold text-slate-900 text-xs">{cg.corridor}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                    cg.blocked > 0
                      ? 'text-rose-800 bg-rose-50 border-rose-200'
                      : cg.restricted > 0
                      ? 'text-amber-800 bg-amber-50 border-amber-200'
                      : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                  }`}>
                    {cg.suitability}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Block Sections</span>
                    <span className="font-bold text-slate-800">{cg.sections.length} sections</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Active Restrictions</span>
                    <span className={`font-mono font-semibold ${
                      cg.blocked > 0 ? 'text-rose-700' : cg.restricted > 0 ? 'text-amber-700' : 'text-slate-500'
                    }`}>
                      {cg.blocked > 0
                        ? `${cg.blocked} Blocked`
                        : cg.restricted > 0
                        ? `${cg.restricted} Restricted Speed`
                        : 'None'}
                    </span>
                  </div>
                  <div className="col-span-2 p-2 bg-indigo-50/50 rounded border border-indigo-100">
                    <span className="text-indigo-900 font-bold block text-[10px] uppercase">
                      High Traffic Sections
                    </span>
                    <span className="font-mono font-bold text-indigo-800 text-xs">
                      {cg.peakSections} / {cg.sections.length} sections
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Train Timetable & Operational Schedule Feed */}
      <div className="space-y-2.5 pt-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            2. High-Priority Working Timetable (WTT) & Freight Ingestion
          </h2>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Filter Train Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="py-1 px-2.5 bg-slate-50 border border-slate-300 rounded text-slate-800"
            >
              <option value="ALL">All Train Types</option>
              <option value="Vande Bharat">Vande Bharat</option>
              <option value="Superfast">Superfast Express</option>
              <option value="Express">Express</option>
              <option value="Passenger">Passenger</option>
              <option value="Goods (Freight)">Goods (Freight Rakes)</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Train Number</th>
                  <th>Train Name</th>
                  <th>Category</th>
                  <th>Operating Route</th>
                  <th>Corridor</th>
                  <th>Section Arrival</th>
                  <th>Section Departure</th>
                  <th>Planning Priority</th>
                  <th>Running Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTrains.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <Train className="w-8 h-8 text-slate-300" />
                        <span className="text-xs font-medium">No train services found.</span>
                        <span className="text-[11px]">Timetable data will appear here once loaded from the COA operational feed.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTrains.map((t) => (
                    <tr key={t.trainNumber} className="hover:bg-slate-50/80 transition-colors">
                      {/* Train Number */}
                      <td className="font-mono font-bold text-xs text-slate-900 whitespace-nowrap">
                        {t.trainNumber}
                      </td>

                      {/* Train Name */}
                      <td className="font-semibold text-slate-800 text-xs whitespace-nowrap">
                        {t.trainName}
                      </td>

                      {/* Category */}
                      <td className="whitespace-nowrap">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                            t.type === 'Vande Bharat'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : t.type === 'Superfast'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : t.type.includes('Goods')
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {t.type}
                        </span>
                      </td>

                      {/* Route */}
                      <td className="text-slate-700 text-xs whitespace-nowrap">
                        {t.route}
                      </td>

                      {/* Corridor */}
                      <td className="text-slate-700 text-xs whitespace-nowrap">
                        {t.corridor}
                      </td>

                      {/* Arrival */}
                      <td className="font-mono text-xs font-bold text-slate-800 whitespace-nowrap">
                        {t.arrival}
                      </td>

                      {/* Departure */}
                      <td className="font-mono text-xs font-bold text-slate-800 whitespace-nowrap">
                        {t.departure}
                      </td>

                      {/* Priority */}
                      <td className="whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            t.priority === 'Highest'
                              ? 'bg-rose-100 text-rose-800'
                              : t.priority === 'High'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>

                      {/* Days of Run */}
                      <td className="text-slate-500 text-xs whitespace-nowrap font-mono">
                        {t.daysOfRun}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-2 bg-slate-50/80 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Timetable updates automatically pulled from the Control Office Application (COA).</span>
            <span className="font-semibold text-slate-700">{filteredTrains.length} Services Listed</span>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
