import type { DriftAnalysisPreview, DetectedChange, RiskLevel } from '../types/drift.js';

const getRiskLevel = (score: number): RiskLevel => {
  if (score <= 25) return 'low';
  if (score <= 50) return 'medium';
  if (score <= 75) return 'high';
  return 'critical';
};

const getSummary = (riskLevel: RiskLevel) => {
  if (riskLevel === 'low') return 'Minor requirement drift detected. Changes appear manageable but should still be documented.';
  if (riskLevel === 'medium') return 'Moderate requirement drift detected. Some requested changes may affect scope, effort, or delivery expectations.';
  if (riskLevel === 'high') return 'High requirement drift detected. Several changes may expand the original scope and should be reviewed before development continues.';
  return 'Critical requirement drift detected. The new request significantly changes the original baseline and should be converted into a formal change request.';
};

export const scoreDriftAnalysis = (detectedChanges: DetectedChange[]) => {
  const counts = detectedChanges.reduce(
    (accumulator, change) => {
      if (change.changeType === 'added') accumulator.addedCount += 1;
      if (change.changeType === 'modified') accumulator.modifiedCount += 1;
      if (change.changeType === 'removed') accumulator.removedCount += 1;
      if (change.changeType === 'ambiguous') accumulator.ambiguousCount += 1;
      if (change.changeType === 'contradiction') accumulator.contradictionCount += 1;

      return accumulator;
    },
    { addedCount: 0, modifiedCount: 0, removedCount: 0, ambiguousCount: 0, contradictionCount: 0 }
  );

  let driftScore = counts.addedCount * 12 + counts.modifiedCount * 10 + counts.removedCount * 8 + counts.ambiguousCount * 6 + counts.contradictionCount * 15;

  for (const change of detectedChanges) {
    if (change.impact === 'high') {
      driftScore += 8;
    }

    if (change.impact === 'critical') {
      driftScore += 15;
    }
  }

  const estimatedExtraHours = detectedChanges.reduce((total, change) => total + (change.estimatedEffort ?? 0), 0);

  if (estimatedExtraHours >= 30) {
    driftScore += 20;
  } else if (estimatedExtraHours >= 15) {
    driftScore += 10;
  } else if (estimatedExtraHours >= 5) {
    driftScore += 5;
  }

  driftScore = Math.min(100, driftScore);
  const riskLevel = getRiskLevel(driftScore);

  return {
    driftScore,
    riskLevel,
    summary: getSummary(riskLevel),
    estimatedExtraHours,
    ...counts,
  };
};
