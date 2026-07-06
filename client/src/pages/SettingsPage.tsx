import { ChevronDown, LogOut } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../utils/cn';

const SettingRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] py-3 last:border-b-0">
    <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
    <span className="text-sm font-semibold text-[var(--color-text)]">{value}</span>
  </div>
);

type SettingsSection = {
  id: string;
  title: string;
  description: string;
  rows: Array<{ label: string; value: string }>;
};

export const SettingsPage = () => {
  const { user, logout } = useAuth();
  const [openSection, setOpenSection] = useState<string | null>(null);
  const displayName = user?.email?.split('@')[0] || user?.name || 'DriftLedger user';

  const sections: SettingsSection[] = [
    {
      id: 'account',
      title: 'Account',
      description: 'Basic session and profile details.',
      rows: [
        { label: 'Display name', value: displayName },
        { label: 'Email verified', value: user?.isEmailVerified ? 'Yes' : 'Not confirmed' },
        { label: 'Auth mode', value: 'JWT session' },
      ],
    },
    {
      id: 'model',
      title: 'Local model runtime',
      description: 'The drift engine currently used by analysis routes.',
      rows: [
        { label: 'Provider', value: 'llama.cpp' },
        { label: 'Model', value: 'Qwen2.5-7B + DriftLedger LoRA' },
        { label: 'Quantization', value: 'GGUF Q3_K_M' },
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-3xl space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-5 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
        <div>
          <p className="app-eyebrow">Settings</p>
          <h2 className="mt-2 text-3xl font-semibold text-[var(--color-text)]">Account and runtime</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
            Only the settings that matter for using DriftLedger are shown here.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void logout()}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </section>

      <Card className="overflow-hidden p-0">
        <div className="divide-y divide-[var(--color-border)]">
          {sections.map((section) => {
            const isOpen = openSection === section.id;
            return (
              <div key={section.id}>
                <button
                  type="button"
                  onClick={() => setOpenSection(isOpen ? null : section.id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-[var(--color-bg-soft)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-focus)]"
                  aria-expanded={isOpen}
                >
                  <span>
                    <span className="block text-base font-semibold text-[var(--color-text)]">{section.title}</span>
                    <span className="mt-1 block text-sm text-[var(--color-text-muted)]">{section.description}</span>
                  </span>
                  <ChevronDown className={cn('h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition-transform duration-200', isOpen && 'rotate-180')} />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="bg-[var(--color-bg-soft)] px-5 pb-5">
                        {section.rows.map((row) => (
                          <SettingRow key={row.label} label={row.label} value={row.value} />
                        ))}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </Card>
    </motion.div>
  );
};
