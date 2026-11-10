import type { User } from '../../types';

const userHandle = (user?: User | null) => user?.email?.split('@')[0] || user?.name || 'user';

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
    id: 'security',
    title: 'Security',
    description: 'Production safety posture for app data and runtime secrets.',
    rows: [
      { label: 'Workspace data', value: 'Authenticated routes' },
      { label: 'Runtime secrets', value: 'Server-side env vars' },
    ],
  },
];
