import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Card } from '../../components/common/Card';
import { cn } from '../../utils/cn';
import type { SettingsSection } from './settingsSections';

const SettingRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] py-3 last:border-b-0">
    <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
    <span className="text-sm font-semibold text-[var(--color-text)]">{value}</span>
  </div>
);

export const SettingsAccordion = ({ sections }: { sections: SettingsSection[] }) => {
  const [openSection, setOpenSection] = useState<string | null>(null);

  return (
    <Card className="overflow-hidden p-0">
      <div className="divide-y divide-[var(--color-border)]">
        {sections.map((settingsSection) => {
          const isOpen = openSection === settingsSection.id;
          return (
            <div key={settingsSection.id}>
              <button
                type="button"
                onClick={() => setOpenSection(isOpen ? null : settingsSection.id)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-[var(--color-bg-soft)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-focus)]"
                aria-expanded={isOpen}
              >
                <span>
                  <span className="block text-base font-semibold text-[var(--color-text)]">{settingsSection.title}</span>
                  <span className="mt-1 block text-sm text-[var(--color-text-muted)]">{settingsSection.description}</span>
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
                      {settingsSection.rows.map((row) => (
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
  );
};
