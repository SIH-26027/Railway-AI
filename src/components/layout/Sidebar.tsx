'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  Cpu,
  Layers,
  CalendarDays,
  CalendarRange,
  GitFork,
  Train,
  Wrench,
  History,
  Building2,
  UserCheck,
  Sliders
} from 'lucide-react';
import { usePlanning } from '../../context/PlanningContext';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeColor?: string;
}

export function Sidebar() {
  const pathname = usePathname();
  const { requests, aiPlans, existingBlocks } = usePlanning();

  const pendingRequestsCount = React.useMemo(
    () => requests.filter(r => r.status === 'Pending Planning').length,
    [requests]
  );
  const aiRecommendedCount = React.useMemo(
    () => aiPlans.filter(p => p.status === 'AI Recommended').length,
    [aiPlans]
  );
  const activeBlocksCount = React.useMemo(
    () => existingBlocks.filter(b => b.status === 'Active' || b.status === 'Scheduled').length,
    [existingBlocks]
  );

  const navItems: NavItem[] = [
    {
      label: 'Overview',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Maintenance Requests',
      href: '/requests',
      icon: ClipboardList,
      badge: pendingRequestsCount,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      label: 'AI Block Planning',
      href: '/planning',
      icon: Cpu,
      badge: aiRecommendedCount,
      badgeColor: 'bg-indigo-100 text-indigo-800 font-semibold',
    },
    {
      label: 'Existing Blocks',
      href: '/blocks',
      icon: Layers,
      badge: activeBlocksCount,
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      label: 'Weekly Plan',
      href: '/planning/weekly',
      icon: CalendarRange,
    },
    {
      label: 'Monthly Plan',
      href: '/planning/monthly',
      icon: CalendarDays,
    },
    {
      label: 'Corridors',
      href: '/corridors',
      icon: GitFork,
    },
    {
      label: 'Trains & Operations',
      href: '/operations',
      icon: Train,
    },
    {
      label: 'Resources',
      href: '/resources',
      icon: Wrench,
    },
    {
      label: 'Planning History',
      href: '/planning/history',
      icon: History,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col h-screen shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="px-4 py-4 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-bold text-white shadow-sm border border-blue-400/20">
          <Train className="w-5 h-5" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-100 leading-tight">
            RAILWAY AI
          </span>
          <span className="text-[11px] font-medium text-slate-400 truncate">
            COA Block Planning System
          </span>
        </div>
      </div>

      {/* Division Sub-header */}
      <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/60 flex items-center justify-between text-[11px]">
        <span className="text-slate-400">Division:</span>
        <span className="font-semibold text-slate-200">Southern Rly / Salem (SA)</span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Control Office Navigation
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href) && !pathname.startsWith(item.href + '/weekly') && !pathname.startsWith(item.href + '/monthly') && !pathname.startsWith(item.href + '/history'));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={`group flex items-center justify-between px-2.5 py-2 rounded text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600/90 text-white shadow-xs font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`ml-2 px-1.5 py-0.2 rounded text-[10px] shrink-0 font-medium ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : item.badgeColor || 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Control Office Bottom Section */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/70 space-y-2">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded bg-slate-900 border border-slate-800">
          <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="text-[11px] min-w-0 leading-tight">
            <div className="font-semibold text-slate-200 truncate">COA Central Room</div>
            <div className="text-slate-400 text-[10px]">Planning Auth: Primary</div>
          </div>
        </div>

        <div className="flex items-center justify-between px-2 py-1 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 truncate">
            <UserCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="truncate">Chief Controller (COA-01)</span>
          </div>
          <button
            title="Settings"
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
