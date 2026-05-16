import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '../common/Card';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: 'lime' | 'blue' | 'green' | 'purple';
}

const tones = {
  lime: { bg: 'from-lime-400/10 to-lime-500/5', icon: 'bg-lime-400/20 text-lime-400', border: 'border-lime-400/30' },
  blue: { bg: 'from-blue-400/10 to-blue-500/5', icon: 'bg-blue-400/20 text-blue-400', border: 'border-blue-400/30' },
  green: { bg: 'from-emerald-400/10 to-emerald-500/5', icon: 'bg-emerald-400/20 text-emerald-400', border: 'border-emerald-400/30' },
  purple: { bg: 'from-purple-400/10 to-purple-500/5', icon: 'bg-purple-400/20 text-purple-400', border: 'border-purple-400/30' },
};

export const StatCard = ({ label, value, icon: Icon, tone = 'lime' }: StatCardProps) => {
  const toneColors = tones[tone];

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
    >
      <Card className={`p-6 border ${toneColors.border} bg-gradient-to-br ${toneColors.bg}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-400 font-medium">{label}</p>
            <p className="mt-2 text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-lime-400 to-lime-200">{value}</p>
            <p className="mt-1 text-xs text-gray-500">Overview metric</p>
          </div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex h-14 w-14 items-center justify-center rounded-xl bg-black/40 ring-1 ring-lime-400/20 shadow-[0_6px_30px_rgba(16,185,129,0.06)]"
          >
            <Icon className="h-7 w-7 text-lime-400" />
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
};
