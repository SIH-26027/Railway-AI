'use client';

import React, { useState, useMemo } from 'react';
import { PageContainer } from '../../components/layout/PageContainer';
import { RequestFilters } from '../../components/requests/RequestFilters';
import { RequestTable } from '../../components/requests/RequestTable';
import { NewRequestModal } from '../../components/requests/NewRequestModal';
import { usePlanning } from '../../context/PlanningContext';
import { ClipboardList, PlusCircle, FileSpreadsheet } from 'lucide-react';

export default function RequestsPage() {
  const { requests, addMaintenanceRequest } = usePlanning();
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    department: 'ALL',
    sourceSystem: 'ALL',
    priority: 'ALL',
    urgency: 'ALL',
    status: 'ALL',
    corridor: 'ALL'
  });

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // Text Search
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const match =
          req.id.toLowerCase().includes(query) ||
          req.asset.toLowerCase().includes(query) ||
          req.corridor.toLowerCase().includes(query) ||
          req.blockSection.toLowerCase().includes(query) ||
          req.maintenanceType.toLowerCase().includes(query) ||
          req.defectReason.toLowerCase().includes(query);
        if (!match) return false;
      }

      // Department
      if (filters.department !== 'ALL') {
        if (filters.department === 'Engineering' && req.department !== 'Engineering') return false;
        if (filters.department === 'TRD' && !req.department.includes('TRD')) return false;
        if (filters.department === 'S&T' && !req.department.includes('S&T')) return false;
      }

      // Source System
      if (filters.sourceSystem !== 'ALL' && req.sourceSystem !== filters.sourceSystem) return false;

      // Priority
      if (filters.priority !== 'ALL' && req.priority !== filters.priority) return false;

      // Urgency
      if (filters.urgency !== 'ALL' && req.urgency !== filters.urgency) return false;

      // Status
      if (filters.status !== 'ALL' && req.status !== filters.status) return false;

      // Corridor
      if (filters.corridor !== 'ALL' && !req.corridor.includes(filters.corridor)) return false;

      return true;
    });
  }, [requests, filters]);

  return (
    <PageContainer>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              Maintenance Requests Repository
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Centralized intake from Engineering (TMS), Traction Distribution (TDMS), and Signal & Telecommunication (SMMS)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNewRequestModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Block Request</span>
          </button>
          <button
            onClick={() => alert("Simulated: Exported records to railway standard CSV format.")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded shadow-2xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <RequestFilters
        filters={filters}
        setFilters={setFilters}
        totalCount={requests.length}
        filteredCount={filteredRequests.length}
      />

      {/* Requests Data Table */}
      <RequestTable requests={filteredRequests} />

      {/* New Request Modal with RailRadar Exact Block Sections */}
      <NewRequestModal
        isOpen={isNewRequestModalOpen}
        onClose={() => setIsNewRequestModalOpen(false)}
        onSubmit={async (data) => {
          await addMaintenanceRequest(data);
          setIsNewRequestModalOpen(false);
        }}
      />
    </PageContainer>
  );
}
