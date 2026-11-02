import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canReadSiteReportQueue,
  fieldPermission,
} from '../src/modules/attendance/operations/field/access.ts';

const siteId = 'b460bf4c-4e39-497b-9b2c-462ee1b1e89c';
const user = (scopeKind, targetId, permission = 'attendance.site-reports.read') => ({
  account: { employeeId: 'employee' },
  grants: [{ permission, scopeKind, targetId }],
});

test('site-scoped Supervisor can open the queue but only read the assigned site', () => {
  const supervisor = user(5, siteId);
  assert.equal(canReadSiteReportQueue(supervisor), true);
  assert.equal(fieldPermission(supervisor, 'attendance.site-reports.read', siteId), true);
  assert.equal(fieldPermission(supervisor, 'attendance.site-reports.read', 'other-site'), false);
});

test('employee-scoped and self-service grants do not expose site-wide report queues', () => {
  assert.equal(canReadSiteReportQueue(user(2, 'employee')), false);
  assert.equal(canReadSiteReportQueue(user(1, 'employee', 'attendance.site-reports.self')), false);
});

test('site report read access does not grant decision authority', () => {
  assert.equal(fieldPermission(user(5, siteId), 'attendance.site-reports.decide', siteId), false);
});

test('all-scope read is supported while missing account or unrelated Finance grant is denied', () => {
  assert.equal(canReadSiteReportQueue(user(7, null)), true);
  assert.equal(canReadSiteReportQueue(user(7, null, 'finance.ledger.read')), false);
  assert.equal(canReadSiteReportQueue(null), false);
  assert.equal(canReadSiteReportQueue({ ...user(7, null), account: null }), false);
});
