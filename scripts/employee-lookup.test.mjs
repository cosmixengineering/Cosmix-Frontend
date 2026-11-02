import assert from 'node:assert/strict';
import test from 'node:test';
import { employeeLookupSource } from '../src/components/employees/employee-lookup-access.ts';

const user = (permission, scopeKind = 2, targetId = 'assigned-employee') => ({
  account: { accountId: 'signed-in' },
  grants: [{ permission, scopeKind, targetId }],
});
test('scoped Supervisor selects the limited attendance directory, never the full HR directory', () => {
  assert.equal(employeeLookupSource(user('attendance.summaries.read')), 'attendance');
  assert.equal(employeeLookupSource(user('attendance.overtime.review', 5, 'site')), 'attendance');
});
test('Self-only employee and Finance permission do not open an employee directory', () => {
  assert.equal(employeeLookupSource(user('attendance.summaries.self', 1)), null);
  assert.equal(employeeLookupSource(user('finance.ledger.read', 7, null)), null);
  assert.equal(employeeLookupSource(null), null);
});
test('only an all-scope HR directory grant selects the full directory', () => {
  assert.equal(employeeLookupSource(user('hr.employees.read', 7, null)), 'hr');
  assert.equal(employeeLookupSource(user('hr.employees.read')), null);
});
