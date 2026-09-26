'use client';

import React, { useState } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { usePlanning } from '../../context/PlanningContext';
import { Wrench, CheckCircle2, AlertTriangle, Search, Filter, Truck } from 'lucide-react';
import { DepartmentBadge } from '../../components/common/Badge';

export default function ResourcesPage() {
  const { resources } = usePlanning();
  const [searchTerm, setSearchTerm] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');

  const filteredResources = resources.filter(r => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match =
        r.team.toLowerCase().includes(q) ||
        r.machinery.toLowerCase().includes(q) ||
        r.equipment.toLowerCase().includes(q) ||
        r.baseStation.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (availabilityFilter !== 'ALL' && r.availability !== availabilityFilter) return false;
    if (deptFilter !== 'ALL' && r.departmentShort !== deptFilter) return false;
    return true;
  });

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-indigo-600" />
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              Departmental Maintenance Resources & Plant
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Availability tracking for on-track machinery, tower wagons, maintenance gangs, and testing squads
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 bg-slate-100 rounded border border-slate-200 text-slate-700 font-medium">
            Resource Base: Salem Division Depots
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded border border-slate-200 p-3 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search team, machinery (CSM, Tower Wagon), depot..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Availability:</span>
          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            className="py-1 px-2.5 bg-slate-50 border border-slate-300 rounded text-slate-800"
          >
            <option value="ALL">All States</option>
            <option value="Available">Available</option>
            <option value="Assigned">Assigned to Active/Plan</option>
            <option value="Unavailable">Unavailable</option>
            <option value="Maintenance">In Maintenance</option>
          </select>

          <span className="text-slate-500 font-medium ml-2">Department:</span>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="py-1 px-2.5 bg-slate-50 border border-slate-300 rounded text-slate-800"
          >
            <option value="ALL">All Departments</option>
            <option value="Engineering">Engineering (TMS)</option>
            <option value="TRD">TRD (TDMS)</option>
            <option value="S&T">S&T (SMMS)</option>
          </select>
        </div>
      </div>

      {/* Resources Table */}
      <div className="bg-white rounded border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Resource ID</th>
                <th>Department</th>
                <th>Team / Crew</th>
                <th>Base Station</th>
                <th>Crew Size</th>
                <th>Machinery / Heavy Plant</th>
                <th>Equipment & Kits</th>
                <th>Vehicle & Transport</th>
                <th>Availability State</th>
                <th>Assigned Block</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredResources.map((r) => {
                const isAvail = r.availability === 'Available';
                const isAssigned = r.availability === 'Assigned';

                return (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* ID */}
                    <td className="font-mono font-bold text-xs text-slate-900 whitespace-nowrap">
                      {r.id}
                    </td>

                    {/* Department */}
                    <td className="whitespace-nowrap">
                      <DepartmentBadge dept={r.department} />
                    </td>

                    {/* Team */}
                    <td className="font-semibold text-slate-800 text-xs whitespace-nowrap">
                      {r.team}
                    </td>

                    {/* Base Station */}
                    <td className="text-slate-700 text-xs whitespace-nowrap font-medium">
                      {r.baseStation}
                    </td>

                    {/* Crew Size */}
                    <td className="font-mono text-xs text-slate-700 whitespace-nowrap">
                      {r.crewStrength} Personnel
                    </td>

                    {/* Machinery */}
                    <td className="text-xs font-semibold text-slate-900 max-w-[200px] truncate" title={r.machinery}>
                      {r.machinery}
                    </td>

                    {/* Equipment */}
                    <td className="text-xs text-slate-600 max-w-[200px] truncate" title={r.equipment}>
                      {r.equipment}
                    </td>

                    {/* Vehicle */}
                    <td className="text-xs font-mono text-slate-600 whitespace-nowrap">
                      {r.vehicle}
                    </td>

                    {/* Availability */}
                    <td className="whitespace-nowrap">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                          isAvail
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isAssigned
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {isAvail && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        <span>{r.availability}</span>
                      </span>
                    </td>

                    {/* Assigned Block */}
                    <td className="whitespace-nowrap font-mono text-xs">
                      {r.assignedBlock ? (
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                          {r.assignedBlock}
                        </span>
                      ) : (
                        <span className="text-slate-400">None (Free)</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2 bg-slate-50/80 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Maintenance plant coordinates verified with respective Divisional Engineers.</span>
          <span className="font-semibold text-slate-700">{filteredResources.length} Track Resources Ready</span>
        </div>
      </div>
    </PageContainer>
  );
}
