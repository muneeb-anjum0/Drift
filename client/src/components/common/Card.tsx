import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const Card = ({ className, children, ...props }: CardProps) => {
  return (
    <div className={cn('rounded-2xl border border-gray-800 bg-black backdrop-blur-sm shadow-xl hover:border-lime-400/30 transition-all', className)} {...props}>
      {children}
    </div>
  );
};
