import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  trailing?: ReactNode;
  labelClassName?: string;
}

export const Input = ({ label, error, helperText, trailing, className, labelClassName, id, ...props }: InputProps) => {
  const inputId = id ?? props.name;

  return (
    <label className="block space-y-2" htmlFor={inputId}>
      {label ? <span className={cn('text-base font-semibold text-[var(--color-text)]', labelClassName)}>{label}</span> : null}
      <div className="relative">
        <input
          id={inputId}
          className={cn(
            'h-12 w-full rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-base text-[var(--color-text)] shadow-sm outline-none transition placeholder:text-[var(--color-text-soft)] focus:border-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-focus)]',
            trailing ? 'pr-12' : null,
            error && 'border-[var(--color-danger)] focus:border-[var(--color-danger)]',
            className
          )}
          {...props}
        />
        {trailing ? <div className="absolute inset-y-0 right-3 flex items-center text-[var(--color-text-soft)]">{trailing}</div> : null}
      </div>
      {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : helperText ? <p className="text-sm text-[var(--color-text-muted)]">{helperText}</p> : null}
    </label>
  );
};
