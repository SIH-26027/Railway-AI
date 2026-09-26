import React from 'react';
import { DepartmentShort, Priority, Urgency, RequestStatus, ExistingBlockStatus } from '../../types/railway';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'dot';
  color?: 'slate' | 'neutral' | 'emerald' | 'amber' | 'rose' | 'navy';
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  color = 'slate',
  size = 'sm',
  className = ''
}: BadgeProps) {
  const colorMap = {
    slate: 'bg-slate-100 text-slate-700 border-slate-300',
    neutral: 'bg-slate-50 text-slate-800 border-slate-200',
    navy: 'bg-slate-800 text-white border-slate-900',
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    rose: 'bg-rose-50 text-rose-800 border-rose-200',
  };

  const dotColorMap = {
    slate: 'bg-slate-400',
    neutral: 'bg-slate-500',
    navy: 'bg-slate-300',
    emerald: 'bg-emerald-600',
    amber: 'bg-amber-500',
    rose: 'bg-rose-600',
  };

  const sizeMap = {
    xs: 'text-[10px] px-1.5 py-0.2',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded border ${colorMap[color]} ${sizeMap[size]} ${className}`}
    >
      {variant === 'dot' && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColorMap[color]}`} />
      )}
      {children}
    </span>
  );
}

export function DepartmentBadge({ dept }: { dept: string }) {
  let label = dept;
  let code = '';

  if (dept.includes('Engineering')) {
    label = 'ENGG';
    code = 'TMS';
  } else if (dept.includes('TRD') || dept.includes('Traction')) {
    label = 'TRD';
    code = 'TDMS';
  } else if (dept.includes('S&T') || dept.includes('Signal')) {
    label = 'S&T';
    code = 'SMMS';
  }

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-300 font-mono whitespace-nowrap">
      <span>{label}</span>
      {code && <span className="text-[10px] text-slate-500 font-normal">({code})</span>}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  if (priority === 'High') {
    return <Badge color="rose" size="xs" variant="dot">High</Badge>;
  }
  if (priority === 'Medium') {
    return <Badge color="amber" size="xs" variant="dot">Medium</Badge>;
  }
  return <Badge color="slate" size="xs" variant="dot">Low</Badge>;
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  if (urgency === 'Urgent') {
    return <Badge color="rose" size="xs">Urgent</Badge>;
  }
  if (urgency === 'Normal') {
    return <Badge color="slate" size="xs">Normal</Badge>;
  }
  return <Badge color="slate" size="xs">Routine</Badge>;
}

export function StatusBadge({ status }: { status: RequestStatus | ExistingBlockStatus | string }) {
  switch (status) {
    case 'Pending Planning':
      return <Badge color="slate" size="xs" variant="dot">Pending Planning</Badge>;
    case 'Under Planning':
      return <Badge color="slate" size="xs" variant="dot">Under Planning</Badge>;
    case 'Planned':
    case 'Approved':
    case 'Active':
      return <Badge color="emerald" size="xs" variant="dot">{status}</Badge>;
    case 'Scheduled':
      return <Badge color="slate" size="xs" variant="dot">Scheduled</Badge>;
    case 'Completed':
      return <Badge color="slate" size="xs">Completed</Badge>;
    case 'Modified – Pending Approval':
      return <Badge color="amber" size="xs" variant="dot">Modified – Pending</Badge>;
    case 'Rejected':
    case 'Cancelled':
      return <Badge color="rose" size="xs" variant="dot">{status}</Badge>;
    case 'AI Recommended':
      return <Badge color="slate" size="xs" variant="dot">AI Recommended</Badge>;
    case 'COA Approval Required':
    case 'COA_APPROVAL_REQUIRED':
      return <Badge color="amber" size="xs" variant="dot">COA Approval Required</Badge>;
    case 'COMBINED_BLOCK':
      return <Badge color="emerald" size="xs" variant="dot">Combined Block</Badge>;
    case 'SPLIT_PLAN':
      return <Badge color="slate" size="xs" variant="dot">Split Plan</Badge>;
    case 'EXISTING_BLOCK_ABSORBED':
      return <Badge color="emerald" size="xs" variant="dot">Absorbed Block</Badge>;
    case 'NO_FEASIBLE_PLAN':
      return <Badge color="rose" size="xs" variant="dot">No Feasible Plan</Badge>;
    default:
      return <Badge color="slate" size="xs">{status}</Badge>;
  }
}
