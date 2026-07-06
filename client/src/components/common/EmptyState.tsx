import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Card } from './Card';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

export const EmptyState = ({ title, description, actionLabel, onAction, icon }: EmptyStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card className="border-[var(--color-border)] p-10 text-center">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 30 }}
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-accent-soft)] text-[var(--color-text)]"
        >
          {icon}
        </motion.div>
        <motion.h3 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-2xl font-bold text-[var(--color-text)]"
        >
          {title}
        </motion.h3>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mx-auto mt-3 max-w-md text-[var(--color-text-muted)]"
        >
          {description}
        </motion.p>
        {actionLabel && onAction ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button type="button" onClick={onAction} className="mt-6">
              {actionLabel}
            </Button>
          </motion.div>
        ) : null}
      </Card>
    </motion.div>
  );
};
