/**
 * Evaluates whether a block plan should be 'Active' or 'Scheduled'
 * according to its date and time window.
 */
export function determineBlockStatus(
  dateStr: string,
  startTimeStr: string,
  endTimeStr: string
): 'Active' | 'Scheduled' {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const blockDate = (dateStr || '').slice(0, 10);

    // If future date: Scheduled
    if (blockDate > todayStr) {
      return 'Scheduled';
    }

    // If today's date:
    if (blockDate === todayStr) {
      const [sH, sM] = (startTimeStr || '00:00').split(':').map(Number);
      const [eH, eM] = (endTimeStr || '23:59').split(':').map(Number);
      const startMin = (sH || 0) * 60 + (sM || 0);
      const endMin = (eH || 0) * 60 + (eM || 0);
      const nowMin = now.getHours() * 60 + now.getMinutes();

      // Overnight block: e.g. 23:00 to 03:00
      if (endMin < startMin) {
        if (nowMin >= startMin || nowMin <= endMin) {
          return 'Active';
        }
        return 'Scheduled';
      }

      // Normal block:
      // If currently within the window
      if (nowMin >= startMin && nowMin <= endMin) {
        return 'Active';
      }

      // If scheduled for later today:
      if (nowMin < startMin) {
        return 'Scheduled';
      }

      // If scheduled for today and start time has occurred, it is active for today's operational day
      return 'Active';
    }

    // Past date fallback
    return 'Scheduled';
  } catch {
    return 'Scheduled';
  }
}
