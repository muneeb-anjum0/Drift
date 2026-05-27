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
      <span className="text-sm font-semibold text-gray-300">{label}</span>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        disabled={disabled}
        className={cn(
          'flex h-11 w-full items-center justify-between rounded-full border border-gray-700 bg-black px-4 text-left text-sm text-white shadow-sm outline-none transition',
          'focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30',
          !selected && 'text-gray-500',
          disabled && 'cursor-not-allowed opacity-60',
          isOpen && 'border-lime-400/50 ring-2 ring-lime-400/20'
        )}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-lime-300 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && !disabled ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[120] overflow-hidden rounded-2xl border border-lime-400/25 bg-zinc-950 shadow-[0_18px_60px_rgba(0,0,0,0.75),0_0_0_1px_rgba(163,230,53,0.08)]">
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
                    active ? 'bg-lime-400 text-black' : 'text-gray-200 hover:bg-lime-400/10 hover:text-lime-200'
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