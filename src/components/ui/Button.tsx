import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';
export function Button({
  className,
  variant = 'primary',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  return (
    <button type={type} className={cn('button', 'button--' + variant, className)} {...props} />
  );
}
