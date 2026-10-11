import type { DetectedChange } from './drift.types';

const names: Record<DetectedChange['changeType'], string> = { added: 'New requirement', modified: 'Changed requirement', removed: 'Requirement removed', contradiction: 'Conflicts with agreement', ambiguous: 'Needs clarification', unchanged: 'No meaningful change' };

export const DetectedChangeCard = ({ change }: { change: DetectedChange }) => <article className="border-t border-[var(--v-border)] py-4 text-sm">
  <div className="flex flex-wrap items-center gap-2"><span className="v-pill">{names[change.changeType]}</span><span className="v-muted capitalize">Potential impact: {change.impact}</span></div>
  <h4 className="mt-3 font-semibold">{change.title}</h4><p className="mt-1 leading-6">{change.description}</p>
  {change.oldText ? <p className="v-muted mt-2"><strong>Originally:</strong> {change.oldText}</p> : null}
  {change.newText ? <p className="v-muted mt-1"><strong>New request:</strong> {change.newText}</p> : null}
  <details className="mt-2"><summary className="v-link cursor-pointer">Why this was flagged / technical details</summary><div className="v-muted mt-2 space-y-1"><p>{change.recommendation}</p><p>Model confidence: {change.confidence}% · Heuristic effort: {change.estimatedEffort ?? 'not estimated'}</p></div></details>
</article>;
