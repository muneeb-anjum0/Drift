import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '../common/Card';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
}

export const StatCard = ({ label, value, icon: Icon }: StatCardProps) => {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.015 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 340, damping: 24 }}
    >
      <Card className="overflow-hidden rounded-[2rem] border-white/10 bg-black/70 p-5 hover:border-lime-400/35">
        <div className="absolute inset-x-6 top-0 h-px bg-lime-400/40" />
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{label}</p>
            <p className="mt-3 text-4xl font-semibold text-white">{value}</p>
          </div>

          <motion.div
            whileHover={{ rotate: -4, scale: 1.07 }}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-lime-400/25 bg-lime-400/10"
          >
            <Icon className="h-5 w-5 text-lime-300" />
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
};
