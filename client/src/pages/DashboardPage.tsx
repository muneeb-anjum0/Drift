import { FolderKanban, LayoutGrid, Rocket, CheckCircle2, BriefcaseBusiness, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { StatCard } from '../components/dashboard/StatCard';
import { RecentActivity } from '../components/dashboard/RecentActivity';
import { EmptyState } from '../components/common/EmptyState';
import { Card } from '../components/common/Card';
import { Spinner } from '../components/common/Spinner';
import { useWorkspaces } from '../hooks/useWorkspaces';
import { useProjects } from '../hooks/useProjects';
import { useActivities } from '../hooks/useActivities';

export const DashboardPage = () => {
  const { workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const { projects, isLoading: projectsLoading } = useProjects();
  const { activities, isLoading: activitiesLoading } = useActivities();

  const stats = useMemo(() => {
    const activeProjects = projects.filter((project) => project.status === 'active').length;
    const completedProjects = projects.filter((project) => project.status === 'completed').length;

    return [
      { label: 'Total Workspaces', value: workspaces.length, icon: BriefcaseBusiness, tone: 'lime' as const },
      { label: 'Total Projects', value: projects.length, icon: FolderKanban, tone: 'blue' as const },
      { label: 'Active Projects', value: activeProjects, icon: Rocket, tone: 'green' as const },
      { label: 'Completed Projects', value: completedProjects, icon: CheckCircle2, tone: 'purple' as const },
    ];
  }, [projects, workspaces.length]);

  if (workspacesLoading || projectsLoading || activitiesLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const isEmpty = workspaces.length === 0 && projects.length === 0 && activities.length === 0;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      {isEmpty ? (
        <EmptyState
          title="Your dashboard is ready"
          description="Create a workspace and a project to start seeing activity and project metrics."
          icon={<LayoutGrid className="h-5 w-5" />}
        />
      ) : null}

      {/* Stats Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, staggerChildren: 0.1 }}
        className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"
      >
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <StatCard label={stat.label} value={stat.value} icon={stat.icon} tone={stat.tone} />
          </motion.div>
        ))}
      </motion.div>

      {/* Overview Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="p-6 border-lime-400/20 hover:border-lime-400/50">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-lime-400" />
                SaaS Overview
              </h2>
              <p className="mt-1 text-gray-400">Phase 1 builds the foundation for requirement drift tracking</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { title: 'Authentication', text: 'JWT-based login & protected routes', icon: '🔐' },
              { title: 'Workspace System', text: 'Organize clients & projects', icon: '📦' },
              { title: 'Activity Logging', text: 'Track all events & changes', icon: '📊' },
            ].map(({ title, text, icon }) => (
              <motion.div 
                key={title}
                whileHover={{ scale: 1.05, y: -5 }}
                className="rounded-lg bg-black/60 border border-gray-800 p-4 hover:border-lime-400/50 transition-all"
              >
                <div className="text-2xl mb-2">{icon}</div>
                <p className="font-semibold text-white">{title}</p>
                <p className="mt-1 text-sm text-gray-400">{text}</p>
              </motion.div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <RecentActivity activities={activities} />
      </motion.div>
    </motion.div>
  );
};
