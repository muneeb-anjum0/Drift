import { BriefcaseBusiness, CheckCircle2, FolderKanban, GitCompareArrows, LayoutGrid, ListChecks, Rocket } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { StatCard } from '../components/dashboard/StatCard';
import { RecentActivity } from '../components/dashboard/RecentActivity';
import { EmptyState } from '../components/common/EmptyState';
import { Card } from '../components/common/Card';
import { Spinner } from '../components/common/Spinner';
import { Button } from '../components/common/Button';
import { useWorkspaces } from '../hooks/useWorkspaces';
import { useProjects } from '../hooks/useProjects';
import { useActivities } from '../hooks/useActivities';
import { useAuth } from '../hooks/useAuth';
import { userHandle } from '../components/layout/appNavigation';

const sectionMotion = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { type: 'spring', stiffness: 220, damping: 26 },
} as const;

export const DashboardPage = () => {
  const { workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const { projects, isLoading: projectsLoading } = useProjects();
  const { activities, isLoading: activitiesLoading } = useActivities();
  const { user } = useAuth();
  const displayName = userHandle(user);

  const stats = useMemo(() => {
    const activeProjects = projects.filter((project) => project.status === 'active').length;
    const completedProjects = projects.filter((project) => project.status === 'completed').length;

    return [
      { label: 'Workspaces', value: workspaces.length, icon: BriefcaseBusiness },
      { label: 'Projects', value: projects.length, icon: FolderKanban },
      { label: 'Active', value: activeProjects, icon: Rocket },
      { label: 'Completed', value: completedProjects, icon: CheckCircle2 },
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <motion.section
        {...sectionMotion}
        className="overflow-hidden rounded-[1.75rem] border border-lime-400/20 bg-black/75 p-4 shadow-[0_18px_70px_rgba(163,230,53,0.06)] sm:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-lime-400">Command center</p>
            <p className="mt-2 text-sm font-semibold text-lime-200">Welcome back, {displayName}</p>
            <h1 className="mt-2 max-w-3xl text-3xl font-semibold leading-tight text-white sm:text-4xl">Track scope before it turns into unpaid work.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Monitor workspaces, projects, requirement baselines, and drift activity from one focused dashboard.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/projects">
              <Button type="button">Open Projects</Button>
            </Link>
            <Link to="/workspaces">
              <Button type="button" variant="secondary">Workspaces</Button>
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
              <StatCard label={stat.label} value={stat.value} icon={stat.icon} />
            </motion.div>
          ))}
        </div>
      </motion.section>

      {isEmpty ? (
        <EmptyState
          title="Your workspace is ready"
          description="Create a workspace and project to start building baselines and tracking requirement drift."
          icon={<LayoutGrid className="h-5 w-5" />}
        />
      ) : null}

      <div className="space-y-5">
        <motion.section {...sectionMotion} transition={{ ...sectionMotion.transition, delay: 0.12 }}>
          <Card className="rounded-[1.5rem] border-white/10 bg-black/65 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-lime-400">Workflow</p>
                <h2 className="mt-1 text-lg font-semibold text-white">Scope protection pipeline</h2>
              </div>
              <GitCompareArrows className="h-4 w-4 text-lime-400" />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {[
                { title: 'Capture', text: 'Create projects and preserve original scope.', icon: FolderKanban },
                { title: 'Baseline', text: 'Structure requirements into approved snapshots.', icon: ListChecks },
                { title: 'Analyze', text: 'Run Qwen GGUF drift analysis on new input.', icon: GitCompareArrows },
              ].map(({ title, text, icon: Icon }, index) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 + index * 0.07 }}
                  whileHover={{ y: -3, scale: 1.01 }}
                  className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-lime-400/35 hover:bg-lime-400/10"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-lime-400/25 bg-lime-400/10">
                    <Icon className="h-4 w-4 text-lime-300" />
                  </div>
                  <p className="mt-3 font-semibold text-white">{title}</p>
                  <p className="mt-1.5 text-xs leading-5 text-gray-400">{text}</p>
                </motion.div>
              ))}
            </div>
          </Card>
        </motion.section>

        <motion.section {...sectionMotion} transition={{ ...sectionMotion.transition, delay: 0.18 }}>
          <RecentActivity activities={activities} />
        </motion.section>
      </div>
    </motion.div>
  );
};
