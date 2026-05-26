import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import type { AnalysisEngine, DetectedChange, DriftAnalysisPreview } from '../types/drift.js';

type OllamaResponse = {
  response?: string;
  done?: boolean;
};

const parseJsonResponse = <T>(value: string): T | null => {
  try {
    return JSON.parse(value) as T;
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
};

const createTimeoutSignal = (timeoutMs: number) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, cancel: () => clearTimeout(timeoutId) };
};

export const isOllamaEnabled = () => env.OLLAMA_ENABLED;

export const checkOllamaHealth = async () => {
  if (!isOllamaEnabled()) {
    return false;
  }

  const { signal, cancel } = createTimeoutSignal(Math.min(env.OLLAMA_TIMEOUT_MS, 5000));
  try {
    const response = await fetch(`${env.OLLAMA_BASE_URL}/api/tags`, { method: 'GET', signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    cancel();
  }
};

const callOllama = async (prompt: string, model: string) => {
  const { signal, cancel } = createTimeoutSignal(env.OLLAMA_TIMEOUT_MS);
  try {
    const response = await fetch(`${env.OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, prompt, stream: false }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed with status ${response.status}`);
    }

    return (await response.json()) as OllamaResponse;
  } finally {
    cancel();
  }
};

const buildDriftEnhancementPrompt = (params: {
  baselineRequirements: Array<{ title: string; description: string }>;
  inputText: string;
  ruleBasedResult: DriftAnalysisPreview;
}) => `You are improving a rule-based requirement drift analysis for a SaaS product.

Return STRICT JSON only. Do not wrap it in markdown or code fences.
Do not invent new requirements. Only improve wording, recommendations, and clarity for the existing detected changes.

JSON schema:
{
  "summary": string,
  "detectedChanges": [
    {
      "changeType": "added" | "modified" | "removed" | "ambiguous" | "contradiction" | "unchanged",
      "title": string,
      "description": string,
      "baselineRequirementId"?: string,
      "baselineRequirementTitle"?: string,
      "newText"?: string,
      "oldText"?: string,
      "impact": "low" | "medium" | "high" | "critical",
      "estimatedEffort"?: number,
      "confidence": number,
      "recommendation": string
    }
  ]
}

Baseline requirements:
${JSON.stringify(params.baselineRequirements, null, 2)}

New client input:
${params.inputText}

Rule-based result:
${JSON.stringify(params.ruleBasedResult, null, 2)}
`;

const buildAiDriftAnalysisPrompt = (params: {
  baselineRequirements: Array<{
    requirementId: string;
    title: string;
    description: string;
    type: string;
    priority: string;
    status: string;
    acceptanceCriteria: string[];
    tags: string[];
    estimatedEffort?: number | null;
  }>;
  inputText: string;
  inputType: string;
}) => `You are DriftLedger's requirement drift analysis engine.

Compare the approved baseline requirements against the new client input. Return STRICT JSON only. Do not wrap it in markdown or code fences.

Important rules:
- Detect added requirements when the new input asks for capabilities not present in the baseline.
- Detect modified requirements when the input changes a baseline requirement's behavior, constraints, priority, acceptance criteria, UX, security, integration, performance, timeline, or delivery expectation.
- Detect removed requirements only when the input explicitly says something is removed, cancelled, disabled, no longer needed, not required, or replaced.
- Detect contradictions when the input conflicts with an approved baseline requirement.
- Detect ambiguous requests when wording is unclear, subjective, broad, or needs clarification.
- Do not mark a baseline item as removed just because it is not mentioned.
- Estimate effort in hours as a realistic implementation delta.
- Use confidence from 0 to 100.
- Keep recommendations professional and client-facing.

JSON schema:
{
  "summary": string,
  "detectedChanges": [
    {
      "changeType": "added" | "modified" | "removed" | "ambiguous" | "contradiction",
      "title": string,
      "description": string,
      "baselineRequirementId"?: string,
      "baselineRequirementTitle"?: string,
      "newText"?: string,
      "oldText"?: string,
      "impact": "low" | "medium" | "high" | "critical",
      "estimatedEffort"?: number,
      "confidence": number,
      "recommendation": string
    }
  ]
}

Approved baseline requirements:
${JSON.stringify(params.baselineRequirements, null, 2)}

Input type:
${params.inputType}

New client input:
${params.inputText}
`;

const buildChangeRequestPrompt = (params: {
  driftAnalysis: DriftAnalysisPreview;
  changeRequestDraft: Record<string, unknown>;
}) => `You are improving a client-friendly change request for a SaaS product.

Return STRICT JSON only. Do not wrap it in markdown or code fences.
Do not invent new scope. Keep the response aligned with the detected drift.

JSON schema:
{
  "title": string,
  "summary": string,
  "businessReason": string,
  "timelineImpact": string,
  "costImpact": string,
  "recommendedAction": string,
  "approvalNote": string,
  "changesRequested": [
    {
      "title": string,
      "description": string,
      "changeType": "added" | "modified" | "removed" | "ambiguous" | "contradiction",
      "impact": "low" | "medium" | "high" | "critical",
      "estimatedEffort"?: number
    }
  ]
}

Drift analysis:
${JSON.stringify(params.driftAnalysis, null, 2)}

Current draft:
${JSON.stringify(params.changeRequestDraft, null, 2)}
`;

const isDetectedChange = (value: unknown): value is DetectedChange => Boolean(value && typeof value === 'object' && 'changeType' in value);

const validChangeTypes = new Set(['added', 'modified', 'removed', 'ambiguous', 'contradiction']);
const validImpacts = new Set(['low', 'medium', 'high', 'critical']);

const asString = (value: unknown, fallback = '') => (typeof value === 'string' && value.trim() ? value.trim() : fallback);
const asOptionalString = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);
const asEffort = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.round(value * 10) / 10 : undefined);
const asConfidence = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 75);

