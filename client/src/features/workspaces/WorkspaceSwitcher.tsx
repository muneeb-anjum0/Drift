import { ChevronDown } from 'lucide-react';
import type { Workspace } from '../../types';
import { cn } from '../../utils/cn';

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  selectedWorkspaceId?: string;
  onChange: (workspaceId: string) => void;
}

export const WorkspaceSwitcher = ({ workspaces, selectedWorkspaceId, onChange }: WorkspaceSwitcherProps) => {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-gray-300">Workspace</span>
      <div className="relative">
        <select
          value={selectedWorkspaceId}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            'h-11 w-full appearance-none rounded-2xl border border-gray-700 bg-black px-4 pr-10 text-sm text-white shadow-sm outline-none',
            'focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30'
          )}
        >
          <option value="">All workspaces</option>
          {workspaces.map((workspace) => (
            <option key={workspace._id} value={workspace._id}>
              {workspace.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>
    </label>
  );
};
