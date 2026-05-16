// AI extraction is intentionally not enabled in Phase 2.
// This placeholder keeps the architecture ready for a future Gemini/OpenAI integration.
// API keys will be added later through environment variables when AI support is introduced.
// For now, Phase 2 relies on the local rule-based extraction service.

export const extractRequirementsWithAI = async (_sourceText: string) => {
  throw new Error('AI extraction is not enabled in Phase 2. Use local extraction instead.');
};