const normalizeDetectedChange = (value: unknown): DetectedChange | null => {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Record<string, unknown>;
  const changeType = asString(candidate.changeType);
  const impact = asString(candidate.impact);

  if (!validChangeTypes.has(changeType) || !validImpacts.has(impact)) {
    return null;
  }

  const title = asString(candidate.title, 'Scope change');
  const description = asString(candidate.description, title);

  return {
    changeType: changeType as DetectedChange['changeType'],
    title,
    description,
    baselineRequirementId: asOptionalString(candidate.baselineRequirementId),
    baselineRequirementTitle: asOptionalString(candidate.baselineRequirementTitle),
    newText: asOptionalString(candidate.newText),
    oldText: asOptionalString(candidate.oldText),
    impact: impact as DetectedChange['impact'],
    estimatedEffort: asEffort(candidate.estimatedEffort),
    confidence: asConfidence(candidate.confidence),
    recommendation: asString(candidate.recommendation, `Review "${title}" before implementation begins.`),
  };
};

export const analyzeDriftWithOllama = async ({
  baselineRequirements,
  inputText,
  inputType,
  model = env.OLLAMA_MODEL,
}: {
  baselineRequirements: Array<{
    requirementId: string;
    title: string;
    description: string;
    type: string;
    priority: string;
    status: string;
    acceptanceCriteria: string[];
    tags: string[];
    estimatedEffort?: number | null;
  }>;
  inputText: string;
  inputType: string;
  model?: string;
}) => {
  if (!isOllamaEnabled()) {
    throw new ApiError(503, 'Ollama is not enabled. Set OLLAMA_ENABLED=true to run drift analysis.');
  }

  const reachable = await checkOllamaHealth();
  if (!reachable) {
    throw new ApiError(503, 'Ollama is enabled but unavailable. Start Ollama and try again.');
  }

  const response = await callOllama(buildAiDriftAnalysisPrompt({ baselineRequirements, inputText, inputType }), model);
  const parsed = response.response ? parseJsonResponse<Record<string, unknown>>(response.response) : null;
  const parsedDetectedChanges = parsed && Array.isArray(parsed.detectedChanges) ? parsed.detectedChanges : null;

  if (!parsed || typeof parsed.summary !== 'string' || !parsedDetectedChanges) {
    throw new ApiError(502, 'Ollama returned an invalid drift analysis response. Try again or use a stronger local model.');
  }

  const detectedChanges = parsedDetectedChanges
    .map((change) => normalizeDetectedChange(change))
    .filter((change): change is DetectedChange => Boolean(change));

  return {
    summary: parsed.summary.trim(),
    detectedChanges,
    analysisEngine: 'ollama' as AnalysisEngine,
    ollamaUsed: true,
    ollamaModel: model,
  };
};

