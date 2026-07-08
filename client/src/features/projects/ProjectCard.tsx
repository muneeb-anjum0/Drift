import { CalendarDays, Clock3, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Project } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { formatDate } from '../../utils/formatDate';

const statusStyles: Record<Project['status'], string> = {
  planning: 'bg-white/[0.04] text-gray-200 border border-white/10',
  active: 'bg-lime-400/10 text-lime-300 border border-lime-400/30',
  paused: 'bg-white/[0.04] text-gray-200 border border-white/10',
  completed: 'bg-lime-400/20 text-lime-300 border border-lime-400/30',
  archived: 'bg-white/[0.03] text-gray-400 border border-white/10',
};

const priorityStyles: Record<Project['priority'], string> = {
  low: 'bg-white/[0.03] text-gray-300 border border-white/10',
  medium: 'bg-white/[0.04] text-gray-200 border border-white/10',
  high: 'bg-lime-400/10 text-lime-300 border border-lime-400/30',
  urgent: 'bg-lime-400/20 text-lime-200 border border-lime-400/40',
};

const workspaceName = (workspace: Project['workspace']) => (typeof workspace === 'string' ? 'Workspace' : workspace.name);

export const ProjectCard = ({
  project,
  projectNumber,
  onEdit,
  onDelete,
  onOpen,
}: {
  project: Project;
  projectNumber: number;
  onEdit: () => void;
  onDelete: () => void;
  onOpen: () => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -6, scale: 1.012 }}
      whileTap={{ scale: 0.99 }}
      className="h-full"
    >
      <Card className="flex h-full min-h-[18rem] flex-col rounded-[1.5rem] border-white/10 bg-black/65 p-5 hover:border-lime-400/35">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="mb-2 inline-flex rounded-full border border-lime-400/20 bg-lime-400/10 px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-lime-300">
              Project {String(projectNumber).padStart(2, '0')}
            </span>
            <motion.button
              whileHover={{ color: 'var(--color-text-muted)' }}
              className="block min-w-0 text-left transition-colors"
              onClick={onOpen}
            >
              <h3 className="line-clamp-2 min-h-[3.5rem] text-xl font-semibold leading-7 text-white">{project.name}</h3>
            </motion.button>
            <p className="mt-1 truncate text-sm text-gray-400">{project.clientName}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 px-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-gray-400">{project.description || 'No description provided.'}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[project.status]}`}>{project.status}</span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${priorityStyles[project.priority]}`}>{project.priority}</span>
        </div>
        <div className="mt-4 grid gap-2 text-sm text-gray-400 sm:grid-cols-2">
          <div className="flex min-w-0 items-center gap-2">
            <Clock3 className="h-4 w-4 text-lime-400" />
            <span className="truncate">{workspaceName(project.workspace)}</span>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <CalendarDays className="h-4 w-4 text-lime-400" />
            <span className="truncate">{formatDate(project.deadline)}</span>
          </div>
        </div>
        <div className="mt-auto flex justify-end gap-2 pt-4">
          <Button type="button" variant="secondary" size="sm" onClick={onOpen}>
            View
          </Button>
          <Button type="button" variant="danger" size="sm" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};
