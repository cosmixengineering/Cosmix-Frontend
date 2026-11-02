import { EmployeeReference } from '@/components/employees/EmployeeReference';
import { formatEmployeeCode } from '@/utils/employee-code';
import type { ReactNode } from 'react';

const humanLabel = (key: string) =>
  key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function display(
  value: unknown,
  key = '',
  resolvers?: Record<string, (val: unknown) => ReactNode>,
): ReactNode {
  const resolver = resolvers && Object.hasOwn(resolvers, key) ? resolvers[key] : undefined;
  if (typeof resolver === 'function') return resolver(value);
  if (value === null || value === undefined || value === '')
    return <span className="muted">Not set</span>;
  if (
    typeof value === 'string' &&
    (/employeeId$/i.test(key) ||
      key === 'employeeReference' ||
      /managerId$/i.test(key) ||
      /reportingManager/i.test(key) ||
      /approverId$/i.test(key) ||
      /requestedBy/i.test(key) ||
      /submittedBy/i.test(key))
  )
    return <EmployeeReference employeeId={value} showName />;
  if (
    (typeof value === 'string' || typeof value === 'number') &&
    /(?:employeeNumber|employeeCode)$/i.test(key)
  )
    return formatEmployeeCode(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && UUID_REGEX.test(value)) {
    return (
      <span className="emp-short-id-chip" title={`UUID: ${value}`}>
        {value.slice(0, 8)}…{value.slice(-4)}
      </span>
    );
  }
  if (typeof value === 'object')
    return Array.isArray(value) ? (
      value.length ? (
        <ol>
          {value.map((v, i) => (
            <li key={i}>{display(v, /employeeIds$/i.test(key) ? 'employeeId' : key, resolvers)}</li>
          ))}
        </ol>
      ) : (
        'None'
      )
    ) : (
      <RecordView value={value as Record<string, unknown>} resolvers={resolvers} />
    );
  return String(value);
}

export function RecordView({
  value,
  omit = [],
  resolvers,
}: {
  value: Record<string, unknown>;
  omit?: string[];
  resolvers?: Record<string, (val: unknown) => ReactNode>;
}) {
  return (
    <dl className="hr-dl">
      {Object.entries(value)
        .filter(([key]) => !omit.includes(key))
        .map(([key, item]) => (
          <div key={key}>
            <dt>{humanLabel(key)}</dt>
            <dd>{display(item, key, resolvers)}</dd>
          </div>
        ))}
    </dl>
  );
}
