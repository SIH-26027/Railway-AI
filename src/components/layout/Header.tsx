'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Calendar, ShieldCheck, Bell, CheckCircle2 } from 'lucide-react';
import { usePlanning } from '../../context/PlanningContext';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { useLanguage } from '../../context/LanguageContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({
  title,
  subtitle
}: HeaderProps) {
  const { notificationMessage, dismissNotification } = usePlanning();
  const { t } = useLanguage();
  const [timeStr, setTimeStr] = useState("15:22:38 IST");

  const displayTitle = title || t('nav.systemTitle', {}, 'Automatic Block Planning');
  const displaySubtitle = subtitle || t('nav.portalSubtitle', {}, 'Control Office – Maintenance Planning & Coordination');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-IN', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }) + ' IST'
      );
    };
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-2xs">
      {/* Top operational metadata banner */}
      <div className="px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
        {/* Title and Subtitle */}
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold tracking-tight text-slate-900 leading-tight">
              {displayTitle}
            </h1>
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
              <ShieldCheck className="w-3 h-3 text-blue-600" />
              COA Operational Planning Mode
            </span>
          </div>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            {displaySubtitle}
          </p>
        </div>

        {/* Operational Indicators: Date, Shift, Clock, Language Switcher (Top Right Corner) */}
        <div className="flex items-center gap-3 text-xs">
          {/* Horizon & Date */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded border border-slate-200 text-slate-700 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Horizon: <strong className="text-slate-900">20 Sep – 26 Sep 2026</strong></span>
          </div>

          {/* Clock */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 text-white rounded font-mono text-xs tabular-nums shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>{timeStr}</span>
          </div>

          {/* Language Switcher in Top Right Corner */}
          <LanguageSwitcher variant="light" />
        </div>
      </div>

      {/* Global Notification Banner if triggered */}
      {notificationMessage && (
        <div className="bg-blue-50 border-t border-b border-blue-200 px-6 py-2 flex items-center justify-between text-xs text-blue-900 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-medium">{notificationMessage}</span>
          </div>
          <button
            onClick={dismissNotification}
            className="text-blue-600 hover:text-blue-900 font-semibold px-2 py-0.5 rounded hover:bg-blue-100 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
    </header>
  );
}