export const enhanceDriftAnalysisWithOllama = async ({
  baselineRequirements,
  inputText,
  ruleBasedResult,
  model = env.OLLAMA_MODEL,
}: {
  baselineRequirements: Array<{ title: string; description: string }>;
  inputText: string;
  ruleBasedResult: DriftAnalysisPreview;
  model?: string;
}) => {
  if (!isOllamaEnabled()) {
    return null;
  }

  const reachable = await checkOllamaHealth();
  if (!reachable) {
    console.warn('Ollama is enabled but unavailable. Falling back to rule-based drift analysis.');
    return null;
  }

  try {
    const response = await callOllama(
      buildDriftEnhancementPrompt({ baselineRequirements, inputText, ruleBasedResult }),
      model ?? env.OLLAMA_MODEL
    );

    const parsed = response.response ? parseJsonResponse<Record<string, unknown>>(response.response) : null;
    const parsedDetectedChanges = parsed && Array.isArray(parsed.detectedChanges) ? parsed.detectedChanges : null;

    if (!parsed || typeof parsed.summary !== 'string' || !parsedDetectedChanges) {
      return null;
    }

    const mergedChanges = ruleBasedResult.detectedChanges.map((change, index) => {
      const candidate = parsedDetectedChanges[index];
      if (!isDetectedChange(candidate)) {
        return change;
      }

      return {
        ...change,
        description: typeof candidate.description === 'string' ? candidate.description : change.description,
        impact: candidate.impact === 'low' || candidate.impact === 'medium' || candidate.impact === 'high' || candidate.impact === 'critical' ? candidate.impact : change.impact,
        estimatedEffort: typeof candidate.estimatedEffort === 'number' ? candidate.estimatedEffort : change.estimatedEffort,
        confidence: typeof candidate.confidence === 'number' ? Math.max(0, Math.min(100, candidate.confidence)) : change.confidence,
        recommendation: typeof candidate.recommendation === 'string' ? candidate.recommendation : change.recommendation,
      };
    });

    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : ruleBasedResult.summary,
      detectedChanges: mergedChanges,
      analysisEngine: 'ollama' as AnalysisEngine,
      ollamaUsed: true,
      ollamaModel: model ?? env.OLLAMA_MODEL,
    };
  } catch (error) {
    console.warn('Ollama drift enhancement failed. Falling back to rule-based drift analysis.', error);
    return null;
  }
};

export const generateChangeRequestWithOllama = async ({
  driftAnalysis,
  changeRequestDraft,
  model = env.OLLAMA_MODEL,
}: {
  driftAnalysis: DriftAnalysisPreview;
  changeRequestDraft: Record<string, unknown>;
  model?: string;
}) => {
  if (!isOllamaEnabled()) {
    return null;
  }

  const reachable = await checkOllamaHealth();
  if (!reachable) {
    console.warn('Ollama is enabled but unavailable. Falling back to rule-based change request generation.');
    return null;
  }

  try {
    const response = await callOllama(buildChangeRequestPrompt({ driftAnalysis, changeRequestDraft }), model ?? env.OLLAMA_MODEL);
    const parsed = response.response ? parseJsonResponse<Record<string, unknown>>(response.response) : null;
    if (!parsed || typeof parsed.title !== 'string' || typeof parsed.summary !== 'string') {
      return null;
    }

    return {
      title: parsed.title,
      summary: parsed.summary,
      businessReason: typeof parsed.businessReason === 'string' ? parsed.businessReason : changeRequestDraft.businessReason,
      timelineImpact: typeof parsed.timelineImpact === 'string' ? parsed.timelineImpact : changeRequestDraft.timelineImpact,
      costImpact: typeof parsed.costImpact === 'string' ? parsed.costImpact : changeRequestDraft.costImpact,
      recommendedAction: typeof parsed.recommendedAction === 'string' ? parsed.recommendedAction : changeRequestDraft.recommendedAction,
      approvalNote: typeof parsed.approvalNote === 'string' ? parsed.approvalNote : changeRequestDraft.approvalNote,
      changesRequested: Array.isArray(parsed.changesRequested) ? parsed.changesRequested : changeRequestDraft.changesRequested,
      generatedBy: 'ollama' as AnalysisEngine,
    };
  } catch (error) {
    console.warn('Ollama change request generation failed. Falling back to rule-based draft.', error);
    return null;
  }
};
