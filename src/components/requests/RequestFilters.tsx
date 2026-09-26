'use client';

import React from 'react';
import { Search, Filter, RotateCcw } from 'lucide-react';

interface FiltersState {
  search: string;
  department: string;
  sourceSystem: string;
  priority: string;
  urgency: string;
  status: string;
  corridor: string;
}

interface RequestFiltersProps {
  filters: FiltersState;
  setFilters: React.Dispatch<React.SetStateAction<FiltersState>>;
  totalCount: number;
  filteredCount: number;
}

export function RequestFilters({
  filters,
  setFilters,
  totalCount,
  filteredCount
}: RequestFiltersProps) {
  const handleReset = () => {
    setFilters({
      search: '',
      department: 'ALL',
      sourceSystem: 'ALL',
      priority: 'ALL',
      urgency: 'ALL',
      status: 'ALL',
      corridor: 'ALL'
    });
  };

  return (
    <div className="bg-white rounded border border-slate-200 p-3.5 shadow-2xs space-y-3">
      {/* Top Search Bar & Summary */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Request ID, asset, defect, corridor, section..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-500">
            Showing <strong className="text-slate-800 tabular-nums">{filteredCount}</strong> of <span className="tabular-nums">{totalCount}</span> requests
          </span>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded transition-colors"
            title="Reset filters"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Filter Selectors Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1 border-t border-slate-100">
        {/* Department Filter */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Department
          </label>
          <select
            value={filters.department}
            onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
            className="w-full text-xs py-1 px-2 bg-slate-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
          >
            <option value="ALL">All Departments</option>
            <option value="Engineering">Engineering (TMS)</option>
            <option value="TRD">TRD (TDMS)</option>
            <option value="S&T">S&T (SMMS)</option>
          </select>
        </div>

        {/* Source System */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Source System
          </label>
          <select
            value={filters.sourceSystem}
            onChange={(e) => setFilters(prev => ({ ...prev, sourceSystem: e.target.value }))}
            className="w-full text-xs py-1 px-2 bg-slate-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
          >
            <option value="ALL">All Systems</option>
            <option value="TMS">TMS (Track)</option>
            <option value="TDMS">TDMS (Traction)</option>
            <option value="SMMS">SMMS (Signalling)</option>
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Priority
          </label>
          <select
            value={filters.priority}
            onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
            className="w-full text-xs py-1 px-2 bg-slate-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
          >
            <option value="ALL">All Priorities</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>
        </div>

        {/* Urgency */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Urgency
          </label>
          <select
            value={filters.urgency}
            onChange={(e) => setFilters(prev => ({ ...prev, urgency: e.target.value }))}
            className="w-full text-xs py-1 px-2 bg-slate-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
          >
            <option value="ALL">All Urgencies</option>
            <option value="Urgent">Urgent</option>
            <option value="Normal">Normal</option>
            <option value="Routine">Routine</option>
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="w-full text-xs py-1 px-2 bg-slate-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending Planning">Pending Planning</option>
            <option value="Under Planning">Under Planning</option>
            <option value="Planned">Planned</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        {/* Corridor */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Corridor
          </label>
          <select
            value={filters.corridor}
            onChange={(e) => setFilters(prev => ({ ...prev, corridor: e.target.value }))}
            className="w-full text-xs py-1 px-2 bg-slate-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
          >
            <option value="ALL">All Corridors</option>
            <option value="Erode – Salem">Erode – Salem</option>
            <option value="Salem – Jolarpettai">Salem – Jolarpettai</option>
            <option value="Erode – Tiruppur">Erode – Tiruppur</option>
            <option value="Coimbatore – Palakkad">Coimbatore – Palakkad</option>
            <option value="Katpadi – Jolarpettai">Katpadi – Jolarpettai</option>
          </select>
        </div>
      </div>
    </div>
  );
}
