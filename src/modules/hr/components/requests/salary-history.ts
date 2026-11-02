export function salaryHistoryLabel(from: string, to: string | null, asOf?: string) {
  const range = to ? `From ${from} until ${to} (exclusive)` : `From ${from}, open-ended`;
  if (!asOf) return range;
  const status = from > asOf ? 'Scheduled' : to && to <= asOf ? 'Ended' : 'Current';
  return `${status} · ${range}`;
}
