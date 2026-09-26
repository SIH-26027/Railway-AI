'use client';

import React, { useState } from 'react';
import { PageContainer } from '../../../components/layout/PageContainer';
import { usePlanning } from '../../../context/PlanningContext';
import {
  CalendarRange,
  Users2,
  Clock,
  MapPin,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { DepartmentBadge, StatusBadge } from '../../../components/common/Badge';
import { ExistingBlock, AIPlanningPlan } from '../../../types/railway';

export default function WeeklyPlanningPage() {
  const { existingBlocks, aiPlans } = usePlanning();
  const [selectedCorridor, setSelectedCorridor] = useState('ALL');

  const daysOfWeek = [
    { name: 'Monday', date: '21 Sep', fullDate: '2026-09-21' },
    { name: 'Tuesday', date: '22 Sep', fullDate: '2026-09-22' },
    { name: 'Wednesday', date: '23 Sep', fullDate: '2026-09-23' },
    { name: 'Thursday', date: '24 Sep', fullDate: '2026-09-24' },
    { name: 'Friday', date: '25 Sep', fullDate: '2026-09-25' },
    { name: 'Saturday', date: '26 Sep', fullDate: '2026-09-26' },
    { name: 'Sunday', date: '27 Sep', fullDate: '2026-09-27' },
  ];

  const departments: { key: 'Engineering' | 'TRD' | 'S&T'; label: string; system: string; color: string }[] = [
    { key: 'Engineering', label: 'Engineering', system: 'TMS', color: 'border-l-4 border-l-blue-600' },
    { key: 'TRD', label: 'Traction Distribution (TRD)', system: 'TDMS', color: 'border-l-4 border-l-amber-600' },
    { key: 'S&T', label: 'Signal & Telecomm (S&T)', system: 'SMMS', color: 'border-l-4 border-l-purple-600' },
  ];

  // Helper to get items for a department & day
  const getItemsForDeptDay = (deptKey: string, dayDate: string) => {
    // Combine existing blocks and approved/recommended AI plans
    const blocks = existingBlocks.filter((b: ExistingBlock) => b.departmentShort === deptKey && b.date === dayDate);
    const plans = aiPlans.filter((p: AIPlanningPlan) => p.departmentShort === deptKey && p.recommendedDate === dayDate);
    return { blocks, plans };
  };

  return (
    <PageContainer>
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-indigo-600" />
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              Weekly Maintenance Block Planning Board
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-departmental schedule matrix across Engineering, TRD, and S&T for multi-department corridor coordination
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center bg-slate-100 rounded border border-slate-200 p-1">
            <button className="p-1 hover:bg-white rounded transition-colors text-slate-600">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2.5 font-bold text-slate-800">21 Sep – 27 Sep 2026 (Week 38)</span>
            <button className="p-1 hover:bg-white rounded transition-colors text-slate-600">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Department Shadow Coordination Highlight Callout */}
      <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 text-blue-800 rounded border border-blue-200 shrink-0">
            <Users2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-blue-900 text-xs uppercase tracking-wide">
                Multi-Department Shadow Coordination Active
              </span>
              <span className="px-1.5 py-0.2 bg-blue-200 text-blue-900 rounded text-[10px] font-bold">
                Wed 23 Sep (01:00 – 05:00)
              </span>
            </div>
            <p className="text-blue-800 text-[11px] mt-0.5 leading-relaxed">
              Katpadi – Jolarpettai corridor: Engineering track de-stressing (BR-2026-010), TRD bracket replacement (BR-2026-011) and S&T cable megger testing (BR-2026-012) consolidated into a single 4-hour window. Saves <strong>5 hours</strong> of repetitive track possession.
            </p>
          </div>
        </div>

        <span className="px-2.5 py-1 bg-white border border-blue-200 rounded font-semibold text-blue-800 text-[11px] shrink-0">
          3 Depts Synchronized
        </span>
      </div>

      {/* Filter by Corridor */}
      <div className="bg-white rounded border border-slate-200 p-2.5 shadow-2xs flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Filter Corridor:</span>
          <select
            value={selectedCorridor}
            onChange={(e) => setSelectedCorridor(e.target.value)}
            className="text-xs py-1 px-2.5 bg-slate-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 font-medium"
          >
            <option value="ALL">All Corridors (Salem Division)</option>
            <option value="Erode – Salem">Erode – Salem</option>
            <option value="Salem – Jolarpettai">Salem – Jolarpettai</option>
            <option value="Erode – Tiruppur">Erode – Tiruppur</option>
            <option value="Coimbatore – Palakkad">Coimbatore – Palakkad</option>
            <option value="Katpadi – Jolarpettai">Katpadi – Jolarpettai</option>
          </select>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-emerald-100 border border-emerald-400 rounded"></span> Approved/Active Block
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-indigo-50 border border-indigo-300 rounded"></span> AI Recommended Plan
          </span>
        </div>
      </div>

      {/* Weekly Matrix Board */}
      <div className="bg-white rounded border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs min-w-[1000px]">
            {/* Table Header: Days of the week */}
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="w-48 p-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600 border-r border-slate-200">
                  Department
                </th>
                {daysOfWeek.map((day) => (
                  <th
                    key={day.fullDate}
                    className="p-2.5 text-center border-r border-slate-200 last:border-r-0"
                  >
                    <div className="font-bold text-slate-900">{day.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{day.date}</div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body: Department Rows */}
            <tbody className="divide-y divide-slate-200">
              {departments.map((dept) => (
                <tr key={dept.key} className="align-top">
                  {/* Department Column */}
                  <td className={`p-3 bg-slate-50/70 border-r border-slate-200 ${dept.color}`}>
                    <div className="font-bold text-slate-900 text-xs">{dept.label}</div>
                    <div className="text-[10px] font-mono text-slate-500 mt-0.5">Source: {dept.system}</div>
                  </td>

                  {/* 7 Days Columns */}
                  {daysOfWeek.map((day) => {
                    const { blocks, plans } = getItemsForDeptDay(dept.key, day.fullDate);
                    const hasItems = blocks.length > 0 || plans.length > 0;

                    return (
                      <td
                        key={day.fullDate}
                        className="p-2 border-r border-slate-200 last:border-r-0 min-w-[130px] space-y-1.5"
                      >
                        {/* Existing Approved Blocks in this slot */}
                        {blocks.map((b) => (
                          <div
                            key={b.blockId}
                            className="p-2 rounded bg-emerald-50 border border-emerald-200 shadow-2xs hover:border-emerald-300 transition-all space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-[10px] text-emerald-900">
                                {b.startTime}–{b.endTime}
                              </span>
                              <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1 py-0.2 rounded">
                                APPROVED
                              </span>
                            </div>
                            <div className="font-semibold text-slate-800 text-[11px] leading-tight line-clamp-2">
                              {b.purpose}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {b.corridor}
                            </div>
                          </div>
                        ))}

                        {/* AI Recommended Plans in this slot */}
                        {plans.map((p) => (
                          <div
                            key={p.planId}
                            className={`p-2 rounded border shadow-2xs hover:shadow-xs transition-all space-y-1 ${
                              p.coordinationOpportunity?.isCoordinated
                                ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-300'
                                : 'bg-indigo-50/50 border-indigo-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-[10px] text-indigo-900">
                                {p.startTime}–{p.endTime}
                              </span>
                              {p.coordinationOpportunity?.isCoordinated ? (
                                <span className="text-[9px] font-bold text-blue-800 bg-blue-100 px-1 py-0.2 rounded flex items-center gap-0.5">
                                  <Users2 className="w-2.5 h-2.5" /> COORD
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold text-indigo-800 bg-indigo-100 px-1 py-0.2 rounded">
                                  AI REC
                                </span>
                              )}
                            </div>
                            <div className="font-semibold text-slate-800 text-[11px] leading-tight line-clamp-2">
                              {p.maintenanceType}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {p.corridor} ({p.line})
                            </div>
                          </div>
                        ))}

                        {!hasItems && (
                          <div className="h-14 flex items-center justify-center text-slate-300 text-[10px]">
                            — Clear Slot —
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageContainer>
  );
}
