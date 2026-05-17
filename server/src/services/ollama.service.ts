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
    return null;
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
