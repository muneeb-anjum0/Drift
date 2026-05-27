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
  onClose: () => void;
  size?: 'md' | 'lg' | 'xl';
  density?: 'comfortable' | 'compact';
}

const sizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
  md: 'max-w-xl',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
};

export const Modal = ({ open, title, description, children, onClose, size = 'xl', density = 'comfortable' }: ModalProps) => {
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className={cn(
          'max-h-[92vh] w-full overflow-y-auto rounded-[2rem] border border-lime-400/20 bg-black shadow-[0_24px_100px_rgba(0,0,0,0.75)]',
          sizeClasses[size],
          density === 'compact' ? 'p-5 sm:p-6' : 'p-7'
        )}
      >
        <div className={cn('flex items-start justify-between gap-4', density === 'compact' ? 'mb-4' : 'mb-6')}>
          <div>
            <h2 className={cn('font-semibold text-white', density === 'compact' ? 'text-xl' : 'text-2xl')}>{title}</h2>
            {description ? <p className={cn('mt-2 text-gray-400', density === 'compact' ? 'text-sm leading-6' : 'text-base leading-7')}>{description}</p> : null}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-10 w-10 shrink-0 px-0">
            <X className="h-5 w-5" />
          </Button>
        </div>
        {children}
      </motion.div>
    </div>,
    document.body
  );
};
