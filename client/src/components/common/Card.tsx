import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const Card = ({ className, children, ...props }: CardProps) => {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-card)] transition-all',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
