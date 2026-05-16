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
    <Card className="p-6 border-lime-600/20">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-black/40 px-3 py-1">
            <Activity className="h-5 w-5 text-lime-400" />
            <h2 className="text-lg font-bold text-white">Recent Activity</h2>
          </div>
          <p className="mt-2 text-sm text-gray-400">Latest workspace and project events</p>
        </div>
      </div>

      <div className="space-y-3">
        {activities.map((activity, i) => (
          <motion.div
            key={activity._id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            whileHover={{ scale: 1.01 }}
            className="flex items-center justify-between gap-4 rounded-lg bg-black/50 p-4 border border-gray-800 hover:shadow-[0_8px_30px_rgba(16,185,129,0.04)] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/30 ring-1 ring-lime-400/15">
                <Clock3 className="h-5 w-5 text-lime-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white capitalize">{activity.action.split('_').join(' ')}</p>
                <p className="mt-1 text-xs text-gray-400">
                  <span className="text-lime-400 font-medium">{activity.entityType}</span> {activity.entityId}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs text-gray-500">{formatDate(activity.createdAt)}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
};
