import type { RequirementVersion } from '../requirements/requirement.types';

interface BaselineSelectorProps {
  versions: RequirementVersion[];
  value: string;
  onChange: (versionId: string) => void;
}

const selectClass =
  'h-11 w-full rounded-2xl border border-gray-700 bg-black px-4 text-sm text-white shadow-sm outline-none transition focus:border-lime-400 focus:ring-2 focus:ring-lime-400/30';

export const BaselineSelector = ({ versions, value, onChange }: BaselineSelectorProps) => {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-gray-300">Baseline version</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className={selectClass}>
        {versions.map((version) => (
          <option key={version._id} value={version._id}>
            Version {version.versionNumber} {version.label ? `- ${version.label}` : ''}
          </option>
        ))}
      </select>
    </label>
  );
};
