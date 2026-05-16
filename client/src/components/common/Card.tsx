import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const Card = ({ className, children, ...props }: CardProps) => {
  return (
    <div
      className={cn(
        'rounded-2xl border bg-gradient-to-b from-black/70 to-black/50 backdrop-blur-md shadow-[0_12px_40px_rgba(16,185,129,0.04)] hover:shadow-[0_16px_48px_rgba(16,185,129,0.06)] transition-all',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
