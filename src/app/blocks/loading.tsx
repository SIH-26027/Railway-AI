import React from 'react';
import { PageContainer } from '../../components/layout/PageContainer';

export default function BlocksLoading() {
  return (
    <PageContainer>
      {/* Header Banner Skeleton */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-2 border-b border-slate-200 animate-pulse">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-emerald-200 rounded" />
            <div className="h-5 w-72 bg-slate-300 rounded" />
          </div>
          <div className="h-3 w-96 bg-slate-200 rounded" />
        </div>
        <div className="h-7 w-48 bg-emerald-100 rounded" />
      </div>

      {/* Notice Banner Skeleton */}
      <div className="h-12 bg-amber-50/70 border border-amber-200/60 rounded p-3 animate-pulse" />

      {/* Filter Bar Skeleton */}
      <div className="bg-white rounded border border-slate-200 p-3 animate-pulse flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-32 bg-slate-100 rounded" />
          <div className="h-8 w-36 bg-slate-100 rounded" />
        </div>
        <div className="h-4 w-32 bg-slate-200 rounded" />
      </div>

      {/* Schedule Table Skeleton */}
      <div className="bg-white rounded border border-slate-200 overflow-hidden animate-pulse">
        <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-4">
          <div className="h-3 w-20 bg-slate-300 rounded" />
          <div className="h-3 w-28 bg-slate-300 rounded" />
          <div className="h-3 w-40 bg-slate-300 rounded" />
          <div className="h-3 w-32 bg-slate-300 rounded" />
          <div className="h-3 w-24 bg-slate-300 rounded ml-auto" />
        </div>
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="h-14 border-b border-slate-100 flex items-center px-4 gap-4">
            <div className="h-4 w-24 bg-slate-200 rounded" />
            <div className="h-5 w-20 bg-slate-100 rounded" />
            <div className="h-4 w-44 bg-slate-200 rounded" />
            <div className="h-4 w-32 bg-slate-200 rounded" />
            <div className="h-6 w-20 bg-slate-200 rounded ml-auto" />
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
