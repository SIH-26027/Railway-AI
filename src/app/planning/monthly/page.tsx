'use client';

import React, { useState } from 'react';
import { PageContainer } from '../../../components/layout/PageContainer';
import { usePlanning } from '../../../context/PlanningContext';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Layers,
  Users2
} from 'lucide-react';
import { DepartmentBadge } from '../../../components/common/Badge';

export default function MonthlyPlanningPage() {
  const { existingBlocks, aiPlans, requests } = usePlanning();
  const [selectedCorridor, setSelectedCorridor] = useState('ALL');
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Days in September 2026 (Starts on Tuesday Sep 1)
  // Let's create a 35-cell calendar grid for September 2026
  const daysInMonth = Array.from({ length: 30 }, (_, i) => i + 1);
  const leadingBlankDays = 1; // Tuesday is day 1 (0 = Mon, 1 = Tue)

  // Map activities to dates in Sep 2026
  const getActivityForDay = (dayNum: number) => {
    const dayStr = `2026-09-${String(dayNum).padStart(2, '0')}`;
    const blocks = existingBlocks.filter(b => b.date === dayStr);
    const plans = aiPlans.filter(p => p.recommendedDate === dayStr);
    const highReqs = requests.filter(r => r.requestedDate === dayStr && r.priority === 'High');
    return { blocks, plans, highReqs };
  };

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-600" />
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              Monthly Maintenance Block Calendar
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Enterprise monthly horizon overview: existing operational blocks, AI recommendations, and high-priority maintenance requests
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center bg-slate-100 rounded border border-slate-200 p-1">
            <button className="p-1 hover:bg-white rounded transition-colors text-slate-600">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-3 font-bold text-slate-800">September 2026</span>
            <button className="p-1 hover:bg-white rounded transition-colors text-slate-600">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Legend Bar */}
      <div className="bg-white rounded border border-slate-200 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Corridor:</span>
            <select
              value={selectedCorridor}
              onChange={(e) => setSelectedCorridor(e.target.value)}
              className="py-1 px-2 bg-slate-50 border border-slate-300 rounded text-slate-800"
            >
              <option value="ALL">All Corridors</option>
              <option value="Erode – Salem">Erode – Salem</option>
              <option value="Salem – Jolarpettai">Salem – Jolarpettai</option>
              <option value="Erode – Tiruppur">Erode – Tiruppur</option>
              <option value="Coimbatore – Palakkad">Coimbatore – Palakkad</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Department:</span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="py-1 px-2 bg-slate-50 border border-slate-300 rounded text-slate-800"
            >
              <option value="ALL">All Departments</option>
              <option value="Engineering">Engineering (TMS)</option>
              <option value="TRD">TRD (TDMS)</option>
              <option value="S&T">S&T (SMMS)</option>
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> Existing Block
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-indigo-500"></span> AI Recommended
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-rose-500"></span> High Priority Defect
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-blue-500"></span> Multi-Dept Coordinated
          </span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded border border-slate-200 shadow-2xs overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100 text-slate-700 font-semibold text-xs text-center py-2">
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
          <div>Sun</div>
        </div>

        {/* Days Cells */}
        <div className="grid grid-cols-7 border-collapse divide-x divide-y divide-slate-200 text-xs">
          {/* Leading blank days */}
          {Array.from({ length: leadingBlankDays }).map((_, i) => (
            <div key={`blank-${i}`} className="h-28 bg-slate-50/50 p-1 text-slate-300">
              —
            </div>
          ))}

          {/* Actual days 1 - 30 */}
          {daysInMonth.map((dayNum) => {
            const { blocks, plans, highReqs } = getActivityForDay(dayNum);
            const isToday = dayNum === 18;

            return (
              <div
                key={dayNum}
                className={`min-h-[120px] p-1.5 transition-colors flex flex-col justify-between ${
                  isToday ? 'bg-blue-50/30' : 'bg-white hover:bg-slate-50/50'
                }`}
              >
                <div>
                  {/* Day header */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                        isToday
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-700'
                      }`}
                    >
                      {dayNum}
                    </span>
                    {isToday && (
                      <span className="text-[9px] font-bold text-blue-700 uppercase tracking-wide">
                        TODAY
                      </span>
                    )}
                  </div>

                  {/* Badges / Items for this day */}
                  <div className="space-y-1">
                    {/* Existing Blocks */}
                    {blocks.map(b => (
                      <div
                        key={b.blockId}
                        className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[10px] font-medium truncate"
                        title={`${b.blockId}: ${b.purpose} (${b.startTime}-${b.endTime})`}
                      >
                        <span className="font-bold">{b.startTime}</span> {b.departmentShort} ({b.durationMin}m)
                      </div>
                    ))}

                    {/* AI Plans */}
                    {plans.map(p => (
                      <div
                        key={p.planId}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate border ${
                          p.coordinationOpportunity?.isCoordinated
                            ? 'bg-blue-50 text-blue-900 border-blue-300 font-bold'
                            : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                        }`}
                        title={`${p.planId}: ${p.maintenanceType} (${p.startTime}-${p.endTime})`}
                      >
                        <span className="font-bold">{p.startTime}</span> AI: {p.departmentShort}
                      </div>
                    ))}

                    {/* High Priority Unplanned Requests */}
                    {highReqs.map(r => (
                      <div
                        key={r.id}
                        className="px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px] font-medium truncate"
                        title={`High Priority: ${r.asset} - ${r.maintenanceType}`}
                      >
                        ⚠️ {r.id}: {r.asset.slice(0, 15)}...
                      </div>
                    ))}
                  </div>
                </div>

                {/* Day summary footer */}
                {(blocks.length > 0 || plans.length > 0) && (
                  <div className="text-[9px] text-slate-400 font-mono text-right pt-1">
                    {blocks.length + plans.length} items
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </PageContainer>
  );
}
