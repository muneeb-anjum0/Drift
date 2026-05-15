import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  trailing?: ReactNode;
}

export const Input = ({ label, error, helperText, trailing, className, id, ...props }: InputProps) => {
  const inputId = id ?? props.name;

  return (
    <label className="block space-y-2" htmlFor={inputId}>
      {label ? <span className="text-sm font-semibold text-gray-300">{label}</span> : null}
      <div className="relative">
        <input
          id={inputId}
          className={cn(
            'h-11 w-full rounded-2xl border border-gray-700 bg-black px-4 text-sm text-white shadow-sm outline-none transition placeholder:text-gray-500 focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30',
            trailing ? 'pr-12' : null,
            error && 'border-red-500 focus:border-red-500 focus:ring-red-400/30',
            className
          )}
          {...props}
        />
        {trailing ? <div className="absolute inset-y-0 right-3 flex items-center text-gray-500">{trailing}</div> : null}
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : helperText ? <p className="text-sm text-gray-400">{helperText}</p> : null}
    </label>
  );
};
