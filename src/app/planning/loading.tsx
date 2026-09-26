import React from 'react';
import { PageContainer } from '../../components/layout/PageContainer';

export default function PlanningLoading() {
  return (
    <PageContainer>
      {/* Header & Controls Skeleton */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-2 border-b border-slate-200 animate-pulse">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-indigo-200 rounded" />
            <div className="h-5 w-64 bg-slate-300 rounded" />
          </div>
          <div className="h-3 w-80 bg-slate-200 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-28 bg-slate-200 rounded" />
          <div className="h-8 w-32 bg-slate-200 rounded" />
          <div className="h-8 w-36 bg-indigo-200 rounded" />
        </div>
      </div>

      {/* Optimization Summary KPIs Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="bg-white rounded border border-slate-200 p-3 h-16 flex flex-col justify-between animate-pulse">
            <div className="h-2.5 w-20 bg-slate-200 rounded" />
            <div className="h-5 w-12 bg-slate-300 rounded" />
          </div>
        ))}
      </div>

      {/* Main Split Console Skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left: AI Plans Table Skeleton */}
        <div className="xl:col-span-7 bg-white rounded border border-slate-200 p-4 space-y-3 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-4 w-44 bg-slate-300 rounded" />
            <div className="h-3 w-24 bg-slate-200 rounded" />
          </div>
          <div className="space-y-2 pt-2">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="h-14 bg-slate-50 border border-slate-100 rounded p-2.5 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="h-3.5 w-28 bg-slate-200 rounded" />
                  <div className="h-2.5 w-48 bg-slate-100 rounded" />
                </div>
                <div className="h-6 w-20 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Right: Recommendation Details Skeleton */}
        <div className="xl:col-span-5 space-y-4">
          <div className="bg-white rounded border border-slate-200 p-5 space-y-4 animate-pulse">
            <div className="h-5 w-48 bg-slate-300 rounded" />
            <div className="space-y-2">
              <div className="h-3.5 w-full bg-slate-100 rounded" />
              <div className="h-3.5 w-5/6 bg-slate-100 rounded" />
            </div>
            <div className="h-24 bg-slate-50 border border-slate-100 rounded" />
            <div className="flex gap-2">
              <div className="h-8 flex-1 bg-emerald-100 rounded" />
              <div className="h-8 flex-1 bg-slate-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
