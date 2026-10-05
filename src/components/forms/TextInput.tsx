import { useId, type InputHTMLAttributes } from 'react';
export function TextInput({
  label,
  error,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <input
        {...props}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? inputId + '-error' : undefined}
      />
      {error && (
        <p className="field-error" id={inputId + '-error'}>
          {error}
        </p>
      )}
    </div>
  );
}
