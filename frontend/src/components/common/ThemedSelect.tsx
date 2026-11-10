import { useId } from 'react';
import { cn } from '../../utils/cn';

export type SelectOption<T extends string> = {
  label: string;
  value: T;
};

interface ThemedSelectProps<T extends string> {
  label: string;
  value: T | '';
  options: Array<SelectOption<T>>;
  onChange: (value: T) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const ThemedSelect = <T extends string,>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select option',
  className,
  disabled = false,
}: ThemedSelectProps<T>) => {
  const id = useId();

  return (
    <label className={cn('block space-y-1.5', className)} htmlFor={id}>
      <span className="block text-sm font-medium text-[var(--color-text)]">{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        disabled={disabled}
        className="h-11 w-full rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:opacity-60"
      >
        {value === '' ? <option value="" disabled>{placeholder}</option> : null}
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
};
