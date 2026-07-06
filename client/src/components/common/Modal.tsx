import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from './Button';
import { cn } from '../../utils/cn';

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  size?: 'md' | 'lg' | 'xl';
  density?: 'comfortable' | 'compact';
}

const sizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
  md: 'max-w-xl',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
};

export const Modal = ({ open, title, description, children, footer, onClose, size = 'xl', density = 'comfortable' }: ModalProps) => {
  useEffect(() => {
    if (!open) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-[rgba(17,17,17,0.42)] px-4 py-6 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className={cn(
          'flex max-h-[calc(100dvh-3rem)] w-full flex-col overflow-hidden rounded-[var(--radius-modal)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-floating)]',
          sizeClasses[size]
        )}
      >
        <div className={cn('flex shrink-0 items-start justify-between gap-4', density === 'compact' ? 'px-5 pt-5 sm:px-6 sm:pt-6' : 'px-7 pt-7')}>
          <div>
            <h2 className={cn('font-semibold text-[var(--color-text)]', density === 'compact' ? 'text-xl' : 'text-2xl')}>{title}</h2>
            {description ? <p className={cn('mt-2 text-[var(--color-text-muted)]', density === 'compact' ? 'text-sm leading-6' : 'text-base leading-7')}>{description}</p> : null}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-10 w-10 shrink-0 px-0">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className={cn(density === 'compact' ? 'px-5 pb-5 pt-4 sm:px-6 sm:pb-6' : 'px-7 pb-7 pt-6')}>
            {children}
          </div>
        </div>
        {/** footer sits outside the scrollable area so it remains visible */}
        {/** render footer with matching horizontal padding */}
        <div className={cn('shrink-0', density === 'compact' ? 'px-5 pb-5 sm:px-6 sm:pb-6' : 'px-7 pb-7')}>
          {footer}
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
