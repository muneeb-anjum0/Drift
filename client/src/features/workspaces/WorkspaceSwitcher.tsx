import type { Workspace } from '../../types';
import { ThemedSelect } from '../../components/common/ThemedSelect';

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  selectedWorkspaceId?: string;
  onChange: (workspaceId: string) => void;
}

export const WorkspaceSwitcher = ({ workspaces, selectedWorkspaceId, onChange }: WorkspaceSwitcherProps) => {
  const options = workspaces.map((workspace) => ({ label: workspace.name, value: workspace._id }));

  return (
    <ThemedSelect
      label="Workspace"
      value={selectedWorkspaceId ?? ''}
      options={options}
      onChange={onChange}
      placeholder="All workspaces"
    />
  );
};
