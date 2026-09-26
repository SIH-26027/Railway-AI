import React from 'react';
import { PageContainer } from '../../../components/layout/PageContainer';

export default function MonthlyLoading() {
  return (
    <PageContainer>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-2 border-b border-slate-200 animate-pulse">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-indigo-200 rounded" />
            <div className="h-5 w-60 bg-slate-300 rounded" />
          </div>
          <div className="h-3 w-80 bg-slate-200 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 28 }).map((_, idx) => (
          <div key={idx} className="bg-white rounded border border-slate-200 p-2 h-20 animate-pulse" />
        ))}
      </div>
    </PageContainer>
  );
}
