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
      <Card className="p-12 text-center border-lime-400/20">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 30 }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-lime-400/20 to-lime-500/10 text-lime-400 border border-lime-400/30"
        >
          {icon}
        </motion.div>
        <motion.h3 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-2xl font-bold text-white"
        >
          {title}
        </motion.h3>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-3 text-gray-400 max-w-md mx-auto"
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
