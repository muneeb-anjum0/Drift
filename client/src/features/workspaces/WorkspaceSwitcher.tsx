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
      <span className="text-sm font-medium text-slate-700">Workspace</span>
      <div className="relative">
        <select
          value={selectedWorkspaceId}
          onChange={(event) => onChange(event.target.value)}
          className={cn('h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100')}
        >
          <option value="">All workspaces</option>
          {workspaces.map((workspace) => (
            <option key={workspace._id} value={workspace._id}>
              {workspace.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </label>
  );
};
