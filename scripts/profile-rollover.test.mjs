import assert from 'node:assert/strict';
import test from 'node:test';
import { setImmediate } from 'node:timers';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import {
  watchProfileDay,
  refreshProfileDay,
} from '../src/modules/hr/hooks/use-profile-rollover.ts';
import { salaryHistoryLabel } from '../src/modules/hr/components/requests/salary-history.ts';
import { profileDraftChanged } from '../src/modules/hr/utils/profile-draft.ts';

const { EventTarget, Event, structuredClone } = globalThis;

test('open profile retries failed midnight reads on wake, deduplicates and cleans up', async (t) => {
  let now = Date.parse('2026-11-02T18:59:59.999Z');
  // watchProfileDay also reads new Date() on subscription.
  t.mock.timers.enable({ apis: ['Date'], now });
  let callback;
  let delay;
  const window = Object.assign(new EventTarget(), {
    setTimeout(fn, ms) {
      callback = fn;
      delay = ms;
      return 1;
    },
    clearTimeout() {
      callback = undefined;
    },
  });
  const document = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  const globals = ['window', 'document'].map((name) =>
    Object.getOwnPropertyDescriptor(globalThis, name),
  );
  Object.assign(globalThis, { window, document });
  t.after(() =>
    ['window', 'document'].forEach((name, i) => {
      if (globals[i]) Object.defineProperty(globalThis, name, globals[i]);
      else delete globalThis[name];
    }),
  );
  let refreshes = 0;
  const stop = watchProfileDay(async () => {
    if (++refreshes === 1) throw new Error('temporary read failure');
  });
  const settle = () => new Promise((resolve) => setImmediate(resolve));
  assert.equal(delay, 1);
  window.dispatchEvent(new Event('focus'));
  assert.equal(refreshes, 0);
  t.mock.timers.setTime(++now);
  callback();
  assert.equal(refreshes, 1);
  assert.equal(delay, 86_400_000);
  await settle();
  document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(refreshes, 2);
  window.dispatchEvent(new Event('focus'));
  await settle();
  assert.equal(refreshes, 2);
  document.visibilityState = 'hidden';
  t.mock.timers.setTime((now += 2 * 86_400_000));
  callback();
  assert.equal(refreshes, 2);
  document.visibilityState = 'visible';
  document.dispatchEvent(new Event('visibilitychange'));
  window.dispatchEvent(new Event('pageshow'));
  assert.equal(refreshes, 3);
  await settle();
  // A suspended tab can miss its timer altogether.
  t.mock.timers.setTime((now += 86_400_000));
  window.dispatchEvent(new Event('focus'));
  assert.equal(refreshes, 4);
  stop();
  assert.equal(callback, undefined);
  t.mock.timers.setTime(now + 86_400_000);
  window.dispatchEvent(new Event('pageshow'));
  assert.equal(refreshes, 4);
  assert.equal(callback, undefined);
});

test('refetch includes only active current and ledger reads owned by this session and employee', async (t) => {
  const cache = new QueryClient();
  t.after(() => cache.clear());
  const calls = [];
  const base = 'employees/emp33/';
  const included = [
    'current/employment',
    'current/bank',
    'compensation',
    'changes/employment/history?page=2',
    'changes/bank/history?page=1',
    'compensation/history?page=3',
  ];
  function observe(subject, path, enabled = true) {
    const key = ['hr', subject, path];
    cache.setQueryData(key, 'before');
    const observer = new QueryObserver(cache, {
      queryKey: key,
      enabled,
      staleTime: Infinity,
      queryFn: () => {
        calls.push(key);
        return 'after';
      },
    });
    const unsubscribe = observer.subscribe(() => {});
    t.after(unsubscribe);
    return unsubscribe;
  }
  for (const path of included) observe('hr1', base + path);
  observe('hr2', base + 'current/bank');
  observe('hr1', 'employees/other/compensation');
  for (const path of [
    'current/basic',
    'current/identity',
    'compensation/requests',
    'changes/bank/history/immutable-id',
  ])
    observe('hr1', base + path);
  observe('hr1', base + 'changes/bank/history?page=2', false);
  observe('hr1', base + 'compensation/history?page=4')();
  await refreshProfileDay(cache, 'hr1', 'emp33');
  assert.deepEqual(calls.map((key) => key[2]).sort(), included.map((path) => base + path).sort());
  assert.ok(calls.every((key) => key[1] === 'hr1'));
});

