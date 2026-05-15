import { Clock3, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { formatDate } from '../../utils/formatDate';
import type { ActivityLog } from '../../types';

export const RecentActivity = ({ activities }: { activities: ActivityLog[] }) => {
  if (!activities.length) {
    return (
      <EmptyState
        title="No activity yet"
        description="Create a workspace or project to see recent actions here."
        icon={<Clock3 className="h-5 w-5" />}
      />
    );
  }

  return (
    <Card className="p-6 border-lime-400/20">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-lime-400" />
            Recent Activity
          </h2>
          <p className="mt-1 text-gray-400">Latest workspace and project events</p>
        </div>
      </div>
      <div className="space-y-3">
        {activities.map((activity, i) => (
          <motion.div 
            key={activity._id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ x: 5 }}
            className="flex items-start justify-between gap-4 rounded-lg bg-black/60 border border-gray-800 p-4 hover:border-lime-400/30 transition-all"
          >
            <div className="flex-1">
              <p className="text-sm font-semibold text-white capitalize">
                {activity.action.split('_').join(' ')}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                <span className="text-lime-400 font-medium">{activity.entityType}</span> {activity.entityId}
              </p>
            </div>
            <p className="text-xs text-gray-500 whitespace-nowrap">{formatDate(activity.createdAt)}</p>
          </motion.div>
        ))}
      </div>
    </Card>
  );
};
