import assert from 'node:assert/strict';
import test from 'node:test';
import { loadUnreadNotifications } from '../src/services/notifications/unread-notifications.ts';

const row = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Actual notice',
  body: 'Server content',
  createdAt: '2026-10-30T12:00:00+00:00',
  readAt: null,
  version: 'AAAAAAAABAA=',
};
test('empty server inbox stays empty and requests only current-account unread records', async () => {
  const calls = [];
  const result = await loadUnreadNotifications(async (path) => {
    calls.push(path);
    return { items: [], totalCount: 0, page: 1, pageSize: 5 };
  });
  assert.deepEqual(calls, ['/me/notifications?page=1&pageSize=5&unreadOnly=true']);
  assert.equal(result.totalCount, 0);
  assert.deepEqual(result.items, []);
});
test('unread badge uses server total rather than preview length', async () => {
  const result = await loadUnreadNotifications(async () => ({
    items: [row],
    totalCount: 27,
    page: 1,
    pageSize: 5,
  }));
  assert.equal(result.totalCount, 27);
  assert.equal(result.items[0].title, 'Actual notice');
});
test('network failures propagate instead of fabricating notices or a zero count', async () => {
  const failure = new Error('503');
  await assert.rejects(
    loadUnreadNotifications(async () => {
      throw failure;
    }),
    (error) => error === failure,
  );
});
test('malformed, inconsistent and already-read responses fail closed', async () => {
  for (const body of [
    null,
    { items: [row], totalCount: 0, page: 1, pageSize: 5 },
    { items: [{ ...row, readAt: row.createdAt }], totalCount: 1, page: 1, pageSize: 5 },
  ])
    await assert.rejects(loadUnreadNotifications(async () => body));
});
