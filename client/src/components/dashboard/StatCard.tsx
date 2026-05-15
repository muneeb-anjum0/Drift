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
      whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(34, 255, 0, 0.1)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <Card className={`p-6 border ${toneColors.border} bg-gradient-to-br ${toneColors.bg} backdrop-blur-sm`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gray-400 font-medium">{label}</p>
            <p className="mt-3 text-4xl font-bold text-white">{value}</p>
          </div>
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 10 }}
            className={`flex h-12 w-12 items-center justify-center rounded-lg ${toneColors.icon}`}
          >
            <Icon className="h-6 w-6" />
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
};
