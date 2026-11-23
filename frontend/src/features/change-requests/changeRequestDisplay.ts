import type { ChangeRequest } from './changeRequest.types';

export const generatedByLabel = (generatedBy?: ChangeRequest['generatedBy'] | string) => {
  if (generatedBy === 'qwen_lora' || generatedBy === 'local_model') return 'Local AI model';
  if (generatedBy === 'rule_based') return 'Legacy rules';
  if (generatedBy === 'openai_compatible') return 'External analysis provider';
  return generatedBy || 'Unknown model';
};
