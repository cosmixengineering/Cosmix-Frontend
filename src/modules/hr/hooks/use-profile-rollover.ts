import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { businessToday } from '../utils/calendar.ts';

// Find the first instant in the next company day using the same calendar as HR.
// This avoids assuming a UTC offset, the browser's zone, or a 24-hour local day.
function untilMidnight(now: number, today: string) {
  let low = 0;
  let high = 36 * 60 * 60 * 1000;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (businessToday(new Date(now + mid)) === today) low = mid;
    else high = mid;
  }
  return high;
}

export function watchProfileDay(refresh: () => Promise<void>) {
  let day = businessToday();
  let refreshing = false;
  let stopped = false;
  let timer: number;
  function check() {
    window.clearTimeout(timer);
    const now = Date.now();
    const today = businessToday(new Date(now));
    if (today !== day && !refreshing && document.visibilityState === 'visible') {
      refreshing = true;
      void refresh()
        .then(
          () => {
            day = today;
          },
          () => {
            /* QueryState reports the error. The next wake event may retry. */
          },
        )
        .finally(() => {
          refreshing = false;
          // A second date boundary can pass while this read is paused offline.
          if (!stopped && businessToday() !== today) check();
        });
    }
    timer = window.setTimeout(check, untilMidnight(now, today));
  }
  check();
  document.addEventListener('visibilitychange', check);
  window.addEventListener('focus', check);
  window.addEventListener('pageshow', check);
  return () => {
    stopped = true;
    window.clearTimeout(timer);
    document.removeEventListener('visibilitychange', check);
    window.removeEventListener('focus', check);
    window.removeEventListener('pageshow', check);
  };
}

export async function refreshProfileDay(cache: QueryClient, subject: string, employeeId: string) {
  const base = `employees/${employeeId}/`;
  const filters = {
    queryKey: ['hr', subject],
    type: 'active' as const,
    predicate: ({ queryKey }: { queryKey: readonly unknown[] }) => {
      const path = queryKey[2];
      if (typeof path !== 'string' || !path.startsWith(base)) return false;
      const endpoint = path.slice(base.length).split('?')[0];
      return (
        endpoint === 'current/employment' ||
        endpoint === 'current/bank' ||
        endpoint === 'compensation' ||
        endpoint === 'compensation/history' ||
        endpoint === 'changes/employment/history' ||
        endpoint === 'changes/bank/history'
      );
    },
  };
  // An initial GET started yesterday may still be in flight. Discard its response.
  await cache.cancelQueries(filters);
  await cache.refetchQueries(filters);
  if (
    cache
      .getQueryCache()
      .findAll(filters)
      .some((query) => {
        const { status, fetchStatus, data } = query.state;
        // Current DTOs carry the server's business date. A successful response
        // from just before the server boundary is also eligible for a wake retry.
        return (
          status !== 'success' ||
          fetchStatus === 'paused' ||
          (data &&
            typeof data === 'object' &&
            'asOf' in data &&
            typeof data.asOf === 'string' &&
            data.asOf < businessToday())
        );
      })
  ) {
    throw new Error('Profile rollover reads are incomplete');
  }
}

export function useProfileRollover(employeeId: string, subject: string, enabled: boolean) {
  const cache = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    return watchProfileDay(() => refreshProfileDay(cache, subject, employeeId));
  }, [cache, enabled, employeeId, subject]);
}
