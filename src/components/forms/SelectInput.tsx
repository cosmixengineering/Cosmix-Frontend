import { useId, type SelectHTMLAttributes } from 'react';
export function SelectInput({
  label,
  options,
  id,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: readonly { value: string; label: string }[];
}) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <select {...props} id={inputId}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