test('a pre-midnight initial GET cannot win after the day changes', async () => {
  const cache = new QueryClient();
  const queryKey = ['hr', 'hr1', 'employees/emp33/compensation'];
  let calls = 0;
  let previous;
  let signal;
  const observer = new QueryObserver(cache, {
    queryKey,
    queryFn: (ctx) => {
      if (++calls === 1) {
        signal = ctx.signal;
        return new Promise((resolve) => {
          previous = resolve;
        });
      }
      return 'Nov 3';
    },
  });
  const unsubscribe = observer.subscribe(() => {});
  try {
    await refreshProfileDay(cache, 'hr1', 'emp33');
    assert.ok(signal.aborted);
    previous('Nov 2');
    await Promise.resolve();
    assert.equal(cache.getQueryData(queryKey), 'Nov 3');
    assert.equal(calls, 2);
  } finally {
    unsubscribe();
    cache.clear();
  }
});

test('salary ledger uses server asOf and half-open periods', () => {
  const label = salaryHistoryLabel;
  assert.match(label('2026-11-03', null, '2026-11-02'), /^Scheduled .*open-ended$/);
  assert.match(label('2026-11-03', null, '2026-11-03'), /^Current /);
  assert.match(label('2026-10-30', '2026-11-03', '2026-11-02'), /^Current /);
  assert.match(label('2026-10-30', '2026-11-03', '2026-11-03'), /^Ended .*exclusive\)$/);
  assert.doesNotMatch(label('2026-11-03', null), /Scheduled|Current|Ended/);
});

test('mounted drafts reject changed dates, versions, and before-record IDs', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-11-02T18:59:59.999Z') });
  const edit = { asOf: '2026-11-02', version: 'v1', current: { recordId: 'old' } };
  assert.equal(profileDraftChanged(edit, structuredClone(edit)), false);
  for (const change of [
    { asOf: '2026-11-03' },
    { version: 'v2' },
    { current: { recordId: 'new' } },
  ])
    assert.equal(profileDraftChanged(edit, { ...edit, ...change }), true);
  const salary = {
    asOf: '2026-11-02',
    employeeVersion: 'v1',
    latestRecordId: 'scheduled',
    effective: { id: 'old' },
  };
  assert.equal(profileDraftChanged(salary, structuredClone(salary)), false);
  for (const change of [
    { asOf: '2026-11-03' },
    { employeeVersion: 'v2' },
    { latestRecordId: 'replacement' },
    { effective: { id: 'scheduled' } },
  ])
    assert.equal(profileDraftChanged(salary, { ...salary, ...change }), true);
  // A submit event may run before the timer/focus listener starts its read.
  t.mock.timers.tick(1);
  assert.equal(profileDraftChanged(edit, edit), true);
  assert.equal(profileDraftChanged(salary, salary), true);
});

test('failed and old-day responses remain retryable even with cached data', async (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-11-02T19:00:00Z') });
  const cache = new QueryClient();
  const queryKey = ['hr', 'hr1', 'employees/emp33/current/bank'];
  cache.setQueryData(queryKey, 'Nov 2');
  let fail = true;
  let asOf = '2026-11-02';
  const observer = new QueryObserver(cache, {
    queryKey,
    staleTime: Infinity,
    retry: false,
    queryFn: () => {
      if (fail) throw new Error('unavailable');
      return { asOf };
    },
  });
  const stop = observer.subscribe(() => {});
  try {
    await assert.rejects(refreshProfileDay(cache, 'hr1', 'emp33'), /incomplete/);
    fail = false;
    await assert.rejects(refreshProfileDay(cache, 'hr1', 'emp33'), /incomplete/);
    asOf = '2026-11-03';
    await refreshProfileDay(cache, 'hr1', 'emp33');
    assert.deepEqual(cache.getQueryData(queryKey), { asOf });
  } finally {
    stop();
    cache.clear();
  }
});
