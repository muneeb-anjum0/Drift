import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
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
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <div className={cn('relative space-y-2', className)}>
      <span className="text-sm font-semibold text-[var(--color-text)]">{label}</span>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        disabled={disabled}
        className={cn(
          'flex h-11 w-full items-center justify-between rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-left text-sm text-[var(--color-text)] shadow-sm outline-none transition',
          'focus:border-[var(--color-text)] focus:ring-2 focus:ring-[var(--color-focus)]',
          !selected && 'text-[var(--color-text-soft)]',
          disabled && 'cursor-not-allowed opacity-60',
          isOpen && 'border-[var(--color-text)] ring-2 ring-[var(--color-focus)]'
        )}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && !disabled ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[120] overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-floating)]">
          <div className="max-h-48 overflow-y-auto p-1">
            {options.map((option) => {
              const active = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition',
                    active ? 'bg-[var(--color-primary)] text-[var(--color-primary-text)]' : 'text-[var(--color-text)] hover:bg-[var(--color-accent-soft)]'
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {active ? <Check className="h-4 w-4 shrink-0" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};
