import React from 'react';
import { PageContainer } from '../../components/layout/PageContainer';

export default function CorridorsLoading() {
  return (
    <PageContainer>
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-2 border-b border-slate-200 animate-pulse">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-200 rounded" />
            <div className="h-5 w-64 bg-slate-300 rounded" />
          </div>
          <div className="h-3 w-80 bg-slate-200 rounded" />
        </div>
        <div className="h-7 w-44 bg-slate-100 rounded" />
      </div>

      {/* Search & Filter Bar Skeleton */}
      <div className="bg-white rounded border border-slate-200 p-3.5 animate-pulse flex flex-wrap items-center gap-3">
        <div className="h-8 flex-1 min-w-[240px] bg-slate-100 rounded" />
        <div className="h-8 w-44 bg-slate-100 rounded" />
      </div>

      {/* Corridors Grid Skeleton (6 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="bg-white rounded border border-slate-200 p-4 space-y-3 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 bg-slate-300 rounded" />
              <div className="h-5 w-16 bg-slate-100 rounded-full" />
            </div>
            <div className="h-3 w-48 bg-slate-200 rounded" />
            <div className="h-16 bg-slate-50 rounded border border-slate-100" />
            <div className="flex items-center justify-between pt-1">
              <div className="h-3 w-20 bg-slate-200 rounded" />
              <div className="h-3 w-24 bg-slate-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
