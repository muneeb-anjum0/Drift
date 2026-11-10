import { CalendarDays, Clock3, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { formatDate } from '../../utils/formatDate';
import { RequirementBadges } from './RequirementBadges';
import type { Requirement } from './requirement.types';

const workspaceName = (workspace: Requirement['workspace']) => (typeof workspace === 'string' ? 'Workspace' : workspace.name);

export const RequirementCard = ({
  requirement,
  onEdit,
  onDelete,
}: {
  requirement: Requirement;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const effortLabel = requirement.estimatedEffort ? `${requirement.estimatedEffort}h` : 'Not set';

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} whileHover={{ y: -4 }}>
      <Card className="h-full border-lime-400/20 bg-black/60 p-5 transition hover:border-lime-400/40">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">{requirement.title}</h3>
            <p className="mt-1 text-sm text-gray-400">{requirement.description}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onEdit} className="px-2">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4">
          <RequirementBadges requirement={requirement} />
        </div>

        <div className="mt-4 grid gap-3 text-sm text-gray-400 sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-lime-400" />
            <span>{workspaceName(requirement.workspace)}</span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-lime-400" />
            <span>{formatDate(requirement.createdAt)}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 rounded-2xl border border-gray-800 bg-black/40 p-4 text-sm text-gray-400 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-gray-500">Source</p>
            <p className="mt-1 text-gray-200">{requirement.sourceText || 'Manual entry'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-gray-500">Effort</p>
            <p className="mt-1 text-gray-200">{effortLabel}</p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button type="button" variant="danger" size="sm" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};
