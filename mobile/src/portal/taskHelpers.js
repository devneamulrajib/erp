// Live timer math shared by task list + detail (from PortalTasksPage / PortalTaskDetailPage).
import { useEffect, useState } from 'react';

export const TASK_STATUSES = ['To Do', 'In Progress', 'On Hold', 'Done'];
export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
export const PRIORITY_COLOR = { Low: '#94a3b8', Medium: '#64748b', High: '#ea580c', Urgent: '#dc2626' };

export function useNow(active) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

export function timerInfo(t, now) {
  const closed = t.status === 'Done' || t.status === 'Cancelled';
  const unconfirmed = !t.confirmedAt && !closed;
  const activeSecs = t.running && t.runningSince ? Math.max(0, (now - new Date(t.runningSince).getTime()) / 1000) : 0;
  const liveWorkedSecs = (t.priorWorkedSeconds || 0) + activeSecs;
  const allottedSecs = t.estimatedMinutes ? t.estimatedMinutes * 60 : null;
  const crossed = allottedSecs !== null && liveWorkedSecs > allottedSecs;
  const diffSecs = allottedSecs !== null ? Math.abs(allottedSecs - liveWorkedSecs) : liveWorkedSecs;
  return { closed, unconfirmed, liveWorkedSecs, allottedSecs, crossed, diffSecs };
}

export const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
