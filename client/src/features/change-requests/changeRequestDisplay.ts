import type { ChangeRequest } from './changeRequest.types';

export const generatedByLabel = (generatedBy?: ChangeRequest['generatedBy'] | string) => {
  if (generatedBy === 'qwen_lora') return 'Qwen2.5-7B + DriftLedger LoRA (GGUF Q4_K_M)';
  if (generatedBy === 'rule_based') return 'DriftLedger rules';
  return generatedBy || 'DriftLedger Q4_K_M';
};
