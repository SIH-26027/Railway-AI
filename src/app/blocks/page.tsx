'use client';

import React, { useState } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { ExistingBlockTable } from '../../components/blocks/ExistingBlockTable';
import { usePlanning } from '../../context/PlanningContext';
import { Layers, Info, Filter, ShieldCheck, CheckCircle2 } from 'lucide-react';

import { ExistingBlock } from '../../types/railway';

export default function ExistingBlocksPage() {
  const { existingBlocks } = usePlanning();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');

  const filteredBlocks = existingBlocks.filter((b: ExistingBlock) => {
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
    if (deptFilter !== 'ALL' && b.departmentShort !== deptFilter) return false;
    return true;
  });

  return (
    <PageContainer>
      {/* Header Banner clearly separating from AI */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              Existing Operational Blocks Schedule
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Committed and authorized railway maintenance blocks currently operating or scheduled in the active working timetable
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded font-semibold inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            COA Approved Schedule (Official)
          </span>
        </div>
      </div>

      {/* Critical Enterprise Distinction Notice */}
      <div className="p-3 bg-amber-50/70 border border-amber-200 rounded text-xs text-amber-900 flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Operational System Distinction:</span> Records listed on this page represent officially confirmed, approved or currently active blocks entered into the railway operational working timetable. They are distinct from <em>AI Candidate Recommended Blocks</em>, which remain under pending review until formally approved by the COA Chief Controller.
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded border border-slate-200 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded border border-slate-200">
          {(['ALL', 'Active', 'Scheduled', 'Completed'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded font-semibold transition-all ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st === 'ALL' ? 'All Blocks' : st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Department:</span>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="text-xs py-1 px-2.5 bg-slate-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
          >
            <option value="ALL">All Departments</option>
            <option value="Engineering">Engineering (TMS)</option>
            <option value="TRD">TRD (TDMS)</option>
            <option value="S&T">S&T (SMMS)</option>
          </select>
        </div>
      </div>

      {/* Blocks Table */}
      <ExistingBlockTable blocks={filteredBlocks} />
    </PageContainer>
  );
}
