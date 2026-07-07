import type { ChangeRequest } from './changeRequest.types';

export const generatedByLabel = (generatedBy?: ChangeRequest['generatedBy'] | string) => {
  if (generatedBy === 'qwen_lora' || generatedBy === 'hybrid') return 'Qwen2.5-7B + DriftLedger LoRA (GGUF Q4_K_M)';
  if (generatedBy === 'rule_based') return 'DriftLedger rules';
  if (generatedBy === 'ollama') return 'Legacy model draft';
  return generatedBy || 'DriftLedger Q4_K_M';
};
