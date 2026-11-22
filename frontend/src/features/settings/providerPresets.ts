export type ProviderID = 'openai' | 'gemini' | 'deepseek' | 'custom';

// Text generation models with a Standard API free tier in Google's pricing table.
// Availability and quotas depend on the user's project and can change.
export const geminiFreeTierModels = [
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
] as const;

export const providerPresets: Record<ProviderID, { name: string; endpoint: string; modelHint: string; docs?: string }> = {
  openai: { name: 'OpenAI', endpoint: 'https://api.openai.com/v1', modelHint: 'Model ID from your OpenAI account', docs: 'https://developers.openai.com/api/docs/models' },
  gemini: { name: 'Google Gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai', modelHint: 'Model ID from Google AI Studio', docs: 'https://aistudio.google.com/docs/models' },
  deepseek: { name: 'DeepSeek', endpoint: 'https://api.deepseek.com', modelHint: 'Model ID from your DeepSeek account', docs: 'https://api-docs.deepseek.com/quick_start/pricing' },
  custom: { name: 'Other compatible provider', endpoint: '', modelHint: 'Provider model ID' },
};

export const providerFromEndpoint = (endpoint?: string): ProviderID =>
  (Object.keys(providerPresets) as ProviderID[]).find((id) => id !== 'custom' && providerPresets[id].endpoint === endpoint) ?? 'custom';
