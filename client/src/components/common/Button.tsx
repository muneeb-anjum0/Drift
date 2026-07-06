import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export const Button = ({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) => {
  const base = 'inline-flex items-center justify-center rounded-[var(--radius-control)] font-semibold tracking-normal transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0';
  const variants = {
    primary: 'border border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-text)] shadow-[var(--shadow-button)] hover:bg-[var(--color-primary-hover)]',
    secondary: 'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-text)] hover:bg-[var(--color-bg-soft)]',
    ghost: 'bg-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-text)]',
    danger: 'border border-[var(--color-danger)] bg-[var(--color-surface)] text-[var(--color-danger)] hover:bg-[rgba(159,29,29,0.08)]',
  };
  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-5 text-sm',
  };

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
};
