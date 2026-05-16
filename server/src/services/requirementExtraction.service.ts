export type RequirementExtractionSuggestion = {
  title: string;
  description: string;
  type: 'functional' | 'non_functional' | 'business' | 'technical' | 'ui_ux' | 'security' | 'performance' | 'integration' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  source: 'original_scope' | 'manual' | 'client_message' | 'meeting_note' | 'document' | 'ai_extracted';
  sourceText: string;
  acceptanceCriteria: string[];
  tags: string[];
  estimatedEffort?: number;
};

const functionalKeywords = ['should allow', 'must allow', 'user can', 'users can', 'system should', 'system must', 'admin can', 'admins can'];
const securityKeywords = ['authentication', 'authorization', 'password', 'role', 'permission', 'secure', 'login'];
const performanceKeywords = ['fast', 'response time', 'load time', 'performance', 'scalable', 'latency'];
const uiKeywords = ['dashboard', 'screen', 'interface', 'page', 'form', 'button', 'layout'];
const integrationKeywords = ['api', 'webhook', 'third-party', 'payment', 'email', 'notification'];
const businessKeywords = ['approve', 'approval', 'budget', 'billing', 'client', 'invoice', 'subscription', 'report'];

const splitStatements = (sourceText: string) =>
  sourceText
    .replace(/\r/g, '\n')
    .split(/(?<=[.!?])\s+|\n+/)
    .flatMap((statement) => statement.split(/;+/))
    .map((statement) => statement.trim())
    .filter(Boolean);

const hasKeyword = (text: string, keywords: string[]) => keywords.some((keyword) => text.includes(keyword));

const classifyType = (sentence: string) => {
  const lower = sentence.toLowerCase();

  if (hasKeyword(lower, securityKeywords)) return 'security';
  if (hasKeyword(lower, performanceKeywords)) return 'performance';
  if (hasKeyword(lower, integrationKeywords)) return 'integration';
  if (hasKeyword(lower, uiKeywords)) return 'ui_ux';
  if (hasKeyword(lower, businessKeywords)) return 'business';
  if (hasKeyword(lower, functionalKeywords) || /(should|must|can|allow|need|requires)/.test(lower)) return 'functional';
  return 'other';
};

const classifyPriority = (sentence: string, type: RequirementExtractionSuggestion['type']) => {
  const lower = sentence.toLowerCase();
  if (type === 'security' || lower.includes('critical') || lower.includes('must')) return 'high';
  if (type === 'performance' || lower.includes('important') || lower.includes('high priority')) return 'high';
  if (lower.includes('urgent') || lower.includes('critical issue')) return 'critical';
  return 'medium';
};

const cleanTitle = (sentence: string) =>
  sentence
    .replace(/^(the|this|that)\s+/i, '')
    .replace(/\b(should|must|can|allow|allows|enable|enables|support|supports|provide|provides|be able to)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

const deriveTitle = (sentence: string) => {
  const lower = sentence.toLowerCase();
  if (lower.includes('login') || lower.includes('sign in')) return 'User login';
  if (lower.includes('dashboard')) return 'Dashboard experience';
  if (lower.includes('project') && lower.includes('admin')) return 'Admin project management';
  if (lower.includes('notification')) return 'Notification handling';
  if (lower.includes('api')) return 'API integration';

  const cleaned = cleanTitle(sentence);
  const words = cleaned.split(' ').filter(Boolean).slice(0, 6);
  const title = words.join(' ').replace(/^[a-z]/, (char) => char.toUpperCase());
  return title.length > 3 ? title : 'Captured requirement';
};

const deriveTags = (sentence: string) => {
  const lower = sentence.toLowerCase();
  const tags = new Set<string>();

  if (hasKeyword(lower, securityKeywords)) tags.add('security');
  if (hasKeyword(lower, performanceKeywords)) tags.add('performance');
  if (hasKeyword(lower, uiKeywords)) tags.add('ui-ux');
  if (hasKeyword(lower, integrationKeywords)) tags.add('integration');
  if (lower.includes('admin')) tags.add('admin');
  if (lower.includes('user')) tags.add('user');
  if (lower.includes('project')) tags.add('project');

  return [...tags];
};

const deriveEstimatedEffort = (sentence: string, type: RequirementExtractionSuggestion['type']) => {
  if (type === 'security' || type === 'integration') return 8;
  if (type === 'performance') return 10;
  if (sentence.length > 180) return 6;
  return 4;
};

const shouldKeepSentence = (sentence: string) => {
  const lower = sentence.toLowerCase();
  return (
    hasKeyword(lower, functionalKeywords) ||
    hasKeyword(lower, securityKeywords) ||
    hasKeyword(lower, performanceKeywords) ||
    hasKeyword(lower, uiKeywords) ||
    hasKeyword(lower, integrationKeywords) ||
    lower.includes('requirement') ||
    /(should|must|can|allow|requires|needs|dashboard|page|form|api|login|secure)/.test(lower)
  );
};

export const extractRequirementsFromText = (sourceText: string, source: RequirementExtractionSuggestion['source'] = 'original_scope') => {
  const suggestions: RequirementExtractionSuggestion[] = [];
  const seenTitles = new Set<string>();

  for (const sentence of splitStatements(sourceText)) {
    if (!shouldKeepSentence(sentence)) continue;

    const title = deriveTitle(sentence);
    const dedupeKey = title.toLowerCase();
    if (seenTitles.has(dedupeKey)) continue;
    seenTitles.add(dedupeKey);

    const type = classifyType(sentence);
    suggestions.push({
      title,
      description: sentence.replace(/\s+/g, ' ').trim(),
      type,
      priority: classifyPriority(sentence, type),
      source,
      sourceText: sentence,
      acceptanceCriteria: [
        'User can complete this requirement successfully.',
        'System provides clear feedback for success and failure states.',
      ],
      tags: deriveTags(sentence),
      estimatedEffort: deriveEstimatedEffort(sentence, type),
    });
  }

  return suggestions;
};
