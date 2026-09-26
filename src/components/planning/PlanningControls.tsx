'use client';

import React from 'react';
import { Calendar, Filter, Sparkles, SlidersHorizontal } from 'lucide-react';
import { usePlanning } from '../../context/PlanningContext';

interface PlanningControlsProps {
  horizon: 'Today' | 'This Week' | 'This Month';
  setHorizon: (h: 'Today' | 'This Week' | 'This Month') => void;
  selectedCorridor: string;
  setSelectedCorridor: (c: string) => void;
  selectedDept: string;
  setSelectedDept: (d: string) => void;
  selectedDate: string;
  setSelectedDate: (d: string) => void;
}

export function PlanningControls({
  horizon,
  setHorizon,
  selectedCorridor,
  setSelectedCorridor,
  selectedDept,
  setSelectedDept,
  selectedDate,
  setSelectedDate
}: PlanningControlsProps) {
  const { generateRecommendations, isGenerating } = usePlanning();

  return (
    <div className="bg-white rounded border border-slate-200 p-4 shadow-2xs space-y-3">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        {/* Horizon Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded border border-slate-200">
          {(['Today', 'This Week', 'This Month'] as const).map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                horizon === h
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {h}
            </button>
          ))}
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <button
            onClick={generateRecommendations}
            disabled={isGenerating}
            className={`w-full lg:w-auto inline-flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-semibold rounded shadow-2xs border transition-all ${
              isGenerating
                ? 'bg-slate-200 text-slate-500 border-slate-300 cursor-not-allowed'
                : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900 active:scale-98'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Running AI Optimization...' : 'Generate Planning Recommendations'}</span>
          </button>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
        {/* Date Selector */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Planning Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
            />
          </div>
        </div>

        {/* Corridor Selector */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Corridor
          </label>
          <select
            value={selectedCorridor}
            onChange={(e) => setSelectedCorridor(e.target.value)}
            className="w-full text-xs py-1.5 px-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
          >
            <option value="ALL">All Corridors (Salem Division)</option>
            <option value="Erode – Salem">Erode – Salem</option>
            <option value="Salem – Jolarpettai">Salem – Jolarpettai</option>
            <option value="Erode – Tiruppur">Erode – Tiruppur</option>
            <option value="Coimbatore – Palakkad">Coimbatore – Palakkad</option>
            <option value="Katpadi – Jolarpettai">Katpadi – Jolarpettai</option>
          </select>
        </div>

        {/* Department Selector */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Department Filter
          </label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full text-xs py-1.5 px-2 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
          >
            <option value="ALL">All Departments (Engg, TRD, S&T)</option>
            <option value="Engineering">Engineering (TMS)</option>
            <option value="TRD">Traction Distribution (TDMS)</option>
            <option value="S&T">Signal & Telecomm (SMMS)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
