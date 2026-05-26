import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export const Button = ({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) => {
  const base = 'inline-flex items-center justify-center rounded-full font-semibold tracking-normal transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-0 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-lime-400/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:scale-100';
  const variants = {
    primary: 'bg-lime-400 text-black shadow-[0_10px_30px_rgba(163,230,53,0.22)] hover:bg-lime-300 hover:shadow-[0_14px_38px_rgba(163,230,53,0.32)]',
    secondary: 'border border-white/10 bg-white/[0.03] text-white hover:border-lime-400/40 hover:bg-lime-400/10 hover:text-lime-200',
    ghost: 'bg-transparent text-gray-300 hover:bg-lime-400/10 hover:text-lime-200',
    danger: 'border border-white/10 bg-black text-gray-300 hover:border-lime-400/40 hover:bg-lime-400/10 hover:text-lime-200',
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
