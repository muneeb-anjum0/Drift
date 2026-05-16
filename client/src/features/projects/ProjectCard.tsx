import { CalendarDays, Clock3, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Project } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { formatDate } from '../../utils/formatDate';

const statusStyles: Record<Project['status'], string> = {
  planning: 'bg-gray-800/50 text-gray-200 border border-gray-700',
  active: 'bg-lime-400/10 text-lime-300 border border-lime-400/30',
  paused: 'bg-amber-400/10 text-amber-300 border border-amber-400/30',
  completed: 'bg-lime-400/20 text-lime-300 border border-lime-400/30',
  archived: 'bg-gray-800/50 text-gray-400 border border-gray-700',
};

const priorityStyles: Record<Project['priority'], string> = {
  low: 'bg-gray-800/50 text-gray-300 border border-gray-700',
  medium: 'bg-gray-800/40 text-gray-200 border border-gray-700',
  high: 'bg-amber-400/10 text-amber-300 border border-amber-400/30',
  urgent: 'bg-red-400/10 text-red-300 border border-red-400/30',
};

const workspaceName = (workspace: Project['workspace']) => (typeof workspace === 'string' ? 'Workspace' : workspace.name);

export const ProjectCard = ({
  project,
  onEdit,
  onDelete,
  onOpen,
}: {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
  onOpen: () => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -5 }}
    >
      <Card className="p-6 border-lime-400/20 hover:border-lime-400/50 h-full">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <motion.button 
              whileHover={{ color: '#22ff00' }}
              className="text-left transition-colors"
              onClick={onOpen}
            >
              <h3 className="text-lg font-bold text-white">{project.name}</h3>
            </motion.button>
            <p className="mt-1 text-sm text-gray-400">{project.clientName}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onEdit} className="px-2">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-4 line-clamp-2 text-sm leading-6 text-gray-400">{project.description || 'No description provided.'}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[project.status]}`}>{project.status}</span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityStyles[project.priority]}`}>{project.priority}</span>
        </div>
        <div className="mt-5 grid gap-3 text-sm text-gray-400 sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-lime-400" />
            <span>{workspaceName(project.workspace)}</span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-lime-400" />
            <span>{formatDate(project.deadline)}</span>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
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
