import { RefreshCcw } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Spinner } from '../../components/common/Spinner';

interface BaselineButtonProps {
  requirementCount: number;
  isLoading?: boolean;
  onCreateBaseline: () => Promise<void>;
}

export const BaselineButton = ({ requirementCount, isLoading = false, onCreateBaseline }: BaselineButtonProps) => {
  const handleClick = async () => {
    if (requirementCount === 0) return;
    const confirmed = window.confirm('Create a requirement baseline from the current set?');
    if (!confirmed) return;
    await onCreateBaseline();
  };

  return (
    <div className="rounded-3xl border border-lime-400/15 bg-black/60 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-lime-400">Baseline</p>
          <h3 className="mt-2 text-base font-semibold text-white">Freeze the current requirements</h3>
          <p className="mt-1 text-sm leading-6 text-gray-400">Baseline versions freeze the current requirement set so future drift can be compared against it.</p>
        </div>
        <Button type="button" variant="secondary" onClick={handleClick} disabled={requirementCount === 0 || isLoading} className="shrink-0">
          {isLoading ? <Spinner /> : <RefreshCcw className="mr-2 h-4 w-4" />}
          Create Baseline
        </Button>
      </div>
      <p className="mt-3 text-xs text-gray-500">Current requirements: {requirementCount}</p>
    </div>
  );
};
