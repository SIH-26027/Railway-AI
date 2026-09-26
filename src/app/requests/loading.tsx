import React from 'react';
import { PageContainer } from '../../components/layout/PageContainer';

export default function RequestsLoading() {
  return (
    <PageContainer>
      {/* Header Banner Skeleton */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-2 border-b border-slate-200 animate-pulse">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-slate-300 rounded" />
            <div className="h-5 w-60 bg-slate-300 rounded" />
          </div>
          <div className="h-3 w-80 bg-slate-200 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-28 bg-slate-200 rounded" />
          <div className="h-8 w-24 bg-slate-200 rounded" />
        </div>
      </div>

      {/* Filter Bar Skeleton */}
      <div className="bg-white rounded border border-slate-200 p-3.5 animate-pulse space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-8 flex-1 min-w-[200px] bg-slate-100 rounded" />
          <div className="h-8 w-36 bg-slate-100 rounded" />
          <div className="h-8 w-32 bg-slate-100 rounded" />
          <div className="h-8 w-32 bg-slate-100 rounded" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded border border-slate-200 overflow-hidden animate-pulse">
        {/* Table Header */}
        <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-4">
          <div className="h-3 w-20 bg-slate-300 rounded" />
          <div className="h-3 w-24 bg-slate-300 rounded" />
          <div className="h-3 w-32 bg-slate-300 rounded" />
          <div className="h-3 w-28 bg-slate-300 rounded" />
          <div className="h-3 w-20 bg-slate-300 rounded" />
          <div className="h-3 w-16 bg-slate-300 rounded ml-auto" />
        </div>
        {/* Table Rows (8 rows) */}
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="h-14 border-b border-slate-100 flex items-center px-4 gap-4">
            <div className="h-4 w-20 bg-slate-200 rounded" />
            <div className="h-5 w-20 bg-slate-100 rounded-full" />
            <div className="h-4 w-40 bg-slate-200 rounded" />
            <div className="h-4 w-32 bg-slate-200 rounded" />
            <div className="h-5 w-16 bg-slate-100 rounded" />
            <div className="h-6 w-20 bg-slate-200 rounded ml-auto" />
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
