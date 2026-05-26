import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}

export const Modal = ({ open, title, description, children, onClose }: ModalProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-lime-400/20 bg-black p-7 shadow-[0_24px_100px_rgba(0,0,0,0.75)]"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">{title}</h2>
            {description ? <p className="mt-2 text-base leading-7 text-gray-400">{description}</p> : null}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-10 w-10 shrink-0 px-0">
            <X className="h-5 w-5" />
          </Button>
        </div>
        {children}
      </motion.div>
    </div>
  );
};
