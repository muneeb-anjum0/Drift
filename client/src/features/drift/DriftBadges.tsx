import type { AnalysisEngine, RiskLevel } from './drift.types';

const riskClassName = (riskLevel: RiskLevel) => {
  if (riskLevel === 'low') return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300';
  if (riskLevel === 'medium') return 'border-amber-400/20 bg-amber-400/10 text-amber-300';
  if (riskLevel === 'high') return 'border-orange-400/20 bg-orange-400/10 text-orange-300';
  return 'border-red-400/20 bg-red-400/10 text-red-300';
};

const engineLabel = (analysisEngine: AnalysisEngine) => {
  if (analysisEngine === 'qwen_lora') return 'Qwen GGUF';
  if (analysisEngine === 'rule_based') return 'Fallback mode';
  if (analysisEngine === 'hybrid') return 'Qwen GGUF';
  return 'Legacy engine';
};

const runtimeLabel = (analysisEngine: AnalysisEngine, ollamaUsed: boolean) => {
  if (analysisEngine === 'rule_based') return 'Fallback mode';
  if (analysisEngine === 'qwen_lora') return 'Fallback not used';
  if (analysisEngine === 'hybrid') return ollamaUsed ? 'Summary enhanced' : 'Model used';
  return 'Legacy analysis';
};

export const DriftBadges = ({ riskLevel, analysisEngine, ollamaUsed }: { riskLevel: RiskLevel; analysisEngine: AnalysisEngine; ollamaUsed: boolean }) => {
  return (
    <div className="flex flex-wrap gap-2">
      <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${riskClassName(riskLevel)}`}>
        {riskLevel}
      </span>
      <span className="rounded-full border border-lime-400/20 bg-lime-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-lime-300">
        {engineLabel(analysisEngine)}
      </span>
      <span className="rounded-full border border-gray-700 bg-black/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-300">
        {runtimeLabel(analysisEngine, ollamaUsed)}
      </span>
    </div>
  );
};
