import type { User } from '../../types';
import { userHandle } from '../../components/layout/appNavigation';

export type SettingsSection = {
  id: string;
  title: string;
  description: string;
  rows: Array<{ label: string; value: string }>;
};

export const getSettingsSections = (user?: User | null): SettingsSection[] => [
  {
    id: 'account',
    title: 'Account',
    description: 'Basic session and profile details.',
    rows: [
      { label: 'Display name', value: userHandle(user) },
      { label: 'Email verified', value: user?.isEmailVerified ? 'Yes' : 'Not confirmed' },
      { label: 'Auth mode', value: 'JWT session' },
    ],
  },
  {
    id: 'plan',
    title: 'Plan and billing',
    description: 'Demo plan status for the local-first SaaS workflow.',
    rows: [
      { label: 'Plan', value: 'DriftLedger Local Pro' },
      { label: 'Billing status', value: 'Active demo' },
      { label: 'Price display', value: '$19/month placeholder' },
      { label: 'Billing page', value: '/billing' },
    ],
  },
  {
    id: 'model',
    title: 'Local model runtime',
    description: 'The drift engine currently used by analysis routes.',
    rows: [
      { label: 'Provider', value: 'llama.cpp' },
      { label: 'Model', value: 'Qwen2.5-7B + DriftLedger LoRA' },
      { label: 'Quantization', value: 'GGUF Q4_K_M' },
      { label: 'Drift mode', value: 'Model first' },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    description: 'Production safety posture for app data and runtime secrets.',
    rows: [
      { label: 'Workspace data', value: 'Authenticated routes' },
      { label: 'Runtime secrets', value: 'Server-side env vars' },
    ],
  },
];
