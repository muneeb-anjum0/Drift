import { RequirementCard } from './RequirementCard';
import { RequirementBadges } from './RequirementBadges';
import { EmptyState } from '../../components/common/EmptyState';
import type { Requirement } from './requirement.types';
import { formatDate } from '../../utils/formatDate';

const valueLabel = (value: Requirement['priority'] | Requirement['status'] | Requirement['type'] | Requirement['source']) =>
  value.replace(/_/g, ' ');

export const RequirementTable = ({
  requirements,
  onEdit,
  onDelete,
}: {
  requirements: Requirement[];
  onEdit: (requirement: Requirement) => void;
  onDelete: (requirement: Requirement) => void;
}) => {
  if (!requirements.length) {
    return (
      <EmptyState
        title="No requirements yet"
        description="Add a requirement manually or extract them from the project scope to build the baseline."
        icon={<span className="text-lime-400">REQ</span>}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:hidden">
        {requirements.map((requirement) => (
          <RequirementCard
            key={requirement._id}
            requirement={requirement}
            onEdit={() => onEdit(requirement)}
            onDelete={() => onDelete(requirement)}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-[1200px] w-full border-separate border-spacing-y-3">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.18em] text-gray-500">
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Priority</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Effort</th>
              <th className="px-4 py-2">Updated</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requirements.map((requirement) => (
              <tr key={requirement._id} className="rounded-3xl border border-gray-800 bg-black/60 shadow-sm">
                <td className="px-4 py-4 align-top">
                  <div className="max-w-[280px]">
                    <p className="font-semibold text-white">{requirement.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-400">{requirement.description}</p>
                    <p className="mt-2 text-xs text-gray-500">{formatDate(requirement.createdAt)}</p>
                  </div>
                </td>
                <td className="px-4 py-4 align-top">
                  <span className="rounded-full border border-lime-400/20 bg-lime-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-lime-300">
                    {valueLabel(requirement.type)}
                  </span>
                </td>
                <td className="px-4 py-4 align-top">
                  <RequirementBadges requirement={requirement} />
                </td>
                <td className="px-4 py-4 align-top">
                  <span className="rounded-full border border-gray-700 bg-gray-800/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-200">
                    {valueLabel(requirement.status)}
                  </span>
                </td>
                <td className="px-4 py-4 align-top">
                  <span className="rounded-full border border-gray-700 bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">
                    {valueLabel(requirement.source)}
                  </span>
                </td>
                <td className="px-4 py-4 align-top text-sm text-gray-300">{requirement.estimatedEffort ? `${requirement.estimatedEffort}h` : '—'}</td>
                <td className="px-4 py-4 align-top text-sm text-gray-300">{formatDate(requirement.updatedAt)}</td>
                <td className="px-4 py-4 align-top">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(requirement)}
                      className="rounded-full border border-lime-400/20 bg-black px-4 py-2 text-sm font-semibold text-lime-300 transition hover:border-lime-400 hover:bg-lime-400/10"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(requirement)}
                      className="rounded-full border border-red-400/20 bg-black px-4 py-2 text-sm font-semibold text-red-300 transition hover:border-red-400 hover:bg-red-400/10"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
