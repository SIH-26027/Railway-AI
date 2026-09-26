/**
 * Utility functions to format railway maintenance block durations
 * in both Day format (e.g. "1.00 Day", "0.33 Days (8h)") and Minutes format (e.g. "1,440 min").
 */

export function formatDurationMinutes(minutes: number): string {
  if (!minutes || isNaN(minutes)) return '0 min';
  return `${minutes.toLocaleString()} min`;
}

export function formatDurationDays(minutes: number): string {
  if (!minutes || isNaN(minutes)) return '0.00 Days';
  const days = minutes / 1440;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;

  if (minutes >= 1440) {
    if (minutes % 1440 === 0) {
      const d = minutes / 1440;
      return `${d} ${d === 1 ? 'Day' : 'Days'} (${hours}h)`;
    }
    const dStr = (minutes / 1440).toFixed(2);
    return `${dStr} Days (${hours}h${remainingMins > 0 ? ` ${remainingMins}m` : ''})`;
  }

  // Under 1 day
  if (hours > 0) {
    return `${days.toFixed(2)} Days (${hours}h${remainingMins > 0 ? ` ${remainingMins}m` : ''})`;
  }

  return `${days.toFixed(2)} Days (${minutes}m)`;
}

export function formatDurationDual(minutes: number): {
  minutesStr: string;
  daysStr: string;
  hoursStr: string;
  combined: string;
} {
  const m = Number(minutes) || 0;
  const minFormatted = formatDurationMinutes(m);
  const dayFormatted = formatDurationDays(m);
  const hrs = (m / 60).toFixed(1);

  return {
    minutesStr: minFormatted,
    daysStr: dayFormatted,
    hoursStr: `${hrs} hrs`,
    combined: m >= 1440
      ? `${minFormatted} · ${dayFormatted}`
      : `${minFormatted} (${(m / 1440).toFixed(2)} Days / ${Math.floor(m / 60)}h ${m % 60}m)`,
  };
}
