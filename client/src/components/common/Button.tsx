import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export const Button = ({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) => {
  const base = 'inline-flex items-center justify-center rounded-full font-semibold transition-all focus:outline-none disabled:cursor-not-allowed disabled:opacity-60';
  const variants = {
    primary: 'bg-lime-400 text-black hover:bg-lime-300 shadow-lg shadow-lime-400/30 hover:shadow-lime-400/50 hover:shadow-lg',
    secondary: 'bg-black text-gray-300 border border-lime-400/20 hover:border-lime-400 hover:text-lime-400 hover:bg-lime-400/5 transition-all',
    ghost: 'bg-transparent text-gray-300 hover:bg-lime-400/10 hover:text-lime-400 transition-all',
    danger: 'bg-red-600/80 text-white hover:bg-red-600 shadow-lg shadow-red-600/20 hover:shadow-red-600/40',
  };
  const sizes = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-11 px-4 text-sm',
    lg: 'h-12 px-5 text-base',
  };

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
};
