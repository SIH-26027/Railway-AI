import React from 'react';
import { PageContainer } from '../../components/layout/PageContainer';

export default function DashboardLoading() {
  return (
    <PageContainer>
      {/* KPI Cards Skeleton (8 cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="bg-white rounded border border-slate-200 p-3 flex flex-col justify-between h-20 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 bg-slate-200 rounded" />
              <div className="h-4 w-4 bg-slate-200 rounded" />
            </div>
            <div className="h-6 w-10 bg-slate-300 rounded mt-1" />
            <div className="h-2 w-20 bg-slate-100 rounded mt-1" />
          </div>
        ))}
      </div>

      {/* Planning Pipeline Skeleton */}
      <div className="bg-white rounded border border-slate-200 p-4 animate-pulse space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-44 bg-slate-300 rounded" />
          <div className="h-3 w-28 bg-slate-200 rounded" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-14 bg-slate-100 border border-slate-200/80 rounded p-2 flex flex-col justify-between">
              <div className="h-3 w-16 bg-slate-200 rounded" />
              <div className="h-4 w-8 bg-slate-300 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Priority Alerts Skeleton */}
      <div className="bg-white rounded border border-slate-200 p-4 animate-pulse space-y-2.5">
        <div className="h-4 w-36 bg-slate-300 rounded" />
        <div className="h-10 bg-slate-100 rounded border border-slate-200/60" />
        <div className="h-10 bg-slate-100 rounded border border-slate-200/60" />
      </div>

      {/* Active Blocks & Corridor Availability Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded border border-slate-200 p-4 animate-pulse space-y-3">
          <div className="h-4 w-40 bg-slate-300 rounded" />
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-12 bg-slate-50 border border-slate-100 rounded p-2 flex items-center justify-between">
              <div className="h-3 w-32 bg-slate-200 rounded" />
              <div className="h-4 w-16 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded border border-slate-200 p-4 animate-pulse space-y-3">
          <div className="h-4 w-44 bg-slate-300 rounded" />
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-12 bg-slate-50 border border-slate-100 rounded p-2 flex items-center justify-between">
              <div className="h-3 w-32 bg-slate-200 rounded" />
              <div className="h-4 w-16 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
