'use client';

import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Zap,
  ArrowRight,
  ShieldAlert,
  Bell
} from 'lucide-react';
import { usePlanning } from '../../context/PlanningContext';

export function Alerts() {
  const { requests, aiPlans } = usePlanning();

  // Derive alerts dynamically from context data
  const highPriorityPending = requests.filter(
    r => r.priority === 'High' && (r.status === 'Pending Planning' || r.status === 'Under Planning')
  );

  const trainConflicts = aiPlans.filter(p => p.conflictStatus === 'Train Conflict');

  const powerDisconnections = aiPlans.filter(
    p => p.conflictStatus === 'Power Disconnection Needed' && p.status === 'AI Recommended'
  );

  type AlertItem = {
    id: string;
    type: 'critical' | 'warning' | 'info';
    icon: React.ElementType;
    title: string;
    description: string;
    actionLabel: string;
    actionHref: string;
    badge: string;
  };

  const alerts: AlertItem[] = [];

  if (highPriorityPending.length > 0) {
    const ids = highPriorityPending
      .slice(0, 3)
      .map(r => r.id)
      .join(', ');
    alerts.push({
      id: 'ALT-HIGH-PRIORITY',
      type: 'critical',
      icon: AlertTriangle,
      title: `${highPriorityPending.length} High-Priority Maintenance Request${highPriorityPending.length > 1 ? 's' : ''} Require Planning`,
      description: `Requests ${ids}${highPriorityPending.length > 3 ? ` and ${highPriorityPending.length - 3} more` : ''} are high priority and pending scheduling.`,
      actionLabel: 'Review Requests',
      actionHref: '/requests?priority=High',
      badge: 'Immediate Action'
    });
  }

  if (trainConflicts.length > 0) {
    const ids = trainConflicts
      .slice(0, 2)
      .map(p => p.requestId)
      .join(', ');
    alerts.push({
      id: 'ALT-TRAIN-CONFLICT',
      type: 'warning',
      icon: ShieldAlert,
      title: `${trainConflicts.length} Block Request${trainConflicts.length > 1 ? 's' : ''} Conflict with Scheduled Train Movements`,
      description: `Request${trainConflicts.length > 1 ? 's' : ''} ${ids}${trainConflicts.length > 2 ? ` and ${trainConflicts.length - 2} more` : ''} overlap with active train timetable slots. Review alternative windows in the planning module.`,
      actionLabel: 'Inspect Conflict in Planning',
      actionHref: '/planning',
      badge: 'Timetable Clash'
    });
  }

  if (powerDisconnections.length > 0) {
    const ids = powerDisconnections
      .slice(0, 2)
      .map(p => p.requestId)
      .join(', ');
    alerts.push({
      id: 'ALT-OHE-DISCONNECT',
      type: 'info',
      icon: Zap,
      title: `${powerDisconnections.length} TRD Request${powerDisconnections.length > 1 ? 's' : ''} Require Traction Power Disconnection`,
      description: `Request${powerDisconnections.length > 1 ? 's' : ''} ${ids}${powerDisconnections.length > 2 ? ` and ${powerDisconnections.length - 2} more` : ''} require 25kV OHE isolation. Multi-department shadow coordination may be available.`,
      actionLabel: 'View Shadow Block',
      actionHref: '/planning',
      badge: 'OHE Coordination'
    });
  }

  return (
    <div className="bg-white rounded border border-slate-200 p-4 shadow-2xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Control Office Priority Operational Alerts
          </h3>
        </div>
        {alerts.length > 0 ? (
          <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
            {alerts.length} Operational Flag{alerts.length > 1 ? 's' : ''}
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            All Clear
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Bell className="w-8 h-8 text-slate-300" />
          <p className="text-xs font-medium">No operational alerts at this time.</p>
          <p className="text-[11px] text-slate-400">All corridors and requests are within normal parameters.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 mt-1">
          {alerts.map((alert) => {
            const Icon = alert.icon;
            const isCritical = alert.type === 'critical';
            const isWarning = alert.type === 'warning';

            return (
              <div key={alert.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded shrink-0 mt-0.5 border ${
                      isCritical
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : isWarning
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{alert.title}</h4>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.2 rounded uppercase ${
                          isCritical
                            ? 'bg-rose-100 text-rose-800'
                            : isWarning
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {alert.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 max-w-3xl leading-relaxed">
                      {alert.description}
                    </p>
                  </div>
                </div>

                <Link
                  href={alert.actionHref}
                  className="shrink-0 text-xs font-semibold text-slate-700 hover:text-blue-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded transition-colors inline-flex items-center gap-1.5 self-start md:self-center"
                >
                  <span>{alert.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
