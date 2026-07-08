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
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[rgba(17,17,17,0.42)] px-4 py-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className={cn(
          'flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-[var(--radius-modal)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-floating)]',
          sizeClasses[size]
        )}
      >
        <div className={cn('flex shrink-0 items-start justify-between gap-4', density === 'compact' ? 'px-4 pt-4 sm:px-5 sm:pt-5' : 'px-6 pt-6')}>
          <div>
            <h2 className={cn('font-semibold text-[var(--color-text)]', density === 'compact' ? 'text-lg' : 'text-xl')}>{title}</h2>
            {description ? <p className={cn('mt-1.5 text-[var(--color-text-muted)]', density === 'compact' ? 'text-xs leading-5' : 'text-sm leading-6')}>{description}</p> : null}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-9 w-9 shrink-0 px-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className={cn(density === 'compact' ? 'px-4 pb-4 pt-3 sm:px-5 sm:pb-5' : 'px-6 pb-6 pt-5')}>
            {children}
          </div>
        </div>
        <div className={cn('shrink-0', density === 'compact' ? 'px-4 pb-4 sm:px-5 sm:pb-5' : 'px-6 pb-6')}>
          {footer}
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
